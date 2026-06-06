#!/usr/bin/env python3
"""House-style BibTeX normalizer + reconciliation for the portfolio site.

Two responsibilities:

1. ``normalize`` — apply the *safe, mechanical* formatting transforms that turn
   Google Scholar's parsed output into the hand-edited house style used in
   ``references.bib`` (en-dash page ranges, LaTeX escaping of ``& _``, unicode
   accents -> LaTeX, ``@inproceedings`` uses ``organization`` not ``publisher``,
   aligned ``=`` columns, entries sorted by key).

2. ``merge`` — reconcile a freshly-fetched ``references_scholar.bib`` against the
   curated ``references.bib``. Existing entries are *kept as-is* (your manual
   edits win); genuinely new entries are appended in house style; and every
   meaningful difference is printed as a review report so you can decide.

Usage:
    # Normalize any .bib in place-ish (writes to --out)
    python scripts/bib_format.py normalize references_scholar.bib -o references_scholar.bib

    # Reconcile scholar dump against curated file -> merged file + report
    python scripts/bib_format.py merge \
        --manual references.bib \
        --scholar references_scholar.bib \
        --out references_merged.bib

Depends on bibtexparser (installed alongside scholarly).
"""

from __future__ import annotations

import argparse
import re
import sys

# ---------------------------------------------------------------------------
# Field rendering config (kept in sync with fetch_scholar.py)
# ---------------------------------------------------------------------------
FIELD_ORDER = [
    "title",
    "author",
    "journal",
    "booktitle",
    "volume",
    "number",
    "pages",
    "year",
    "school",
    "publisher",
    "organization",
]

# Unicode -> LaTeX accent map (chars commonly seen in author names / titles).
LATEX_ACCENTS = {
    "á": r"{\'a}", "à": r"{\`a}", "ä": r"{\"a}", "â": r"{\^a}", "ã": r"{\~a}",
    "å": r"{\aa}", "ą": r"{\k a}",
    "é": r"{\'e}", "è": r"{\`e}", "ë": r"{\"e}", "ê": r"{\^e}", "ę": r"{\k e}",
    "í": r"{\'i}", "ì": r"{\`i}", "ï": r"{\"i}", "î": r"{\^i}",
    "ó": r"{\'o}", "ò": r"{\`o}", "ö": r"{\"o}", "ô": r"{\^o}", "õ": r"{\~o}",
    "ø": r"{\o}",
    "ú": r"{\'u}", "ù": r"{\`u}", "ü": r"{\"u}", "û": r"{\^u}",
    "ñ": r"{\~n}", "ç": r"{\c c}",
    "ć": r"{\'c}", "č": r"{\v c}", "ş": r"{\c s}", "š": r"{\v s}",
    "ž": r"{\v z}", "ź": r"{\'z}", "ż": r"{\.z}", "ł": r"{\l}",
    "ß": r"{\ss}",
    "Á": r"{\'A}", "Ä": r"{\"A}", "Å": r"{\AA}",
    "É": r"{\'E}", "Ë": r"{\"E}",
    "Í": r"{\'I}", "Ï": r"{\"I}",
    "Ó": r"{\'O}", "Ö": r"{\"O}", "Ø": r"{\O}",
    "Ú": r"{\'U}", "Ü": r"{\"U}",
    "Ñ": r"{\~N}", "Ç": r"{\c C}",
    "Š": r"{\v S}", "Ž": r"{\v Z}",
}


# ---------------------------------------------------------------------------
# Category-A transforms (safe, mechanical)
# ---------------------------------------------------------------------------
def latexify_accents(text: str) -> str:
    return "".join(LATEX_ACCENTS.get(ch, ch) for ch in text)


def normalize_dashes(text: str) -> str:
    """Unicode en/em dashes -> LaTeX ``--`` / ``---``."""
    text = text.replace("—", "---")  # em dash
    text = text.replace("–", "--")  # en dash
    return text


def normalize_pages(value: str) -> str:
    """Convert page ranges to en-dash form, matching the curated file.

    - ``343-349``      -> ``343--349``  (numeric range)
    - ``SM1K. 6``      -> ``SM1K--6``   (Scholar conference id form)
    - ``SS193_1``      -> ``SS193\\_1`` (escaping handled by escape_latex)
    Already-en-dashed or single values are left alone.
    """
    v = value.strip()
    # Scholar renders conference ids like "SM1K. 6" / "SM4O. 4".
    m = re.fullmatch(r"([A-Za-z0-9]+)\.\s*(\d+)", v)
    if m:
        return f"{m.group(1)}--{m.group(2)}"
    # Plain numeric range "12-34" (single hyphen) -> "12--34".
    v = re.sub(r"(?<=\d)\s*-\s*(?=\d)", "--", v)
    return v


