#!/usr/bin/env python3
"""Build the screen-time habit file from local macOS usage databases.

Apple exposes no web API for Screen Time — the ``DeviceActivity`` framework is
sandboxed so usage data never leaves the device. It is, however, sitting on
your Mac's disk, in two places:

* **Mac usage** — ``~/Library/Application Support/Knowledge/knowledgeC.db``,
  a SQLite database whose ``ZOBJECT`` table holds ``/app/usage`` sessions.
* **iPhone usage** — synced through iCloud into ``~/Library/Biome/``, as
  binary ``App.InFocus`` streams.

Because this reads local files it cannot run in CI. Run it on your Mac every
week or two and commit the result; the nightly workflow leaves this file alone.

Usage:
    python scripts/fetch_screentime.py
    python scripts/fetch_screentime.py --no-iphone      # Mac only
    python scripts/fetch_screentime.py --dump-biome 40  # inspect the parser

**Full Disk Access is required.** Grant it to your terminal in
System Settings → Privacy & Security → Full Disk Access, then restart it.

Two accuracy notes:

1. ``knowledgeC.db`` records overlapping sessions when several apps are
   "in use" at once. Summing them inflates the total, so intervals are
   **unioned** before being measured — matching how Screen Time counts
   wall-clock time.
2. Apple prunes ``knowledgeC.db`` to roughly the last four weeks. This script
   merges into the existing JSON rather than replacing it, so history
   accumulates as long as you run it more often than that.
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sqlite3
import struct
import sys

import habits_common as hc

# Apple's Core Data epoch: 2001-01-01 UTC, in Unix seconds.
MAC_EPOCH = 978307200

KNOWLEDGE_DB = os.path.expanduser(
    "~/Library/Application Support/Knowledge/knowledgeC.db"
)
BIOME_ROOT = os.path.expanduser("~/Library/Biome")

# Plausible Mac-epoch range for a timestamp, used to sift real timestamps out
# of arbitrary bytes when scanning the undocumented Biome streams:
# 2019-01-01 through 2035-01-01.
TS_MIN = 568_080_000
TS_MAX = 1_072_915_200

# In-focus sessions longer than this are treated as parse noise rather than
# real usage (a genuine uninterrupted session rarely runs longer).
MAX_SESSION_S = 4 * 3600

FDA_HINT = (
    "Full Disk Access is required to read local Screen Time data.\n"
    "  System Settings → Privacy & Security → Full Disk Access → enable your\n"
    "  terminal, then quit and reopen it and run this again."
)


# --------------------------------------------------------------------------
# interval maths
# --------------------------------------------------------------------------

def union(intervals: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Merge overlapping ``(start, end)`` pairs into disjoint spans.

    Screen Time measures wall-clock time, so two apps used in the same minute
    count once. Summing raw session lengths would double-count them.
    """
    spans: list[tuple[float, float]] = []
    for start, end in sorted(i for i in intervals if i[1] > i[0]):
        if spans and start <= spans[-1][1]:
            if end > spans[-1][1]:
                spans[-1] = (spans[-1][0], end)
        else:
            spans.append((start, end))
    return spans


def split_by_local_day(spans: list[tuple[float, float]]) -> dict[str, float]:
    """Distribute spans across the local calendar days they cover.

    A session running from 23:40 to 00:20 contributes to both days, weighted
    by how much of it falls on each side of midnight.
    """
    per_day: dict[str, float] = {}
    for start, end in spans:
        cursor = start
        while cursor < end:
            local = dt.datetime.fromtimestamp(cursor)
            midnight = dt.datetime.combine(
                local.date() + dt.timedelta(days=1), dt.time.min
            ).timestamp()
            chunk_end = min(end, midnight)
            key = hc.day_key(local)
            per_day[key] = per_day.get(key, 0.0) + (chunk_end - cursor)
            cursor = chunk_end
    return per_day


# --------------------------------------------------------------------------
# Mac: knowledgeC.db
# --------------------------------------------------------------------------

def read_knowledge(path: str, since: dt.date) -> list[tuple[float, float]]:
    if not os.path.exists(path):
        hc.log(f"note: {path} not found; skipping Mac usage")
        return []

    floor = dt.datetime.combine(since, dt.time.min).timestamp() - MAC_EPOCH
    # Read-only + immutable so a live database being written by the OS cannot
    # block us and we can never modify it.
    uri = f"file:{path}?mode=ro&immutable=1"
    try:
        conn = sqlite3.connect(uri, uri=True, timeout=10)
    except sqlite3.OperationalError as exc:
        raise SystemExit(f"cannot open knowledgeC.db ({exc}).\n{FDA_HINT}") from exc

    try:
        rows = conn.execute(
            """
            SELECT ZSTARTDATE, ZENDDATE
            FROM ZOBJECT
            WHERE ZSTREAMNAME = '/app/usage'
              AND ZSTARTDATE IS NOT NULL
              AND ZENDDATE IS NOT NULL
              AND ZSTARTDATE >= ?
            """,
            (floor,),
        ).fetchall()
    except sqlite3.DatabaseError as exc:
        raise SystemExit(f"cannot query knowledgeC.db ({exc}).\n{FDA_HINT}") from exc
    finally:
        conn.close()

    spans = [
        (start + MAC_EPOCH, end + MAC_EPOCH)
        for start, end in rows
        if end > start and (end - start) <= MAX_SESSION_S
    ]
    hc.log(f"  knowledgeC.db: {len(rows)} sessions → {len(spans)} usable")
    return spans


