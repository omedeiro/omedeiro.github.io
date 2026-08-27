# Changelog

## 2.3.0 — 2026-08-27

### Added

- `/philosophy` — quotes collected from my journal, sorted into Work, Life and Politics. Carried over from the old MyST `philosophy/` markdown, where most of them sat commented out. The page is a **draft**: it builds and is reachable at its URL, but it is not in the nav and carries `noindex, nofollow`
- A `noindex` prop on `Base.astro`, settable from markdown frontmatter through `Md.astro`. Emits `<meta name="robots" content="noindex, nofollow">` so an unlisted draft stays out of search results

## 2.1.5 — 2026-08-25

### Fixed

- Missing space before several links on the home page ("work developed<a>", "and some<a>", "publications</a>,<a>"). Astro's HTML compressor drops whitespace-only runs that span a newline, so any link the source starts on its own line lost the space in front of it. `compressHTML` is now off — the pages are small and JS-free, so keeping the authored whitespace costs less than reflowing prose around the compressor

## 2.1.4 — 2026-08-24

### Changed

- `/habits` tooltips latch open on tap: tapping a cell keeps it up, tapping it again dismisses it, and tapping another cell moves it there. Previously a tap showed the tooltip only while the finger was down, because a touch pointer is destroyed on release and fires `pointerleave` immediately after `pointerdown`.
- The tapped cell is outlined while its tooltip is open, since touch has no hover state to show which cell is being read.
- Dismissing on page scroll is replaced by dismissing on horizontal scroll of the chart, which is the case that actually leaves the tooltip misaligned. Vertical scroll needs no handling — the tooltip travels with the chart.

## 2.1.3 — 2026-08-23

### Fixed

- Empty `package.json`, committed in 2.1.2 by a version-bump one-liner that opened the file for writing before reading it. `main` could not build until this landed

### Added

- Full history on `/habits`: running back to 2019-01-01 (228 → 851 days) and commits to 2020-06-04 (275 → 418), re-fetched with a wider window. The chart no longer spans a hardcoded 104 weeks — it derives its span from the earliest day any habit holds, so older data stops being clipped as it accumulates
- `implausible_sleep()` in `import_health.py` — refuses to write when the median night is under three hours, the shape an Apple Watch worn for afternoon naps but not overnight produces. A guard, not a filter, matching `fetch_screentime.implausible()`

### Removed

- The sleep column. There is no night sleep data to show: `InBed` records stop 2024-09-20, sleep staging stops 2023-12-13, and the only two records since May 2026 are afternoon naps. The importers and `sleep.json` stay, so restoring the column is a one-line change once sleep tracking is on

### Changed

- `habits_daily.py` commits a habit file only if its own importer just wrote it. Previously it committed any change to those paths, so a hand-run import would have been auto-committed unreviewed

## 2.1.2 — 2026-08-23

### Added

