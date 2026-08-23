# Changelog

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
