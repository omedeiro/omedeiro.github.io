# Agent Instructions — owenmedeiros.com

Personal site built with Astro, deployed to Cloudflare Workers (static assets) at https://owenmedeiros.com.

## Commands

```bash
npm install
npm run dev       # local dev server
npm run build     # outputs to dist/
npm run preview   # preview production build
```

Deploys run automatically via Cloudflare Workers Builds on push to `main` (build command: `npm run build`; wrangler serves `dist/` as static assets).

## Structure

- `src/layouts/Base.astro` — site shell: nav, footer, all global CSS (single-column, minimal design)
- `src/layouts/Md.astro` — wrapper for markdown pages (renders `title` frontmatter as `<h1>`)
- `src/pages/` — all pages; markdown files use `layout: ../layouts/Md.astro` frontmatter
- `public/` — static assets (images, PDFs, `.m` files) served at root paths
- `wrangler.jsonc` — Cloudflare Worker config; custom domain `owenmedeiros.com`
- `astro.config.mjs` — redirects (`/contact`→`/about`, `/publications`→`/research`, `/thesis`→`/research`), math rendering (remark-math + rehype-katex)

## Adding pages

1. Create `src/pages/section/page-name.md` with frontmatter:
   ```yaml
   ---
   layout: ../../layouts/Md.astro   # depth-relative path
   title: Page Title
   ---
   ```
2. Images go in `public/section/` and are referenced with absolute paths (`/section/file.png`).
3. Add a link from the relevant index page (`src/pages/projects/index.md` etc.) — there is no auto-generated nav for content pages.

## Design rules

- Match darioamodei.com aesthetic: single ~42rem column, serif body, small sans-serif nav, no cards/grids/sidebars, no client-side JS.
- All styling lives in `Base.astro`; do not add per-page CSS files.
- **`/habits` is the sole exception**, deliberately and narrowly: it passes `wide` to `Base` for a 52rem column (five heatmaps do not fit in 42rem) and carries an `is:inline` script for the heatmap tooltip. Every other page stays 42rem and JS-free. Do not generalise either exception without asking.
- LaTeX math works in markdown via `$...$` / `$$...$$` (KaTeX CSS loaded from CDN).

## Content guidelines

**Never invent personal details:**
- No biographical filler ("passionate developer...")
- No assumed career history or education
- Stick to documented projects and technical facts
- If personal content is needed, ask the user

**Prefer concise technical content:** direct statements, specific tech details, real implementation notes.

## Habits

`/habits` renders five heatmaps from one JSON file per habit in `src/data/habits/`,
all sharing the same shape (`days: {"YYYY-MM-DD": {value, extra?}}`). The page buckets
each habit against **its own** quartiles, so unlike metrics share one five-step ramp.

Only two sources have web APIs. Apple has none for either Screen Time or Health —
`DeviceActivity` is sandboxed so usage data never leaves the device, and HealthKit is
on-device only — so those two arrive by periodic local export.

| Habit | Script | Refresh |
|---|---|---|
| Running, Stretching | `scripts/fetch_strava.py` | nightly, automatic |
| Commits | `scripts/fetch_github.py` | nightly, automatic |
| Screen time | `scripts/fetch_screentime.py` | manual, on the Mac |
| Sleep | `scripts/import_health.py` | manual, after a Health export |

All scripts are standard-library only (no pip install) and **merge** into the existing
JSON rather than overwriting it. That is load-bearing for screen time: macOS prunes
`knowledgeC.db` to roughly four weeks, so an overwriting write would destroy history.

`.github/workflows/habits.yml` runs the two API scripts nightly and commits
`src/data/habits/` straight to `main`, which triggers the usual Cloudflare deploy. This
is a deliberate, path-scoped exception to the never-commit-to-`main` rule below — it
applies to automated data commits only, never to code. The job skips the commit when
only `updated_at` changed, so a quiet day does not trigger a pointless redeploy.

### One-time setup

1. **Strava** — create an app at <https://www.strava.com/settings/api>, then
   `python scripts/fetch_strava.py --auth` and follow the prompts. Tokens land in
   `scripts/.env` (gitignored).
2. **GitHub** — create a classic PAT with `read:user`. For private contributions also
   add `repo` and enable Settings → Profile → "Include private contributions".
3. **Repository secrets** — add `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`,
   `STRAVA_REFRESH_TOKEN`, and `GH_CONTRIB_TOKEN`. Optionally add `GH_ADMIN_TOKEN`
   (a PAT with `secrets:write`) so the workflow can store rotated Strava tokens itself;
   without it the job warns and you update `STRAVA_REFRESH_TOKEN` by hand.
4. **Screen time** — grant Full Disk Access to your terminal in System Settings →
   Privacy & Security, restart it, then run `python scripts/fetch_screentime.py` every
   week or two and commit the result.
5. **Sleep** — on iPhone: Health → profile → Export All Health Data, then
   `python scripts/import_health.py ~/Downloads/export.zip` and commit.

## Publications

`src/pages/research.md` holds a static publications list. `references.bib` and `scripts/fetch_scholar.py` are kept for regenerating entries; update the markdown manually when new papers appear.

## Release / PR workflow (agent-driven changes)

All non-trivial changes (content edits, new pages, config changes) follow this process:

1. **Branch** — never commit directly to `main`. Create `feature/<short-slug>` from an up-to-date `main`.
2. **Version bump** — update `"version"` in `package.json` (semver). **Default to a patch bump** for most changes (content tweaks, link/copy edits, asset updates). Use minor for new pages/features, major only for site-wide redesigns or migrations.
3. **Changelog** — add a `## x.y.z — YYYY-MM-DD` entry at the top of `CHANGELOG.md` with `### Added` / `### Changed` / `### Removed` subsections as applicable.
4. **Verify** — run `npm run build` and confirm it succeeds.
5. **Commit** — one commit including the change, version bump, and changelog. Concise imperative subject line.
6. **PR** — push the branch and open a PR with `gh pr create` (summary of what/why).
7. **Merge** — use a **merge commit** (`gh pr merge --merge --delete-branch`), matching repo history. Then `git checkout main && git pull`.

Deploys to production happen automatically on merge to `main` via Cloudflare Workers Builds.

## Git LFS

PDFs tracked via LFS (`.gitattributes`). If pushing fails with "git-lfs not found":
```bash
git lfs install
git push
```
