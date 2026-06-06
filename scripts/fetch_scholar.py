#!/usr/bin/env python3
"""Fetch a Google Scholar publication record and emit a formatted .bib file.

The output is styled to match the hand-edited ``references.bib`` in this repo:
2-space indent, ``=`` signs aligned per entry, entries sorted by citation key.

Output is run through the shared house-style normalizer in ``bib_format`` so
it already matches the curated ``references.bib`` (en-dash page ranges, LaTeX
escaping, unicode accents, ``organization`` for ``@inproceedings``, etc.).

By default this writes a *separate* file (``references_scholar.bib``) so your
manual formatting fixes in ``references.bib`` are never clobbered. Then run
``bib_format.py merge`` to reconcile, or pass ``--merge references.bib`` here
to do it in one step.

Usage:
    pip install scholarly
    python scripts/fetch_scholar.py                 # uses default SCHOLAR_ID
    python scripts/fetch_scholar.py --user XXXXXXXX  # override profile id
    python scripts/fetch_scholar.py --out references.bib
    python scripts/fetch_scholar.py --limit 5        # quick test run
    python scripts/fetch_scholar.py --merge references.bib  # fetch + reconcile

Note: Google Scholar aggressively rate-limits scraping. If you get blocked,
wait a while, run with a smaller ``--limit``, or configure a proxy (see the
scholarly docs: https://scholarly.readthedocs.io/).
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import time
from typing import Any

# Shared formatting/merge logic lives in bib_format (same directory).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bib_format  # noqa: E402

# Default profile: scholar.google.com/citations?user=o0Esya8AAAAJ
SCHOLAR_ID = "o0Esya8AAAAJ"

# Field order / renderer come from the shared module to avoid drift.
FIELD_ORDER = bib_format.FIELD_ORDER


def log(msg: str) -> None:
    print(msg, file=sys.stderr)


def reformat_authors(author: str) -> str:
    """Convert scholarly's ``First M Last`` names to ``Last, First M``.

    Matches the native Google Scholar BibTeX export style used in
    references.bib. Names already in ``Last, First`` form and the literal
    ``others`` token are left untouched.
    """
    if not author:
        return author
    out = []
    for name in author.split(" and "):
        name = name.strip()
        if not name or name.lower() == "others" or "," in name:
            out.append(name)
            continue
        parts = name.split()
        if len(parts) == 1:
            out.append(parts[0])
        else:
            out.append(f"{parts[-1]}, {' '.join(parts[:-1])}")
    return " and ".join(out)


def make_key(bib: dict[str, Any]) -> str:
    """Build a BibTeX key like ``medeiros2026scalable``.

    first-author-surname + year + first significant title word.
    """
    author = bib.get("author", "")
    # scholarly gives authors as "Surname, First and Surname, First" OR
    # "First Surname and First Surname" depending on source. Handle both.
    first = author.split(" and ")[0].strip()
    if "," in first:
        surname = first.split(",")[0].strip()
    else:
        surname = first.split()[-1] if first.split() else "anon"
    surname = re.sub(r"[^A-Za-z]", "", surname).lower() or "anon"

    year = str(bib.get("pub_year") or bib.get("year") or "")
    year = re.sub(r"[^0-9]", "", year)

    title = bib.get("title", "")
    stop = {"a", "an", "the", "of", "for", "and", "on", "in", "to", "with"}
    word = ""
    for tok in re.findall(r"[A-Za-z0-9]+", title.lower()):
        if tok not in stop:
            word = tok
            break
    return f"{surname}{year}{word}"


def entry_type(pub: dict[str, Any], bib: dict[str, Any]) -> str:
    """Guess the BibTeX entry type from scholarly metadata."""
    citation = (bib.get("citation") or "").lower()
    title = (bib.get("title") or "").lower()
    if "phd" in citation or "thesis" in citation or "dissertation" in citation:
        return "phdthesis"
    if bib.get("school"):
        return "phdthesis"
    if bib.get("booktitle"):
        return "inproceedings"
    if "proceedings" in citation or "conference" in citation or "symposium" in citation:
        return "inproceedings"
    return "article"


def normalize_bib(pub: dict[str, Any]) -> dict[str, str]:
    """Flatten scholarly's bib dict into clean string fields."""
    bib = pub.get("bib", {})
    out: dict[str, str] = {}

    field_map = {
        "title": "title",
        "author": "author",
        "journal": "journal",
        "venue": "journal",
        "booktitle": "booktitle",
        "conference": "booktitle",
        "volume": "volume",
        "number": "number",
        "issue": "number",
        "pages": "pages",
        "pub_year": "year",
        "year": "year",
        "publisher": "publisher",
        "school": "school",
        "institution": "school",
        "organization": "organization",
        "abstract": "abstract",
    }

    for src, dst in field_map.items():
        val = bib.get(src)
        if val and dst not in out:
            out[dst] = str(val).strip()

    out.pop("abstract", None)  # not used in this repo's references.bib

    if "author" in out:
        out["author"] = reformat_authors(out["author"])
    return out


