#!/usr/bin/env python
"""Optional stage 6b2: seed the whole agent art set on the color-matched MTG card.

The point of the art pipeline: the client's logo colors pick an OPERATOR-
APPROVED MTG card (templates/approved-mtg-cards.json — e.g. a green mark lands
on Seedborn Muse), that card's art becomes the STYLE SEED, and every agent
portrait is generated as an ORIGINAL gpt-image-2 variant of it (images.edit)
-> assets/generated/<id>.png. One seed, one visual family, per client.

Rights: the WotC art is only the generation seed — it never ships; every
published portrait is an original generation, attributed in
seeded-art-manifest.json (seed card name + original artist, factual credit).

`--base-prompt "<description>"` bypasses MTG entirely: the set is generated
from the text description alone (e.g. 'star wars steampunk gardener'), so no
third-party material appears anywhere in the generation chain — the fully
rights-clean path for real prospect sends.

Requires network + OPENAI_API_KEY (exit 2 when unavailable) and runs BEFORE
forge_agent_cards.py / capture_card_images.py so the forged cards and the
carousel inherit the seeded set. ~180s connection cutoff on the office PC:
use --quality low here; run higher quality on the Mac Mini.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from _common import dump_json, find_repo_root, load_artifact, workdir_arg
from fetch_mtg_art import LEAD_CARD_BY_COLOR, art_uri, download, fetch_card, mtg_color_for_hexes

# neutral DNA: inherit the seed's look instead of imposing a house palette
DNA = ("Fantasy trading-card illustration, painterly digital art, landscape "
       "composition. Match the visual style, palette, setting, lighting and "
       "mood of the reference image exactly. ")

# prompt-seeded mode DNA: no reference image — the base description IS the
# style seed, so the family constraint is stated in words. gpt-image-2 mangles
# lettering, so every prompt bans text outright.
PROMPT_DNA = ("Fantasy trading-card illustration, painterly digital art, "
              "landscape composition. One unified visual family across the "
              "set: identical palette, lighting, rendering style and mood. "
              "Scene and character style inspired by: {base}. Wholly original "
              "characters and designs — do not depict any recognizable "
              "franchise character, costume, armor, droid or insignia. ")
NO_TEXT = (" Absolutely no text, letters, numbers, watermarks or logos "
           "anywhere in the image.")

ROLE_PROMPTS = {
    "team_leader": ("The subject is now the commanding team orchestrator, one hand "
                    "raised directing unseen forces, radiating calm authority. "
                    "A leader archetype."),
    "senior": ("The subject is now a focused senior specialist examining glowing "
               "streams of information with complete attention. An expert archetype."),
    "junior": ("The subject is now a small, swift scout moving between tasks, alert "
               "and precise. A utility archetype."),
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--seed-card",
                        help="Approved MTG card to seed the set on (default: the "
                             "logo-color-matched lead card, e.g. Seedborn Muse for green)")
    parser.add_argument("--base-prompt",
                        help="Text description to seed the whole set on INSTEAD of an "
                             "MTG card (e.g. 'star wars steampunk gardener') — no WotC "
                             "material anywhere in the generation chain")
    parser.add_argument("--quality", default="low", choices=["low", "medium", "high"])
    parser.add_argument("--force", action="store_true",
                        help="Regenerate portraits that already exist")
    args = parser.parse_args()

    if args.seed_card and args.base_prompt:
        print("ERROR: --seed-card and --base-prompt are mutually exclusive", file=sys.stderr)
        return 1
    if not os.environ.get("OPENAI_API_KEY"):
        print("BLOCKED: OPENAI_API_KEY not set — optional stage, skipping is safe",
              file=sys.stderr)
        return 2

    workdir = Path(args.workdir)
    manifest = load_artifact(workdir, "sanitized-hermes-team.yaml")
    logo = load_artifact(workdir, "logo-verification.json")

    root = find_repo_root()
    forge_scripts = (root / "resources" / "skills" / "agent-card-forge" / "scripts"
                     ) if root else None

    card, seed_path = None, None
    if args.base_prompt:
        print(f"  seed: text prompt '{args.base_prompt}' (no MTG material)")
        generator = forge_scripts / "generate_gpt_image.py" if forge_scripts else None
        if not generator or not generator.exists():
            print("BLOCKED: agent-card-forge generate_gpt_image.py not found",
                  file=sys.stderr)
            return 2
    else:
        seed_name = args.seed_card or LEAD_CARD_BY_COLOR[
            mtg_color_for_hexes(logo.get("brand_colors") or [])]
        card = fetch_card(seed_name)
        uri = art_uri(card)
        if not uri:
            print(f"ERROR: no art_crop for seed card {seed_name}", file=sys.stderr)
            return 1
        seed_path = workdir / "assets" / "seed" / "seed-card-art.jpg"
        download(uri, seed_path)
        print(f"  seed: {card['name']} — art by {card.get('artist', '?')} "
              f"[{card.get('set_name', '')}]")
        generator = forge_scripts / "generate_variant.py" if forge_scripts else None
        if not generator or not generator.exists():
            print("BLOCKED: agent-card-forge generate_variant.py not found",
                  file=sys.stderr)
            return 2

    agents = [manifest["team"]["lead_agent"], *manifest["team"]["specialist_agents"]]
    out_dir = workdir / "assets" / "generated"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Resume is only valid within the SAME seed: existing portraits from a
    # different card/prompt are stale, not reusable — skipping them would
    # silently ship a mixed visual family.
    seed_sig = (("prompt_seeded", args.base_prompt) if args.base_prompt
                else ("card_seeded", card["name"]))
    prior_path = workdir / "seeded-art-manifest.json"
    stale = False
    if prior_path.exists():
        prior = json.loads(prior_path.read_text(encoding="utf-8"))
        prior_sig = (prior.get("mode", "card_seeded"),
                     prior.get("base_prompt") or prior.get("seed_card"))
        stale = prior_sig != seed_sig
        if stale:
            print(f"  seed changed ({prior_sig[1]!r} -> {seed_sig[1]!r}) — existing "
                  "portraits are stale and will be regenerated")

    outputs, skipped = [], []
    for agent in agents:
        dest = out_dir / f"{agent['id']}.png"
        if dest.exists() and not args.force and not stale:
            skipped.append(agent["id"])
            continue
        role = (ROLE_PROMPTS.get(agent.get("role_tier", "senior"), ROLE_PROMPTS["senior"])
                + f" It embodies the {agent['display_name']} role.")
        if args.base_prompt:
            prompt = PROMPT_DNA.format(base=args.base_prompt) + role + NO_TEXT
            cmd = ["uv", "run", str(generator), prompt, str(dest),
                   "--quality", args.quality, "--size", "1536x1024"]
        else:
            cmd = ["uv", "run", str(generator), str(seed_path), role, str(dest),
                   "--quality", args.quality, "--dna", DNA]
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(workdir))
        if result.returncode != 0:
            print(f"ERROR generating {agent['id']}:\n{result.stdout[-400:]}"
                  f"{result.stderr[-400:]}", file=sys.stderr)
            return 1
        outputs.append(agent["id"])
        print(f"  OK {agent['id']} <- "
              + (f"prompt-seeded set" if args.base_prompt else f"variant of {card['name']}"))

    dump_json(workdir / "seeded-art-manifest.json", {
        "schema_version": "leadmagnet-seeded-art.v1",
        "mode": "prompt_seeded" if args.base_prompt else "card_seeded",
        "seed_card": card["name"] if card else None,
        "seed_artist": card.get("artist", "") if card else None,
        "seed_scryfall_uri": card.get("scryfall_uri", "") if card else None,
        "base_prompt": args.base_prompt or None,
        "note": ("Portraits are ORIGINAL gpt-image-2 generations from a text style "
                 "description — no third-party material in the generation chain."
                 if args.base_prompt else
                 "Portraits are ORIGINAL gpt-image-2 generations style-seeded on the "
                 "operator-approved card above; the seed art itself never ships."),
        "generated": outputs,
        "skipped_existing": skipped,
        "quality": args.quality,
    })
    print(f"OK seeded set: {len(outputs)} generated, {len(skipped)} kept "
          f"-> seeded-art-manifest.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
