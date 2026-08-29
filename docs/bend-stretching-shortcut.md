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
```

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

### 2. The Shortcut

New Shortcut, named something like *Push Bend to habits*:

1. **Find Workouts** — *(Health → Find Workouts; some iOS versions call this
   "Find Health Samples" with the type set to Workouts. The filters are what
   matter, not the name.)*
   - Filter: **Source** `is` **Bend**
   - Filter: **Start Date** `is in the last` **7** **days**
   - Sort by Start Date, no limit

   Match on the *source*, not the workout type — Bend has filed sessions as
   Flexibility, Yoga, and Mind & Body across versions, and matching on type
   silently loses whichever one it isn't. If your Shortcuts build offers no
   Source filter, filter on those three types instead and accept that a future
   Bend release may add a fourth.

2. **Repeat with Each** over the result:
   - **Format Date** — Date: *Repeat Item → Start Date*, Format: **Custom**,
     Format String: `yyyy-MM-dd'T'HH:mm:ssZ`
   - **Format Date** — same, on *Repeat Item → End Date*
   - **Text**: `[Formatted Date][,][Formatted Date 2][,][Repeat Item → Workout Type]`
     — one line, the two dates and the name separated by commas. The name is
     optional; it becomes the tooltip on `/habits`.
   - **Add to Variable** → `lines`

3. **Combine Text** — Input: `lines`, Separator: **New Lines**

4. **Get Contents of URL**
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
       - `sessions` — Text — the **Combined Text** variable

**Run it once by hand.** The first run raises the Health permission prompt, and
a permission prompt inside a scheduled automation just fails. A successful run
returns an empty body and a 204; check the repo's Actions tab for an *Ingest
stretching* run.

### 3. Schedule it

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
- **The Shortcut finds no workouts.** Check Bend → Settings → Apple Health is
  still granted write access, and Health → Sharing → Apps → Bend. If a full
  `export.zip` is handy, `python scripts/import_health.py export.zip
  --list-sources` prints every source and activity type the export actually
  contains, which settles what the filter should say.
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
