"""Reusable color-preset registry for the canonical GBauto document shell.

GB Auto is the immutable internal default. The 24 external presets are complete
17-token systems intended for client/showcase previews in the document drawer.
Selections are applied in-browser only; this module performs no network writes.
"""
from __future__ import annotations

import html as html_lib
import json
import re
from typing import Any, Dict, List, Mapping, Sequence, Tuple


THEME_STORAGE_KEY = "gbauto.document.color-preset.v1"
THEME_TOKEN_KEYS: Tuple[str, ...] = (
    "canvas",
    "canvasSubtle",
    "panel",
    "panelRaised",
    "border",
    "text",
    "muted",
    "primary",
    "onPrimary",
    "accent",
    "onAccent",
    "success",
    "warning",
    "danger",
    "focus",
    "watermark",
    "shadow",
)

# Each generic preset token is exposed as a stable --gbauto-* token. Selected
# tokens also bridge onto the original gbauto-doc.v1 variables so existing
# renderer content changes with the preset instead of only recoloring Settings.
THEME_TOKEN_MAP: Mapping[str, Tuple[str, ...]] = {
    "canvas": ("--gbauto-canvas", "--cream-bg"),
    "canvasSubtle": ("--gbauto-canvas-subtle", "--cream-2"),
    "panel": ("--gbauto-panel",),
    "panelRaised": ("--gbauto-panel-raised",),
    "border": ("--gbauto-border", "--stone"),
    "text": ("--gbauto-text", "--ink"),
    "muted": ("--gbauto-muted", "--text-mute", "--text-muted-2"),
    "primary": ("--gbauto-primary", "--terracotta-hover"),
    "onPrimary": ("--gbauto-on-primary",),
    "accent": ("--gbauto-accent", "--terracotta"),
    "onAccent": ("--gbauto-on-accent",),
    "success": ("--gbauto-success", "--status-green"),
    "warning": ("--gbauto-warning", "--status-amber"),
    "danger": ("--gbauto-danger", "--status-red"),
    "focus": ("--gbauto-focus", "--status-blue"),
    "watermark": ("--gbauto-watermark",),
    "shadow": ("--gbauto-shadow",),
}


def _preset(
    preset_id: str,
    mode: str,
    name: str,
    harmony: str,
    note: str,
    tokens: Sequence[str],
    *,
    scope: str = "external",
) -> Dict[str, Any]:
    return {
        "id": preset_id,
        "mode": mode,
        "name": name,
        "harmony": harmony,
        "note": note,
        "scope": scope,
        "tokens": dict(zip(THEME_TOKEN_KEYS, tokens)),
    }


