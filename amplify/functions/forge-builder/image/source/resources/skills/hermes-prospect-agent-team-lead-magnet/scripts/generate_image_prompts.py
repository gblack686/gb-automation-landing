#!/usr/bin/env python
"""Stage 6: Image 2.0 prompts + provenance -> image-provenance.json + assets/.

Default provider is the deterministic SVG fallback (renders immediately, always
passes brand + no-fabrication gates). `--provider image_2_0` only writes the
prompts/provenance for a later gated generation run — this stage never calls an
image API itself. Prompt fingerprints bind each prompt to the verified facts it
was allowed to see.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _common import (
    ASSETS, dump_json, esc, fail_gate, load_artifact, load_schema, read_text,
    render_template, sha256_fingerprint, validate_schema, workdir_arg, write_text,
)

BRAND_SOURCE = "second-brain/systems/brand/gbauto-brand-tokens.md"
GB_CONSTRAINTS = (
    "GBAutomation visual system: warm cream #F3F1E7 field, terracotta #D97757 accents, "
    "ink #191919 detail; editorial, calm, abstract; zero text or lettering in image"
)
NEGATIVE = (
    "no real people, no employee likenesses, no offices or facilities, no product "
    "screenshots, no dashboards, no customer names, no metrics, no text, no logos"
)

ASSET_SPECS = [
    ("hero_world", "hero-world.svg.j2",
     "Abstract aerial-calm operations landscape for a {industry} business, layered "
     "cream and terracotta topography suggesting orderly flow"),
    ("team_collaboration", "team-collaboration.svg.j2",
     "Abstract network of {agent_count} glowing agent nodes exchanging work along "
     "clean paths into one synthesis point, glass-panel geometry"),
    ("industry_workflow", "industry-workflow.svg.j2",
     "Abstract {industry} workflow: intake, analysis, human approval gate, daily "
     "brief — four calm stations connected left to right"),
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--provider", choices=["deterministic_svg_fallback", "image_2_0"],
                        default="deterministic_svg_fallback")
    args = parser.parse_args()

    workdir = Path(args.workdir)
    intake = load_artifact(workdir, "intake.json")
    research = load_artifact(workdir, "research-citations.json")
    manifest = load_artifact(workdir, "sanitized-hermes-team.yaml")

    verified_facts = [f for f in research["facts"] if f["confidence"] == "verified"]
    industry = next((f["text"] for f in verified_facts if f.get("category") == "industry"),
                    "operations")
    context = {
        "industry": industry,
        "agent_count": 1 + len(manifest["team"]["specialist_agents"]),
        "company_name": esc(intake["company_name"]),
    }
    fact_ids = [f["fact_id"] for f in verified_facts]

    assets_out = workdir / "assets"
    records = []
    for asset_id, fallback_name, prompt_tpl in ASSET_SPECS:
        prompt = f"{prompt_tpl.format(**context)}. {GB_CONSTRAINTS}"
        output_path = None
        if args.provider == "deterministic_svg_fallback":
            svg_tpl = read_text(ASSETS / "deterministic-visual-fallbacks" / fallback_name)
            svg = render_template(svg_tpl, context)
            output_path = f"assets/{asset_id}.svg"
            write_text(assets_out / f"{asset_id}.svg", svg)
        records.append({
            "asset_id": asset_id,
            "provider": args.provider,
            "model": None,
            "seed": None,
            "prompt_fingerprint": sha256_fingerprint(prompt, NEGATIVE, *fact_ids),
            "source_fact_ids": fact_ids,
            "company_logo_colors_used": [],
            "gbauto_constraints_source": BRAND_SOURCE,
            "prompt": prompt,
            "negative_prompt": NEGATIVE,
            "output_path": output_path,
            "approval_status": "fallback_used" if args.provider == "deterministic_svg_fallback" else "draft",
            "review_notes": "",
        })

    provenance = {"schema_version": "image2-provenance.v1", "assets": records}
    errors = validate_schema(provenance, load_schema("image-provenance.schema.json"), "provenance")
    if errors:
        fail_gate(errors, "image-provenance")

    dump_json(workdir / "image-provenance.json", provenance)
    print(f"OK {len(records)} visuals ({args.provider}) -> image-provenance.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
