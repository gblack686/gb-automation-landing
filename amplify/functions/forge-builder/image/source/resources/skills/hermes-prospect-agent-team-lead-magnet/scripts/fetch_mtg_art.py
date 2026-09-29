#!/usr/bin/env python
"""Optional stage 6b: fetch MTG card art for each agent -> assets/mtg/ + manifest.

Pulls art_crop images from Scryfall for the pinned card in
templates/mtg-card-map.json (fuzzy named lookup, tier fallback for unmapped
roles). Every record carries the artist attribution (mandatory wherever the
art renders) and the rights caveat: card art is (c) Wizards of the Coast and
the WotC Fan Content Policy is NON-COMMERCIAL — internal demo use only until
replaced with licensed or generated art before any Gate-3 prospect publish.

Offline-safe pipeline: this stage is OPTIONAL. When it hasn't run (CI,
selftest), assemble_index.py falls back to the deterministic SVG treatment.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from _common import TEMPLATES, dump_json, load_artifact, read_text, workdir_arg

API = "https://api.scryfall.com/cards/named?fuzzy="
UA = {"User-Agent": "gbauto-leadmagnet/1.0 (internal demo tooling)", "Accept": "application/json"}
RIGHTS = ("Card art (c) Wizards of the Coast. WotC Fan Content Policy is "
          "NON-COMMERCIAL: internal demo use only — replace with licensed or "
          "generated art before any Gate-3 prospect publish.")


def fetch_card(name: str) -> dict:
    url = API + urllib.parse.quote(name)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(resp.read())


def art_uri(card: dict) -> str | None:
    if "image_uris" in card:
        return card["image_uris"].get("art_crop")
    faces = card.get("card_faces") or []
    if faces and "image_uris" in faces[0]:
        return faces[0]["image_uris"].get("art_crop")
    return None


def fetch_unique_arts(card_name: str) -> list[dict]:
    """All unique-art printings of one card, oldest first (deterministic)."""
    query = urllib.parse.quote(f'!"{card_name}"')
    url = f"https://api.scryfall.com/cards/search?q={query}&unique=art&order=released&dir=asc"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return [c for c in json.load(resp).get("data", []) if art_uri(c)]


# Logo-color -> MTG color identity -> an OPERATOR-APPROVED lead card (all six
# are in templates/approved-mtg-cards.json): the Kamigawa legendary-dragon
# cycle per color, and monochrome marks (near-black/white/gray) read as
# artifact/colorless -> Platinum Angel.
LEAD_CARD_BY_COLOR = {
    "W": "Yosei, the Morning Star",
    "U": "Keiga, the Tide Star",
    "B": "Kokusho, the Evening Star",
    "R": "Ryusei, the Falling Star",
    "G": "Jugan, the Rising Star",
    "C": "Platinum Angel",
}

APPROVED_PATH = TEMPLATES / "approved-mtg-cards.json"


def load_approved() -> list[dict]:
    """Operator-approved card pool — favorited in the avatar-set-gallery and
    exported as tac-lead-avatar-votes*.json (curated 2026-07, latest-vote-wins)."""
    if APPROVED_PATH.exists():
        return json.loads(read_text(APPROVED_PATH)).get("cards", [])
    return []


def pick_from_pool(pin_name: str, approved: list[dict], taken: set[str], idx: int) -> tuple[str, bool]:
    """Approved-pool guard: keep the pinned card when it's approved and free;
    otherwise substitute deterministically (rotate the name-sorted pool by
    agent index, skipping cards already assigned). Returns (name, substituted)."""
    names = {c["name"] for c in approved}
    if pin_name in names and pin_name not in taken:
        return pin_name, False
    pool = sorted(names - taken)
    if not pool:
        return pin_name, False
    return pool[idx % len(pool)], True


def mtg_color_for_hexes(brand_colors: list[str]) -> str:
    """Map the first chromatic brand color to WUBRG; monochrome -> C."""
    for color in brand_colors or []:
        r, g, b = (int(color[i:i + 2], 16) for i in (1, 3, 5))
        if max(r, g, b) - min(r, g, b) <= 24:
            continue  # neutral — keep looking
        if r > g and r > b:
            return "W" if g > 160 and b < 120 else "R"   # golds read white, reds red
        if b > r and b > g:
            return "B" if r > b * 0.7 and g < 100 else "U"  # purples read black
        if g >= r and g >= b:
            return "G"
    return "C"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--single-card",
                        help="Use every unique-art printing of ONE card across the roster "
                             "(round-robin, oldest art first) instead of the per-role map, "
                             "e.g. --single-card 'Platinum Angel'")
    parser.add_argument("--lead-by-logo-color", action="store_true",
                        help="Choose the LEAD agent's card from the client's logo colors "
                             "(logo-verification.json brand_colors -> MTG color identity) "
                             "and also download the full card face for the orchestrator section")
    parser.add_argument("--any-card", action="store_true",
                        help="Bypass the operator-approved card pool "
                             "(templates/approved-mtg-cards.json) — by default every "
                             "pick must come from the approved favorites")
    args = parser.parse_args()

    workdir = Path(args.workdir)
    manifest = load_artifact(workdir, "sanitized-hermes-team.yaml")
    card_map = json.loads(read_text(TEMPLATES / "mtg-card-map.json"))
    approved = [] if args.any_card else load_approved()
    if approved:
        print(f"  approved pool active: {len(approved)} operator-favorited cards")
        if args.single_card and args.single_card not in {c["name"] for c in approved}:
            print(f"  WARNING: --single-card '{args.single_card}' is not in the "
                  f"approved pool (explicit operator override, proceeding)")

    agents = [("lead_agent", manifest["team"]["lead_agent"])]
    agents += [(a["id"], a) for a in manifest["team"]["specialist_agents"]]

    prints: list[dict] = []
    if args.single_card:
        prints = fetch_unique_arts(args.single_card)
        if not prints:
            print(f"ERROR: no unique-art printings found for '{args.single_card}'", file=sys.stderr)
            return 1
        print(f"  {len(prints)} unique arts of {args.single_card} — assigning round-robin")

    lead_pin_card = None
    if args.lead_by_logo_color:
        logo = load_artifact(workdir, "logo-verification.json")
        mtg_color = mtg_color_for_hexes(logo.get("brand_colors") or [])
        lead_pin_card = LEAD_CARD_BY_COLOR[mtg_color]
        print(f"  logo colors {logo.get('brand_colors')} -> MTG color '{mtg_color}' "
              f"-> lead card {lead_pin_card}")

    records, failures = {}, []
    taken: set[str] = set()
    for idx, (role_key, agent) in enumerate(agents):
        pin = card_map["roles"].get(role_key) or card_map["tier_fallbacks"][agent["model_tier"]]
        try:
            if role_key == "lead_agent" and lead_pin_card:
                card = fetch_card(lead_pin_card)
                why = f"lead card chosen from the client logo colors — {lead_pin_card}"
            elif args.single_card:
                card = prints[idx % len(prints)]
                why = f"{args.single_card} — {card.get('set_name', '')} printing"
            else:
                name, why = pin["card"], pin["why"]
                if approved:
                    name, substituted = pick_from_pool(name, approved, taken, idx)
                    if substituted:
                        why = (f"operator-approved gallery pick (pinned '{pin['card']}' "
                               f"is not in the approved pool)")
                card = fetch_card(name)
            taken.add(card["name"])
            uri = art_uri(card)
            if not uri:
                raise ValueError(f"no art_crop for {card.get('name', '?')}")
            agent_id = agent["id"]
            local = f"assets/mtg/{agent_id}.jpg"
            download(uri, workdir / local)
            records[agent_id] = {
                "card_name": card["name"],
                "set_name": card.get("set_name", ""),
                "artist": card.get("artist", "unknown artist"),
                "scryfall_uri": card.get("scryfall_uri", ""),
                "why": why,
                "image_local": local,
                "rights": RIGHTS,
                "approval_status": "draft",
            }
            if role_key == "lead_agent" and args.lead_by_logo_color:
                face = (card.get("image_uris") or {}).get("normal") or \
                       ((card.get("card_faces") or [{}])[0].get("image_uris") or {}).get("normal")
                if face:
                    card_local = f"assets/mtg/{agent_id}-card.jpg"
                    download(face, workdir / card_local)
                    records[agent_id]["card_image_local"] = card_local
            print(f"  OK {agent_id} <- {card['name']} [{card.get('set_name','')}] (art: {records[agent_id]['artist']})")
            time.sleep(0.15)  # Scryfall asks for ~10 req/s max; stay well under
        except Exception as exc:
            failures.append(f"{agent['id']}: {exc}")

    if failures:
        print("FETCH FAILURES (pipeline continues on SVG fallback for these):")
        for f in failures:
            print(f"  - {f}")

    if not records:
        print("ERROR: no card art fetched — check network / Scryfall availability", file=sys.stderr)
        return 1

    dump_json(workdir / "mtg-art-manifest.json", {
        "schema_version": "leadmagnet-mtg-art.v1",
        "rights": RIGHTS,
        "agents": records,
    })
    print(f"OK {len(records)} card arts -> mtg-art-manifest.json (rights: NON-COMMERCIAL demo)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
