#!/usr/bin/env python3
"""Import sleep and stretching from an Apple Health export.

HealthKit is on-device only — there is no web API — and neither is there one
for the Bend stretching app, which syncs its sessions into Apple Health. Both
habits therefore arrive by periodic manual export:

    iPhone → Health → your profile picture → Export All Health Data

That produces ``export.zip``. Point this script at it and one pass over the
XML fills in both habits:

* ``sleep.json``      — hours asleep per night, from sleep analysis records
* ``stretching.json`` — minutes per day, from Bend's workout records

Usage:
    python scripts/import_health.py ~/Downloads/export.zip
    python scripts/import_health.py ~/Downloads/apple_health_export/export.xml
    python scripts/import_health.py export.zip --list-sources   # see what's inside

The export runs to hundreds of megabytes, so the XML is streamed with
``iterparse`` and each element is released as it goes rather than building a
tree in memory.

Three details worth knowing:

* An iPhone and an Apple Watch both log the same night, so overlapping
  intervals are **unioned** before measuring — otherwise every night doubles.
* Each sleep block is filed under the date you *woke up*, which is how you'd
  naturally read "how did I sleep last night" off the heatmap.
* Stretching is matched on the workout's **source name** rather than its
  activity type, since Bend has logged sessions as Flexibility, Yoga, and
  Mind & Body at different points. ``--list-sources`` prints what a given
  export actually contains if the match ever comes up empty.
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import sys
import zipfile
from xml.etree import ElementTree as ET

import habits_common as hc

SLEEP_TYPE = "HKCategoryTypeIdentifierSleepAnalysis"

# "InBed" overlaps the asleep stages and "Awake" is time awake in bed; counting
# either would overstate the night.
ASLEEP_VALUES = {
    "HKCategoryValueSleepAnalysisAsleep",
    "HKCategoryValueSleepAnalysisAsleepUnspecified",
    "HKCategoryValueSleepAnalysisAsleepCore",
    "HKCategoryValueSleepAnalysisAsleepDeep",
    "HKCategoryValueSleepAnalysisAsleepREM",
}

DEFAULT_STRETCH_SOURCE = "Bend"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S %z"


def parse_stamp(raw: str) -> dt.datetime | None:
    try:
        return dt.datetime.strptime(raw, DATE_FORMAT)
    except (ValueError, TypeError):
        return None


def open_export(path: str):
    """Yield a file object for export.xml, whether given a zip, dir, or the xml."""
    path = os.path.expanduser(path)
    if not os.path.exists(path):
        raise SystemExit(f"no such file: {path}")

    if zipfile.is_zipfile(path):
        archive = zipfile.ZipFile(path)
        names = [n for n in archive.namelist() if n.endswith("export.xml")]
        if not names:
            raise SystemExit(f"{path} contains no export.xml")
        hc.log(f"reading {names[0]} from {os.path.basename(path)}")
        return archive.open(names[0])

    if os.path.isdir(path):
        candidate = os.path.join(path, "export.xml")
        if not os.path.exists(candidate):
            raise SystemExit(f"no export.xml in {path}")
        path = candidate

    hc.log(f"reading {path}")
    return open(path, "rb")


def scan(handle, stretch_source: str):
    """Single streaming pass collecting sleep spans, stretch spans, and sources.

    The export is far too large to walk more than once, so both habits and the
    diagnostic source inventory come out of the same traversal.
    """
    sleep_spans: list[tuple[float, float]] = []
    stretch_spans: list[tuple[float, float]] = []
    workout_sources: dict[str, int] = {}
    needle = stretch_source.casefold()

    for _event, elem in ET.iterparse(handle, events=("end",)):
        tag = elem.tag

        if tag == "Record":
            if elem.get("type") == SLEEP_TYPE and elem.get("value") in ASLEEP_VALUES:
                start = parse_stamp(elem.get("startDate", ""))
                end = parse_stamp(elem.get("endDate", ""))
                if start and end and end > start:
                    sleep_spans.append((start.timestamp(), end.timestamp()))

        elif tag == "Workout":
            source = elem.get("sourceName", "") or "(unnamed)"
            activity = elem.get("workoutActivityType", "") or "(none)"
            workout_sources[f"{source} — {activity}"] = workout_sources.get(f"{source} — {activity}", 0) + 1
            # Matching on source, not activity type: Bend has filed sessions
            # under Flexibility, Yoga, and Mind & Body across versions.
            if needle in source.casefold():
                start = parse_stamp(elem.get("startDate", ""))
                end = parse_stamp(elem.get("endDate", ""))
                if start and end and end > start:
                    stretch_spans.append((start.timestamp(), end.timestamp()))

        # Releasing each element keeps peak memory flat over a huge export.
        elem.clear()

    return sleep_spans, stretch_spans, workout_sources


def union(intervals: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Merge overlapping spans.

    Distinct sessions don't overlap, so they still add up; what this removes is
    the duplicate records two devices write for the same activity.
    """
    merged: list[tuple[float, float]] = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            if end > merged[-1][1]:
                merged[-1] = (merged[-1][0], end)
        else:
            merged.append((start, end))
    return merged