- `scripts/import_shortcut_sleep.py` — merges sleep dropped into `iCloud Drive/habits/sleep/` by a scheduled iOS Shortcut. Apple Health has no API and no local store on the Mac (it syncs through CloudKit's private database, not as files), so the only route is a phone-side push; iCloud Drive is the one such surface readable without Full Disk Access. Reuses `import_health.sleep_days` and `union` so a night from a drop file and the same night from a Health export cannot disagree, and filters tagged `InBed`/`Awake` samples, which Apple files under the same sleep type as the asleep stages and which would otherwise overstate a night

### Changed

- `screentime_daily.py` becomes `habits_daily.py` and now collects screen time *and* sleep, independently — one failing does not stop the other — committing whichever habit files changed. The LaunchAgent is relabelled `com.owenmedeiros.habits`, logging to `~/Library/Logs/habits-daily.log`

## 2.1.1 — 2026-08-23

### Fixed

- iPhone screen time, which the previous release recorded as unusable. `read_biome` now parses the `SEGB` segments under `~/Library/Biome/streams/restricted/App.InFocus/` as protobuf records rather than sweeping the bytes for anything that decodes as a plausible timestamp. Three things were wrong, not one: `tombstone/` directories hold sync bookkeeping rather than usage and were being read as sessions; StandBy — the charging clock face — is logged like an app and was a third of the total; and a synced Apple Watch is indistinguishable from a synced iPhone by path alone. Real data now gives a 1.78 h/day median over 29 days, against the 18 h/day and 2033 dates the old heuristic produced
- `read_knowledge` catching only `sqlite3.OperationalError` when opening the database. A Full Disk Access denial raises the parent `DatabaseError`, so the one failure the FDA hint exists for produced an unhandled traceback instead

### Added

- `scripts/screentime_daily.py` and a `com.owenmedeiros.screentime` LaunchAgent — daily collection at 23:00, committing `screentime.json` to `main` only, path-limited and skipped mid-rebase. Runs under `/usr/bin/python3` so the Full Disk Access grant lands on that interpreter rather than on `/bin/sh` and every shell script with it

### Changed

- iPhone screen time is on by default; `--iphone` becomes `--no-iphone`. `implausible()` still gates every write

## 2.1.0 — 2026-08-23

### Added

- `/habits` page: five GitHub-style heatmaps (running, stretching, screen time, commits, sleep) as side-by-side vertical columns, newest week at the top, with a hover/tap tooltip showing that day's numbers and a summary table of totals and streaks
- `scripts/fetch_strava.py` — OAuth fetch for the running habit
- `scripts/fetch_github.py` — contribution calendar via the GitHub GraphQL API
- `scripts/fetch_screentime.py` — Mac and iPhone screen time from local `knowledgeC.db` and Biome data (Apple exposes no web API)
- `scripts/import_health.py` — stretching (from the Bend app) and sleep, in one pass over an Apple Health `export.zip`
- `scripts/backfill_stretching.py` and `scripts/bend-history.csv` — hand-recorded Bend sessions predating the Apple Health connection, which does not backfill
- `scripts/habits_common.py` — shared env parsing and merge-on-write habit file handling
- `.github/workflows/habits.yml` — nightly refresh of the Strava and GitHub habits, committing to `main` to trigger a deploy; warns and skips rather than failing when credentials are not yet configured
- Two years of running (227 days) and GitHub commit (273 days) history, plus three weeks of backfilled Bend sessions

### Changed

- `Base.astro` gains a `Habits` nav entry and an opt-in `wide` prop (52rem) used only by `/habits`
- `/habits` is the one page carrying client-side JS, for the heatmap tooltip

### Removed

- `habits-wip.md`, superseded by the implemented page

## 2.0.1 — 2026-07-25

### Removed

- budget.owenmedeiros.com and wedding.owenmedeiros.com links from the homepage "Live apps" section

## 2.0.0 — 2026-07-25

Complete rebuild: migrated from MyST/Jupyter Book on GitHub Pages to Astro on Cloudflare Workers.

### Added

- Astro static site with minimal single-column design (serif body, small sans-serif nav, dark-mode aware, no client-side JS)
- `src/layouts/Base.astro` (site shell + all global CSS) and `src/layouts/Md.astro` (markdown page wrapper)
- Cloudflare Workers deployment (`wrangler.jsonc`) serving `dist/` as static assets on the custom domain `owenmedeiros.com`
- "Live apps" section on the homepage linking grafana., budget., and wedding.owenmedeiros.com
- Redirects: `/contact` → `/about`, `/publications` → `/research`, `/thesis` → `/research`
- Custom 404 page
- KaTeX math rendering in markdown (remark-math + rehype-katex)

### Changed

- Content reorganized: Contact merged into About; Publications and both thesis abstracts combined into a single Research page; projects and maths pages ported to `src/pages/` with assets in `public/`
- Maths pages now show their figure at the top
- Homepage title changed to "Owen Medeiros — Technical Profile" and duplicate on-page name heading removed
- Publications converted from a `{cite}`-based bibliography to a static markdown list (sources kept in `references.bib`)
- TDGL animation GIF downscaled from 28 MB to 4.5 MB; QNN blog PDF (46 MB) split into two parts to fit the Workers 25 MiB asset limit

### Removed

- MyST/Jupyter Book tooling: `myst.yml`, `_toc.yml`, `_config.yml`, `requirements.txt`, `_build/`, `_static/`
- GitHub Pages deploy workflow (`.github/workflows/deploy.yml`) and `DEPLOYMENT.md`
- `old-html-site/` legacy site
