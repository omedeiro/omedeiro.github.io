#!/usr/bin/env python3
"""Build the screen-time habit file from local macOS usage databases.

Apple exposes no web API for Screen Time — the ``DeviceActivity`` framework is
sandboxed so usage data never leaves the device. It is, however, sitting on
your Mac's disk, in two places:

* **Mac usage** — ``~/Library/Application Support/Knowledge/knowledgeC.db``,
  a SQLite database whose ``ZOBJECT`` table holds ``/app/usage`` sessions.
* **iPhone usage** — synced through iCloud into
  ``~/Library/Biome/streams/restricted/App.InFocus/remote/<device-uuid>/``, as
  ``SEGB`` segment files holding one protobuf record per focus change. Parsed
  properly (see ``parse_segment``), not guessed at.

Screen Time's own cross-device store is **not** on the Mac. Enabling "Share
Across Devices" registers the phone as a sync peer — it shows up in
``knowledgeC.db``'s ``ZSYNCPEER`` — but no ``/app/*`` row is ever attributed to
it, and there is no ``RMAdminStore-*.sqlite`` or ScreenTimeAgent container.
The Screen Time UI assembles that view from CloudKit on demand. Biome is the
only local source of iPhone usage.

Because this reads local files it cannot run in CI. Run it on your Mac every
week or two and commit the result; the nightly workflow leaves this file alone.

Usage:
    python scripts/fetch_screentime.py                  # Mac + iPhone
    python scripts/fetch_screentime.py --no-iphone      # Mac only
    python scripts/fetch_screentime.py --dump-biome 40  # inspect the parser

**Full Disk Access is required.** Grant it to your terminal in
System Settings → Privacy & Security → Full Disk Access, then restart it.

Three accuracy notes:

1. ``knowledgeC.db`` records overlapping sessions when several apps are
   "in use" at once. Summing them inflates the total, so intervals are
   **unioned** before being measured — matching how Screen Time counts
   wall-clock time.
2. Apple prunes ``knowledgeC.db`` to roughly the last four weeks, and Biome to
   a similar window. This script merges into the existing JSON rather than
   replacing it, so history accumulates as long as you run it more often
   than that.
3. StandBy — the clock face an iPhone shows while charging on its side — is
   logged as an in-focus "app" and is a third of the raw Biome total. Apple
   does not count it as screen time and neither do we; see ``AMBIENT``.
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
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

# Segment files live under this stream. ``remote/<uuid>/`` holds what other
# devices synced over; ``local/`` is this Mac. ``tombstone/`` subdirectories
# hold sync bookkeeping, not usage — reading them was what made the previous
# byte-scanning version invent sessions out of deletion records.
BIOME_STREAM = os.path.join(
    BIOME_ROOT, "streams", "restricted", "App.InFocus"
)

# Surfaces the phone shows without anyone using it. StandBy — the charging
# clock face — is logged like any other in-focus app and is roughly a third of
# the raw total, enough to turn an ordinary day into a ten-hour one. Apple
# excludes it from Screen Time.
AMBIENT = frozenset({
    "com.apple.springboard.stand-by",
    "com.apple.SleepLockScreen",
    "com.apple.ClockAngel",
})

# watchOS bundles, used to tell a synced Apple Watch from a synced iPhone: both
# arrive as ``remote/<uuid>/`` and the UUID says nothing about which is which.
WATCH_MARKERS = ("com.apple.carousel.", "com.apple.Nano", ".watchapp")

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
    except sqlite3.DatabaseError as exc:
        # DatabaseError, not OperationalError: a Full Disk Access denial comes
        # back as a bare "authorization denied" DatabaseError, which the
        # narrower class does not catch — turning the one failure this hint
        # exists for into an unhandled traceback.
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

def biome_segments() -> list[tuple[str, str]]:
    """Locate usable App.InFocus segments as ``(device, path)`` pairs.

    Skips ``tombstone/`` outright: those files contain sync metadata —
    references to segment ids and to ``biomesyncd`` — and no usage at all.
    """
    found: list[tuple[str, str]] = []
    if not os.path.isdir(BIOME_STREAM):
        return found
    for root, _dirs, files in os.walk(BIOME_STREAM):
        if "tombstone" in root.split(os.sep):
            continue
        rel = os.path.relpath(root, BIOME_STREAM).split(os.sep)
        device = "local" if rel[0] == "local" else (rel[1] if len(rel) > 1 else "?")
        for name in files:
            if name.startswith(".") or name == "lock":
                continue
            path = os.path.join(root, name)
            try:
                if os.path.getsize(path) < 64:
                    continue
            except OSError:
                continue
            found.append((device, path))
    return found


def _varint(buf: bytes, i: int) -> tuple[int, int]:
    result = shift = 0
    while i < len(buf):
        byte = buf[i]
        i += 1
        result |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return result, i
        shift += 7
        if shift > 63:
            raise ValueError("varint too long")
    raise ValueError("truncated varint")


def parse_record(buf: bytes) -> dict[int, object]:
    """Decode one protobuf record into ``{field_number: value}``.

    Only the field numbers this script uses are named at the call site: 3 is
    the focus flag (1 entering, 0 leaving), 4 the timestamp as a Mac-epoch
    double, 6 the bundle identifier. The rest — app version, build, transition
    reason — are decoded because skipping a field requires parsing it anyway.
    """
    fields: dict[int, object] = {}
    i = 0
    while i < len(buf):
        if buf[i] == 0:  # zero padding to the next 4-byte boundary
            break
        key, i = _varint(buf, i)
        number, wire = key >> 3, key & 7
        if number == 0:
            raise ValueError("field number 0")
        if wire == 0:
            value, i = _varint(buf, i)
        elif wire == 1:
            value = struct.unpack_from("<d", buf, i)[0]
            i += 8
        elif wire == 2:
            length, i = _varint(buf, i)
            if i + length > len(buf):
                raise ValueError("truncated length-delimited field")
            raw = buf[i:i + length]
            i += length
            try:
                value = raw.decode()
            except UnicodeDecodeError:
                value = raw
        elif wire == 5:
            value = struct.unpack_from("<f", buf, i)[0]
            i += 4
        else:
            raise ValueError(f"unsupported wire type {wire}")
        fields.setdefault(number, value)
    return fields


def parse_segment(path: str) -> list[tuple[float, str, int]]:
    """Read a SEGB segment into ``(timestamp, bundle_id, focus_flag)`` events.

    Layout, worked out from the bytes and confirmed against the record count
    the header carries at offset 4: a 32-byte file header, then records of
    ``[4-byte CRC][4-byte state][protobuf][zero padding to 4 bytes]``.

    Records are found by their state marker rather than by walking lengths.
    A record whose payload happens to end on a 4-byte boundary carries no
    padding, so a walker that stops at the first zero byte runs straight into
    the next record's CRC and desynchronises — which silently cost about 80%
    of the records here before the marker scan replaced it.
    """
    try:
        with open(path, "rb") as fh:
            blob = fh.read()
    except PermissionError as exc:
        raise SystemExit(f"cannot read {path} ({exc}).\n{FDA_HINT}") from exc
    except OSError:
        return []

    if blob[:4] != b"SEGB":
        return []

    marks = [
        off for off in range(0x20, len(blob) - 4, 4)
        if struct.unpack_from("<I", blob, off)[0] == 0x0A
    ]
    events: list[tuple[float, str, int]] = []
    for index, off in enumerate(marks):
        stop = marks[index + 1] - 4 if index + 1 < len(marks) else len(blob)
        try:
            fields = parse_record(blob[off + 4:stop])
        except ValueError:
            continue
        stamp, bundle = fields.get(4), fields.get(6)
        if not isinstance(stamp, float) or not isinstance(bundle, str):
            continue
        flag = fields.get(3)
        if not isinstance(flag, int):
            continue
        events.append((stamp + MAC_EPOCH, bundle, flag))
    return events


def pair_sessions(events: list[tuple[float, str, int]]) -> list[tuple[float, float]]:
    """Turn focus-change events into ``(start, end)`` intervals.

    Each bundle's ``flag == 1`` opens an interval that its next ``flag == 0``
    closes. Unclosed opens are dropped rather than guessed at: an interval is
    only produced where the stream explicitly recorded both ends.
    """
    open_at: dict[str, float] = {}
    spans: list[tuple[float, float]] = []
    for stamp, bundle, flag in sorted(events):
        if bundle in AMBIENT:
            continue
        if flag == 1:
            open_at[bundle] = stamp
        elif flag == 0:
            start = open_at.pop(bundle, None)
            if start is not None and 0 < stamp - start <= MAX_SESSION_S:
                spans.append((start, stamp))
    return spans


def read_biome(since: dt.date, dump: int = 0) -> list[tuple[float, float]]:
    segments = biome_segments()
    if not segments:
        hc.log(
            "note: no Biome App.InFocus segments found. iPhone screen time needs "
            "Screen Time sharing across devices enabled in Settings, plus Full "
            "Disk Access. Continuing with Mac usage only."
        )
        return []

    by_device: dict[str, list[tuple[float, str, int]]] = {}
    for device, path in segments:
        by_device.setdefault(device, []).extend(parse_segment(path))

    floor = dt.datetime.combine(since, dt.time.min).timestamp()
    horizon = dt.datetime.now().timestamp()
    spans: list[tuple[float, float]] = []

    for device, events in sorted(by_device.items()):
        if not events:
            continue
        if device == "local":
            # This Mac. knowledgeC.db already covers it from a documented
            # schema and records it more completely, so Biome would only
            # duplicate it.
            hc.log(f"  Biome {device}: Mac stream, skipped (knowledgeC.db covers it)")
            continue

        # Decide by share rather than by any single match: an iPhone that
        # happens to log one watch-ish bundle should not be discarded whole.
        # In practice the split is unambiguous — a watch is ~99% these, a
        # phone 0% — so the threshold never has to be delicate.
        watchish = sum(
            any(marker in bundle for marker in WATCH_MARKERS)
            for _, bundle, _ in events
        )
        if watchish > len(events) / 2:
            hc.log(
                f"  Biome {device}: Apple Watch "
                f"({watchish}/{len(events)} events), skipped"
            )
            continue

        paired = [
            (start, end) for start, end in pair_sessions(events)
            if start >= floor and end <= horizon
        ]
        spans.extend(paired)
        hc.log(
            f"  Biome {device}: {len(events)} events → {len(paired)} iPhone sessions"
        )

        if dump:
            for start, end in paired[:dump]:
                hc.log(
                    f"    {dt.datetime.fromtimestamp(start):%Y-%m-%d %H:%M:%S}"
                    f"  {(end - start) / 60:6.1f} min"
                )

    return spans


# --------------------------------------------------------------------------

def implausible(days: dict[str, dict]) -> list[str]:
    """Report ways the data cannot be describing real usage.

    A guard rather than a filter: the failures this catches mean the parse is
    wrong, and silently trimming them would bury that behind numbers that merely
    look reasonable.
    """
    today = hc.day_key(dt.date.today())
    problems: list[str] = []

    ahead = sorted(k for k in days if k > today)
    if ahead:
        problems.append(f"{len(ahead)} day(s) in the future, e.g. {ahead[:3]}")

    long_days = sorted((k, v["value"]) for k, v in days.items() if v["value"] > 24)
    if long_days:
        worst = max(long_days, key=lambda kv: kv[1])
        problems.append(
            f"{len(long_days)} day(s) over 24h, worst {worst[0]} at {worst[1]:.1f}h"
        )

    phone = [v.get("extra", {}).get("iphone_h", 0) for v in days.values()]
    active = [h for h in phone if h]
    if active and sorted(active)[len(active) // 2] > 12:
        problems.append(
            f"median iPhone usage {sorted(active)[len(active)//2]:.1f}h/day, "
            f"which is not credible"
        )
    return problems


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--days", type=int, default=120, help="how far back to read (default: 120)")
    ap.add_argument("--no-iphone", action="store_true",
                    help="skip the Biome streams and record Mac usage only")
    ap.add_argument("--dump-biome", type=int, default=0, metavar="N",
                    help="print the first N iPhone sessions the parser finds, then continue")
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

    problems = implausible(days)
    if problems:
        hc.log("\nRefusing to write — the data failed a sanity check:\n")
        for line in problems:
            hc.log(f"  {line}")
        hc.log(
            "\n  Nothing was written. Re-run with --no-iphone to record Mac usage\n"
            "  only, which is read from a documented schema and is trustworthy."
        )
        return 1

    source = "macOS + iPhone" if phone_by_day else "macOS"
    hc.write_habit(
        "screentime", "Screen time", source, "h",
        days, merge=not args.no_merge, data_dir=args.out_dir,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
