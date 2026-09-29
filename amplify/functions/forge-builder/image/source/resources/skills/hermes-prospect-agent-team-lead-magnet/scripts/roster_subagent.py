#!/usr/bin/env python
"""Optional stage 3b: client-specific roster names -> roster-content.json.

The GPT roster subagent: takes the deterministic role-library pick (shared
select_roles() from generate_team_manifest.py), the intake objectives, and the
researched facts, and proposes client-specific display names + purposes for
each agent — "Customer Ops Scout" becomes "Nursery Enrollment Scout" for a
plant marketplace. IDs, tiers, archetypes and proposed skills are NEVER
touched: renames key on the stable library id, so art assets and profile
pages keyed by id survive.

- exit 0: roster-content.json written; generate_team_manifest.py applies it
- exit 2: blocked — codex CLI missing or the call failed; the manifest
  falls back to the library names (CI/selftest never require this stage)

Anti-fabrication: purposes may only reference the intake objectives and the
researched facts provided in the prompt — no invented metrics, tools, or
claims. Output is sanitized (ids restricted to the baseline, length caps,
secret scan) and the manifest still passes every downstream gate.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import subprocess
import sys
from pathlib import Path

from _common import dump_json, load_artifact, scan_secrets, workdir_arg
from generate_team_manifest import select_roles

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
TIMEOUT_S = 15 * 60

PROMPT_TEMPLATE = """You are naming the agents of a drafted (not active) AI agent team proposed to {company} ({website}). The team is a PROPOSAL rendered on a preview page; nothing is wired or running. Your job is ONLY to rename each agent and rewrite its one-sentence purpose so both are specific to {company}'s business and stated objectives — a reader from {company} should recognize their own operation in every card title.

The baseline roster (id -> current generic name -> archetype purpose):
{roster_block}

What {company} says it wants (their words, from intake):
{objectives_block}

What public research established (cited facts — the ONLY claims you may echo):
{facts_block}