THEME_PRESETS: List[Dict[str, Any]] = [
    _preset(
        "gbauto", "light", "GB Auto", "Cream neutral + terracotta accent",
        "Canonical internal theme and reset target.",
        (
            "#F3F1E7", "#E6E4D9", "#FBFAF5", "#E6E4D9", "#D6D4C8",
            "#191919", "#5C5C5C", "#191919", "#FFFFFF", "#D97757",
            "#191919", "#4F9D69", "#C08A3E", "#B94A48", "#3D6EA8",
            "#D97757", "#191919",
        ),
        scope="internal",
    ),
    _preset("l01", "light", "Jade Porcelain", "Jade analogous + kiln-coral complement", "Clean institutional mint with a warm human counterpoint.", ("#F4FBF8", "#E7F5F0", "#FFFFFF", "#DFF5ED", "#B7D8CD", "#102A25", "#47665E", "#0E7668", "#FFFFFF", "#A84834", "#FFFFFF", "#18704A", "#825B0A", "#A33A3A", "#159083", "#75B9A8", "#23483F")),
    _preset("l02", "light", "Aqua Sand", "Teal anchor + cobalt split-cool", "Warm mineral paper offsets a precise ocean-and-cobalt system.", ("#F7F3E8", "#EBE6D8", "#FFFCF4", "#E4F1EC", "#C9C2B1", "#18302B", "#4E625C", "#126F68", "#FFFFFF", "#365D95", "#FFFFFF", "#287047", "#855A0C", "#9D3D3D", "#238D83", "#77AFA6", "#383A32")),
    _preset("l03", "light", "Sage Linen", "Botanical analogous + fired-clay complement", "Soft natural credibility for a consulting or research audience.", ("#F2F5E9", "#E6EBDD", "#FBFCF5", "#DFE9DC", "#C1CAB9", "#1F2D25", "#526159", "#2E6B55", "#FFFFFF", "#9A4D35", "#FFFFFF", "#367047", "#7E5A12", "#973E3E", "#43846B", "#89A994", "#2D4033")),
    _preset("l04", "light", "Glacier Ink", "Arctic analogous + indigo depth", "A crisp technical palette with calm enterprise authority.", ("#F1F7FA", "#E3EEF3", "#FCFEFF", "#DDEDF0", "#B9CDD4", "#132D38", "#48616B", "#08737B", "#FFFFFF", "#3E5792", "#FFFFFF", "#26704B", "#7D5B13", "#A03E45", "#188E98", "#78AFB8", "#203C47")),
    _preset("l05", "light", "Celadon Plum", "Celadon field + aubergine complement", "A cultured editorial direction without losing technical clarity.", ("#EFF8F1", "#E2EFE5", "#FCFEFC", "#DAEBDD", "#B8CEBD", "#172C28", "#4C625D", "#166C60", "#FFFFFF", "#744064", "#FFFFFF", "#2A7047", "#805914", "#983D48", "#268779", "#80AE98", "#293B34")),
    _preset("l06", "light", "Seafoam Copper", "Seafoam analogous + oxidized copper", "A material palette inspired by saltwater instruments and metal housings.", ("#ECF8F5", "#DDEEEA", "#FAFEFD", "#D4ECE6", "#AFCCC5", "#17302D", "#4A625D", "#176D63", "#FFFFFF", "#93462F", "#FFFFFF", "#247048", "#7B5910", "#9D3E3B", "#278C80", "#71AD9F", "#24413B")),
    _preset("l07", "light", "Pearl Orchid", "Pearl-lilac field + teal complement", "A polished creative-tech option with restrained violet authority.", ("#F7F3FA", "#ECE5F0", "#FFFCFF", "#E5F1ED", "#CCC1D2", "#292336", "#61596B", "#147064", "#FFFFFF", "#684A96", "#FFFFFF", "#2A714B", "#805A11", "#9D3F55", "#298D80", "#8DABA5", "#372F43")),
    _preset("l08", "light", "Citrus Mineral", "Mineral green + aged-marigold accent", "Fresh and optimistic, but grounded enough for an engineering artifact.", ("#F7F8EB", "#ECEEDC", "#FFFFF7", "#E1EEE3", "#C8CBB8", "#263026", "#5C655A", "#246B57", "#FFFFFF", "#895B05", "#FFFFFF", "#337047", "#7A5607", "#9C4040", "#398670", "#8BAD97", "#344035")),
    _preset("l09", "light", "Rose Quartz Circuit", "Blush field + teal/berry triad", "A softer prospect-facing palette with firm technical contrast.", ("#FBF3F2", "#F0E5E4", "#FFFCFB", "#E2F1ED", "#D2C1BF", "#342426", "#6D5558", "#096F67", "#FFFFFF", "#8D3E5C", "#FFFFFF", "#2B704A", "#81580F", "#983843", "#168D82", "#91AAA5", "#493537")),
    _preset("l10", "light", "Alpine Sky", "Sky/teal analogous + navy structure", "Open, breathable, and trustworthy for a high-information report.", ("#F0F8FB", "#E1EEF4", "#FCFEFF", "#DCEFEA", "#B7CDD6", "#152D3A", "#4C626C", "#08716A", "#FFFFFF", "#315D8B", "#FFFFFF", "#26714C", "#7F5A10", "#A13D46", "#198E85", "#73ABB0", "#223E49")),
    _preset("l11", "light", "Parchment Reef", "Parchment neutral + reef-coral complement", "A warm editorial base with a sharp marine systems identity.", ("#F8F2E5", "#EBE3D3", "#FFFBF2", "#DFEEE8", "#CABFAD", "#332A22", "#675C50", "#176C61", "#FFFFFF", "#A34237", "#FFFFFF", "#2B7048", "#80570B", "#9C3C3C", "#2A887A", "#87A99E", "#493C31")),
    _preset("l12", "light", "Silver Eucalyptus", "Cool neutral + eucalyptus/violet split", "A restrained professional system with a small chromatic surprise.", ("#F3F6F5", "#E6EBE9", "#FEFFFF", "#DDEBE6", "#C0CBC7", "#1D2B2A", "#52615F", "#1A6B60", "#FFFFFF", "#5C4D80", "#FFFFFF", "#2C7049", "#7E5A11", "#9D3E49", "#2D877B", "#83A79E", "#303E3B")),
    _preset("d01", "dark", "Abyss Mint", "Deep ocean analogous + warm coral flare", "Cinematic protocol depth with comfortable luminous text.", ("#071D27", "#0D2933", "#102F38", "#153944", "#31535C", "#E9FFF8", "#A9C6C2", "#8FF4D8", "#082A25", "#EC7D64", "#25100B", "#70D6A0", "#E8BE69", "#F08B8B", "#7DE8D0", "#5AC0AE", "#02090D")),
    _preset("d02", "dark", "Deep Lagoon", "Lagoon monochrome + salmon complement", "Rich teal surfaces with a warm, legible action counterpoint.", ("#082B2B", "#103535", "#143E3D", "#194946", "#35615D", "#ECFFF8", "#A9C9C2", "#91E7CF", "#0A302A", "#FF947A", "#3B130A", "#71D39D", "#E5BE68", "#F18D91", "#79DFCB", "#5EB8A9", "#031212")),
    _preset("d03", "dark", "Aubergine Current", "Aubergine field + mint/rose split", "A premium night palette that avoids the standard black-and-acid trope.", ("#241428", "#301D34", "#38233C", "#432B47", "#654B69", "#FFF5FC", "#CEB8C9", "#8FE6CF", "#142D28", "#E994B8", "#3A1528", "#77D5A1", "#E8BE70", "#F18D95", "#7DDECC", "#8B6D90", "#0E0710")),
    _preset("d04", "dark", "Midnight Cobalt", "Cobalt night + aqua/amber split", "High-trust enterprise depth with a data-viz-friendly secondary.", ("#0B1832", "#12213D", "#172746", "#1C3052", "#3C4D70", "#F3F8FF", "#B7C3D9", "#72D7CE", "#082E2B", "#F1B95B", "#3D2704", "#71D19C", "#F0C873", "#F08C93", "#6DD5D1", "#526D93", "#030813")),
    _preset("d05", "dark", "Forest Copper", "Forest analogous + copper complement", "Natural infrastructure tones that feel durable rather than decorative.", ("#10261E", "#173027", "#1B392F", "#224338", "#425F51", "#F4FFF7", "#B8C9BF", "#8EDBB8", "#103124", "#E58B61", "#38190D", "#73D09B", "#E3BC69", "#EF8B8B", "#7BD6B5", "#607F70", "#07100C")),
    _preset("d06", "dark", "Slate Orchid", "Blue slate + teal/orchid split", "A composed product palette with a precise creative edge.", ("#1B2331", "#242D3C", "#293344", "#313C4E", "#536071", "#F6F5FF", "#BDC4D2", "#79DDD0", "#0B312C", "#C59AE8", "#2E1741", "#74D19E", "#E5BD6C", "#F18D95", "#76D8CF", "#738092", "#090D14")),
    _preset("d07", "dark", "Espresso Tide", "Roasted neutral + seafoam/apricot split", "Warm hospitality meets technical seafoam for a less expected external style.", ("#2A1E1A", "#352721", "#3B2D27", "#46352E", "#67544B", "#FFF9F1", "#D3C1B7", "#8BE0C7", "#12332C", "#F2A978", "#43200D", "#78D3A0", "#E8C075", "#F08F8F", "#7AD8C2", "#887166", "#100B09")),
    _preset("d08", "dark", "Ink Rose", "Wine-black field + mint/rose dual", "Dramatic and editorial while preserving clear system-state contrast.", ("#2B1821", "#36212A", "#3E2731", "#492E39", "#694A58", "#FFF6F8", "#D4BBC4", "#8FE4C9", "#12312A", "#EE8BAA", "#411425", "#78D3A0", "#E7BD6D", "#F29099", "#7EDBC6", "#896474", "#11080C")),
    _preset("d09", "dark", "Carbon Ice", "Carbon-blue neutral + ice/coral split", "Technical density without pure black, generic neon, or weak gray text.", ("#151C23", "#1D252D", "#232D36", "#2A3640", "#475661", "#F4FBFF", "#B7C4CF", "#77D8D2", "#092E2B", "#F08670", "#3A130C", "#73D09F", "#E5BE6B", "#F08C92", "#70D3D0", "#647984", "#06090C")),
    _preset("d10", "dark", "Petrol Gold", "Petrol analogous + antique-gold complement", "A finance-adjacent premium system without default fintech blue.", ("#0E292D", "#153438", "#193D40", "#20474A", "#3E6263", "#F2FFFC", "#B3CDC9", "#8EE9CF", "#0B302A", "#E7B95C", "#382801", "#72D3A0", "#EBC66F", "#F08D91", "#7DE1CB", "#5A8782", "#041113")),
    _preset("d11", "dark", "Ultraviolet Reef", "Ultraviolet field + mint/coral triad", "The boldest technology direction, controlled by disciplined surfaces.", ("#1A1740", "#23204B", "#292653", "#322E60", "#514D79", "#F8F5FF", "#C4BFE0", "#83DDD1", "#0C312C", "#F0927D", "#40150E", "#77D0A0", "#E7BF6E", "#F18D98", "#7BD9D0", "#706B9E", "#08061A")),
    _preset("d12", "dark", "Nocturne Sage", "Moss night + mint/lavender split", "Quiet, cultivated darkness suited to long-form technical reading.", ("#1D281F", "#263128", "#2C392E", "#344335", "#526254", "#F7FFF4", "#BECBBB", "#91D8B0", "#133024", "#C1A4E8", "#291743", "#78D19E", "#E5BE6C", "#EF8D90", "#84D2AD", "#718573", "#0A0F0B")),
]


