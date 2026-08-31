# Getting Bend sessions onto /habits

Bend syncs its sessions into Apple Health. Apple Health is where the trail goes
cold: HealthKit is on-device only, there is no web API, and Health does not
reach the Mac either — it moves between devices through CloudKit's private
database, not as files. Nothing outside the phone can pull a Bend session out.

So the phone has to push. This is the phone-side half of that; the repo-side
half is `.github/workflows/stretching.yml` and
`scripts/import_shortcut_stretching.py`, both already in place.

## What the phone has to send

One line per session, in any of three shapes:

```
2026-08-26T07:12:00-0400,2026-08-26T07:20:00-0400            # a session
2026-08-26T07:12:00-0400,2026-08-26T07:20:00-0400,Wake Up    # ... named
2026-08-26,2                                                 # a finished day
2026-08-26,0                                                 # ... a rest day
```

The last form matters more than it looks: a Shortcut that sends one line a day
has to send *something* on a day you didn't stretch, and an explicit zero is
understood and dropped rather than treated as a broken payload.

Spans are preferred — they run through the same union-then-count path as a full
Health export, so a session that arrives this way and the same session pulled
out of `export.zip` produce the same number rather than two subtly different
ones. The third shape is there so a Shortcut that can only count sessions still
has something to send.

**Send a rolling window, not just today.** Seven days is a good default. Spans
are deduped on their exact `(start, end)` pair and every affected day is
recounted from scratch, so re-sending a day cannot double-count it — which
means a run the phone misses (locked, offline, out of battery) is repaired by
the next one instead of leaving a permanent hole.

## Route A — straight to GitHub (the one that runs daily)

The Shortcut POSTs a `repository_dispatch`; the workflow merges, commits, and
Cloudflare redeploys. Nothing else has to be awake.

### 1. A token for the phone

GitHub → Settings → Developer settings → **Fine-grained personal access
tokens** → Generate new token:

- Repository access: **Only select repositories** → `omedeiro/owenmedeiros.com`
- Permissions → Repository permissions → **Contents: Read and write**
  (`repository_dispatch` is gated on Contents, not on Actions)
- Expiration: whatever you will actually remember to rotate

Nothing else. This token can write to one repo and do nothing else with the
account, which is the point of putting it on a phone.

### 2. What Shortcuts can and cannot read

**Stock Shortcuts cannot enumerate workouts.** `Find Health Samples` covers
quantity and category samples; an `HKWorkout` is neither, so *Workouts* simply
is not in its Type list. Toolbox Pro sells a `Get Workouts` action precisely
because the built-in actions can't do it. Two earlier drafts of this guide said
otherwise — first naming a "Find Workouts" action that does not exist, then
claiming `Find Health Samples` could be set to Workouts. Both were wrong. Don't
go looking again.

So before building anything, find out which readable type Bend writes.
**Health → your profile → Apps → Bend** lists exactly what it is permitted to
write, which settles it in one look. Failing that, add a bare
`Find Health Samples` action, set the Type below, filter
`Start Date is in the last 30 days`, and press ▶.

In order of preference:

1. **Mindful Minutes** — a category sample, so it *is* in the Type list. Several
   stretching apps write one per session alongside the workout. If Bend does,
   this is the whole answer: each sample carries a start and an end date, which
   is exactly what the span format below wants, and nothing else in this guide
   changes.
2. **Active Energy**, filtered to `Source is Bend` — a quantity sample, so
   always readable. Coarser, because one session writes many samples: enough to
   prove a session happened on a given day, not enough to cleanly separate two.
   Good enough for the `YYYY-MM-DD,1` day form, not for spans.

Whichever you use, note the exact **Source** string Bend reports. Guessing it is
the likeliest way to end up with a Shortcut that runs cleanly and sends nothing.

### 2b. If Bend writes only workouts

Then the stock app cannot reach it, and there are three ways forward:

- **Toolbox Pro** (App Store, paid) — adds a `Get Workouts` action to Shortcuts.
  It drops straight into step 1 of the five-action version; every other step
  here is unchanged. Smallest change by far.
- **Health Auto Export** (App Store, paid) — scheduled REST exports with no
  Shortcut at all. More robust than any Shortcut, but it posts its own JSON
  shape, so `import_shortcut_stretching.py` would need a small adapter for it.
- **A periodic full export** — `import_health.py export.zip`, by hand every few
  weeks. No new apps, no token, no automation.

### 3. The five-action version — build this one first

Five actions, no loop, no date arithmetic. It proves the whole pipe end to end,
and the span version below is a drop-in replacement once you trust it. New
Shortcut, named something like *Push Bend to habits*:

1. **Find Health Samples** — Type: **Workouts**; Filter: **Start Date** `is`
   **Today**; Filter: **Source** `is` **Bend** (or whatever step 2 showed)
2. **Count** — *Items* in **Health Samples**
3. **Format Date** — Date: **Current Date**, Format: **Custom**, Format String:
   `yyyy-MM-dd`
4. **Text** — `[Formatted Date][,][Count]`, giving one line like `2026-08-29,2`
5. **Get Contents of URL** — as in *Posting it* below, with the **Text** from
   step 4 as `sessions`

On a day you don't stretch, step 2 counts zero and the line reads
`2026-08-29,0`. That is understood and dropped, not treated as an error, so a
rest day is a quiet green run.

What you give up is only tooltip detail — no routine names, no minutes — and
the self-healing window: this sends today, so a day the phone is off stays
missing. Both come back with the span version.

### 3b. The span version, once the short one works

Same shape, but it sends the last seven days with times and routine names,
which is what makes a missed run repair itself:

1. **Find Health Samples** — Type: **Workouts**
   - Filter: **Start Date** `is in the last` **7** **days**
   - Filter: **Source** `is` **Bend**
   - Sort by **Start Date**, no limit

   Filter on the *source*, not the workout type — Bend has filed sessions as
   Flexibility, Yoga, and Mind & Body across versions, and matching on type
   silently loses whichever one it isn't.

2. **Repeat with Each** over the result:
   - **Get Details of Health Sample** — Detail: **Start Date**, from *Repeat Item*
   - **Format Date** — on that, Format: **Custom**, Format String:
     `yyyy-MM-dd'T'HH:mm:ssZ`
   - **Get Details of Health Sample** — Detail: **End Date**, from *Repeat Item*
   - **Format Date** — same format string
   - **Text**: `[Formatted Date][,][Formatted Date 2]` — one line, the two
     stamps separated by a comma. Append `,` and the workout's name or activity
     type if you want it in the `/habits` tooltip; it is optional.
   - **Add to Variable** → `lines`

3. **Combine Text** — Input: `lines`, Separator: **New Lines**

4. **Get Contents of URL** — as below, with the **Combined Text** as `sessions`

`Z` in that format string means the numeric offset (`-0400`), not a literal Z.
Getting it wrong is the one failure the workflow reports loudly rather than
silently.

### Posting it

The final action in either version:

- **Get Contents of URL**
   - URL: `https://api.github.com/repos/omedeiro/owenmedeiros.com/dispatches`
   - Method: **POST**
   - Headers:
     | Key | Value |
     |---|---|
     | `Authorization` | `Bearer ghp_…` (the token from step 1) |
     | `Accept` | `application/vnd.github+json` |
     | `Content-Type` | `application/json` |
   - Request Body: **JSON**
     - `event_type` — Text — `stretching`
     - `client_payload` — Dictionary, containing:
       - `sessions` — Text — the line(s) you just built: the **Text** from the
         five-action version, or the **Combined Text** from the span version

**Run it once by hand.** The first run raises the Health permission prompt, and
a permission prompt inside a scheduled automation just fails. A successful run
returns an empty body and a 204; check the repo's Actions tab for an *Ingest
stretching* run.

### 4. Schedule it

Shortcuts → **Automation** → **+** → **Time of Day** → 11:30 PM, Daily →
**Run Immediately**, and turn *Notify When Run* off.

11:30 PM catches the whole day, and the 7-day window covers any night the phone
was locked or offline at the time.

## Route B — iCloud Drive (fallback, needs the Mac)

The same lines written to a file in
`iCloud Drive/habits/stretching/` instead of POSTed. The nightly LaunchAgent
(`scripts/habits_daily.py`, 23:00) merges everything in that folder and commits.

Replace steps 4–5 above with a **Save File** action into that folder — one file
per run, any name; the whole folder is re-read every time, so files accumulate
harmlessly. `README*` is skipped on purpose, so a worked example written in
prose there can't be imported as real data.

This route only runs when the Mac is on, which is why it is the fallback. It
needs no token, which is why it is worth keeping.

## Checking it without a phone

Run the workflow by hand — Actions → **Ingest stretching** → *Run workflow* —
and paste lines into the input. Or from a shell:

```bash
curl -X POST https://api.github.com/repos/omedeiro/owenmedeiros.com/dispatches \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d '{"event_type":"stretching","client_payload":{"sessions":"2026-08-26T07:12:00-0400,2026-08-26T07:20:00-0400,Wake Up"}}'
```

And locally, against a scratch directory so `src/data/habits` is left alone:

```bash
echo '2026-08-26T07:12:00-0400,2026-08-26T07:20:00-0400,Wake Up' \
  | python scripts/import_shortcut_stretching.py --payload-file - --out-dir /tmp/habits
```

## When nothing shows up

- **The run is green but no commit.** Either the window held nothing new — the
  job skips the commit when only `updated_at` would change, so re-sending the
  same seven days does not redeploy the site — or you did not stretch at all
  this week, which the job reports as "no sessions in this window" rather than
  as a failure.
- **The run is red at "Merge sessions".** The payload had lines in it and none
  of them parsed; the log prints how many. Usually the date format: it must be
  `yyyy-MM-dd'T'HH:mm:ssZ`, and `Z` there means the numeric offset (`-0400`),
  not a literal Z. This is deliberately the one case that fails loudly — an
  empty week is silent, a broken Shortcut is not.
- **Sessions land on the wrong day.** A session is filed under the local date it
  started, so the runner has to agree with the phone about "local". That is what
  `TZ: America/New_York` in the workflow is for — change it if you move.
- **The Shortcut finds no workouts.** Almost always the *Source* filter not
  matching what Bend actually calls itself. Strip every filter but
  `Start Date is in the last 30 days` and press ▶ — if workouts come back, the
  source string was wrong; if none do, the problem is upstream, in
  Bend → Settings → Apple Health, or Health → Sharing → Apps → Bend. If a full
  `export.zip` is handy, `python scripts/import_health.py export.zip
  --list-sources` prints every source and activity type it contains, which
  settles the question outright.
- **Nothing has run at all.** The nightly *Refresh habit data* job warns when
  `stretching.json` has not moved in more than four days, so a Shortcut that
  quietly stopped shows up as an annotation rather than as a column that just
  stops growing.

## Sessions from before the sync

Bend's Health connection only writes sessions from the day it was enabled
onward; it never backfills. Anything earlier has to come off Bend's own Recent
History screen into `scripts/bend-history.csv`, merged by
`python scripts/backfill_stretching.py`. Those days are tagged
`"backfilled": true`.
