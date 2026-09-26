#!/usr/bin/env python
"""Stage 8: render the print-friendly team-brief.md from upstream artifacts."""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

from _common import (
    TEMPLATES, load_artifact, read_text, render_template, workdir_arg, write_text,
)


def layer_outline(manifest: dict) -> str:
    """ASCII three-layer team outline (vault doctrine: profile = boundary,
    skill = procedure, canopy = inherited behavior)."""
    import textwrap
    team = manifest["team"]
    lead = team["lead_agent"]

    def row(name: str, tier: str, role: str) -> str:
        return f"| {name:<42}{tier:<8}{role:<18} |"

    bar = "+" + "-" * 70 + "+"
    lines = ["LAYER 1 - PROFILES · operating boundaries", bar]
    lines.append(row(f"* {lead['display_name']}"[:42], lead["model_tier"],
                     lead.get("role_tier", "team_leader").replace("_", " ") + " (planner)"))
    for agent in team["specialist_agents"]:
        lines.append(row(f"  {agent['display_name']}"[:42], agent["model_tier"],
                         agent.get("role_tier", "specialist")))
    lines.append(bar)

    rack = " · ".join(s["name"] for s in team.get("core_skill_rack", []))
    lines.append("LAYER 2 - SKILLS · reusable procedures")
    lines.append(bar)
    for wrapped in textwrap.wrap("core rack (shared): " + rack, width=68) or [""]:
        lines.append(f"| {wrapped:<68} |")
    lines.append(f"| {'role skills: see each agent profile page':<68} |")
    lines.append(bar)

    canopy = " · ".join(c["snippet"] for c in team.get("canopy_inheritance", []))
    lines.append("LAYER 3 - INHERITED BEHAVIOR · Canopy contract")
    lines.append(bar)
    for wrapped in textwrap.wrap(canopy, width=68) or [""]:
        lines.append(f"| {wrapped:<68} |")
    lines.append(bar)
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--generated-on", default=None)
    args = parser.parse_args()

    workdir = Path(args.workdir)
    intake = load_artifact(workdir, "intake.json")
    research = load_artifact(workdir, "research-citations.json")
    manifest = load_artifact(workdir, "sanitized-hermes-team.yaml")
    claim_map = load_artifact(workdir, "claim-map.json")

    lead = manifest["team"]["lead_agent"]
    limitation = next(c["text"] for c in claim_map["claims"] if c["claim_type"] == "limitation")

    context = {
        "layer_outline": layer_outline(manifest),
        "core_rack_rows": "\n".join(
            f"- **{s['name']}** — {s['description']}"
            for s in manifest["team"].get("core_skill_rack", [])
        ) or "- Defined with the activation scope.",
        "company_name": intake["company_name"],
        "safety_line": limitation,
        "generated_on": args.generated_on or dt.date.today().isoformat(),
        "thesis": (f"A drafted, not-yet-active Hermes agent team aimed at: "
                   f"{intake['desired_business_outcome']}"),
        "lead_block": (f"**{lead['display_name']}** (tier: {lead['model_tier']})\n\n"
                       f"{lead['purpose']}\n\n"
                       + "\n".join(f"- {b.replace('_', ' ')}" for b in lead["approval_boundaries"])),
        "specialist_rows": "\n".join(
            f"- **{a['display_name']}** ({a['model_tier']}) — {a['purpose']}"
            for a in manifest["team"]["specialist_agents"]
        ) + ("\n\nThe full roster is also rendered as an original card set: "
             "[agent-cards.html](agent-cards.html)."
             if (workdir / "agent-cards.html").exists() else ""),
        "fact_rows": "\n".join(
            f"- [{f['confidence']}] {f['text']}"
            + "".join(f" (source: {s['url']})" for s in f.get("sources", [])[:1])
            for f in research["facts"]
        ),
        "trial_rows": "\n".join(
            f"- **{day}** — {text}" for day, text in [
                ("Day 0", "activation scope approved by you"),
                ("Day 1", "sanitized workspace created; activation receipt logged"),
                ("Days 2–6", "daily guided briefs; external actions approval-gated"),
                ("Day 7", "mid-trial checkpoint"),
                ("Days 8–13", "bounded workflows under updated rules"),
                ("Day 14", "closeout report: keep / kill / convert"),
            ]
        ),
    }

    brief = render_template(read_text(TEMPLATES / "team-brief.md.j2"), context)
    write_text(workdir / "team-brief.md", brief)
    print(f"OK team brief -> team-brief.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
