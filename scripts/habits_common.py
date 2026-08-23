#!/usr/bin/env python3
"""Shared helpers for the habit-tracking fetch scripts.

Every habit feeds the ``/habits`` heatmap through one JSON file per habit in
``src/data/habits/``, all sharing the same shape::

    {
      "id": "running",
      "label": "Running",
      "source": "Strava",
      "unit": "km",
      "updated_at": "2026-08-23T06:12:00Z",
      "days": {
        "2026-08-22": {"value": 8.4, "extra": {"moving_time_s": 2520}}
      }
    }

``value`` is the number the heatmap buckets on; ``extra`` is free-form detail
the page folds into its hover tooltip.

Writes **merge** by default. This matters: macOS prunes ``knowledgeC.db`` to
roughly the last four weeks, so an overwriting write would silently discard
every screen-time day older than the current window. Scripts hand us only the
days they can see, and the file accumulates history across runs.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import ssl
import sys
import tempfile
from typing import Any, Iterable

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(REPO_ROOT, "src", "data", "habits")
ENV_PATH = os.path.join(REPO_ROOT, "scripts", ".env")


def log(msg: str) -> None:
    print(msg, file=sys.stderr)


def ssl_context() -> ssl.SSLContext:
    """A TLS context that works on a Python with no CA bundle wired up.

    python.org builds on macOS ship without the system trust store connected
    until ``Install Certificates.command`` is run, so every HTTPS call fails
    with CERTIFICATE_VERIFY_FAILED. Where certifi is installed we fall back to
    its bundle; otherwise this is just the default context. certifi stays
    optional — nothing here requires a pip install.
    """
    try:
        import certifi
    except ImportError:
        return ssl.create_default_context()
    return ssl.create_default_context(cafile=certifi.where())


# --------------------------------------------------------------------------
# environment
# --------------------------------------------------------------------------

def load_env(path: str = ENV_PATH) -> dict[str, str]:
    """Parse a minimal ``KEY=value`` .env file into os.environ.

    Hand-rolled to keep the scripts dependency-free (same reasoning as
    ``bib_format``: these run on a laptop and in CI with nothing installed).
    Existing environment variables always win, so CI secrets are never
    shadowed by a stale local file. Blank lines, ``#`` comments, a leading
    ``export``, and surrounding quotes are all tolerated.
    """
    found: dict[str, str] = {}
    if not os.path.exists(path):
        return found
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            if line.startswith("export "):
                line = line[len("export "):]
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                val = val[1:-1]
            found[key] = val
            os.environ.setdefault(key, val)
    return found


# Values from the setup instructions' copy-paste template. Left in place they
# reach the API as a real-looking credential and come back as an opaque error,
# so they are treated as missing.
PLACEHOLDERS = {
    "your_client_id_here",
    "your_client_secret_here",
    "your_token_here",
    "xxx",
    "changeme",
}


def env(name: str, required: bool = True) -> str:
    """Read a variable from the environment, falling back to scripts/.env."""
    load_env()
    val = os.environ.get(name, "")

    if val.strip().lower() in PLACEHOLDERS:
        raise SystemExit(
            f"{name} is still set to the placeholder '{val}'.\n"
            f"  Open {ENV_PATH} and replace it with the real value.\n"
            f"  Strava's Client ID and Client Secret are at the top of\n"
            f"  https://www.strava.com/settings/api (click Show for the secret)."
        )

    if not val and required:
        raise SystemExit(
            f"missing {name}. Set it in the environment or in scripts/.env "
            f"(see the Habits section of AGENTS.md)."
        )
    return val


def update_env_file(updates: dict[str, str], path: str = ENV_PATH) -> None:
    """Rewrite scripts/.env with ``updates`` applied, preserving other keys.

    Used to persist rotated OAuth refresh tokens. Skipped silently when the
    file does not exist and we are running in CI, where secrets live in the
    repository's secret store rather than on disk.
    """
    existing: dict[str, str] = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                s = line.strip()
                if s and not s.startswith("#") and "=" in s:
                    k, _, v = s.partition("=")
                    existing[k.strip()] = v.strip()
    elif os.environ.get("CI"):
        return
    existing.update(updates)
    body = "".join(f"{k}={v}\n" for k, v in sorted(existing.items()))
    _atomic_write(path, body)
    os.chmod(path, 0o600)


# --------------------------------------------------------------------------
# dates
# --------------------------------------------------------------------------

def day_key(when: dt.date | dt.datetime) -> str:
    """Return the ``YYYY-MM-DD`` key a value should be filed under."""
    if isinstance(when, dt.datetime):
        when = when.date()
    return when.isoformat()


def days_ago(n: int) -> dt.date:
    return dt.date.today() - dt.timedelta(days=n)


def utc_now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# --------------------------------------------------------------------------
# habit files
# --------------------------------------------------------------------------

def habit_path(habit_id: str, data_dir: str = DATA_DIR) -> str:
    return os.path.join(data_dir, f"{habit_id}.json")


def load_habit(habit_id: str, data_dir: str = DATA_DIR) -> dict[str, Any]:
    path = habit_path(habit_id, data_dir)
    if not os.path.exists(path):
        return {}
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        log(f"warning: could not read {path} ({exc}); starting fresh")
        return {}


def write_habit(
    habit_id: str,
    label: str,
    source: str,
    unit: str,
    days: dict[str, dict[str, Any]],
    *,
    merge: bool = True,
    data_dir: str = DATA_DIR,
) -> str:
    """Write ``days`` into ``<data_dir>/<habit_id>.json``.

    With ``merge`` (the default) the incoming days are layered over whatever
    the file already holds, so history predating the source's retention window
    survives. Pass ``merge=False`` only to deliberately rebuild a habit from
    scratch.
    """
    existing = load_habit(habit_id, data_dir) if merge else {}
    combined: dict[str, dict[str, Any]] = dict(existing.get("days") or {})
    combined.update(days)

    payload = {
        "id": habit_id,
        "label": label,
        "source": source,
        "unit": unit,
        "updated_at": utc_now_iso(),
        "days": {k: combined[k] for k in sorted(combined)},
    }
    path = habit_path(habit_id, data_dir)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    _atomic_write(path, json.dumps(payload, indent=2, ensure_ascii=False) + "\n")

    added = len(set(combined) - set(existing.get("days") or {}))
    log(f"wrote {path} — {len(combined)} days total ({added} new)")
    return path


def day(value: float, **extra: Any) -> dict[str, Any]:
    """Build one day record, dropping empty extras to keep diffs small."""
    rec: dict[str, Any] = {"value": round(value, 4)}
    clean = {k: v for k, v in extra.items() if v}
    if clean:
        rec["extra"] = clean
    return rec


def sum_by_day(rows: Iterable[tuple[str, float]]) -> dict[str, float]:
    """Collapse ``(day_key, amount)`` pairs into per-day totals."""
    out: dict[str, float] = {}
    for key, amount in rows:
        out[key] = out.get(key, 0.0) + amount
    return out


def _atomic_write(path: str, body: str) -> None:
    """Write via a temp file + rename so an interrupted run can't truncate data."""
    directory = os.path.dirname(path) or "."
    fd, tmp = tempfile.mkstemp(dir=directory, prefix=".tmp-", suffix=".swap")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(body)
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise
