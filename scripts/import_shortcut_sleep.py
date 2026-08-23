#!/usr/bin/env python3
"""Merge sleep dropped into iCloud Drive by an iOS Shortcut.

Apple Health has no API and does not sync to the Mac: it moves between devices
through CloudKit's private database, not as files, and macOS has no Health app
or local store. The only way health data reaches this machine is if something
on the phone puts it there. A scheduled Shortcut writing into iCloud Drive is
that something — iCloud Drive *is* mirrored to
``~/Library/Mobile Documents/com~apple~CloudDocs/``, and unlike Biome or
knowledgeC.db it needs no Full Disk Access to read.

The shortcut writes one file per run into ``habits/sleep/`` (see AGENTS.md for
how to build it). Every file in that folder is re-read on every run and the
result recomputed, so re-running is idempotent and a shortcut that writes the
same night twice cannot double-count it.

Two line formats are accepted, so the shortcut can use whichever is easier to
produce:

    2026-08-22T23:41:00-0400,2026-08-23T07:12:00-0400   # an asleep span
    2026-08-23,7.52                                     # a finished night

Spans are preferred. They go through the same union-then-file-by-wake-date
path as ``import_health.py``, so a night imported from a Shortcut and the same
night imported from a Health export produce the same number rather than two
subtly different ones.

Usage:
    python scripts/import_shortcut_sleep.py
    python scripts/import_shortcut_sleep.py --drop-dir ~/some/other/folder
"""

from __future__ import annotations

import argparse
import datetime as dt
import glob
import os
import sys

import habits_common as hc
import import_health as ih

DROP_DIR = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/habits/sleep"
)

# Formats the Shortcuts "Format Date" action can be told to emit, plus the one
# Apple's own Health export uses, so the two importers accept the same strings.
STAMP_FORMATS = (
    "%Y-%m-%dT%H:%M:%S%z",
    "%Y-%m-%d %H:%M:%S %z",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
)


def parse_stamp(raw: str) -> dt.datetime | None:
    raw = raw.strip().replace("Z", "+0000")
    # "+00:00" -> "+0000": %z only learned to accept the colon in 3.7, and the
    # colon form is what several Shortcuts date formats emit.
    if len(raw) > 6 and raw[-3] == ":" and raw[-6] in "+-":
        raw = raw[:-3] + raw[-2:]
    for fmt in STAMP_FORMATS:
        try:
            return dt.datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


# Substrings marking a sample as time in bed rather than asleep. Checked
# before the asleep markers because "AsleepUnspecified" and "InBed" can both
# appear in a single export and only one of them is sleep.
NOT_ASLEEP = ("inbed", "in bed", "awake")
ASLEEP = ("asleep", "core", "deep", "rem")


def is_asleep(category: str) -> bool:
    """Whether a sample category counts as sleep. Unlabelled spans are kept."""
    tag = category.strip().lower().replace("hkcategoryvaluesleepanalysis", "")
    if not tag:
        return True
    if any(m in tag for m in NOT_ASLEEP):
        return False
    return any(m in tag for m in ASLEEP)


def parse_line(line: str) -> tuple[str, object] | None:
    """Classify one line as a span or a finished night, or reject it."""
    line = line.strip().lstrip("﻿")
    if not line or line.startswith("#"):
        return None
    parts = [p.strip() for p in line.replace("\t", ",").split(",")]
    if len(parts) < 2:
        return None

    # A finished night: a bare date and a number of hours.
    try:
        hours = float(parts[1])
    except ValueError:
        hours = None
    if hours is not None:
        try:
            dt.date.fromisoformat(parts[0])
        except ValueError:
            return None
        if 0 < hours <= 24:
            return ("night", (parts[0], hours))
        return None

    if len(parts) > 2 and not is_asleep(parts[2]):
        return ("skip", None)

    start, end = parse_stamp(parts[0]), parse_stamp(parts[1])
    if start is None or end is None or end <= start:
        return None
    if (end - start).total_seconds() > 24 * 3600:
        return None
    return ("span", (start.timestamp(), end.timestamp()))


def read_drop(drop_dir: str) -> tuple[list[tuple[float, float]], dict[str, float]]:
    spans: list[tuple[float, float]] = []
    nights: dict[str, float] = {}
    # README files are excluded deliberately: the folder documents its own
    # format, and worked examples in prose are one careless edit away from
    # being imported as real nights.
    files = sorted(
        p for pattern in ("*.txt", "*.csv", "*.json")
        for p in glob.glob(os.path.join(drop_dir, pattern))
        if not os.path.basename(p).lower().startswith(("readme", "."))
    )
    if not files:
        return spans, nights

    skipped = in_bed = 0
    for path in files:
        try:
            with open(path, encoding="utf-8-sig", errors="replace") as fh:
                body = fh.read()
        except OSError as exc:
            hc.log(f"  cannot read {os.path.basename(path)} ({exc})")
            continue
        # Tolerate a shortcut that emits a JSON-ish array: the delimiters are
        # noise once the lines are parsed individually.
        for ch in "[]{}\"'":
            body = body.replace(ch, "")
        for line in body.splitlines():
            got = parse_line(line)
            if got is None:
                skipped += 1 if line.strip() else 0
            elif got[0] == "skip":
                in_bed += 1
            elif got[0] == "span":
                spans.append(got[1])
            else:
                key, hours = got[1]
                nights[key] = max(nights.get(key, 0.0), hours)

    hc.log(
        f"  {len(files)} file(s): {len(spans)} span(s), {len(nights)} "
        f"pre-totalled night(s)"
        + (f", {in_bed} in-bed/awake dropped" if in_bed else "")
        + (f", {skipped} line(s) unparsed" if skipped else "")
    )
    return spans, nights


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--drop-dir", default=DROP_DIR, help="iCloud Drive folder to read")
    ap.add_argument("--days", type=int, default=120, help="how far back to keep")
    ap.add_argument("--out-dir", default=hc.DATA_DIR, help="habit JSON directory")
    args = ap.parse_args(argv)

    drop_dir = os.path.expanduser(args.drop_dir)
    if not os.path.isdir(drop_dir):
        hc.log(f"note: {drop_dir} not found — no shortcut drop to import")
        return 1

    hc.log(f"reading sleep drops from {drop_dir}")
    spans, nights = read_drop(drop_dir)
    if not spans and not nights:
        hc.log("nothing to import")
        return 1

    since = hc.days_ago(args.days)
    days = ih.sleep_days(ih.union(spans), since)

    # Pre-totalled nights only fill dates the spans did not already cover, so a
    # shortcut that sends both forms cannot count a night twice.
    for key, hours in sorted(nights.items()):
        if key >= hc.day_key(dt.datetime.combine(since, dt.time.min)) and key not in days:
            days[key] = hc.day(hours)

    if not days:
        hc.log("no nights in range — sleep.json left alone")
        return 1

    hc.write_habit(
        "sleep", "Sleep", "Apple Health", "h",
        days, merge=True, data_dir=args.out_dir,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
