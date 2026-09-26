# HTML output standard for plans

Greg requested exact official plan styling and smaller embedded assets on
2026-09-17. This applies to new plans, amendments, architecture discussions,
and local review previews as well as published plans. An explicitly requested
visual experiment may opt out; record that exception and keep it separate
from the official plan. Do not infer an exception from the product's theme.

## Render from one source

Use `resources/lib/gbauto_doc_template.py::render_document()` with its default
`theme_lock=True`. The approved TAC HTML reference supplies content structure;
the shared module supplies the final shell, logo, CSS, and feedback widget.
Other approved renderers must carry the same `report-theme-locked` body class
and import `CANONICAL_GBAUTO_THEME_LOCK_CSS` from the module.

Preserve the official typography, topbar, navigation, collapsible sections,
word counts, metadata, trace, feedback, and architecture sources. Do not invent
nearby hex values, replace the shell with product CSS, or substitute opaque
cards for the approved glass surfaces. Brand authority is
`second-brain/systems/brand/gbauto-brand-tokens.md`; current document grammar is
`second-brain/systems/gbauto-planning-system.md`.

The screen canvas is cream `#F3F1E7`, text ink `#191919`, borders stone
`#D6D4C8`, and accent terracotta `#D97757`. Match actual card/sidebar colors
and opacity to the shared base CSS, including open and closed states.
Print-only white backgrounds are not screen-theme defects.

Viewer presets must neither recolor an official plan nor overwrite the
viewer's saved preference. Keep theme controls disabled with an explanation
on locked documents. CSS metadata and correct `:root` values alone are not
proof: inspect the browser after feedback initialization and injection.

## Keep assets proportionate

Use the renderer's `gb-logo-report.png`, a 96px derivative of the unchanged
official logo for its 24px topbar. Keep one embedded logo per document, at most
12 KiB decoded / 16 KiB base64. Do not inline the full-resolution source PNG
or invent a replacement logo. Asset provenance lives beside the derivative.

Record total HTML bytes and the largest embedded assets. Review ordinary
plans above 250 KiB and justify diagram/image payloads. This is a review
threshold, not a reason to remove necessary architecture evidence. Keep CSS
and required diagrams self-contained and verify brand fonts load.

## Validate the delivered bytes

After final rendering and widget injection:

1. Compare computed body, sidebar, open/closed section, text, link, and accent
   colors with the official reference. Test a fresh context and saved light
   and dark presets using `gbauto.document.color-preset.v1` (`l03`, `d01`).
   The locked document must remain identical and leave storage unchanged.
2. Check desktop and narrow mobile screenshots, font loading, overflow,
   expand/collapse, navigation, and keyboard focus. Check first paint or a
   JavaScript-disabled load as well as the initialized page.
3. Record logo and HTML byte sizes, screenshots, and computed-style results.
   Run focused renderer regressions when renderer code changes. The existing
   `scripts/report_conformance.py` publication gate still applies; never
   invent missing task/PR/trace evidence to pass it.
4. Refresh adoption and index hashes after edits. Open the validated local
   report automatically on Greg's browser machine. Headless hosts provide
   the established review URL instead.