# Render via the shared module so layout stays identical everywhere.
format_entry = bib_format.format_entry


def fetch(user_id: str, limit: int | None) -> list[tuple[str, str, dict[str, str]]]:
    try:
        from scholarly import scholarly
    except ImportError:
        log("ERROR: scholarly is not installed. Run: pip install scholarly")
        sys.exit(1)

    log(f"Looking up author id={user_id} ...")
    author = scholarly.search_author_id(user_id)
    author = scholarly.fill(author, sections=["publications"])
    pubs = author.get("publications", [])
    log(f"Found {len(pubs)} publications. Filling details ...")

    if limit:
        pubs = pubs[:limit]

    entries: list[tuple[str, str, dict[str, str]]] = []
    seen_keys: set[str] = set()
    for i, pub in enumerate(pubs, 1):
        title_preview = pub.get("bib", {}).get("title", "?")[:60]
        log(f"  [{i}/{len(pubs)}] {title_preview}")
        try:
            filled = scholarly.fill(pub)
        except Exception as exc:  # noqa: BLE001
            log(f"    ! failed to fill ({exc}); using summary data")
            filled = pub

        fields = normalize_bib(filled)
        if not fields.get("title"):
            log("    ! no title; skipping")
            continue

        key = make_key({**filled.get("bib", {}), **fields})
        base = key
        n = 1
        while key in seen_keys:
            n += 1
            key = f"{base}{chr(ord('a') + n - 1)}"
        seen_keys.add(key)

        etype = entry_type(filled, {**filled.get("bib", {}), **fields})
        entries.append((etype, key, fields))
        time.sleep(0.5)  # be polite to Scholar

    entries.sort(key=lambda e: e[1])
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--user", default=SCHOLAR_ID, help="Google Scholar user id")
    parser.add_argument(
        "--out",
        default="references_scholar.bib",
        help="Output .bib path (default: references_scholar.bib)",
    )
    parser.add_argument(
        "--limit", type=int, default=None, help="Only fetch first N pubs (testing)"
    )
    parser.add_argument(
        "--merge",
        metavar="MANUAL_BIB",
        default=None,
        help="After fetching, reconcile against this curated .bib and write "
        "a merged file (references_merged.bib) plus a review report.",
    )
    args = parser.parse_args()

    entries = fetch(args.user, args.limit)
    if not entries:
        log("No entries produced.")
        sys.exit(1)

    # Apply house-style normalization (category-A transforms) before writing.
    blocks = []
    for et, key, fields in entries:
        et, fields = bib_format.house_style(et, fields)
        blocks.append(format_entry(et, key, fields))
    output = "\n".join(blocks)

    with open(args.out, "w", encoding="utf-8") as fh:
        fh.write(output)
    log(f"\nWrote {len(entries)} entries to {args.out}")

    if args.merge:
        merged_out = "references_merged.bib"
        log(f"\nReconciling against {args.merge} ...\n")
        merge_args = argparse.Namespace(
            manual=args.merge, scholar=args.out, out=merged_out
        )
        bib_format.cmd_merge(merge_args)


if __name__ == "__main__":
    main()
