# Changelog

## 2.5.1 — 2026-08-30

### Added

- Every entry in the `/research` publications list is now a link, resolved to the publisher of record: DOIs (`doi.org`) for journal articles, `opg.optica.org` abstracts for the three CLEO papers, IEEE Xplore for the two conference papers without a findable DOI, arXiv for the two preprints, and the DSpace handles already used above for the two theses

### Changed

- The two theses duplicated in the publications list now point at the same MIT handles as the entries in the Theses section
- The 2026 Nature Electronics memory-array paper carries its final citation — 9, 69–77 — in place of the advance-online `1–9`

### Removed

- *Control of bulk superconductivity via surface-bound electric fields in ion-gated niobium nitride thin films* (Proc. 11th Conf. "Solid State Surfaces and Interfaces", 2020). The proceedings volume has no DOI or publisher record anywhere online, so the entry could not be linked like the rest. It remains in `references.bib`

## 2.5.0 — 2026-08-30

### Added

- `/maths/bertrand-paradox` is interactive. Four ways of drawing a chord at random — two points on the circle, a point along a random radius, a point anywhere in the disc, and the line through two interior points — each sampled live, with a **Compare all four** mode that puts them side by side. **Show → Midpoints** swaps each chord for its own midpoint, which is where the methods separate most clearly, and **Run** streams the sample in so the estimate can be watched settling
- `public/maths/bertrand-paradox.js` — the sampler. Every rotation-invariant method reduces to a density on `p`, the chord's distance from the centre, and the chord beats the triangle side exactly when `p < 1/2`; all four densities are known in closed form, so the strip under the circle draws the sampled histogram against the exact curve and shades the half whose area *is* the answer. Sampling runs off a seeded generator, one stream per method, so raising the count extends the sample rather than drawing an unrelated one
- A fourth method Bertrand did not list: the line through two uniform points in the disc. Pairs of interior points on a chord number as the cube of its length, so the induced density is `(16/3pi)(1-p^2)^(3/2)` and the answer is `1/3 + 3*sqrt(3)/(4*pi) ~ 0.7468`, checked against 4e6 Monte Carlo samples
- The page now says outright that the question has every answer in `(0,1)`, not three: `f(p) = (a+1)p^a` gives `P = (1/2)^(a+1)`, and two of Bertrand's own answers are already in that family. Plus Jaynes' invariance argument for `1/2`, and why it does not make the other constructions wrong

### Changed

- The `/maths` index no longer singles Bertrand out as the static one; all three pages run live

### Fixed

- The old listing's second method — *fix one endpoint, choose the other at random* — was labelled `P = 1/2`. It is the first method with the rotation already applied, and gives `1/3`. The page now makes that the point of its own section, since it is the most common way to get the paradox wrong

### Removed

- The MATLAB listing and `bertrand_paradox.m`. The four methods run live, at any sample count. `bertrand.png` stays as the page's opening figure, with a caption noting that its third panel's colours are inverted — the code coloured `|y| > r/2` as the long case when that is exactly the short one

## 2.4.2 — 2026-08-30

### Changed

