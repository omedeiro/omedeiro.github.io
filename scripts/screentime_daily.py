#!/usr/bin/env python3
"""Collect screen time and commit it, for the daily LaunchAgent.

Run by ``~/Library/LaunchAgents/com.owenmedeiros.screentime.plist``. Logs to
``~/Library/Logs/screentime-daily.log``.

This is a Python wrapper rather than a shell one for a Full Disk Access
reason: TCC grants apply to the binary launchd actually starts, so a shell
wrapper would mean granting Full Disk Access to ``/bin/sh`` — and every shell
script on the machine with it. Pointing the agent straight at
``/usr/bin/python3`` keeps the grant on the interpreter that genuinely needs
to read ``knowledgeC.db`` and Biome, and off the conda Python used for
day-to-day work.

Collection runs on any branch, because ``knowledgeC.db`` and Biome are both
pruned to roughly four weeks and a skipped day is gone for good. Committing is
the guarded part: only on ``main``, only this one file, never mid-rebase.
``write_habit`` merges, so days collected while on a feature branch are still
committed by a later run.
"""

from __future__ import annotations

import datetime as dt
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join("src", "data", "habits", "screentime.json")
GIT = "/usr/bin/git"


def log(msg: str) -> None:
    print(f"{dt.datetime.now():%Y-%m-%d %H:%M:%S}  {msg}", flush=True)


def git(*args: str) -> str:
    return subprocess.run(
        [GIT, *args], cwd=REPO, capture_output=True, text=True, check=False
    ).stdout.strip()


def collect() -> bool:
    """Run the fetch in-process; returns False if it wrote nothing."""
    sys.path.insert(0, os.path.join(REPO, "scripts"))
    import fetch_screentime

    try:
        return fetch_screentime.main([]) == 0
    except SystemExit as exc:          # the script exits this way on a bad read
        log(f"fetch exited: {exc}")
        return False
    except Exception as exc:           # noqa: BLE001 - a crash must not kill the agent
        log(f"fetch crashed: {exc!r}")
        return False


def busy() -> str | None:
    """Name any in-progress git operation that makes committing unsafe."""
    for path, what in (
        ("rebase-merge", "rebase"), ("rebase-apply", "rebase"),
        ("MERGE_HEAD", "merge"), ("CHERRY_PICK_HEAD", "cherry-pick"),
    ):
        if os.path.exists(git("rev-parse", "--git-path", path)):
            return what
    return None


def main() -> int:
    log("=== daily screen-time collection ===")
    if not collect():
        log("nothing written")
        return 1

    if not git("status", "--porcelain", "--", DATA):
        log("no change to commit")
        return 0

    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    if branch != "main":
        log(f"on '{branch}', not main — leaving the change uncommitted")
        return 0

    blocked = busy()
    if blocked:
        log(f"{blocked} in progress — leaving the change uncommitted")
        return 0

    # Path-limited commit: whatever else is in the working tree stays untouched
    # and unstaged, so this can never sweep up work in progress.
    done = subprocess.run(
        [GIT, "commit", "-q", "-m", "Update screen time data", "--", DATA],
        cwd=REPO, capture_output=True, text=True, check=False,
    )
    if done.returncode:
        log(f"commit failed: {done.stderr.strip()}")
        return 1
    log(f"committed {git('rev-parse', '--short', 'HEAD')}")

    pushed = subprocess.run(
        [GIT, "push", "-q", "origin", "main"],
        cwd=REPO, capture_output=True, text=True, check=False,
    )
    if pushed.returncode:
        log(f"push failed ({pushed.stderr.strip()}) — commit is local")
        return 0
    log("pushed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
