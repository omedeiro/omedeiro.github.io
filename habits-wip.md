# Habits page — work in progress

Build a "Habits" tab (nav item `/habits`) showing Strava activity as a GitHub-style heatmap.

## Decisions (confirmed)

- Heatmap metric: **distance intensity** — 5 levels (none → light → dark), cells bucketed by quartiles of active days.
- Activity scope: **Run + Ride only** (filtered in the fetch script; `--types` override allowed).
- Data refresh: **manual** — run `scripts/fetch_strava.py`, commit the generated `src/data/strava.json`. (Site is static on Cloudflare; data is baked in at build time.)
- Page renders the heatmap as **server-rendered SVG** in an `.astro` page — no client-side JS, consistent with site design rules.

## Files

- New: `scripts/fetch_strava.py` — stravalib fetch script (mirror `scripts/fetch_scholar.py` style)
- New: `src/data/strava.json` — committed build-time data
- New: `src/pages/habits.astro` — the page (uses `Base` layout)
- Edit: `src/layouts/Base.astro` — add nav link + heatmap CSS
- Edit: `package.json` — bump to `2.1.0` (minor)
- Edit: `CHANGELOG.md` — `## 2.1.0 — 2026-08-08`
- Edit: `.gitignore` — add `scripts/.env`

## Script requirements (`scripts/fetch_strava.py`)

- Read `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN` from env or `scripts/.env` (hand-rolled parser, no dotenv dep).
- `--auth`: print OAuth URL; exchange pasted callback code for access + refresh tokens; save to `scripts/.env`.
- Refresh token via `client.refresh_access_token(...)`; persist rotated refresh token.
- `client.get_activities(after=<now - N days>)` (default `--days 730`), `--limit` for testing.
- Per-activity record: `{date, type, distance_m, moving_time_s, elapsed_time_s, elevation_gain_m}`.
- Per-day sums: `days: { "YYYY-MM-DD": {distance_m, moving_time_s, count} }`.
- Output JSON: `{updated_at, window_days, activities[], days{}}`.
- `pip install stravalib` (stravalib 2.x — raw SI values: distance in meters, times in seconds).

## Strava setup (user, once)

1. Create API app at https://www.strava.com/settings/api (Client ID + Secret).
2. `python scripts/fetch_strava.py --auth` → authorize → paste code.
3. `python scripts/fetch_strava.py` to populate `src/data/strava.json`.

## Page content (`src/pages/habits.astro`)

- Intro line.
- 52-week heatmap SVG: columns = weeks (Mon–Sun), cells 10px / 2px gap, empty = `var(--border)`, fills = `var(--accent)` at opacity levels → dark-mode aware.
- Month labels + "Less → More" legend.
- Stats: activities, total distance (km), moving time (h), active days, current streak, longest streak.
- Per-type breakdown (runs vs rides).
- Graceful empty-state text if no data yet.

## Release (per AGENTS.md)

- Branch `feature/habits-page` from up-to-date `main`. NOTE: `main` is behind — the v2.0.1 commit (`cc71a38`) is only on `feature/remove-homepage-app-links`. Merge that first so the 2.1.0 changelog entry sits on top of 2.0.1.
- Single commit (page + script + data + version + changelog), PR, `gh pr merge --merge --delete-branch`, then `git checkout main && git pull`.
- Verify: `npm run build` succeeds.
