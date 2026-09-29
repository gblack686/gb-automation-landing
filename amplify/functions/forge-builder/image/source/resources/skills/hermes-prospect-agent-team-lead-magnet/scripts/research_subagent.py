#!/usr/bin/env python
"""Stage 2a2 (optional, network + codex): GPT research subagent.

Runs a BROAD company research pass through the codex CLI (web search on)
and writes research-content.json — the sectioned narrative the
TAC-plan-format report renders. Operator-directed 2026-07-13: "use a
sub-agent and GPT-5.6 … keep it rather broad and hope it does a thorough
job." NOTE: 'gpt-5.6' is not a valid API model on the codex ChatGPT
account — the default is gpt-5.5 (the TAC fleet model); override --model
when a newer slug lands.

Contract:
  - exit 0: research-content.json written (validated shape, secrets-scanned)
  - exit 2: blocked — codex CLI missing or the call failed; the pipeline
    continues on the deterministic research-citations.json path (CI/selftest
    never require this stage)

Anti-fabrication rails are IN THE PROMPT (public sources only, cite every
claim, no unsourced figures) and re-enforced downstream: every fact rendered
without a source is forced to inferred/needs_call here, and the page still
passes scan_fabrication + the citation gates.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from _common import TEMPLATES, dump_json, load_artifact, scan_secrets, workdir_arg

TIMEOUT_S = 15 * 60
ALLOWED_CONFIDENCE = {"verified", "inferred", "needs_call"}

PROMPT_TEMPLATE = """You are a research analyst at GBAutomation producing a client-facing company research report on {company} ({website}). You work ONLY from public sources you can actually access — company website, filings, press, reputable news, directories, podcasts, LinkedIn public pages. You never invent facts, numbers, names, or dates. Every claim carries its source URL. If something cannot be verified publicly, either omit it or state it as an open question — never guess.

Research {company} broadly and thoroughly, then write the report content as six sections (each becomes a TOC anchor in one scrolling document):

1. anchor "snapshot" — Company snapshot: what they do, stage, HQ, principals (public bios only)
2. anchor "model" — Business model & how they operate: structure, focus, key customer and supplier relationships, what a typical engagement/order/workflow looks like from public evidence
3. anchor "signals" — Recent activity & signals: deals, news, hires, launches, raises from the last ~18 months
4. anchor "load" — Where the operational load lives — inferred from evidence: recurring communications, outreach and onboarding, pipeline or catalog upkeep, reporting, monitoring. Label every inference confidence "inferred".
5. anchor "automation" — Automation surface: the 3-5 workflows an AI agent team could take over first, each tied to a fact from sections 1-4
6. anchor "questions" — Open questions: what public sources could NOT answer (discovery-call questions)
{operator_context}

Respond with STRICT JSON only (no markdown fences, no commentary before or after):
{{
  "company": "{company}",
  "model": "{model}",
  "generated_on": "{today}",
  "sources_consulted": <int>,
  "sections": [
    {{
      "anchor": "snapshot",
      "title": "...",
      "paragraphs": ["plain-text paragraph", "..."],
      "facts": [
        {{"text": "...", "confidence": "verified|inferred|needs_call",
          "sources": [{{"title": "...", "url": "https://...", "accessed_at": "{today}"}}]}}
      ]
    }}
  ]
}}