def sleep_days(spans: list[tuple[float, float]], since: dt.date) -> dict[str, dict]:
    """Total each merged span onto the local date it ended (the wake date)."""
    hours: dict[str, float] = {}
    for start, end in spans:
        woke = dt.datetime.fromtimestamp(end)
        if woke.date() < since:
            continue
        key = hc.day_key(woke)
        hours[key] = hours.get(key, 0.0) + (end - start) / 3600.0
    return {k: hc.day(v) for k, v in sorted(hours.items())}


def stretch_days(spans: list[tuple[float, float]], since: dt.date) -> dict[str, dict]:
    """Total each session onto its local start date, in minutes."""
    minutes: dict[str, float] = {}
    counts: dict[str, int] = {}
    for start, end in spans:
        began = dt.datetime.fromtimestamp(start)
        if began.date() < since:
            continue
        key = hc.day_key(began)
        minutes[key] = minutes.get(key, 0.0) + (end - start) / 60.0
        counts[key] = counts.get(key, 0) + 1
    return {
        k: hc.day(v, moving_time_s=int(v * 60), count=counts[k])
        for k, v in sorted(minutes.items())
    }


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("export", help="path to export.zip, its folder, or export.xml")
    ap.add_argument("--days", type=int, default=730, help="ignore records older than this (default: 730)")
    ap.add_argument("--stretch-source", default=DEFAULT_STRETCH_SOURCE,
                    help=f"workout source name to count as stretching (default: {DEFAULT_STRETCH_SOURCE})")
    ap.add_argument("--list-sources", action="store_true",
                    help="print every workout source/type in the export and exit")
    ap.add_argument("--out-dir", default=hc.DATA_DIR, help="habit JSON directory")
    ap.add_argument("--no-merge", action="store_true", help="rebuild instead of merging")
    args = ap.parse_args(argv)

    since = hc.days_ago(args.days)
    with open_export(args.export) as handle:
        sleep_spans, stretch_spans, sources = scan(handle, args.stretch_source)

    if args.list_sources:
        if not sources:
            print("No workouts found in this export.")
            return 1
        print("Workout sources in this export (use one with --stretch-source):\n")
        for name, count in sorted(sources.items(), key=lambda kv: -kv[1]):
            print(f"  {count:6d}  {name}")
        return 0

    hc.log(f"  {len(sleep_spans)} asleep records, {len(stretch_spans)} '{args.stretch_source}' workouts")

    wrote = 0
    merge = not args.no_merge

    sleep = sleep_days(union(sleep_spans), since)
    if sleep:
        hc.write_habit("sleep", "Sleep", "Apple Health", "h", sleep,
                       merge=merge, data_dir=args.out_dir)
        wrote += 1
    else:
        hc.log("no sleep records in range — sleep.json left alone")

    stretching = stretch_days(union(stretch_spans), since)
    if stretching:
        hc.write_habit("stretching", "Stretching", args.stretch_source, "min", stretching,
                       merge=merge, data_dir=args.out_dir)
        wrote += 1
    else:
        hc.log(
            f"no workouts from '{args.stretch_source}' in range — stretching.json left alone.\n"
            f"  Run with --list-sources to see what this export actually contains."
        )

    return 0 if wrote else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
