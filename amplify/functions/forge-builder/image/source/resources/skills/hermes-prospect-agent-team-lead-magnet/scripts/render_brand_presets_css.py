#!/usr/bin/env python3
"""Render portable prospect brand preset JSON into scoped CSS packets."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


COLOR_TOKENS = (
    "canvas",
    "panel",
    "panel_alt",
    "line",
    "accent",
    "accent_bright",
    "text",
    "muted",
)
FONT_TOKENS = ("heading_font", "body_font")
ID_RE = re.compile(r"^[a-z0-9-]+$")
HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def validate_packet(packet: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if packet.get("schema_version") != "prospect-brand-presets.v1":
        errors.append("schema_version must be prospect-brand-presets.v1")
    presets = packet.get("presets")
    if not isinstance(presets, list) or not presets:
        return errors + ["presets must be a non-empty array"]
    ids: set[str] = set()
    for index, preset in enumerate(presets):
        prefix = f"presets[{index}]"
        preset_id = str(preset.get("id") or "")
        if not ID_RE.fullmatch(preset_id):
            errors.append(f"{prefix}.id must match {ID_RE.pattern}")
        if preset_id in ids:
            errors.append(f"duplicate preset id: {preset_id}")
        ids.add(preset_id)
        tokens = preset.get("tokens") if isinstance(preset.get("tokens"), dict) else {}
        for name in COLOR_TOKENS:
            if not HEX_RE.fullmatch(str(tokens.get(name) or "")):
                errors.append(f"{prefix}.tokens.{name} must be #RRGGBB")
        for name in FONT_TOKENS:
            value = str(tokens.get(name) or "")
            if not value or any(marker in value for marker in ("{", "}", ";", "<", ">")):
                errors.append(f"{prefix}.tokens.{name} is not a safe CSS font stack")
    if packet.get("default_preset") not in ids:
        errors.append("default_preset must reference a preset id")
    return errors


def render_css(packet: dict[str, Any]) -> str:
    errors = validate_packet(packet)
    if errors:
        raise ValueError("; ".join(errors))
    rules = [
        "/* prospect-brand-presets.v1 - scoped layer; canonical GB Auto tokens remain intact */"
    ]
    for preset in packet["presets"]:
        selector = f'body[data-prospect-theme="{preset["id"]}"]'
        tokens = preset["tokens"]
        declarations = [
            f"--prospect-{name.replace('_', '-')}:{tokens[name]}" for name in COLOR_TOKENS
        ]
        declarations += [
            f"--prospect-font-heading:{tokens['heading_font']}",
            f"--prospect-font-body:{tokens['body_font']}",
        ]
        rules.append(f"{selector}{{{';'.join(declarations)}}}")
    rules.append(
        """
body[data-prospect-theme]{background:var(--prospect-canvas);color:var(--prospect-text);font-family:var(--prospect-font-body)}
body[data-prospect-theme]::selection{background:var(--prospect-accent);color:var(--prospect-canvas)}
body[data-prospect-theme] h1,body[data-prospect-theme] h2,body[data-prospect-theme] h3,body[data-prospect-theme] h4,
body[data-prospect-theme] .brand-text,body[data-prospect-theme] .section-title,body[data-prospect-theme] .metadata-card-title,
body[data-prospect-theme] .trace-title,body[data-prospect-theme] .team-panel strong,body[data-prospect-theme] .role-card strong,
body[data-prospect-theme] .gate-card strong{font-family:var(--prospect-font-heading);color:var(--prospect-text)}
body[data-prospect-theme] p,body[data-prospect-theme] li,body[data-prospect-theme] .subtitle,
body[data-prospect-theme] .section-body,body[data-prospect-theme] .source-name{color:var(--prospect-muted)}
body[data-prospect-theme] a,body[data-prospect-theme] .eyebrow,body[data-prospect-theme] .section-index,
body[data-prospect-theme] .section-menu nav button span,body[data-prospect-theme] .metadata-card-action,
body[data-prospect-theme] .trace-action{color:var(--prospect-accent)}
body[data-prospect-theme] .topbar{border-color:var(--prospect-line);background:var(--prospect-panel)}
body[data-prospect-theme] header,body[data-prospect-theme] .layout,body[data-prospect-theme] .metadata-footer{background:var(--prospect-canvas)}
body[data-prospect-theme] .section-menu,body[data-prospect-theme] details.section,
body[data-prospect-theme] .metadata-card,body[data-prospect-theme] .trace-card,
body[data-prospect-theme] .team-panel,body[data-prospect-theme] .role-card,
body[data-prospect-theme] .gate-card,body[data-prospect-theme] .angel-panel,
body[data-prospect-theme] .brand-studio,body[data-prospect-theme] .preset-preview{
  border-color:var(--prospect-line);background:var(--prospect-panel);color:var(--prospect-text)
}
body[data-prospect-theme] details.section[open],body[data-prospect-theme] .section-body,
body[data-prospect-theme] .ascii-flow,body[data-prospect-theme] th,
body[data-prospect-theme] .pill,body[data-prospect-theme] .menu-actions button,
body[data-prospect-theme] .section-menu nav button{border-color:var(--prospect-line);background:var(--prospect-panel-alt);color:var(--prospect-text)}
body[data-prospect-theme] td,body[data-prospect-theme] .section-body,
body[data-prospect-theme] .metadata-card-body,body[data-prospect-theme] .trace-body,
body[data-prospect-theme] .metadata-footer{border-color:var(--prospect-line)}
body[data-prospect-theme] code{border-color:var(--prospect-line);background:var(--prospect-panel-alt);color:var(--prospect-accent-bright)}
body[data-prospect-theme] .group-count,body[data-prospect-theme] .primary-link,
body[data-prospect-theme] .preset-apply[aria-pressed="true"]{background:var(--prospect-accent);color:var(--prospect-canvas)}
body[data-prospect-theme] .role-card,body[data-prospect-theme] .gate-card{border-top-color:var(--prospect-accent)}
body[data-prospect-theme] .role-id,body[data-prospect-theme] .section-count,
body[data-prospect-theme] .menu-title,body[data-prospect-theme] .metadata-list dt{color:var(--prospect-muted)}
body[data-prospect-theme] .metadata-list dd,body[data-prospect-theme] .metadata-grid strong{color:var(--prospect-text)}
body[data-prospect-theme] .preset-apply{border-color:var(--prospect-line);background:var(--prospect-panel-alt);color:var(--prospect-text)}
body[data-prospect-theme] .preset-apply:hover{border-color:var(--prospect-accent);color:var(--prospect-accent)}
""".strip()
    )
    return "\n".join(rules) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packet", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    try:
        packet = json.loads(args.packet.read_text(encoding="utf-8"))
        css = render_css(packet)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(css, encoding="utf-8", newline="\n")
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2))
        return 2
    print(json.dumps({"ok": True, "out": str(args.out), "bytes": len(css.encode('utf-8'))}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