- `/projects/tdgl-simulation` is rebuilt around the current solver. The page had one MATLAB gif and a code sample for an API (`TDGLSolver`) that no longer exists; it now carries eight figures from [`omedeiro/nanowire_tdgl`](https://github.com/omedeiro/nanowire_tdgl) and the results they demonstrate — the 3x3 array of 4 um holes where the flux front stalls at the array perimeter and field-cooling is the only way to trap anything, the S/I/S ring that expels flux to 9.2 mT because the plane screens rather than because the hole is small, vortex nucleation, screening currents around a hole, and the cross-sections against the London and pair-breaking-wall solutions. Every number on the page comes from the repo's own figures
- Source link points at `nanowire_tdgl` (the Python package) rather than `simulation6336`, which is now credited as the MATLAB original. The install and quick-start snippets are the real `tdgl3d` API
- Both MATLAB gifs are kept, moved into a closing provenance section

### Added

- `public/projects/tdgl/` gains six PNGs and two gifs. Every figure links to its full-resolution file, since the four- and six-panel ones are not legible at 42rem, and every image is `loading="lazy"` — the page is 8 MB of figures and only the first one is above the fold
- `nb-hole-array-trapped.gif` is requantised to a 64-colour palette with dithering off: 8.4 MB to 3.1 MB with no visible change to the physics panel, since dithering adds exactly the per-pixel noise GIF's run-length coding cannot compress

## 2.4.1 — 2026-08-30

### Changed

- The running habit is measured in miles rather than kilometres. `fetch_strava.py` divides Strava's metres by 1609.344 on the way out and writes `"unit": "mi"`, and the existing 853 days in `running.json` were converted in place — `extra.distance_m` still carries the raw metres, so the conversion is reversible

## 2.4.0 — 2026-08-30

### Added

- `/maths/euler-spiral` is interactive. One curve reached three ways, each with its own sliders: the Fresnel integrals, the turtle walk the page used to show in MATLAB, and the road transition the curve exists for. Drag to pan, pinch or scroll to zoom, **Trace** to walk a point along the curve with the circle matching its curvature at each moment. The strip under the plot draws curvature against arc length, which is the definition of the curve as a straight line
- `public/maths/euler-spiral.js` — the viewer. Curves are sampled by tangent turn rather than by parameter, since the Fresnel phase grows quadratically and the coils at `s = 8` need 25x the samples per unit length that the straight middle does; the midpoint rule then lands within `2e-5` of tabulated `C(t)` and `S(t)` across the whole slider range. Every sample carries its own closed-form curvature rather than having it differenced back out of the polyline

### Changed

- The transition comparison holds both alignments between the **same two straights**, the way the choice actually presents itself, rather than starting both from one straight. Sharing an entry tangent instead makes the two curves diverge by roughly the tangent distance — half a radius at 90° — which swamps the shift `p = L²/24R` the comparison exists to show. Between fixed tangents the difference is exactly that shift plus the earlier start, and both are checked against the geometry rather than taken from the series
- The `/maths` index now calls out Bertrand as the one page that is still a MATLAB listing; the tiling and Euler spiral pages both run live

### Fixed

- A display equation too wide for the 42rem column now scrolls in its own box rather than pushing the page sideways on a phone (`.katex-display { overflow-x: auto }`)

### Removed

- The MATLAB listing, `euler_spiral.m` and `euler.png`. The turtle mode is that loop, running live

## 2.3.0 — 2026-08-29

### Added

- `/maths/aperiodic-tiles` — a tiling builder you can pan and zoom on a phone or a desktop. Three tilings, built three different ways: Penrose P3 rhombs by substitution of the two Robinson triangles, Ammann–Beenker by cut and project from `Z^4` through an octagonal window, and the hat from a stored patch. Pointer events cover mouse, trackpad and touch through one code path, so a drag pans, two fingers pinch and a flick glides; the canvas centre is clamped to stay over the patch, since one determined scroll otherwise leaves a blank canvas with no clue which way to come back
- `public/maths/hat-search.mjs` — the derivation of the hat, as a runnable script. It enumerates all 10,209 8-kite polykites, keeps the 341 whose outline is a simple 13-gon, asks an exact-cover solver which of those can fill discs of radius 5, 12 and 30, and picks out the one that is forced to mix reflections in the ratio `1 : phi^4`. That one is the hat. Runs in about eight seconds, standard library only. The page's hat patch (475 tiles, radius 44) comes from the same solver, and is stored rather than generated because the search grows exponentially — that radius took three random restarts and `8.8e8` nodes, and four restarts at radius 50 each gave up after `2.5e9`

### Changed

- `/maths` index no longer claims every page is MATLAB, which stopped being true with the tiling page

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
