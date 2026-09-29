#!/usr/bin/env python
"""Optional stage 6e: render the forged cards to PNGs -> assets/cards/<id>.png.

Screenshots each card element out of agent-cards.html (forge_agent_cards.py)
with a headless Chromium so assemble_index.py can swap the full card onto the
ACTIVE roster-carousel panel (collapsed slats keep the portrait artwork).

OPTIONAL like fetch_mtg_art.py: requires Playwright + a browser, so CI and the
offline selftest skip it — assemble falls back to portrait-only panels when
assets/cards/ is absent. Backgrounds are omitted so the card corners stay
transparent (rounded edges survive into the panel).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _common import load_artifact, workdir_arg


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    args = parser.parse_args()

    workdir = Path(args.workdir)
    sheet = workdir / "agent-cards.html"
    if not sheet.exists():
        print("BLOCKED: agent-cards.html missing — run forge_agent_cards.py first",
              file=sys.stderr)
        return 2
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("BLOCKED: playwright not installed — optional stage, skipping is safe "
              "(pip install playwright && playwright install chromium)", file=sys.stderr)
        return 2

    manifest = load_artifact(workdir, "sanitized-hermes-team.yaml")
    ids = [manifest["team"]["lead_agent"]["id"]]
    ids += [a["id"] for a in manifest["team"]["specialist_agents"]]

    out_dir = workdir / "assets" / "cards"
    out_dir.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1200, "height": 900},
                                device_scale_factor=2)
        page.goto(sheet.resolve().as_uri())
        page.wait_for_timeout(1500)
        cards = page.locator(".card")
        count = cards.count()
        if count != len(ids):
            print(f"ERROR: {count} rendered cards but {len(ids)} agents — "
                  f"re-run forge_agent_cards.py", file=sys.stderr)
            browser.close()
            return 1
        # card order in the sheet == agent order in agent-cards.json (lead first)
        for i, agent_id in enumerate(ids):
            cards.nth(i).screenshot(path=str(out_dir / f"{agent_id}.png"),
                                    omit_background=True)
        browser.close()

    print(f"OK captured {len(ids)} card images -> assets/cards/ "
          f"(transparent corners, 2x scale)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
