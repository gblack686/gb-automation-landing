#!/usr/bin/env python
"""Stage 3: logo rights check -> logo-verification.json (+ optional download).

Default is the safe path: text lockup. `verified_logo` mode requires BOTH a
logo source URL and an explicit rights basis; the asset is then downloaded to
<workdir>/assets/brand/ so the page renders the client's own mark. Brand
colors observed on the client's public site can be recorded with
--brand-color; the client-report brand gate unions them into its palette.
Hermes attribution is always text-only per the brand-asset policy.
"""
from __future__ import annotations

import argparse
import re
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

from _common import dump_json, fail_gate, load_artifact, workdir_arg

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) gbauto-leadmagnet/1.0"}
HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def download_logo(url: str, workdir: Path) -> str:
    ext = Path(urlparse(url).path).suffix.lower() or ".png"
    if ext not in (".png", ".svg", ".jpg", ".jpeg", ".webp"):
        ext = ".png"
    rel = f"assets/brand/logo{ext}"
    dest = workdir / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        dest.write_bytes(resp.read())
    return rel


def extract_brand_colors(logo_path: Path, max_colors: int = 4) -> list[str]:
    """Logo-first branding: pull the dominant opaque colors straight from the
    downloaded mark (quantized to 16-step buckets, ordered by coverage).
    Requires Pillow; raster formats only — returns [] when unavailable so the
    operator-provided --brand-color list stays the fallback."""
    try:
        from PIL import Image
    except ImportError:
        return []
    try:
        img = Image.open(logo_path).convert("RGBA")
    except Exception:
        return []
    counts: dict[tuple, int] = {}
    for r, g, b, a in img.getdata():
        if a < 128:
            continue
        key = (r // 16 * 16, g // 16 * 16, b // 16 * 16)
        counts[key] = counts.get(key, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
    return ["#%02X%02X%02X" % c for c, _ in ranked[:max_colors]]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--logo-url", help="Public press-kit/brand-page logo URL")
    parser.add_argument("--rights-basis", choices=["press_kit_or_brand_page", "explicit_permission"],
                        help="Why usage is believed permitted (required with --logo-url)")
    parser.add_argument("--brand-color", action="append", default=[],
                        help="Observed client brand hex (repeatable, e.g. --brand-color '#000000')")
    parser.add_argument("--notes", default="")
    args = parser.parse_args()

    workdir = Path(args.workdir)
    intake = load_artifact(workdir, "intake.json")

    if args.logo_url and not args.rights_basis:
        fail_gate(["--logo-url given without --rights-basis; unclear rights must use text lockup"],
                  "logo-rights")
    if args.logo_url and urlparse(args.logo_url).scheme not in ("http", "https"):
        fail_gate([f"logo url '{args.logo_url}' is not public http(s)"], "logo-rights")
    bad_hexes = [c for c in args.brand_color if not HEX_RE.match(c)]
    if bad_hexes:
        fail_gate([f"--brand-color '{c}' is not a #RRGGBB hex" for c in bad_hexes], "logo-rights")

    verified = bool(args.logo_url and args.rights_basis)
    logo_local = None
    brand_colors = [c.upper() for c in args.brand_color]
    if verified:
        try:
            logo_local = download_logo(args.logo_url, workdir)
        except Exception as exc:
            fail_gate([f"logo download failed ({exc}) — rerun or fall back to text lockup"],
                      "logo-rights")
        if not brand_colors:
            brand_colors = extract_brand_colors(workdir / logo_local)
            if brand_colors:
                print(f"  brand colors extracted from logo: {brand_colors}")

    receipt = {
        "schema_version": "prospect-logo-verification.v1",
        "mode": "verified_logo" if verified else "text_lockup",
        "company_name": intake["company_name"],
        "logo_source_url": args.logo_url if verified else None,
        "logo_local": logo_local,
        "brand_colors": brand_colors,
        "brand_colors_source": ("operator_provided" if args.brand_color
                                 else "extracted_from_logo" if brand_colors else "none"),
        "rights_basis": args.rights_basis if verified else "unclear_use_text_lockup",
        "hermes_attribution": "text_only_no_logo",
        "notes": args.notes or ("verified public brand asset" if verified
                                 else "no verified logo rights — page renders a text lockup"),
    }
    dump_json(workdir / "logo-verification.json", receipt)
    print(f"OK logo verification mode={receipt['mode']}"
          + (f" logo={logo_local}" if logo_local else "")
          + (f" brand_colors={receipt['brand_colors']}" if receipt['brand_colors'] else "")
          + " -> logo-verification.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
