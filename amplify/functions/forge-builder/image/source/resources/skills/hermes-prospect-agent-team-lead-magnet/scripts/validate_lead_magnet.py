#!/usr/bin/env python
"""Stage 9: run every build gate over a prospect workdir -> validation-receipt.json.

Exit 0 only when ALL gates pass. `--selftest` runs the full pipeline on the
bundled acme-sample fixture into a temp dir and validates it — the executed
smoke used by CI and the smoke-client catalog.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from _common import (
    SKILL_ROOT, dump_json, find_repo_root, load_schema, load_structured,
    read_text, scan_fabrication, scan_secrets, validate_schema, workdir_arg,
)

ARTIFACT_SCHEMAS = {
    "intake.json": "intake.schema.json",
    "research-citations.json": "research-citations.schema.json",
    "logo-verification.json": "logo-verification.schema.json",
    "sanitized-hermes-team.yaml": "sanitized-hermes-team.schema.json",
    "claim-map.json": "claim-map.schema.json",
    "image-provenance.json": "image-provenance.schema.json",
}

THEME_SECTION_IDS = {
    "gbauto": [
        "hero", "company-snapshot", "opportunity-map", "lead-agent", "team",
        "workflow", "safeguards", "daily-experience", "visuals", "trial-plan",
        "cta", "brief",
    ],
    # zero-touch restructure (operator-directed 2026-07-12): philosophy,
    # PRD two-gate system, meet->sprint pipeline, core profiles, custom
    # specialists, and the report review surface.
    "neon-oiran": [
        "hero", "zero-touch", "prd-gates", "lead-agent", "team",
        "transcript-pipeline", "core-profiles", "specialist-profiles",
        "reports", "trial-plan", "cta", "brief",
    ],
    # client-report flow (operator-directed 2026-07-14): reports on demand ->
    # notes->action-items -> architecture flow diagram -> orchestrator ->
    # specialists -> 25 workflow presets -> philosophy+PRD merged (bottleneck
    # SVG) -> kanban board.
    "client-report": [
        "hero", "hermes", "reports", "transcript-sprint", "architecture",
        "orchestrator", "specialists", "workflows", "prd-system", "kanban",
        "cta", "brief",
    ],
}

ROSTER_THEMES = ("neon-oiran", "client-report")

REQUIRED_PAGE_MARKERS = [
    ('id="progress"', "scroll progress indicator"),
    ("<nav", "anchor navigation"),
    ("@media print", "print/PDF stylesheet"),
    ("prefers-reduced-motion", "reduced-motion fallback"),
    ('data-cta="book"', "primary CTA"),
]

FORBIDDEN_COLORS = ["#3b82f6", "#667eea", "background:#fff", "background:#ffffff", "background:#000"]
BRAND_TOKENS_REL = Path("second-brain/systems/brand/gbauto-brand-tokens.md")


def gate(name):
    """Collect (gate, status, detail) rows via a tiny decorator-free registry."""
    def wrapper(fn):
        fn.gate_name = name
        return fn
    return wrapper


@gate("artifact-schemas")
def check_schemas(workdir: Path) -> list[str]:
    errors = []
    for artifact, schema_name in ARTIFACT_SCHEMAS.items():
        path = workdir / artifact
        if not path.exists():
            errors.append(f"missing artifact: {artifact}")
            continue
        errors += validate_schema(load_structured(path), load_schema(schema_name), artifact)
    return errors


@gate("citation-coverage")
def check_citations(workdir: Path) -> list[str]:
    claim_map = load_structured(workdir / "claim-map.json")
    errors = []
    for claim in claim_map["claims"]:
        if claim["claim_type"] == "company_fact" and claim["confidence"] == "verified" and not claim.get("support"):
            errors.append(f"{claim['claim_id']}: verified company_fact without citation")
        if claim["reviewer_verdict"] == "block":
            errors.append(f"{claim['claim_id']}: blocked by reviewer verdict")
    return errors


@gate("secret-scan")
def check_secrets(workdir: Path) -> list[str]:
    errors = []
    for path in sorted(workdir.rglob("*")):
        if path.is_file() and path.suffix in (".json", ".yaml", ".yml", ".html", ".md", ".svg"):
            for label in scan_secrets(read_text(path)):
                errors.append(f"{path.name}: secret pattern '{label}'")
    return errors


@gate("no-fabrication")
def check_fabrication(workdir: Path) -> list[str]:
    errors = []
    for name in ("index.html", "team-brief.md"):
        path = workdir / name
        if path.exists():
            for label in scan_fabrication(read_text(path)):
                errors.append(f"{name}: fabrication pattern '{label}'")
    page = read_text(workdir / "index.html") if (workdir / "index.html").exists() else ""
    if page and not re.search(r"(?i)draft", page):
        errors.append("index.html: page never says the team is a draft")
    return errors


@gate("logo-policy")
def check_logo(workdir: Path) -> list[str]:
    logo = load_structured(workdir / "logo-verification.json")
    page = read_text(workdir / "index.html")
    errors = []
    if logo["mode"] == "text_lockup":
        # only the CLIENT mark is rights-gated; GB/Hermes backdrop assets are ours
        if re.search(r'<img[^>]+assets/brand/logo\.', page, re.IGNORECASE):
            errors.append("text_lockup mode but page embeds the client logo image")
    else:
        if not logo.get("logo_source_url"):
            errors.append("verified_logo mode without a logo_source_url")
        local = logo.get("logo_local")
        if local and not (workdir / local).exists():
            errors.append(f"verified_logo mode but downloaded asset missing: {local}")
    if logo.get("hermes_attribution") != "text_only_no_logo":
        errors.append("hermes attribution must be text_only_no_logo")
    return errors


@gate("image-provenance")
def check_provenance(workdir: Path) -> list[str]:
    provenance = load_structured(workdir / "image-provenance.json")
    errors = []
    for asset in provenance["assets"]:
        if len(asset.get("prompt_fingerprint", "")) != 64:
            errors.append(f"{asset['asset_id']}: missing/invalid sha256 prompt fingerprint")
        if asset["provider"] == "deterministic_svg_fallback":
            if not asset["output_path"] or not (workdir / asset["output_path"]).exists():
                errors.append(f"{asset['asset_id']}: fallback provider but rendered SVG missing")
    return errors


def active_theme(workdir: Path) -> str:
    theme_path = workdir / "theme.json"
    if theme_path.exists():
        return load_structured(theme_path).get("theme", "gbauto")
    return "gbauto"


def theme_pages(workdir: Path) -> list[Path]:
    """index.html plus any generated agent profile pages."""
    pages = [workdir / "index.html"]
    pages += sorted((workdir / "agents").glob("*.html")) if (workdir / "agents").is_dir() else []
    return pages


@gate("brand-tokens")
def check_brand(workdir: Path) -> list[str]:
    theme = active_theme(workdir)
    if theme == "gbauto":
        repo_root = find_repo_root()
        if repo_root is None:
            return ["cannot locate repo root — brand gate MUST read the canonical token file"]
        tokens_path = repo_root / BRAND_TOKENS_REL
        if not tokens_path.exists():
            return [f"canonical brand token file missing: {BRAND_TOKENS_REL}"]
        allowed = set(re.findall(r"#[0-9A-Fa-f]{6}", read_text(tokens_path)))
        required = ("#D97757", "#F3F1E7", "#191919")
        source = "canonical token file"
    else:
        theme_manifest_path = Path(__file__).resolve().parents[1] / "templates" / "themes" / f"{theme}.json"
        if not theme_manifest_path.exists():
            return [f"unknown theme '{theme}' — no manifest at templates/themes/{theme}.json"]
        theme_manifest = load_structured(theme_manifest_path)
        allowed = set(theme_manifest["allowed_hexes"])
        required = tuple(theme_manifest["required_hexes"])
        source = f"theme manifest '{theme}'"
        # client-report pages render the client's own brand colors — union the
        # rights-checked colors recorded by verify_logo_asset.py
        logo_path = workdir / "logo-verification.json"
        if logo_path.exists():
            allowed |= set(load_structured(logo_path).get("brand_colors") or [])

    # Agent profile pages keep the neon "trading card" skin in every roster
    # theme — they validate against the neon manifest (plus client brand
    # colors), while index.html validates against the active theme.
    neon_manifest_path = Path(__file__).resolve().parents[1] / "templates" / "themes" / "neon-oiran.json"
    agent_allowed = set(load_structured(neon_manifest_path)["allowed_hexes"]) if neon_manifest_path.exists() else allowed
    logo_path = workdir / "logo-verification.json"
    if logo_path.exists():
        agent_allowed |= set(load_structured(logo_path).get("brand_colors") or [])

    errors = []
    allowed_upper = {h.upper() for h in allowed}
    agent_allowed_upper = {h.upper() for h in agent_allowed}
    for page_path in theme_pages(workdir):
        page = read_text(page_path)
        page_lower = page.lower()
        is_index = page_path.name == "index.html"
        label = page_path.name if is_index else f"agents/{page_path.name}"
        if is_index:
            for req in required:
                if req.lower() not in page_lower:
                    errors.append(f"{label}: missing required hex {req} ({source})")
        for forbidden in FORBIDDEN_COLORS:
            if forbidden in page_lower:
                errors.append(f"{label}: forbidden color/style '{forbidden}'")
        page_allowed = allowed_upper if is_index else agent_allowed_upper
        page_source = source if is_index else "neon manifest (agent card skin)"
        rogue = {h.upper() for h in re.findall(r"#[0-9A-Fa-f]{6}", page)} - page_allowed
        if rogue:
            errors.append(f"{label}: hexes outside {page_source}: {sorted(rogue)}")
    return errors


@gate("page-structure")
def check_structure(workdir: Path) -> list[str]:
    page = read_text(workdir / "index.html")
    errors = []
    theme = active_theme(workdir)
    for section_id in THEME_SECTION_IDS.get(theme, THEME_SECTION_IDS["gbauto"]):
        if f'id="{section_id}"' not in page:
            errors.append(f"missing required section id '{section_id}'")
    for marker, label in REQUIRED_PAGE_MARKERS:
        if marker not in page:
            errors.append(f"missing {label} ({marker})")
    return errors


@gate("agent-profiles")
def check_agent_profiles(workdir: Path) -> list[str]:
    """Roster themes: every agent in the manifest gets a clickable profile
    page, every roster link resolves, and MTG art (when used) carries artist
    attribution + the non-commercial rights record."""
    if active_theme(workdir) not in ROSTER_THEMES:
        return []
    manifest = load_structured(workdir / "sanitized-hermes-team.yaml")
    team = manifest["team"]
    agents = [team["lead_agent"], *team["specialist_agents"]]
    page = read_text(workdir / "index.html")
    errors = []
    for agent in agents:
        profile = workdir / "agents" / f"{agent['id']}.html"
        if not profile.exists():
            errors.append(f"missing agent profile page agents/{agent['id']}.html")
            continue
        body = read_text(profile)
        from _common import esc
        for needle, what in ((esc(agent["display_name"]), "display name"),
                             ("Draft profile config", "config section"),
                             ("Proposed skills", "skills section"),
                             ('href="../index.html"', "back link")):
            if needle not in body:
                errors.append(f"agents/{agent['id']}.html: missing {what}")
        if f'href="agents/{agent["id"]}.html"' not in page:
            errors.append(f"index.html: no roster/lead link to agents/{agent['id']}.html")

    mtg_path = workdir / "mtg-art-manifest.json"
    if mtg_path.exists():
        mtg = load_structured(mtg_path)
        if "NON-COMMERCIAL" not in mtg.get("rights", ""):
            errors.append("mtg-art-manifest.json: rights record missing NON-COMMERCIAL caveat")
        all_pages = [page] + [read_text(p) for p in theme_pages(workdir)[1:]]
        for agent_id, record in mtg.get("agents", {}).items():
            if not (workdir / record["image_local"]).exists():
                continue
            # attribution is owed for art that is RENDERED; fetched-but-unused
            # art (e.g. superseded by generated portraits) needs no credit line
            rel = record["image_local"].replace("\\", "/")
            if not any(rel in body for body in all_pages):
                continue
            credited = f'art: {record["artist"].lower()}'
            if not any(credited in body.lower() for body in all_pages):
                errors.append(f"art for {agent_id} rendered without artist attribution")
    return errors


GATES = [check_schemas, check_citations, check_secrets, check_fabrication,
         check_logo, check_provenance, check_brand, check_structure,
         check_agent_profiles]


def run_gates(workdir: Path) -> dict:
    rows = []
    for fn in GATES:
        try:
            errors = fn(workdir)
        except Exception as exc:  # a crashed gate is a failed gate, not a pass
            errors = [f"gate crashed: {exc}"]
        rows.append({
            "gate": fn.gate_name,
            "status": "fail" if errors else "pass",
            "detail": "; ".join(errors) if errors else "ok",
        })
    intake = load_structured(workdir / "intake.json") if (workdir / "intake.json").exists() else {}
    receipt = {
        "schema_version": "leadmagnet-validation-receipt.v1",
        "prospect_slug": intake.get("prospect_slug", "unknown"),
        "overall": "pass" if all(r["status"] == "pass" for r in rows) else "fail",
        "approval_state": "draft",
        "gates": rows,
        "remote_registration": "skipped_with_reason: local validation run",
    }
    dump_json(workdir / "validation-receipt.json", receipt)
    return receipt


def run_selftest() -> int:
    scripts = SKILL_ROOT / "scripts"
    with tempfile.TemporaryDirectory(prefix="leadmagnet-selftest-") as tmp:
        stages = [
            ["run_intake.py", "--workdir", tmp, "--fixture"],
            ["research_company.py", "--workdir", tmp, "--fixture"],
            ["verify_logo_asset.py", "--workdir", tmp],
            ["render_research_report.py", "--workdir", tmp],
            ["generate_team_manifest.py", "--workdir", tmp],
            ["substantiate_claims.py", "--workdir", tmp],
            ["generate_image_prompts.py", "--workdir", tmp],
            ["render_transcript_mock.py", "--workdir", tmp],
            ["forge_agent_cards.py", "--workdir", tmp],
            ["assemble_index.py", "--workdir", tmp],
            ["render_team_brief.py", "--workdir", tmp],
        ]
        for stage in stages:
            result = subprocess.run([sys.executable, str(scripts / stage[0]), *stage[1:]],
                                    capture_output=True, text=True)
            if result.returncode != 0:
                print(f"selftest: FAIL at {stage[0]}\n{result.stdout}{result.stderr}")
                return 1
        receipt = run_gates(Path(tmp))
        if receipt["overall"] != "pass":
            failing = [r for r in receipt["gates"] if r["status"] == "fail"]
            print(f"selftest: FAIL gates: {failing}")
            return 1
    print("selftest: PASS (full fixture pipeline + all gates)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selftest", action="store_true",
                        help="Run the full pipeline on the bundled fixture and validate it")
    parser.add_argument("--workdir", help="Prospect run output directory")
    args = parser.parse_args()

    if args.selftest:
        return run_selftest()
    if not args.workdir:
        parser.error("--workdir required unless --selftest")

    receipt = run_gates(Path(args.workdir))
    for row in receipt["gates"]:
        print(f"  [{row['status'].upper():4}] {row['gate']}: {row['detail']}")
    print(f"overall: {receipt['overall']} -> validation-receipt.json")
    return 0 if receipt["overall"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