def _linear_channel(value: int) -> float:
    channel = value / 255.0
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def relative_luminance(color: str) -> float:
    """WCAG relative luminance for a six-digit hexadecimal color."""
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", color or ""):
        raise ValueError("expected #RRGGBB color, got %r" % color)
    values = [int(color[index:index + 2], 16) for index in (1, 3, 5)]
    red, green, blue = (_linear_channel(value) for value in values)
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def contrast_ratio(first: str, second: str) -> float:
    lighter, darker = sorted((relative_luminance(first), relative_luminance(second)), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


def validate_theme_presets(presets: Sequence[Mapping[str, Any]] = THEME_PRESETS) -> None:
    """Fail fast if a preset is incomplete, duplicated, or unreadable."""
    ids = [str(preset.get("id", "")) for preset in presets]
    if len(ids) != len(set(ids)):
        raise ValueError("theme preset ids must be unique")
    if ids[:1] != ["gbauto"]:
        raise ValueError("gbauto must remain the first and default preset")
    external = [preset for preset in presets if preset.get("scope") == "external"]
    if len(external) != 24:
        raise ValueError("expected exactly 24 external presets")
    if sum(preset.get("mode") == "light" for preset in external) != 12:
        raise ValueError("expected exactly 12 external light presets")
    if sum(preset.get("mode") == "dark" for preset in external) != 12:
        raise ValueError("expected exactly 12 external dark presets")
    for preset in presets:
        tokens = dict(preset.get("tokens") or {})
        if tuple(tokens) != THEME_TOKEN_KEYS:
            raise ValueError("%s must define the complete ordered 17-token contract" % preset.get("id"))
        for token, value in tokens.items():
            if not re.fullmatch(r"#[0-9A-Fa-f]{6}", str(value)):
                raise ValueError("%s.%s is not #RRGGBB" % (preset.get("id"), token))
        if preset.get("scope") == "external":
            pairs = (
                ("text", "canvas"),
                ("muted", "canvas"),
                ("primary", "onPrimary"),
                ("accent", "onAccent"),
            )
            for foreground, background in pairs:
                ratio = contrast_ratio(tokens[foreground], tokens[background])
                if ratio < 4.5:
                    raise ValueError(
                        "%s %s/%s contrast %.2f is below 4.5"
                        % (preset.get("id"), foreground, background, ratio)
                    )


def theme_presets_json() -> str:
    return json.dumps(THEME_PRESETS, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def theme_token_map_json() -> str:
    serializable = {key: list(values) for key, values in THEME_TOKEN_MAP.items()}
    return json.dumps(serializable, separators=(",", ":"))


def _swatches(tokens: Mapping[str, str]) -> str:
    keys = ("canvas", "canvasSubtle", "panel", "text", "muted", "primary", "accent", "focus")
    return "".join(
        '<span class="fb-theme-swatch" style="--fb-theme-swatch:%s" title="%s: %s"></span>'
        % (
            html_lib.escape(tokens[key], quote=True),
            html_lib.escape(key, quote=True),
            html_lib.escape(tokens[key], quote=True),
        )
        for key in keys
    )


def theme_settings_html() -> str:
    """Accessible, compact theme gallery for the document Settings tab."""
    cards = []
    for preset in THEME_PRESETS:
        selected = preset["id"] == "gbauto"
        cards.append(
            '<button type="button" class="fb-theme-card" data-fb-theme-id="%s" '
            'data-fb-theme-mode="%s" aria-pressed="%s" aria-label="Apply %s preset">'
            '<span class="fb-theme-card-head"><span><strong>%s</strong><small>%s · %s</small></span>'
            '<span class="fb-theme-check" aria-hidden="true">%s</span></span>'
            '<span class="fb-theme-swatches" aria-hidden="true">%s</span>'
            '<span class="fb-theme-note">%s</span></button>'
            % (
                html_lib.escape(preset["id"], quote=True),
                html_lib.escape(preset["mode"], quote=True),
                "true" if selected else "false",
                html_lib.escape(preset["name"], quote=True),
                html_lib.escape(preset["name"]),
                html_lib.escape(str(preset["id"]).upper()),
                html_lib.escape(preset["mode"]),
                "Selected" if selected else "Select",
                _swatches(preset["tokens"]),
                html_lib.escape(preset["harmony"]),
            )
        )
    return (
        '<section id="fb-panel-settings" class="fb-command-panel fb-settings-panel" '
        'data-fb-panel="settings" role="tabpanel" aria-labelledby="fb-tab-settings" hidden>'
        '<div class="fb-settings-head"><div><strong>Document color presets</strong>'
        '<p>Preview-only on this device. GB Auto remains the internal default.</p></div>'
        '<button type="button" class="fb-theme-reset" data-fb-theme-reset>Reset GB Auto</button></div>'
        '<div class="fb-theme-toolbar" role="group" aria-label="Filter color presets">'
        '<button type="button" data-fb-theme-filter="all" aria-pressed="true">All</button>'
        '<button type="button" data-fb-theme-filter="light" aria-pressed="false">Light</button>'
        '<button type="button" data-fb-theme-filter="dark" aria-pressed="false">Dark</button>'
        '<span>1 internal + 24 external</span></div>'
        '<div class="fb-theme-grid">%s</div>'
        '<p class="fb-theme-status" data-fb-theme-status aria-live="polite">GB Auto selected.</p>'
        '</section>' % "".join(cards)
    )


# External themes use the generic variables below to replace hard-coded alpha
# surfaces across the document shell, its diagrams, and the command drawer.
# GB Auto has no overrides: resetting removes all inline variables and reveals
# the canonical BASE_CSS values unchanged.
THEME_OVERRIDE_CSS = """
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]){background:var(--gbauto-canvas);color:var(--gbauto-text)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"])::selection{background:color-mix(in srgb,var(--gbauto-accent) 28%,transparent)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) p,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) ul,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .section-body,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .source-name{color:var(--gbauto-muted)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) a{color:var(--gbauto-primary)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) code,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) th{border-color:var(--gbauto-border);background:var(--gbauto-canvas-subtle);color:var(--gbauto-text)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) th,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) td{border-bottom-color:var(--gbauto-border)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .topbar{border-color:var(--gbauto-border);background:color-mix(in srgb,var(--gbauto-canvas) 93%,transparent)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) header,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) main.layout,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .metadata-footer{background:var(--gbauto-canvas)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .pill,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .section-menu,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) details.section,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .phase-card,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .metric,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .metadata-card,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .trace-card,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .hypeframes .hypeframe,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .team-panel,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .role-card,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .gate-card,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .angel-panel,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .brand-studio,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .preset-preview,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .interface-proof{border-color:var(--gbauto-border);background:var(--gbauto-panel);color:var(--gbauto-text)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) details.section[open],
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .metadata-card,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .trace-card{background:var(--gbauto-panel)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .section-menu,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .phase-card{background:var(--gbauto-canvas-subtle)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .ascii-flow,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .brand-asset-copy{border-color:var(--gbauto-border);background:var(--gbauto-panel-raised);color:var(--gbauto-text)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .menu-actions button,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .section-menu nav button{border-color:var(--gbauto-border);background:var(--gbauto-panel);color:var(--gbauto-text)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .menu-actions button:hover,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .section-menu nav button:hover,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .section-menu nav button.active{border-color:var(--gbauto-accent);background:var(--gbauto-panel-raised);color:var(--gbauto-text)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) details.section>.section-body,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .phase-card .phase-inner,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .metadata-card-body,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .trace-body{border-color:var(--gbauto-border)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .loop{border-color:var(--gbauto-accent);background:color-mix(in srgb,var(--gbauto-accent) 15%,transparent);color:var(--gbauto-primary)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .flow,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) svg.header-visual{border-color:var(--gbauto-border);background:linear-gradient(180deg,var(--gbauto-panel),var(--gbauto-canvas-subtle))}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .flow .box,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) svg.header-visual .box{fill:var(--gbauto-panel);stroke:var(--gbauto-border)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .flow .hot,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) svg.header-visual .hot{fill:color-mix(in srgb,var(--gbauto-accent) 18%,transparent);stroke:var(--gbauto-accent)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .metadata-footer{border-color:var(--gbauto-border)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .role-card,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .gate-card{border-top-color:var(--gbauto-focus)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .group-count,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .primary-link,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .preset-apply[aria-pressed="true"]{background:var(--gbauto-primary);color:var(--gbauto-on-primary)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .preset-apply{border-color:var(--gbauto-border);background:var(--gbauto-panel-raised);color:var(--gbauto-text)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) :focus-visible{outline:3px solid var(--gbauto-focus);outline-offset:2px}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-drawer{border-color:var(--gbauto-border);background:color-mix(in srgb,var(--gbauto-canvas) 97%,transparent);box-shadow:0 -18px 48px color-mix(in srgb,var(--gbauto-shadow) 42%,transparent)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-mode,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-shortcuts,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-status,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-hint{color:var(--gbauto-muted)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-mode[aria-selected="true"]{border-color:var(--gbauto-accent);background:color-mix(in srgb,var(--gbauto-accent) 15%,transparent);color:var(--gbauto-text)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-close,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-annotate-toggle,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) #fb-section,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) #fb-msg,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-expert-pill,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-command-pill{border-color:var(--gbauto-border);background:var(--gbauto-panel);color:var(--gbauto-text)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-theme-card,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-theme-reset,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-theme-toolbar button{border-color:var(--gbauto-border);background:var(--gbauto-panel);color:var(--gbauto-text)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-theme-card[aria-pressed="true"],
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-theme-toolbar button[aria-pressed="true"]{border-color:var(--gbauto-accent);box-shadow:inset 0 0 0 1px var(--gbauto-accent)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-theme-card small,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-theme-note,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-theme-status,
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) .fb-settings-head p{color:var(--gbauto-muted)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) #fb-submit{background:var(--gbauto-primary);color:var(--gbauto-on-primary)}
body[data-gbauto-color-preset]:not([data-gbauto-color-preset="gbauto"]) #fb-submit:hover{background:var(--gbauto-accent);color:var(--gbauto-on-accent)}
"""

# The surface bridge applies to every explicit selection, including GB Auto.
# Keeping the readable selector once above makes the authored CSS easy to audit;
# this normalization turns the reset theme into the same first-class token path
# as external presets instead of falling through to renderer-specific CSS.
THEME_OVERRIDE_CSS = THEME_OVERRIDE_CSS.replace(
    ':not([data-gbauto-color-preset="gbauto"])',
    "",
)

# Preview palettes must never restyle official locked documents, even when a
# feedback drawer is injected after rendering or JavaScript is unavailable.
THEME_OVERRIDE_CSS = THEME_OVERRIDE_CSS.replace(
    "body[data-gbauto-color-preset]",
    "body[data-gbauto-color-preset]:not(.report-theme-locked)",
)


validate_theme_presets()
