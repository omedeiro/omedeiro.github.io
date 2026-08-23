#!/usr/bin/env python3
"""Merge hand-recorded Bend sessions into the stretching habit file.

Bend's Apple Health connection only writes sessions from the day it was
switched on — it does not backfill. Anything before that exists solely in the
app's own Recent History screen, so it has to be transcribed by hand into
``scripts/bend-history.csv`` and merged in here.

This is additive: ``import_health.py`` covers everything from the sync date
onward, and both write into the same ``stretching.json`` through the shared
merge logic. Backfilled days are tagged ``"backfilled": true`` so it stays
obvious which came from the app's history rather than from HealthKit.

The habit is measured in **sessions per day**, not minutes: Bend's history
screen does not show session length, and counting sessions means the
backfilled stretch of the calendar is recorded rather than estimated.

Usage:
    python scripts/backfill_stretching.py
    python scripts/backfill_stretching.py --dry-run
"""

from __future__ import annotations

import argparse
import csv
import os
import sys

import habits_common as hc

HISTORY_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bend-history.csv")


def read_history(path: str) -> list[dict[str, str]]:
    """Read the CSV, skipping the `#` comment lines it is annotated with."""
    if not os.path.exists(path):
        raise SystemExit(f"no such file: {path}")
    with open(path, encoding="utf-8") as fh:
        lines = [ln for ln in fh if not ln.lstrip().startswith("#")]
    return [row for row in csv.DictReader(lines) if (row.get("date") or "").strip()]


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--csv", default=HISTORY_CSV, help="history file (default: scripts/bend-history.csv)")
    ap.add_argument("--out-dir", default=hc.DATA_DIR, help="habit JSON directory")
    ap.add_argument("--dry-run", action="store_true", help="report what would be written, then stop")
    args = ap.parse_args(argv)

    rows = read_history(args.csv)
    if not rows:
        raise SystemExit(f"{args.csv} has no data rows")

    # Two rows sharing a date are two sessions that day.
    counts: dict[str, int] = {}
    routines: dict[str, list[str]] = {}
    for row in rows:
        date = row["date"].strip()
        counts[date] = counts.get(date, 0) + 1
        routines.setdefault(date, []).append((row.get("routine") or "").strip() or "unknown")

    days = {
        date: hc.day(count, routines=", ".join(sorted(set(routines[date]))), backfilled=True)
        for date, count in sorted(counts.items())
    }

    if args.dry_run:
        for date, rec in days.items():
            hc.log(f"  {date}  {int(rec['value'])} session(s)  {rec['extra']['routines']}")
        hc.log(f"\n(dry run — {len(days)} days, nothing written)")
        return 0

    hc.write_habit("stretching", "Stretching", "Bend", "sessions", days,
                   merge=True, data_dir=args.out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
