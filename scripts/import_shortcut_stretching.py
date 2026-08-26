#!/usr/bin/env python3
"""Merge Bend sessions dropped into iCloud Drive by an iOS Shortcut.

Bend has no public API — no developer access, no export endpoint, nothing
documented on bend.com — so the only way a session leaves the phone is through
Apple Health. Health in turn does not sync to the Mac: it moves between devices
through CloudKit's private database, not as files. A scheduled Shortcut writing
into iCloud Drive bridges the two, exactly as ``import_shortcut_sleep.py`` does
for sleep, because iCloud Drive *is* mirrored to
``~/Library/Mobile Documents/com~apple~CloudDocs/`` and needs no Full Disk
Access to read.

The shortcut writes one file per run into ``habits/stretching/`` (see AGENTS.md
for how to build it). Every file in the folder is re-read on every run and the
result recomputed, so re-running is idempotent and a shortcut whose window
overlaps the previous run's cannot double-count a session.

Three line formats are accepted, so the shortcut can use whichever is easiest
to produce from whatever Bend actually writes:

    2026-08-26T07:12:00-0400,2026-08-26T07:20:00-0400        # one session
    2026-08-26T07:12:00-0400,2026-08-26T07:20:00-0400,Wake Up # ... named
    2026-08-26,2                                             # a finished day

Spans are preferred. They go through the same union-then-count path as
``import_health.py``, so a session imported from a Shortcut and the same
session imported from a Health export produce the same number rather than two
subtly different ones.

Usage:
    python scripts/import_shortcut_stretching.py
    python scripts/import_shortcut_stretching.py --drop-dir ~/some/other/folder
"""

from __future__ import annotations

import argparse
import datetime as dt
import glob
import os
import sys

import habits_common as hc
import import_health as ih
from import_shortcut_sleep import parse_stamp

DROP_DIR = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/habits/stretching"
)

# A stretch is minutes, not hours. Anything longer is a workout that was
# mis-tagged or a span whose end stamp failed to parse into the same day;
# either way it is not a Bend routine, and letting it through would blow out
# the minutes shown in the tooltip.
MAX_SESSION_H = 3

# Bend tops out around a dozen short routines in a day even for an enthusiast.
# A larger count means the shortcut sent a running total rather than a daily
# one, which would climb forever; refuse it rather than record it.
MAX_SESSIONS_PER_DAY = 20


def parse_line(line: str) -> tuple[str, object] | None:
    """Classify one line as a session span or a finished day, or reject it."""
    line = line.strip().lstrip("﻿")
    if not line or line.startswith("#"):
        return None
    parts = [p.strip() for p in line.replace("\t", ",").split(",")]
    if len(parts) < 2:
        return None

    # A finished day: a bare date and a session count.
    try:
        count = float(parts[1])
    except ValueError:
        count = None
    if count is not None:
        try:
            dt.date.fromisoformat(parts[0])
        except ValueError:
            return None
        if count.is_integer() and 0 < count <= MAX_SESSIONS_PER_DAY:
            return ("day", (parts[0], int(count)))
        return None

    start, end = parse_stamp(parts[0]), parse_stamp(parts[1])
    if start is None or end is None or end <= start:
        return None
    if (end - start).total_seconds() > MAX_SESSION_H * 3600:
        return None
    label = parts[2] if len(parts) > 2 and parts[2] else ""
    return ("span", ((start.timestamp(), end.timestamp()), label))


def read_drop(drop_dir: str):
    """Return deduped session spans, their labels by day, and per-day counts."""
    spans: dict[tuple[float, float], str] = {}
    days: dict[str, int] = {}
    # README files are excluded deliberately: the folder documents its own
    # format, and worked examples in prose are one careless edit away from
    # being imported as real sessions.
    files = sorted(
        p for pattern in ("*.txt", "*.csv", "*.json")
        for p in glob.glob(os.path.join(drop_dir, pattern))
        if not os.path.basename(p).lower().startswith(("readme", "."))
    )
    if not files:
        return spans, days

    skipped = 0
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
            elif got[0] == "span":
                span, label = got[1]
                # Keyed on the exact span, so the same session arriving in two
                # overlapping shortcut runs collapses to one entry.
                if label or span not in spans:
                    spans[span] = label or spans.get(span, "")
            else:
                key, count = got[1]
                days[key] = max(days.get(key, 0), count)

    hc.log(
        f"  {len(files)} file(s): {len(spans)} session(s), "
        f"{len(days)} pre-counted day(s)"
        + (f", {skipped} line(s) unparsed" if skipped else "")
    )
    return spans, days


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

    hc.log(f"reading stretching drops from {drop_dir}")
    spans, counted = read_drop(drop_dir)
    if not spans and not counted:
        hc.log("nothing to import")
        return 1

    since = hc.days_ago(args.days)
    # union() before counting, matching import_health.py: it collapses the
    # duplicate records two devices write for one session without merging
    # genuinely separate routines, which never overlap.
    merged = ih.union(list(spans))
    days = ih.stretch_days(merged, since)

    # Routine names ride along for the tooltip. They are attached after the
    # counting rather than during it so the session totals stay byte-identical
    # to what a Health export of the same sessions would produce.
    labels: dict[str, list[str]] = {}
    for (start, _end), label in sorted(spans.items()):
        if not label:
            continue
        key = hc.day_key(dt.datetime.fromtimestamp(start))
        if key in days and label not in labels.setdefault(key, []):
            labels[key].append(label)
    for key, names in labels.items():
        days[key].setdefault("extra", {})["routines"] = ", ".join(names)

    # Pre-counted days only fill dates the spans did not already cover, so a
    # shortcut that sends both forms cannot count a day twice.
    floor = hc.day_key(dt.datetime.combine(since, dt.time.min))
    for key, count in sorted(counted.items()):
        if key >= floor and key not in days:
            days[key] = hc.day(count)

    if not days:
        hc.log("no sessions in range — stretching.json left alone")
        return 1

    hc.write_habit(
        "stretching", "Stretching", "Bend", "sessions",
        days, merge=True, data_dir=args.out_dir,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
