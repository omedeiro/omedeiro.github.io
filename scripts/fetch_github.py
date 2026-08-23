#!/usr/bin/env python3
"""Fetch the GitHub contribution calendar and emit the commits habit file.

GitHub's GraphQL API exposes the exact data behind the profile contribution
graph, so no commit-log scraping is needed:

    contributionsCollection(from:, to:) { contributionCalendar { weeks { ... } } }

That connection accepts at most a one-year span, so this walks backwards a
year at a time until ``--days`` is covered.

Usage:
    python scripts/fetch_github.py
    python scripts/fetch_github.py --login someone --days 365

Auth: ``GH_CONTRIB_TOKEN`` (preferred) or ``GITHUB_TOKEN``, from the
environment or ``scripts/.env``. A classic PAT with ``read:user`` covers
public contributions. To include private ones, add the ``repo`` scope *and*
enable Settings → Profile → "Include private contributions on my profile".
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

import habits_common as hc

GRAPHQL_URL = "https://api.github.com/graphql"
DEFAULT_LOGIN = "omedeiro"

QUERY = """
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks {
          contributionDays { date contributionCount }
        }
      }
    }
  }
}
"""


def token() -> str:
    hc.load_env()
    tok = os.environ.get("GH_CONTRIB_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if not tok:
        raise SystemExit(
            "missing GH_CONTRIB_TOKEN (or GITHUB_TOKEN). Create a PAT with "
            "read:user — see the Habits section of AGENTS.md."
        )
    return tok


def graphql(login: str, start: dt.date, end: dt.date, tok: str) -> dict:
    payload = json.dumps({
        "query": QUERY,
        "variables": {
            "login": login,
            "from": f"{start.isoformat()}T00:00:00Z",
            "to": f"{end.isoformat()}T23:59:59Z",
        },
    }).encode()
    req = urllib.request.Request(
        GRAPHQL_URL,
        data=payload,
        headers={
            "Authorization": f"bearer {tok}",
            "Content-Type": "application/json",
            "User-Agent": "owenmedeiros.com-habits",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.load(resp)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:400]
        raise SystemExit(f"GitHub {exc.code}: {detail}") from exc

    # GraphQL reports failures in the body with a 200 status, so check both.
    if body.get("errors"):
        raise SystemExit(f"GitHub GraphQL error: {body['errors']}")
    user = (body.get("data") or {}).get("user")
    if not user:
        raise SystemExit(f"no such GitHub user: {login}")
    return user["contributionsCollection"]["contributionCalendar"]


def fetch_days(login: str, days: int, tok: str) -> dict[str, dict]:
    today = dt.date.today()
    earliest = today - dt.timedelta(days=days)
    out: dict[str, dict] = {}

    window_end = today
    while window_end > earliest:
        # One year minus a day keeps each request inside the API's span limit.
        window_start = max(earliest, window_end - dt.timedelta(days=364))
        hc.log(f"  {window_start} → {window_end}")
        calendar = graphql(login, window_start, window_end, tok)
        for week in calendar["weeks"]:
            for entry in week["contributionDays"]:
                count = int(entry["contributionCount"])
                if count:
                    out[entry["date"]] = hc.day(count)
        window_end = window_start - dt.timedelta(days=1)
    return out


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--login", default=DEFAULT_LOGIN, help=f"GitHub username (default: {DEFAULT_LOGIN})")
    ap.add_argument("--days", type=int, default=730, help="how far back to fetch (default: 730)")
    ap.add_argument("--out-dir", default=hc.DATA_DIR, help="habit JSON directory")
    ap.add_argument("--no-merge", action="store_true", help="rebuild the file instead of merging")
    args = ap.parse_args(argv)

    hc.log(f"fetching contributions for {args.login}, last {args.days} days")
    days = fetch_days(args.login, args.days, token())
    hc.log(f"found {len(days)} days with contributions")

    hc.write_habit(
        "commits", "Commits", "GitHub", "commits",
        days, merge=not args.no_merge, data_dir=args.out_dir,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