Rules: at least one source per verified fact; a fact without a source MUST be confidence "inferred" or "needs_call"; no financial figures unless printed in a public source; paragraphs are plain text (no HTML, no markdown); 1200-2000 words total across paragraphs; aim for 15-30 facts overall."""


def extract_json(text: str) -> dict | None:
    for candidate in (text,
                      *(m.group(1) for m in re.finditer(r"```(?:json)?\s*(\{.*?\})\s*```",
                                                        text, re.DOTALL))):
        try:
            return json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            continue
    start, end = text.find("{"), text.rfind("}")
    if 0 <= start < end:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            return None
    return None


def sanitize(content: dict, company: str, model: str) -> tuple[dict | None, list[str]]:
    """Validate + normalize the subagent artifact; enforce the source rule."""
    problems: list[str] = []
    sections = content.get("sections")
    if not isinstance(sections, list) or not sections:
        return None, ["no sections in subagent output"]
    clean_sections = []
    for sec in sections:
        anchor = re.sub(r"[^a-z0-9-]", "", str(sec.get("anchor", "")).lower())[:40]
        title = str(sec.get("title", "")).strip()[:120]
        if not anchor or not title:
            problems.append(f"section missing anchor/title: {sec.get('anchor')!r}")
            continue
        paragraphs = [str(p).strip() for p in (sec.get("paragraphs") or [])
                      if str(p).strip()][:12]
        facts = []
        for fact in (sec.get("facts") or [])[:20]:
            text = str(fact.get("text", "")).strip()
            if not text:
                continue
            conf = str(fact.get("confidence", "inferred"))
            if conf not in ALLOWED_CONFIDENCE:
                conf = "inferred"
            sources = []
            for s in (fact.get("sources") or [])[:4]:
                url = str(s.get("url", "")).strip()
                if url.startswith(("http://", "https://")):
                    sources.append({"title": str(s.get("title", url))[:160], "url": url,
                                    "accessed_at": str(s.get("accessed_at", ""))[:10]})
            if conf == "verified" and not sources:
                conf = "inferred"  # the hard rule: no source, no "verified"
            facts.append({"text": text[:600], "confidence": conf, "sources": sources})
        clean_sections.append({"anchor": anchor, "title": title,
                               "paragraphs": paragraphs, "facts": facts})
    if not clean_sections:
        return None, problems or ["all sections empty after sanitize"]
    return {
        "company": company,
        "model": str(content.get("model", model))[:40],
        "generated_on": str(content.get("generated_on", dt.date.today().isoformat()))[:10],
        "sources_consulted": int(content.get("sources_consulted") or 0),
        "sections": clean_sections,
    }, problems


def run_codex(prompt: str, workdir: Path, model: str) -> str | None:
    binary = shutil.which("codex") or shutil.which("codex.cmd")
    if not binary:
        return None
    last_msg = workdir / "research-subagent-last-message.txt"
    base = [binary, "exec", "--model", model, "--sandbox", "read-only",
            "--skip-git-repo-check", "--output-last-message", str(last_msg)]
    # Enforce the JSON contract at the harness level: prompt-only compliance
    # is unreliable (gpt-5.5 happily answers in markdown prose).
    schema = TEMPLATES / "research-content.schema.json"
    if schema.exists():
        base += ["--output-schema", str(schema)]
    for args in (base + ["-c", "tools.web_search=true", prompt], base + [prompt]):
        try:
            proc = subprocess.run(args, cwd=workdir, capture_output=True,
                                  text=True, timeout=TIMEOUT_S, encoding="utf-8")
        except (subprocess.TimeoutExpired, OSError) as exc:
            print(f"codex exec failed: {exc}", file=sys.stderr)
            return None
        if proc.returncode == 0:
            if last_msg.exists() and last_msg.read_text(encoding="utf-8").strip():
                return last_msg.read_text(encoding="utf-8")
            return proc.stdout
        err = (proc.stderr or "") + (proc.stdout or "")[-400:]
        retriable = any(marker in err.lower() for marker in
                        ("unexpected argument", "unrecognized", "unknown", "web_search"))
        if not retriable:
            print(f"codex exec rc={proc.returncode}: {err[:400]}", file=sys.stderr)
            return None
    return None


def operator_context(intake: dict) -> str:
    """Render intake outcome + context as research focus — guidance, never a source.

    The block is explicit that operator context must not be cited as a fact:
    everything in the report still has to trace to a public source, so the
    citation and fabrication gates stay meaningful.
    """
    lines: list[str] = []
    outcome = str(intake.get("desired_business_outcome") or "").strip()
    if outcome:
        lines.append(f"- Desired business outcome: {outcome}")
    for note in intake.get("optional_context") or []:
        note = str(note).strip()
        if note:
            lines.append(f"- {note}")
    if not lines:
        return ""
    return ("\nOperator context from the intake — use it to steer sections 4-6 toward "
            "what actually matters to this prospect. It is BACKGROUND, not evidence: "
            "never cite it as a source, never restate it as a verified fact; anything "
            "it claims that you cannot verify publicly stays \"needs_call\".\n"
            + "\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--model", default="gpt-5.5",
                        help="codex model slug (gpt-5.6 is not a valid API model)")
    parser.add_argument("--dry-run", action="store_true",
                        help="print the research prompt and exit")
    args = parser.parse_args()

    workdir = Path(args.workdir)
    intake = load_artifact(workdir, "intake.json")
    company = intake["company_name"]
    website = (intake.get("company_url") or intake.get("company_website")
               or intake.get("website") or "no website on intake")
    prompt = PROMPT_TEMPLATE.format(company=company, website=website, model=args.model,
                                    today=dt.date.today().isoformat(),
                                    operator_context=operator_context(intake))
    if args.dry_run:
        print(prompt)
        return 0

    raw = run_codex(prompt, workdir, args.model)
    if raw is None:
        print("BLOCKED research-subagent: codex CLI unavailable or call failed "
              "(pipeline continues on research-citations.json)", file=sys.stderr)
        return 2

    content = extract_json(raw)
    if content is None:
        print("BLOCKED research-subagent: no JSON in subagent output", file=sys.stderr)
        return 2
    clean, problems = sanitize(content, company, args.model)
    if clean is None:
        print("BLOCKED research-subagent: " + "; ".join(problems), file=sys.stderr)
        return 2
    for label in scan_secrets(json.dumps(clean)):
        print(f"BLOCKED research-subagent: secret pattern '{label}'", file=sys.stderr)
        return 2

    dump_json(workdir / "research-content.json", clean)
    n_facts = sum(len(s["facts"]) for s in clean["sections"])
    print(f"OK research subagent ({len(clean['sections'])} sections, {n_facts} facts"
          + (f", {len(problems)} sanitize notes" if problems else "")
          + ") -> research-content.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
