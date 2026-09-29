#!/usr/bin/env python
"""Stage 6d: forge the agent team as ORIGINAL trading cards -> agent-cards.html.

Renders the drafted roster as a Magic-style card set via the agent-card-forge
skill (resources/skills/agent-card-forge): original frame, our text layer, and
generated art when assets/generated/<id>.png exists (flat art window otherwise).
This is the rights-clean replacement for real card faces on prospect pages —
no Wizards of the Coast material is used or reproduced.

Outputs (all in --workdir):
  agent-cards.json  — the card data model (one card per agent)
  agent-cards.html  — the full team card sheet (art linked, badge inlined)
  lead-card.html    — single lead-agent card sized for the orchestrator embed

Deterministic and offline; frame color is tinted from the client brand accent.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from _common import (
    dump_json, find_repo_root, load_artifact, pick_accent, read_text,
    scan_fabrication, scan_secrets, workdir_arg,
)

# manifest model_tier -> (card-forge tier, mana cost, power/toughness)
TIER_MAP = {
    "sol": ("gpt-5.6-sol", 5, "3 / 3"),
    "terra": ("gpt-5.6-terra", 4, "2 / 2"),
    "luna": ("gpt-5.6-luna", 2, "1 / 1"),
}
# manifest role_tier -> card type line (left half)
TYPE_BY_ROLE = {"team_leader": "Orchestrator", "senior": "Specialist", "junior": "Utility"}
# role-keyed flavor lines — fixed copy, nothing prospect-derived (fabrication-safe)
FLAVOR = {
    "Orchestrator": "“One hand raised, and the whole team moves as one.”",
    "Specialist": "“Scoped to one purpose, accountable for all of it.”",
    "Utility": "“Small, fast, and everywhere at once.”",
}


def card_for(agent: dict, index: int, total: int, workdir: Path) -> dict:
    tier, cost, pt = TIER_MAP[agent["model_tier"]]
    rules = [
        {"abil": "{T}:", "text": f" {s['name'].replace('-', ' ').title()}. {s['description']}"}
        for s in agent.get("proposed_skills", [])[:2]
    ]
    if not rules:
        rules = [{"abil": "", "text": agent.get("purpose", "")}]
    card = {
        "name": agent["display_name"],
        "agentType": TYPE_BY_ROLE.get(agent.get("role_tier", "senior"), "Specialist"),
        "tier": tier,
        "cost": cost,
        "set": "GBA",
        "collector": f"{index:03d}/{total:03d}",
        "rules": rules,
        "flavor": FLAVOR[TYPE_BY_ROLE.get(agent.get("role_tier", "senior"), "Specialist")],
        "pt": pt,
    }
    art_rel = f"assets/generated/{agent['id']}.png"
    if (workdir / art_rel).exists():
        card["art"] = art_rel
        card["illus"] = "Illus. gpt-image-2 — GBAutomation original"
    else:
        card["illus"] = "Art drafted on activation"
    return card


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    args = parser.parse_args()

    workdir = Path(args.workdir)
    manifest = load_artifact(workdir, "sanitized-hermes-team.yaml")
    logo = load_artifact(workdir, "logo-verification.json")
    accent = pick_accent(logo.get("brand_colors") or [])
    company = manifest["prospect"]["company_name"]

    team = [manifest["team"]["lead_agent"], *manifest["team"]["specialist_agents"]]
    cards = [card_for(agent, i + 1, len(team), workdir) for i, agent in enumerate(team)]
    cards_path = workdir / "agent-cards.json"
    dump_json(cards_path, cards)

    root = find_repo_root()
    forge = (root / "resources" / "skills" / "agent-card-forge" / "scripts"
             / "render_cards.py") if root else Path("missing")
    if not forge.exists():
        print(f"BLOCKED: agent-card-forge skill not found at {forge}", file=sys.stderr)
        return 2

    def render(cards_file: Path, out_name: str, *extra: str) -> int:
        result = subprocess.run(
            [sys.executable, str(forge), str(cards_file), str(workdir / out_name),
             "--art-dir", str(workdir), "--accent", accent,
             "--link-art", "--allow-missing-art", *extra],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(f"card render failed for {out_name}:\n{result.stdout}{result.stderr}",
                  file=sys.stderr)
        return result.returncode

    if render(cards_path, "agent-cards.html", "--embed", "--zoom", "0.55",
              "--title", f"{company} — drafted agent team, as a card set"):
        return 1
    lead_only = workdir / "lead-card.tmp.json"
    dump_json(lead_only, cards[:1])
    rc = render(lead_only, "lead-card.html", "--embed", "--zoom", "0.62",
                "--title", f"{company} — ops lead card")
    lead_only.unlink(missing_ok=True)
    if rc:
        return 1

    for name in ("agent-cards.html", "lead-card.html"):
        text = read_text(workdir / name)
        leaks = scan_secrets(text) + scan_fabrication(text)
        if leaks:
            print(f"GATE FAIL: {name} contains {leaks}", file=sys.stderr)
            return 1

    print(f"OK forged {len(cards)} agent cards (accent {accent}) -> "
          f"agent-cards.html + lead-card.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