def escape_latex(text: str) -> str:
    """Escape ``&`` and ``_`` that are not already escaped."""
    text = re.sub(r"(?<!\\)&", r"\\&", text)
    text = re.sub(r"(?<!\\)_", r"\\_", text)
    return text


def normalize_field(name: str, value: str) -> str:
    value = normalize_dashes(value)
    value = latexify_accents(value)
    if name == "pages":
        value = normalize_pages(value)
    # Escape & and _ everywhere except where a LaTeX command is intended.
    if name not in ("title",):  # titles may carry math like $\kappa$; still escape & _
        value = escape_latex(value)
    else:
        value = escape_latex(value)
    return value


def house_style(etype: str, fields: dict[str, str]) -> tuple[str, dict[str, str]]:
    """Apply category-A normalizations to an entry's fields."""
    out = {k: normalize_field(k, v) for k, v in fields.items()}
    # @inproceedings: curated file uses `organization`, Scholar gives `publisher`.
    if etype == "inproceedings" and "publisher" in out and "organization" not in out:
        out["organization"] = out.pop("publisher")
    return etype, out


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------
def format_entry(etype: str, key: str, fields: dict[str, str]) -> str:
    ordered: list[tuple[str, str]] = []
    for name in FIELD_ORDER:
        if name in fields:
            ordered.append((name, fields[name]))
    for name, val in fields.items():
        if name not in FIELD_ORDER:
            ordered.append((name, val))
    if not ordered:
        return f"@{etype}{{{key},\n}}\n"
    width = max(len(n) for n, _ in ordered)
    lines = [f"@{etype}{{{key},"]
    for i, (name, val) in enumerate(ordered):
        comma = "," if i < len(ordered) - 1 else ""
        lines.append(f"  {name.ljust(width)} = {{{val}}}{comma}")
    lines.append("}")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Parsing (self-contained; avoids bibtexparser/pyparsing version churn)
# ---------------------------------------------------------------------------
def load_bib(path: str) -> list[dict]:
    """Parse a .bib file into a list of dicts with ENTRYTYPE/ID + fields.

    Handles brace-delimited values with arbitrary nesting (e.g. ``{\\"a}``) and
    quote-delimited values. Tailored to the simple, generated style used here.
    """
    with open(path, encoding="utf-8") as fh:
        text = fh.read()

    entries: list[dict] = []
    i, n = 0, len(text)
    while i < n:
        at = text.find("@", i)
        if at == -1:
            break
        brace = text.find("{", at)
        if brace == -1:
            break
        etype = text[at + 1:brace].strip().lower()
        # Find the matching closing brace for the whole entry.
        depth, j = 0, brace
        while j < n:
            c = text[j]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        body = text[brace + 1:j]
        entry = _parse_entry_body(etype, body)
        if entry:
            entries.append(entry)
        i = j + 1
    return entries


def _parse_entry_body(etype: str, body: str) -> dict | None:
    # First token up to the first comma is the citation key.
    comma = body.find(",")
    if comma == -1:
        return None
    key = body[:comma].strip()
    rest = body[comma + 1:]

    entry: dict = {"ENTRYTYPE": etype, "ID": key}
    i, n = 0, len(rest)
    while i < n:
        # field name = ...
        eq = rest.find("=", i)
        if eq == -1:
            break
        name = rest[i:eq].strip().lower()
        k = eq + 1
        while k < n and rest[k] in " \t\r\n":
            k += 1
        if k >= n:
            break
        if rest[k] == "{":
            depth, m = 0, k
            while m < n:
                if rest[m] == "{":
                    depth += 1
                elif rest[m] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                m += 1
            value = rest[k + 1:m]
            i = m + 1
        elif rest[k] == '"':
            m = k + 1
            while m < n and rest[m] != '"':
                m += 1
            value = rest[k + 1:m]
            i = m + 1
        else:  # bare value (number)
            m = k
            while m < n and rest[m] not in ",\n":
                m += 1
            value = rest[k:m].strip()
            i = m
        if name:
            entry[name] = value.strip()
        # advance past trailing comma
        nxt = rest.find(",", i)
        i = nxt + 1 if nxt != -1 else n
    return entry


def entry_to_fields(entry: dict) -> tuple[str, str, dict[str, str]]:
    etype = entry.get("ENTRYTYPE", "article")
    key = entry.get("ID", "unknown")
    fields = {
        k: v for k, v in entry.items() if k not in ("ENTRYTYPE", "ID")
    }
    return etype, key, fields


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------
def cmd_normalize(args: argparse.Namespace) -> None:
    entries = load_bib(args.input)
    blocks = []
    for entry in sorted(entries, key=lambda e: e.get("ID", "")):
        etype, key, fields = entry_to_fields(entry)
        etype, fields = house_style(etype, fields)
        blocks.append(format_entry(etype, key, fields))
    output = "\n".join(blocks)
    _write(args.out, output)
    print(f"Normalized {len(entries)} entries -> {args.out or 'stdout'}", file=sys.stderr)