# --------------------------------------------------------------------------
# iPhone: Biome App.InFocus streams
# --------------------------------------------------------------------------

def biome_files() -> list[str]:
    """Locate the App.InFocus stream segments synced from iOS."""
    found: list[str] = []
    if not os.path.isdir(BIOME_ROOT):
        return found
    for root, _dirs, files in os.walk(BIOME_ROOT):
        if "InFocus" not in root:
            continue
        for name in files:
            if name.startswith("."):
                continue
            found.append(os.path.join(root, name))
    return found


# Every timestamp we care about is an IEEE-754 double in [2^29, 2^30), because
# TS_MIN and TS_MAX both sit inside that octave. That fixes the biased exponent
# at 1052, so the top two bytes of the little-endian encoding are always
# 0x41 followed by a high nibble of 0xC — i.e. bytes 6 and 7 match this pattern.
# Prefiltering on it turns a per-byte unpack into a C-speed scan that only
# unpacks genuine candidates.
_DOUBLE_PREFIX = re.compile(rb"[\xc0-\xcf]\x41")


def scan_timestamps(blob: bytes) -> list[float]:
    """Pull plausible Mac-epoch timestamps out of a binary stream segment.

    The Biome on-disk format is undocumented and Apple changes it between OS
    releases, so rather than assume a record layout this sweeps the bytes for
    little-endian doubles landing in a sane date range. Crude, but it degrades
    gracefully instead of breaking outright when the format shifts.

    Candidates are found by byte pattern first — see _DOUBLE_PREFIX. Scanning
    every offset instead means millions of Python-level unpacks per segment,
    which took minutes across a real Biome directory.
    """
    stamps: list[float] = []
    for match in _DOUBLE_PREFIX.finditer(blob):
        offset = match.start() - 6  # the matched bytes are the double's top two
        if offset < 0 or offset + 8 > len(blob):
            continue
        (value,) = struct.unpack_from("<d", blob, offset)
        if TS_MIN < value < TS_MAX:
            stamps.append(value)
    return stamps


def read_biome(since: dt.date, dump: int = 0) -> list[tuple[float, float]]:
    paths = biome_files()
    if not paths:
        hc.log(
            "note: no Biome App.InFocus streams found. iPhone screen time needs "
            "Screen Time sharing across devices enabled in Settings, plus Full "
            "Disk Access. Continuing with Mac usage only."
        )
        return []

    hc.log(f"  Biome: scanning {len(paths)} stream segments")
    floor = dt.datetime.combine(since, dt.time.min).timestamp()
    spans: list[tuple[float, float]] = []
    dumped = 0

    for path in paths:
        try:
            with open(path, "rb") as fh:
                blob = fh.read()
        except PermissionError as exc:
            raise SystemExit(f"cannot read {path} ({exc}).\n{FDA_HINT}") from exc
        except OSError:
            continue

        stamps = sorted(ts + MAC_EPOCH for ts in scan_timestamps(blob))
        # Consecutive timestamps a plausible session apart are read as one
        # in-focus interval.
        for start, end in zip(stamps, stamps[1:]):
            if start < floor:
                continue
            gap = end - start
            if 0 < gap <= MAX_SESSION_S:
                spans.append((start, end))

        if dump and dumped < dump and stamps:
            for ts in stamps[: dump - dumped]:
                local = dt.datetime.fromtimestamp(ts)
                hc.log(f"    {os.path.basename(path)}  {local:%Y-%m-%d %H:%M:%S}")
                dumped += 1

    hc.log(f"  Biome: {len(spans)} candidate intervals")
    return spans


# --------------------------------------------------------------------------

def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--days", type=int, default=120, help="how far back to read (default: 120)")
    ap.add_argument("--no-iphone", action="store_true", help="skip the Biome/iPhone streams")
    ap.add_argument("--dump-biome", type=int, default=0, metavar="N",
                    help="print the first N timestamps the Biome parser finds, then continue")
    ap.add_argument("--out-dir", default=hc.DATA_DIR, help="habit JSON directory")
    ap.add_argument("--no-merge", action="store_true",
                    help="rebuild instead of merging (discards history beyond the retention window)")
    args = ap.parse_args(argv)

    since = hc.days_ago(args.days)
    hc.log(f"reading local screen time since {since}")

    mac_by_day = split_by_local_day(union(read_knowledge(KNOWLEDGE_DB, since)))
    phone_by_day: dict[str, float] = {}
    if not args.no_iphone:
        phone_by_day = split_by_local_day(union(read_biome(since, args.dump_biome)))

    if not mac_by_day and not phone_by_day:
        hc.log("no usage data found — nothing written")
        return 1

    days: dict[str, dict] = {}
    for key in sorted(set(mac_by_day) | set(phone_by_day)):
        mac_s = mac_by_day.get(key, 0.0)
        phone_s = phone_by_day.get(key, 0.0)
        # Separate devices, so their totals genuinely add up.
        days[key] = hc.day(
            (mac_s + phone_s) / 3600.0,
            mac_h=round(mac_s / 3600.0, 3),
            iphone_h=round(phone_s / 3600.0, 3),
        )

    hc.write_habit(
        "screentime", "Screen time", "macOS + iPhone", "h",
        days, merge=not args.no_merge, data_dir=args.out_dir,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
