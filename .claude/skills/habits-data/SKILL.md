---
name: habits-data
description: How the /habits data pipeline works in this repo — the fetch scripts, the merge-on-write JSON contract, and the local Apple data sources (knowledgeC.db, Biome SEGB streams, Apple Health export). Load before touching anything in scripts/ that writes src/data/habits/, before debugging screen time, stretching, sleep, running, or commit numbers, and before investigating where iPhone or Mac usage data lives on disk. Records dead ends that have already been searched so they are not searched again.
---

# Habits data pipeline

Five habits feed `/habits`, one JSON file each in `src/data/habits/`. All fetch
scripts are **standard library only** — no pip install — so the nightly job
cannot break on a dependency release. Read `AGENTS.md` for the runbook; this
skill covers what is expensive to rediscover.

## Which scripts run where

| Habit | Script | Where |
|---|---|---|
| Running | `fetch_strava.py` | CI, nightly |
| Commits | `fetch_github.py` | CI, nightly |
| Screen time | `fetch_screentime.py` | **Mac only** — LaunchAgent, daily 23:00 |
| Stretching, Sleep | `import_health.py` | **Mac only** — manual, after a Health export |

The three local ones read Apple data no CI runner can reach. Do not try to move
them into `.github/workflows/habits.yml`.

## The JSON contract

`habits_common.write_habit` **merges** by default. This is load-bearing:
`knowledgeC.db` and Biome are both pruned to roughly four weeks, so an
overwriting write would silently drop every older day. Never pass
`merge=False` to "clean up" a file.

`habits_common.day()` drops falsy extras to keep diffs small, so a day with no
Mac usage has no `mac_h` key at all. That is not missing data.

## Screen time: where the data actually is

**Mac** — `~/Library/Application Support/Knowledge/knowledgeC.db`, `ZOBJECT`
rows with `ZSTREAMNAME = '/app/usage'`. Documented schema, trustworthy.

**iPhone** — `~/Library/Biome/streams/restricted/App.InFocus/remote/<uuid>/`,
`SEGB` binary segments synced over iCloud. Near-live: records show up within
minutes of the phone being used.

### Dead ends — already searched, do not repeat

Screen Time's cross-device store is **not on the Mac**:

- No `RMAdminStore-*.sqlite` anywhere under `$HOME` (searched with Full Disk
  Access confirmed by a control query) and none in `/private/var/db`.
- No ScreenTimeAgent daemon container. `webContentRestrictions.sqlite` lives in
  the `com.apple.ciphermld` container and is unrelated.
- `com.apple.RemoteManagementAgent/Database/` is MDM configuration, not usage.
- `knowledgeC.db` is Mac-only in practice. Turning on "Share Across Devices"
  registers the phone in `ZSYNCPEER`, but **no `/app/*` row is ever attributed
  to it** — every one has a NULL `ZSOURCE`. The Screen Time UI assembles the
  cross-device view from CloudKit on demand.

The one untried route is a local iPhone backup, which contains the phone's own
Screen Time store with far deeper history than Biome's ~4 weeks. It needs a
backup to exist first (`~/Library/Application Support/MobileSync/Backup/`).

### SEGB format

32-byte file header, then records of
`[4-byte CRC][4-byte state][protobuf][zero pad to 4]`.

- Header offset 0 is `SEGB`; offset 4 is the **record count** — a free check
  that a parse is complete.
- Find records by scanning 4-aligned offsets for `state == 0x0A`. Do **not**
  walk by length: a payload ending on a 4-byte boundary has no padding, so a
  walker runs into the next record's CRC and desyncs, losing ~80% of records.
- Protobuf fields used: 3 = focus flag (1 enter, 0 leave), 4 = timestamp as a
  Mac-epoch double (add 978307200), 6 = bundle id. Also present: 1 transition
  reason, 9 app version, 10 build.

### Three traps that produced garbage before

1. **`tombstone/` directories are sync bookkeeping, not usage.** They contain
   segment ids and `biomesyncd`, no bundle ids. Reading them pairs deletion
   timestamps into fake sessions — the source of the "2033 dates and 26-hour
   days" failure. Filter on the path component, not on the filename.
2. **StandBy is not screen time.** `com.apple.springboard.stand-by` — the
   charging clock face — is logged like an app and is roughly a third of the
   raw total. See `AMBIENT`. Apple excludes it.
3. **A synced Apple Watch looks exactly like a synced iPhone.** Both are
   `remote/<uuid>/`; the UUID says nothing. Separate them by bundle id share
   (`WATCH_MARKERS`), not by any single match.

Intervals must come from explicit enter/leave pairs. An unclosed session is
dropped, never guessed at — that is what keeps a wrong parse loud instead of
plausible. `implausible()` gates every write on future dates, >24h days, and an
absurd median; if it fires, the parse is wrong. Report it, do not trim outliers
until the numbers look reasonable.

### Sanity checks that actually validate a change

- Header record count == number of records parsed.
- Parsing this Mac's own `local/` Biome stream should roughly agree with
  `knowledgeC.db` session counts over the same window (1163 vs 1080 when this
  was last checked) — two unrelated formats, one answer.
- A synthetic `SEGB` segment with known contents round-trips.

## Full Disk Access

Granted **per application**, to the binary that opens the file. Consequences:

- An agent running under a different app than Terminal does **not** inherit
  Terminal's grant. Check what owns the shell before concluding a grant failed.
- TCC attributes access to the *responsible* parent app, so a `python3` spawned
  by another app is judged by that app, not by `/usr/bin/python3`.
- The LaunchAgent therefore invokes `/usr/bin/python3` directly rather than via
  a shell — granting FDA to `/bin/sh` would extend it to every shell script.
- A denial raises `sqlite3.DatabaseError` ("authorization denied"), **not**
  `OperationalError`. Catch the parent class or the FDA hint never prints.

## Daily automation

`scripts/screentime_daily.py`, run by
`~/Library/LaunchAgents/com.owenmedeiros.screentime.plist` at 23:00, logging to
`~/Library/Logs/screentime-daily.log`. It collects on any branch (a skipped day
is lost for good) but commits only on `main`, only `screentime.json`, via a
path-limited commit, and never mid-rebase or mid-merge.

Test it without waiting:
`launchctl kickstart -p gui/$(id -u)/com.owenmedeiros.screentime`
