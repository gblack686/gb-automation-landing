#!/usr/bin/env python
"""Stage 2b: render the company research report -> research-report.html.

v2 (operator-directed 2026-07-13): the report is emitted in the TAC-plan
output format (official-gbauto-tac-plan-template shell — topbar, taxonomy
pills, section-menu TOC, header-visual SVG top-right, metadata footer)
re-skinned onto the client-report neon tokens, as ONE continuous document.

Content source, in preference order:
  1. research-content.json  — the GPT-5.6 research subagent's sectioned output
     (research_company.py stage; network + codex required to produce it)
  2. research-citations.json — the deterministic facts artifact (always
     present; keeps CI/selftest offline and the render reproducible)

The page embeds the shared GBAuto feedback drawer (reused from
resources/lib/gbauto_doc_template.py) pointed at the prospect-feedback-capture
Edge Function -> prospect_report_feedback table (operator-directed NEW table;
override of the never-new-table snippet default is deliberate and documented
in SKILL.md). Keyless renders (CI/pytest) emit a disabled comment instead.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import sys
from pathlib import Path

from _common import (
    TEMPLATES, esc, load_artifact, pick_accent, read_text, render_template,
    scan_fabrication, scan_secrets, fail_gate, workdir_arg, write_text,
)

REPO_ROOT = Path(__file__).resolve().parents[4]
# ACTIVE webhook: PostgREST insert on the dedicated table (anon INSERT-only
# RLS + server-side honeypot CHECK — see the migration). The Edge Function
# (prospect-feedback-capture, committed in supabase/functions/) is the
# hardened upgrade path once a Management API token exists; flip via env.
PROSPECT_FEEDBACK_FN_URL_DEFAULT = (
    "https://aejkzyjrlsfryfidwedm.supabase.co/rest/v1/prospect_report_feedback"
)


def fact_block(fact: dict) -> str:
    cites = "".join(
        f'<p class="cite">Source: <a href="{esc(s["url"])}" rel="noopener" target="_blank">'
        f'{esc(s["title"])}</a> · accessed {esc(s.get("accessed_at", ""))[:10]}</p>'
        for s in fact.get("sources", [])
    )
    conf = esc(fact["confidence"])
    return (f'<div class="fact"><span class="chip {conf}">{conf.replace("_", " ")}</span>'
            f'<p>{esc(fact["text"])}</p>{cites}</div>')


def sections_from_content(content: dict) -> list[dict]:
    """Sections straight from the research subagent artifact."""
    out = []
    for sec in content["sections"]:
        out.append({
            "anchor": sec["anchor"],
            "title": sec["title"],
            "paragraphs": list(sec.get("paragraphs") or []),
            "facts": list(sec.get("facts") or []),
        })
    return out


def sections_from_citations(facts: list[dict], intake: dict) -> list[dict]:
    """Deterministic fallback: synthesize the flow from the citations artifact."""
    by_conf = {c: [f for f in facts if f["confidence"] == c]
               for c in ("verified", "inferred", "needs_call")}
    downstream = [
        f"A drafted Hermes agent team keyed to: {intake['desired_business_outcome']}",
        "A claim map — every statement in the proposal traces back to a fact on this page.",
        "The proposal page itself, which embeds this report as its review-surface example.",
    ]
    return [
        {"anchor": "snapshot", "title": "Verified facts",
         "paragraphs": [], "facts": by_conf["verified"]},
        {"anchor": "hypotheses", "title": "Working hypotheses",
         "paragraphs": [], "facts": by_conf["inferred"]},
        {"anchor": "open-questions", "title": "Open questions for the first call",
         "paragraphs": [], "facts": by_conf["needs_call"]},
        {"anchor": "produced", "title": "What this research already produced",
         "paragraphs": downstream, "facts": []},
    ]


METHOD_SECTION = {
    "anchor": "method", "title": "Method & receipts",
    "paragraphs": [
        "Sources: public web pages only — no logins, no account surfaces, no scraping behind terms.",
        "Every fact carries a confidence label: verified (cited), inferred (labeled hypothesis), or needs-a-call.",
        "Citations, claim map, and validation receipts are archived with this run.",
        "Facts feed directly into the drafted agent team and the proposal page — one source of truth.",
    ],
    "facts": [],
}


def render_sections(sections: list[dict]) -> tuple[str, str, int, int]:
    """-> (toc_html, sections_html, fact_total, source_total)."""
    toc, body = [], []
    fact_total, source_urls = 0, set()
    for i, sec in enumerate(sections, 1):
        idx = f"{i:02d}"
        anchor = esc(sec["anchor"])
        paragraphs = "".join(f"<p>{esc(p)}</p>" for p in sec["paragraphs"])
        facts = "".join(fact_block(f) for f in sec["facts"])
        fact_total += len(sec["facts"])
        for f in sec["facts"]:
            source_urls.update(s["url"] for s in f.get("sources", []))
        words = sum(len(str(p).split()) for p in sec["paragraphs"])
        words += sum(len(f["text"].split()) for f in sec["facts"])
        toc.append(f'<a href="#{anchor}"><span>{idx}</span>{esc(sec["title"])}</a>')
        body.append(
            f'<section class="rsec"><div class="rsec-head" id="{anchor}">'
            f'<span class="section-index">{idx}</span>'
            f'<h2 class="section-title">{esc(sec["title"])}</h2>'
            f'<span class="section-count">~{words} words</span></div>'
            f'<div class="section-body">{paragraphs}{facts or ""}</div></section>'
        )
    return "".join(toc), "".join(body), fact_total, len(source_urls)


def feedback_embed(company: str, section_titles: list[str]) -> tuple[str, str]:
    """(css, widget) via the shared GBAuto drawer — reuse, never re-implement.

    Points at the prospect-feedback-capture Edge Function (NEW table,
    operator-directed). Keyless environments (CI/pytest) get a disabled
    comment so the render never blocks and stays deterministic.
    """
    sys.path.insert(0, str(REPO_ROOT))
    try:
        from resources.lib import gbauto_doc_template as doc_template
    except Exception as exc:  # pragma: no cover — repo layout is fixed
        return "", f"<!-- feedback widget unavailable: {esc(str(exc))} -->"
    finally:
        sys.path.pop(0)
    key = doc_template.resolve_feedback_anon_key()
    if not key:
        return doc_template.FEEDBACK_CSS, "<!-- feedback widget disabled (no anon key) -->"
    fn_url = os.environ.get("PROSPECT_FEEDBACK_FN_URL", PROSPECT_FEEDBACK_FN_URL_DEFAULT)
    slug = f"lead-magnet-research-{company.lower().replace(' ', '-')}"
    widget = doc_template.feedback_widget_html(
        slug, section_titles, fn_url=fn_url, anon_key=key)
    return doc_template.FEEDBACK_CSS, widget


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--generated-on", default=None)
    args = parser.parse_args()

    workdir = Path(args.workdir)
    intake = load_artifact(workdir, "intake.json")
    research = load_artifact(workdir, "research-citations.json")
    logo = load_artifact(workdir, "logo-verification.json")

    company = esc(intake["company_name"])
    facts = research["facts"]

    content_path = workdir / "research-content.json"
    if content_path.exists():
        content = load_artifact(workdir, "research-content.json")
        sections = sections_from_content(content) + [METHOD_SECTION]
        engine = content.get("model", "gpt-5.6") + " research subagent"
    else:
        sections = sections_from_citations(facts, intake) + [METHOD_SECTION]
        engine = "deterministic pipeline"

    toc_items, report_sections, fact_total, source_total = render_sections(sections)

    if logo["mode"] == "verified_logo" and logo.get("logo_local") and \
            (workdir / logo["logo_local"]).exists():
        # client-voice (operator-directed): their report, their brand — the
        # client mark stands alone; no GBAutomation lockup on this page.
        brandrow = (f'<img src="{esc(logo["logo_local"])}" alt="{company} logo">'
                    f'<span class="brand-text">{company}</span>')
    else:
        brandrow = f'<span class="brand-text">{company}</span>'

    exec_summary = (
        f"What public sources say about {company} — {fact_total} cited facts across "
        f"{len(sections)} sections, honest about what is verified, inferred, or "
        f"worth a call. This is the shape of every report your agent team ships: "
        f"asked from your phone, cited, and reviewable anywhere."
    )

    fb_css, fb_widget = feedback_embed(
        intake["company_name"], [s["title"] for s in sections])

    accent = pick_accent(logo.get("brand_colors") or [])
    r, g, b = (int(accent.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    accent_ink = "#191919" if (.2126 * r + .7152 * g + .0722 * b) > 150 else "#F3F1E7"

    context = {
        "company_name": company,
        "accent_hex": esc(accent),
        "accent_ink": accent_ink,
        "brandrow": brandrow,
        "generated_on": esc(args.generated_on or dt.date.today().isoformat()),
        "exec_summary": esc(exec_summary),
        "toc_items": toc_items,
        "report_sections": report_sections,
        "fact_total": fact_total,
        "source_total": source_total,
        "research_engine": esc(engine),
        "feedback_css": fb_css,
        "feedback_widget": fb_widget,
    }

    html = render_template(read_text(TEMPLATES / "research-report.html.j2"), context)
    problems = [f"secret pattern: {p}" for p in scan_secrets(html)]
    problems += [f"fabrication pattern: {p}" for p in scan_fabrication(html)]
    if problems:
        fail_gate(problems, "research-report-content")
    write_text(workdir / "research-report.html", html)
    print(f"OK research report ({fact_total} facts, {len(sections)} sections, "
          f"engine={engine}) -> research-report.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