Rules:
- Rename EVERY agent, lead included. Display names: 2-5 words, title case, concrete ("Nursery Enrollment Scout", not "Growth Ninja"), <= 60 characters, no emoji, no "AI"/"GPT" in names.
- Purposes: ONE sentence, <= 240 characters, plain text, draft-proposal voice ("Researches and catalogs...", never "has increased..."). Reference only the objectives and facts above — NO invented metrics, customers, tools, integrations, or capabilities.
- Do NOT change, add, or remove ids. Do NOT reorder. Keep each rename true to its archetype (a junior scout stays a scout; don't rename it into a strategist).
- Regional/market specifics from the objectives (metros, vendor types, channels) are encouraged in names and purposes where they fit naturally.

Respond with STRICT JSON only (no markdown fences, no commentary):
{{
  "company": "{company}",
  "model": "{model}",
  "lead": {{"display_name": "...", "purpose": "..."}},
  "specialists": [
    {{"id": "<baseline id, unchanged>", "display_name": "...", "purpose": "..."}}
  ]
}}"""


def build_prompt(intake: dict, workdir: Path, model: str) -> tuple[str, list[str]]:
    company = intake["company_name"]
    website = intake.get("company_url") or "no website on intake"
    outcome = str(intake.get("desired_business_outcome") or "").strip()

    roles = select_roles(outcome)
    fmt = {"company": company, "outcome": outcome}
    roster_lines = [f"- lead: \"{company} Ops Lead\" -> synthesizes specialist findings "
                    f"into one daily brief (team leader archetype)"]
    roster_lines += [f"- {sid}: \"{name}\" -> {purpose.format(**fmt)} ({tier} tier)"
                     for sid, name, purpose, tier in roles]

    objective_lines = [f"- {outcome}"] if outcome else []
    objective_lines += [f"- {str(n).strip()}" for n in intake.get("optional_context") or []
                        if str(n).strip()]

    fact_lines: list[str] = []
    content_path = workdir / "research-content.json"
    if content_path.exists():
        content = json.loads(content_path.read_text(encoding="utf-8"))
        fact_lines = [f"- {f['text']}" for sec in content.get("sections", [])
                      for f in sec.get("facts", []) if f.get("text")]
    if not fact_lines:
        citations = load_artifact(workdir, "research-citations.json")
        fact_lines = [f"- {f['text']}" for f in citations.get("facts", []) if f.get("text")]

    prompt = PROMPT_TEMPLATE.format(
        company=company, website=website, model=model,
        roster_block="\n".join(roster_lines),
        objectives_block="\n".join(objective_lines) or "- (none provided)",
        facts_block="\n".join(fact_lines[:40]) or "- (no researched facts)",
    )
    return prompt, [sid for sid, *_ in roles]


def sanitize(content: dict, valid_ids: list[str], company: str,
             model: str) -> tuple[dict | None, list[str]]:
    problems: list[str] = []

    def clean_entry(entry: dict, label: str) -> dict | None:
        name = " ".join(str(entry.get("display_name", "")).split()).strip()[:80]
        purpose = " ".join(str(entry.get("purpose", "")).split()).strip()[:300]
        if not name or not purpose:
            problems.append(f"{label}: empty display_name/purpose dropped")
            return None
        return {"display_name": name, "purpose": purpose}

    lead = clean_entry(content.get("lead") or {}, "lead")
    specialists = []
    seen: set[str] = set()
    for spec in content.get("specialists") or []:
        sid = str(spec.get("id", "")).strip()
        if sid not in valid_ids:
            problems.append(f"unknown id dropped: {sid!r}")
            continue
        if sid in seen:
            problems.append(f"duplicate id dropped: {sid!r}")
            continue
        entry = clean_entry(spec, sid)
        if entry:
            seen.add(sid)
            specialists.append({"id": sid, **entry})
    if not specialists and not lead:
        return None, problems or ["no usable renames in subagent output"]
    missing = sorted(set(valid_ids) - seen)
    if missing:
        problems.append(f"library names kept for: {', '.join(missing)}")
    result = {
        "schema_version": "leadmagnet-roster-content.v1",
        "company": company,
        "model": str(content.get("model", model))[:40],
        "generated_on": dt.date.today().isoformat(),
        "specialists": specialists,
    }
    if lead:
        result["lead"] = lead
    return result, problems


def run_codex(prompt: str, workdir: Path, model: str) -> str | None:
    binary = shutil.which("codex") or shutil.which("codex.cmd")
    if not binary:
        return None
    last_msg = workdir / "roster-subagent-last-message.txt"
    args = [binary, "exec", "--model", model, "--sandbox", "read-only",
            "--skip-git-repo-check", "--output-last-message", str(last_msg),
            "--output-schema", str(TEMPLATES / "roster-content.schema.json"), prompt]
    try:
        proc = subprocess.run(args, cwd=workdir, capture_output=True,
                              text=True, timeout=TIMEOUT_S, encoding="utf-8")
    except (subprocess.TimeoutExpired, OSError) as exc:
        print(f"codex exec failed: {exc}", file=sys.stderr)
        return None
    if proc.returncode != 0:
        err = (proc.stderr or "") + (proc.stdout or "")[-400:]
        print(f"codex exec rc={proc.returncode}: {err[:400]}", file=sys.stderr)
        return None
    if last_msg.exists() and last_msg.read_text(encoding="utf-8").strip():
        return last_msg.read_text(encoding="utf-8")
    return proc.stdout


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--model", default="gpt-5.5",
                        help="codex model slug (gpt-5.6 is not a valid API model)")
    parser.add_argument("--dry-run", action="store_true",
                        help="print the roster prompt and exit")
    args = parser.parse_args()

    workdir = Path(args.workdir)
    intake = load_artifact(workdir, "intake.json")
    prompt, valid_ids = build_prompt(intake, workdir, args.model)
    if args.dry_run:
        print(prompt)
        return 0

    raw = run_codex(prompt, workdir, args.model)
    if raw is None:
        print("BLOCKED roster-subagent: codex CLI unavailable or call failed "
              "(manifest falls back to library names)", file=sys.stderr)
        return 2

    try:
        content = json.loads(raw)
    except json.JSONDecodeError:
        print("BLOCKED roster-subagent: no JSON in subagent output", file=sys.stderr)
        return 2
    clean, problems = sanitize(content, valid_ids, intake["company_name"], args.model)
    if clean is None:
        print("BLOCKED roster-subagent: " + "; ".join(problems), file=sys.stderr)
        return 2
    for label in scan_secrets(json.dumps(clean)):
        print(f"BLOCKED roster-subagent: secret pattern '{label}'", file=sys.stderr)
        return 2
    for note in problems:
        print(f"  note: {note}")

    dump_json(workdir / "roster-content.json", clean)
    print(f"OK roster renames: {len(clean['specialists'])} specialists"
          + (" + lead" if clean.get("lead") else "")
          + " -> roster-content.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
