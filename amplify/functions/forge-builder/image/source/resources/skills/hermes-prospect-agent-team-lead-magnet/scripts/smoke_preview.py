#!/usr/bin/env python
"""Stage 10: structural smoke of the generated page -> smoke-report.json.

Static checks that a browser session would otherwise catch first: parseable
document shape, working anchor targets for every nav href, inline SVG presence,
CTA wiring, and no unresolved template placeholders.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from _common import dump_json, read_text, workdir_arg


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    args = parser.parse_args()

    workdir = Path(args.workdir)
    page_path = workdir / "index.html"
    if not page_path.exists():
        print("ERROR: index.html missing — run assemble_index.py first", file=sys.stderr)
        return 2
    page = read_text(page_path)

    checks = []

    def check(name: str, ok: bool, detail: str = "") -> None:
        checks.append({"check": name, "status": "pass" if ok else "fail", "detail": detail})

    check("doctype", page.lstrip().lower().startswith("<!doctype html>"))
    check("no-unrendered-placeholders", not re.search(r"\{\{[^{}]+\}\}", page),
          "template placeholders left in output" if re.search(r"\{\{[^{}]+\}\}", page) else "")

    anchors = set(re.findall(r'href="#([a-z0-9-]+)"', page))
    ids = set(re.findall(r'id="([a-z0-9-]+)"', page))
    dangling = sorted(a for a in anchors if a and a not in ids)
    check("anchor-targets-resolve", not dangling, f"dangling: {dangling}" if dangling else "")

    # client-report renders the client logo + MTG art, so a single schematic
    # SVG is the expected minimum; older themes inline hero + workflow SVGs.
    theme_path = workdir / "theme.json"
    theme = ""
    if theme_path.exists():
        import json as _json
        theme = _json.loads(read_text(theme_path)).get("theme", "")
    min_svgs = 1 if theme == "client-report" else 2
    check("inline-svg-visuals", page.count("<svg") >= min_svgs,
          f"found {page.count('<svg')} inline SVGs (min {min_svgs} for theme {theme or 'legacy'})")
    check("cta-book", 'data-cta="book"' in page)
    check("cta-print", 'data-cta="print"' in page)
    check("single-h1", page.count("<h1") == 1, f"h1 count = {page.count('<h1')}")

    open_sections = len(re.findall(r"<section\b", page))
    close_sections = page.count("</section>")
    check("balanced-sections", open_sections == close_sections,
          f"{open_sections} open / {close_sections} close")

    team_brief = workdir / "team-brief.md"
    check("team-brief-exists", team_brief.exists())

    # every local subpage link (agents/<id>.html) must resolve to a real file
    local_pages = set(re.findall(r'href="(agents/[a-z0-9-]+\.html)"', page))
    missing_pages = sorted(p for p in local_pages if not (workdir / p).exists())
    check("agent-page-links-resolve", not missing_pages,
          f"missing: {missing_pages}" if missing_pages else f"{len(local_pages)} agent links")
    for sub in local_pages:
        body = read_text(workdir / sub)
        if 'href="../index.html"' not in body:
            check(f"back-link:{sub}", False, "no ../index.html back link")
            break
    else:
        if local_pages:
            check("agent-pages-back-link", True, "")

    report = {
        "schema_version": "leadmagnet-smoke-report.v1",
        "overall": "pass" if all(c["status"] == "pass" for c in checks) else "fail",
        "checks": checks,
    }
    dump_json(workdir / "smoke-report.json", report)
    for c in checks:
        print(f"  [{c['status'].upper():4}] {c['check']} {c['detail']}".rstrip())
    print(f"overall: {report['overall']} -> smoke-report.json")
    return 0 if report["overall"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
