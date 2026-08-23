#!/usr/bin/env python3
"""Import sleep from an Apple Health export and emit the sleep habit file.

HealthKit is on-device only — there is no web API — so sleep arrives by
periodic manual export:

    iPhone → Health → your profile picture → Export All Health Data

That produces ``export.zip``. Point this script at the zip (or at the
extracted ``export.xml``) and it merges the sleep records into
``src/data/habits/sleep.json``, keeping everything imported previously.

Usage:
    python scripts/import_health.py ~/Downloads/export.zip
    python scripts/import_health.py ~/Downloads/apple_health_export/export.xml

The export runs to hundreds of megabytes, so the XML is streamed with
``iterparse`` and each element is released as it goes rather than building a
tree in memory.

Two details worth knowing:

* An iPhone and an Apple Watch both log the same night, so overlapping
  intervals are **unioned** before measuring — otherwise every night doubles.
* Each sleep block is filed under the date you *woke up*, which is how you'd
  naturally read "how did I sleep last night" off the heatmap.
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


def read_sleep_spans(handle) -> list[tuple[float, float]]:
    spans: list[tuple[float, float]] = []
    seen = 0
    for _event, elem in ET.iterparse(handle, events=("end",)):
        if elem.tag != "Record":
            continue
        if elem.get("type") == SLEEP_TYPE and elem.get("value") in ASLEEP_VALUES:
            start = parse_stamp(elem.get("startDate", ""))
            end = parse_stamp(elem.get("endDate", ""))
            if start and end and end > start:
                spans.append((start.timestamp(), end.timestamp()))
                seen += 1
        # Releasing each record keeps peak memory flat over a huge export.
        elem.clear()
    hc.log(f"  {seen} asleep records")
    return spans


def union(intervals: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Merge overlapping spans — an iPhone and a Watch both log the same night."""
    merged: list[tuple[float, float]] = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            if end > merged[-1][1]:
                merged[-1] = (merged[-1][0], end)
        else:
            merged.append((start, end))
    return merged


def to_days(spans: list[tuple[float, float]], since: dt.date) -> dict[str, dict]:
    """Total each merged span onto the local date it ended (the wake date)."""
    hours: dict[str, float] = {}
    for start, end in spans:
        woke = dt.datetime.fromtimestamp(end)
        if woke.date() < since:
            continue
        key = hc.day_key(woke)
        hours[key] = hours.get(key, 0.0) + (end - start) / 3600.0
    return {k: hc.day(v) for k, v in sorted(hours.items())}


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("export", help="path to export.zip, its folder, or export.xml")
    ap.add_argument("--days", type=int, default=730, help="ignore nights older than this (default: 730)")
    ap.add_argument("--out-dir", default=hc.DATA_DIR, help="habit JSON directory")
    ap.add_argument("--no-merge", action="store_true", help="rebuild instead of merging")
    args = ap.parse_args(argv)

    since = hc.days_ago(args.days)
    with open_export(args.export) as handle:
        spans = union(read_sleep_spans(handle))
    hc.log(f"  {len(spans)} distinct sleep blocks after merging overlaps")

    days = to_days(spans, since)
    if not days:
        hc.log("no sleep records found in the export — nothing written")
        return 1

    hc.write_habit(
        "sleep", "Sleep", "Apple Health", "h",
        days, merge=not args.no_merge, data_dir=args.out_dir,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
