#!/usr/bin/env python3
"""Fetch Strava activities and emit the running habit file.

Produces ``running.json`` — kilometres per day from Run / TrailRun /
VirtualRun activities.

Stretching deliberately does *not* come from here. Strava's "Workout" entries
are strength sessions, not stretching; the stretching habit is sourced from
the Bend app via ``import_health.py`` instead.

Usage:
    python scripts/fetch_strava.py --auth      # one-time: authorize the app
    python scripts/fetch_strava.py             # normal run (last 730 days)
    python scripts/fetch_strava.py --days 30   # shorter window
    python scripts/fetch_strava.py --limit 5   # quick test

Credentials come from the environment or ``scripts/.env``:
``STRAVA_CLIENT_ID``, ``STRAVA_CLIENT_SECRET``, ``STRAVA_REFRESH_TOKEN``.

This talks to the REST API over ``urllib`` rather than using ``stravalib`` so
the nightly GitHub Action needs no pip install and cannot break on an upstream
release. Strava reports SI units: distance in metres, times in seconds.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

import habits_common as hc

TOKEN_URL = "https://www.strava.com/oauth/token"
AUTH_URL = "https://www.strava.com/oauth/authorize"
ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities"

# Strava's OAuth requires a redirect target but never needs it to resolve —
# the code is read out of the address bar and pasted back in.
REDIRECT_URI = "http://localhost/exchange_token"
SCOPE = "activity:read_all"

RUN_TYPES = {"Run", "TrailRun", "VirtualRun"}

PER_PAGE = 200


def api_post(url: str, data: dict[str, str]) -> dict:
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:400]
        raise SystemExit(f"Strava {exc.code} from {url}: {detail}") from exc


def api_get(url: str, token: str, params: dict[str, str]) -> list[dict]:
    full = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(full, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:400]
        if exc.code == 429:
            raise SystemExit("Strava rate limit hit (200/15min). Try again shortly.") from exc
        raise SystemExit(f"Strava {exc.code} from {url}: {detail}") from exc


def interactive_auth() -> None:
    """Walk the one-time authorization-code exchange and save the tokens."""
    client_id = hc.env("STRAVA_CLIENT_ID")
    client_secret = hc.env("STRAVA_CLIENT_SECRET")
    query = urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "approval_prompt": "auto",
        "scope": SCOPE,
    })
    print("1. Open this URL and authorize the app:\n")
    print(f"   {AUTH_URL}?{query}\n")
    print("2. The browser will fail to load localhost — that is expected.")
    print("   Copy the `code=...` value out of the address bar.\n")
    code = input("Paste the code here: ").strip()
    if not code:
        raise SystemExit("no code supplied")

    tokens = api_post(TOKEN_URL, {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
    })
    refresh = tokens.get("refresh_token")
    if not refresh:
        raise SystemExit(f"unexpected token response: {tokens}")
    hc.update_env_file({"STRAVA_REFRESH_TOKEN": refresh})
    print(f"\nSaved STRAVA_REFRESH_TOKEN to {hc.ENV_PATH}.")
    print("Add the same value as a repository secret to enable the nightly workflow.")


def access_token() -> str:
    """Exchange the stored refresh token for an access token.

    Strava may hand back a rotated refresh token; persisting it immediately is
    what keeps the next run from failing with an invalid grant.
    """
    refresh = hc.env("STRAVA_REFRESH_TOKEN")
    tokens = api_post(TOKEN_URL, {
        "client_id": hc.env("STRAVA_CLIENT_ID"),
        "client_secret": hc.env("STRAVA_CLIENT_SECRET"),
        "refresh_token": refresh,
        "grant_type": "refresh_token",
    })
    rotated = tokens.get("refresh_token")
    if rotated and rotated != refresh:
        hc.log("Strava rotated the refresh token; persisting the new value")
        hc.update_env_file({"STRAVA_REFRESH_TOKEN": rotated})
        # In CI the new token has to reach the secret store, but printing it
        # would leak it into the workflow log — GitHub only masks secrets it
        # already knows. Write it to a file the workflow reads instead.
        sink = os.environ.get("STRAVA_TOKEN_SINK")
        if sink:
            with open(sink, "w", encoding="utf-8") as fh:
                fh.write(rotated)
            os.chmod(sink, 0o600)
            hc.log(f"rotated token written to {sink}")
    token = tokens.get("access_token")
    if not token:
        raise SystemExit(f"no access_token in response: {tokens}")
    return token


def fetch_activities(token: str, after: dt.date, limit: int | None) -> list[dict]:
    after_ts = int(dt.datetime.combine(after, dt.time.min).timestamp())
    out: list[dict] = []
    page = 1
    while True:
        batch = api_get(ACTIVITIES_URL, token, {
            "after": str(after_ts),
            "page": str(page),
            "per_page": str(PER_PAGE),
        })
        if not batch:
            break
        out.extend(batch)
        hc.log(f"  page {page}: {len(batch)} activities (total {len(out)})")
        if limit and len(out) >= limit:
            return out[:limit]
        if len(batch) < PER_PAGE:
            break
        page += 1
    return out


def activity_type(act: dict) -> str:
    """Prefer sport_type; Strava's older `type` field collapses several sports."""
    return act.get("sport_type") or act.get("type") or ""


def activity_day(act: dict) -> str:
    """File the activity under its local start date, not UTC.

    A 7pm run in Boston is a 23:00 or 00:00 UTC timestamp — using UTC would
    scatter evening workouts onto the following day.
    """
    stamp = act.get("start_date_local") or act.get("start_date") or ""
    return stamp[:10]


def build_days(acts: list[dict], types: set[str]) -> dict[str, dict]:
    """Aggregate matching activities into per-day habit records."""
    buckets: dict[str, dict[str, float]] = {}
    for act in acts:
        if activity_type(act) not in types:
            continue
        key = activity_day(act)
        if not key:
            continue
        acc = buckets.setdefault(key, {"distance_m": 0.0, "moving_time_s": 0.0, "count": 0})
        acc["distance_m"] += float(act.get("distance") or 0)
        acc["moving_time_s"] += float(act.get("moving_time") or 0)
        acc["count"] += 1

    days: dict[str, dict] = {}
    for key, acc in buckets.items():
        days[key] = hc.day(
            acc["distance_m"] / 1000.0,
            moving_time_s=int(acc["moving_time_s"]),
            distance_m=int(acc["distance_m"]),
            count=int(acc["count"]),
        )
    return days


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--auth", action="store_true", help="run the one-time OAuth flow and exit")
    ap.add_argument("--days", type=int, default=730, help="how far back to fetch (default: 730)")
    ap.add_argument("--limit", type=int, help="stop after N activities (for testing)")
    ap.add_argument("--out-dir", default=hc.DATA_DIR, help="habit JSON directory")
    ap.add_argument("--no-merge", action="store_true", help="rebuild the files instead of merging")
    ap.add_argument("--run-types", default=",".join(sorted(RUN_TYPES)))
    args = ap.parse_args(argv)

    if args.auth:
        interactive_auth()
        return 0

    after = hc.days_ago(args.days)
    hc.log(f"fetching Strava activities since {after}")
    acts = fetch_activities(access_token(), after, args.limit)
    hc.log(f"fetched {len(acts)} activities")

    run_types = {t.strip() for t in args.run_types.split(",") if t.strip()}
    hc.write_habit(
        "running", "Running", "Strava", "km",
        build_days(acts, run_types),
        merge=not args.no_merge, data_dir=args.out_dir,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