# Fields whose value differences are worth reporting during a merge.
COMPARE_FIELDS = ["journal", "booktitle", "volume", "number", "pages", "publisher",
                  "organization", "school", "title", "ENTRYTYPE"]


def _author_count(val: str) -> int:
    return len([a for a in val.split(" and ") if a.strip()])


def cmd_merge(args: argparse.Namespace) -> None:
    manual = {e["ID"]: e for e in load_bib(args.manual)}
    scholar = {e["ID"]: e for e in load_bib(args.scholar)}

    new_keys = sorted(set(scholar) - set(manual))
    common = sorted(set(scholar) & set(manual))

    report: list[str] = []
    report.append("=" * 70)
    report.append("RECONCILIATION REPORT")
    report.append("=" * 70)
    report.append(f"  manual entries : {len(manual)}")
    report.append(f"  scholar entries: {len(scholar)}")
    report.append(f"  new (in scholar, not manual): {len(new_keys)}")
    report.append("")

    if new_keys:
        report.append("-- NEW ENTRIES (added to merged output) " + "-" * 30)
        for k in new_keys:
            title = scholar[k].get("title", "")[:70]
            report.append(f"  + {k}: {title}")
        report.append("")

    # Differences on common keys (manual is kept; just flag).
    flagged = []
    for k in common:
        m, s = manual[k], scholar[k]
        diffs = []
        if m.get("ENTRYTYPE") != s.get("ENTRYTYPE"):
            diffs.append(f"type: manual={m.get('ENTRYTYPE')} scholar={s.get('ENTRYTYPE')}")
        # author count (truncation / new coauthors)
        ma, sa = m.get("author", ""), s.get("author", "")
        if _author_count(ma) != _author_count(sa):
            note = ""
            if "others" in ma:
                note = " (manual uses 'others')"
            diffs.append(f"authors: manual={_author_count(ma)} scholar={_author_count(sa)}{note}")
        # field-level value changes that look like real updates
        for f in ("journal", "volume", "number", "pages", "school"):
            mv, sv = (m.get(f) or "").strip(), (s.get(f) or "").strip()
            if mv and sv and mv.replace("--", "-") != sv.replace("--", "-"):
                diffs.append(f"{f}: manual={mv!r} scholar={sv!r}")
            elif not mv and sv and f in ("volume", "number", "pages"):
                diffs.append(f"{f}: manual=<none> scholar={sv!r} (preprint->published?)")
        if diffs:
            flagged.append((k, diffs))

    if flagged:
        report.append("-- DIFFERENCES ON EXISTING ENTRIES (manual kept; review) " + "-" * 12)
        for k, diffs in flagged:
            report.append(f"  ~ {k}")
            for d in diffs:
                report.append(f"      {d}")
        report.append("")

    report.append("=" * 70)
    print("\n".join(report), file=sys.stderr)

    # Build merged output: manual entries verbatim-normalized + new (house style).
    blocks = []
    merged_keys = sorted(set(manual) | set(scholar))
    for k in merged_keys:
        if k in manual:
            etype, key, fields = entry_to_fields(manual[k])
            # Keep manual content; only re-render layout (do NOT re-escape, to
            # avoid double-escaping already-escaped manual entries).
            blocks.append(format_entry(etype, key, fields))
        else:
            etype, key, fields = entry_to_fields(scholar[k])
            etype, fields = house_style(etype, fields)
            blocks.append(format_entry(etype, key, fields))
    _write(args.out, "\n".join(blocks))
    print(f"\nWrote {len(merged_keys)} entries -> {args.out or 'stdout'}", file=sys.stderr)


def _write(path: str | None, content: str) -> None:
    if path:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
    else:
        sys.stdout.write(content)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    pn = sub.add_parser("normalize", help="Apply house-style formatting to a .bib")
    pn.add_argument("input")
    pn.add_argument("-o", "--out", default=None, help="output path (default: stdout)")
    pn.set_defaults(func=cmd_normalize)

    pm = sub.add_parser("merge", help="Reconcile scholar dump with curated file")
    pm.add_argument("--manual", default="references.bib")
    pm.add_argument("--scholar", default="references_scholar.bib")
    pm.add_argument("-o", "--out", default="references_merged.bib")
    pm.set_defaults(func=cmd_merge)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
