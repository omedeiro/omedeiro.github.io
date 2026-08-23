# The habits pipeline

A review of how `/habits` gets its data, written 2026-08-23 after rebuilding the
screen-time half. Covers what each pipeline does, which parts are trustworthy,
which are fragile, and what is worth doing next.

`AGENTS.md` is the operational runbook — how to run things, and the on-disk
details of the Apple data sources. This is the architectural view.

## What feeds the page

| Habit | Source | Transport | Schedule | Retention at source | State |
|---|---|---|---|---|---|
| Running | Strava | OAuth web API | CI, nightly | full history | 851 days, from 2019-01-01 |
| Commits | GitHub | GraphQL contributions API | CI, nightly | full history | 418 days, from 2020-06-04 |
| Screen time | `knowledgeC.db` + Biome | local files on the Mac | LaunchAgent, daily | **~28 days** | 29 days |
| Stretching | Bend | hand-entered CSV | manual | n/a | 19 days |
| Sleep | Apple Health | export, or Shortcut drop | manual / LaunchAgent | ~unlimited | **none — column removed** |

Three transports, in descending order of reliability: a web API anyone can
call, a local file only this Mac can read, and a human moving data by hand.

## The shared contract

One JSON file per habit in `src/data/habits/`, all the same shape:

```json
{ "id": "running", "label": "Running", "source": "Strava", "unit": "km",
  "updated_at": "...", "days": { "2026-08-22": { "value": 8.4, "extra": {...} } } }
```

`value` is what the heatmap buckets on; `extra` is free-form detail for the
tooltip. Three properties of `habits_common` matter more than they look:

- **Writes merge by default.** Load-bearing, not a convenience. Screen time's
  sources retain about four weeks, so an overwriting write would silently
  discard every older day. The JSON file *is* the archive; nothing else holds
  that history.
- **Falsy extras are dropped**, so a day with no Mac usage has no `mac_h` key.
  Not missing data.
- **Standard library only.** No `pip install` anywhere, so the nightly job
  cannot break on a dependency release and the LaunchAgent can run under
  `/usr/bin/python3` rather than a conda environment.

## Pipeline by pipeline

### Running and commits — solid

Both call a documented web API with a token, chunk their queries, and merge.
`fetch_github.py` splits into 364-day windows because `contributionsCollection`
caps at a year; `fetch_strava.py` paginates. Both run in CI, and the workflow
warns and skips rather than failing when a credential is missing.

Nothing here is clever, which is the point. These are the two habits that can
be re-fetched from scratch at any time.

### Screen time — sound, but only as durable as this Mac

Two sources, unioned per day:

- **Mac** — `knowledgeC.db`, `ZOBJECT` rows with `ZSTREAMNAME = '/app/usage'`.
  A documented schema.
- **iPhone** — `SEGB` segments under
  `~/Library/Biome/streams/restricted/App.InFocus/remote/<uuid>/`, parsed as
  protobuf records. Reverse-engineered; see `AGENTS.md` for the layout.

This is the fragile one, and it is worth being explicit about why it is
nonetheless trustworthy today:

- The segment header carries a record count, so a complete parse is checkable
  against the file itself.
- Intervals come only from explicit enter/leave pairs. An unclosed session is
  dropped rather than guessed at, which keeps a wrong parse loud instead of
  plausible.
- Parsing the Mac's *own* Biome stream gave 1163 sessions where `knowledgeC.db`
  independently reported 1080 over the same window — two unrelated formats
  agreeing.
- `implausible()` gates every write on future dates, days over 24 hours, and an
  absurd median.

An earlier version scanned the bytes for anything that decoded as a plausible
timestamp and reported an 18 h/day median with dates in 2033. The rewrite is
not just more careful; it fails differently. That distinction is the whole
design.

### Stretching — manual, and currently stalled

Counted in sessions per day rather than minutes, so days backfilled from Bend's
history screen sit on the same scale as days measured through HealthKit, with
nothing estimated.

Bend is **not** currently syncing to Apple Health — a fresh export lists Strava,
Apple Watch, and Slopes, and no Bend at all. So stretching comes only from
`bend-history.csv`, which is why it stops at 2026-08-22.

### Sleep — no data, column removed

The importers work; the data does not exist. `InBed` records stop 2024-09-20,
REM/Deep staging stops 2023-12-13, and the only records since May 2026 start
mid-afternoon — naps. Importing them produced a 1.5 h/night median, so
`implausible_sleep()` now refuses a median under three hours.

Both routes remain wired: a full Health export (`import_health.py`) and a
scheduled iOS Shortcut dropping spans into iCloud Drive
(`import_shortcut_sleep.py`). Restoring the column is one `HABITS` entry in
`habits.astro` once sleep tracking is enabled on the phone.

## Principles that earned their place

Each of these exists because its absence produced wrong numbers:

- **Union, don't sum.** Overlapping app sessions are one wall-clock minute.
- **Guard, don't filter.** `implausible()` and `implausible_sleep()` refuse to
  write and say why. Trimming outliers until numbers look reasonable would hide
  the parse bug that produced them.
- **Explicit pairs only.** No interval without both ends recorded.
- **Exclude ambient.** StandBy is a third of raw iPhone time; `InBed` and
  `Awake` inflate sleep. Both are the device being present, not used.
- **Verify against a second source** wherever one exists.

## Known risks

1. **A lapse loses data permanently.** Screen time retains ~28 days at source.
   If the LaunchAgent stops — Mac off, Full Disk Access revoked by an OS
   update, repo moved — nothing notices, and those days cannot be recovered
   afterward from anywhere.
2. **No tests.** The `SEGB` parser is hand-reverse-engineered against an
   undocumented format Apple changes between releases. It will break silently
   one day, and `implausible()` only catches failures that produce absurd
   numbers, not ones that produce merely wrong numbers.
3. **The LaunchAgent's success path is unverified** as of writing. Its failure
   path is tested; a real run has not been observed end to end.
4. **Full Disk Access on `/usr/bin/python3` is a broad grant.** Narrower than
   `/bin/sh`, but any script run by that interpreter inherits it.
5. **Single machine, single copy.** The habit JSON in git is the only archive
   of screen-time history.
6. **All-or-nothing sanity gating.** One implausible day blocks the entire
   write, including the good days alongside it.

## Worth doing next

Roughly in order of value per effort.

1. **Regression tests for the `SEGB` parser.** A synthetic segment with known
   contents, asserting session lengths and that StandBy and unclosed sessions
   are dropped. This was written and run by hand during the rewrite but never
   committed; it is the single highest-value gap given risk 2.
2. **A staleness check.** Have the page — or the nightly workflow — flag when
   `screentime.json`'s newest day is more than a few days old. Cheap, and it
   converts risk 1 from silent to visible.
3. **Report which days failed the sanity check**, rather than only that some
   did. Keeps the refuse-don't-trim principle while making a single bad day
   diagnosable.
4. **Fix Bend → Apple Health sync**, which unblocks stretching without hand
   entry.
5. **Enable sleep tracking**, then restore the column. The pipeline is already
   built and tested on synthetic input.
6. **Surface the app breakdown.** The parser already reads bundle IDs, app
   versions, and build numbers, and throws all of it away. "3h 12m, mostly
   Safari" is a better tooltip than "3h 12m", at no parsing cost.
7. **Narrow the Full Disk Access grant** to a dedicated helper rather than the
   system Python.
8. **Reconsider the CI/local split.** Strava now has a connector available
   outside this repo; if habit collection ever moves off this Mac, the local
   Apple sources are the only genuinely machine-bound ones.
