---
name: get-gbauto-theme
description: Load the canonical GBAutomation brand style packet for reports, PRDs, decks, landing-page sections, SVGs, image prompts, artifact generators, and GBauto-themed UI. Use when Codex needs exact GBauto colors, fonts, component classes, report chrome, logo/image assets, or a prompt-ready component packet copied from the live website and HTML reports.
---

# Get GBAuto Theme

Use this skill before creating or revising any GB Automation visual artifact:
HTML reports, PRDs, decks, website sections, SVGs, generated images, social
cards, PDFs, approval catalogs, and client-facing screenshots.

## Canonical Sources

Read these in order:

1. `second-brain/systems/brand/gbauto-brand-tokens.md` - canonical tokens and rules.
2. `references/gbauto-component-prompt-packet.md` - prompt-ready component packet.
3. `references/gbauto-component-inventory.md` - observed component inventory
   from `/ai-resume`, landing React components, and report HTML shells.
4. `references/gbauto-image2-fingerprints.md` - compressed Image 2.0 prompt
   fingerprints for lower-token visual generation.
5. `references/gbauto-aura-dashboard-overrides.css` - Aura-derived GBauto
   dashboard override CSS for richer ops/control-plane surfaces.
6. Local website source, when available:
   - `../gb-automation-landing/src/index.css`
   - `../gb-automation-landing/public/ai-resume.html`
   - `../gb-automation-landing/src/components/VideoHero.jsx`
   - `../gb-automation-landing/src/components/Pricing.jsx`
   - `../gb-automation-landing/src/components/ArtifactsGallery.jsx`
   - `../gb-automation-landing/src/clients/gbautomation/components/PortalHeader.jsx`
   - `../gb-automation-landing/src/ops/components/OpsCards.jsx`

If the landing repo is unavailable, use the packet in `references/`.

## Templates & Examples

Self-contained, reskinnable artifacts live in `examples/`. Copy one as the starting
point for a new artifact, or hand the whole kit to a client (see below).

| File | What it is |
|---|---|
| `examples/landing-page.html` | Marketing / philosophy one-pager (hero, sections, CTA) |
| `examples/resume.html` | Branded resume / bio page, print-ready (`@media print`) |
| `examples/collapsible-report-mall.html` | Real client report — the approved collapsible-section surface, filled |
| `examples/collapsible-report-template.html` | Blank collapsible report shell (topbar · left TOC · `<details>` sections · pills · footer) to fill |
| `examples/svg/*.svg` | 10 advanced data-viz SVG templates (ribbon flow, streamgraph, chord map, contour, violin lanes, beeswarm, topographic funnel, orbit map, uncertainty fan, isobars) |
| `library/*.html` | 21 GBAuto-themed landing, analytics, workspace, section, motion, modal, onboarding, and gallery explorations |
| `library/gbauto-library-theme.css` | Shared adapter for bringing standalone generated HTML into the canonical cream/ink/terracotta system |
| `examples/gb-signature.png`, `gb-logo.png` | Placeholder logos the HTML references — swap for the target brand |
| `references/gbauto-aura-dashboard-overrides.css` | Aura-derived full dashboard skin: cream canvas, terracotta glow, glass cards, compact operation tiles |

The collapsible report surface is generated in production by the `report-package` skill
(`scripts/render_collapsible_report.py`); the template here mirrors that surface for hand-editing.

## Re-skin & Handoff

- **`INSTALL.md`** — interview prompt that asks a user for their brand (logos, colors, fonts,
  example artifacts) and rewrites the `examples/` templates to match. Run it to convert this
  GBAuto-branded kit into any brand.
- **`THEME-HANDOFF.md`** — ship the kit into a client's repo/second-brain, commit + push, and
  ping the client's agent (e.g. a Hermes agent) to pull the commit and run `INSTALL.md`.

## Asset Pack

Use these assets when a visual prompt or generated artifact needs the GB mark:

- `assets/gb-logo.png`
- `assets/gb-signature.png`
- `assets/gb-logo-chrome.png`
- `assets/gb-logo-chrome-avatar.png`

For public website paths, prefer `/gb-signature.png` in web UI and
`/gb-logo.png` for static icon/logo references.

## Hard Rules

- Use cream `#F3F1E7` for the page/background, not white or black.
- Use cards/panels as `#E6E4D9`, `rgba(230, 228, 217, 0.6)`, or `rgba(255,255,255,0.45-0.70)` with `#D6D4C8` borders.
- Use ink `#191919` for text and filled buttons only, not as a large panel background.
- Use terracotta `#D97757` for accent, active states, highlight paths, status dots, and key data.
- Use Newsreader for headings and Inter for body/UI.
- Treat `tailwind.config.js` colors as noncanonical unless they match this
  skill. The landing repo currently uses arbitrary Tailwind values and CSS
  variables; its legacy `primary`/`secondary` blues are not GBauto theme tokens.
- Reuse the report shell from the packet for reports: topbar, left TOC/menu, compact colored pills, collapsible sections, and bottom metadata footer.
- Copy the full component packet into prompts for image/SVG/artifact generators when brand fidelity matters. Do not summarize it down to just hex codes.
- For internal dashboards and Hermes-style control planes, preserve the app's
  native navigation and components, then apply the Aura-derived dashboard skin
  as a theme/customCSS layer instead of embedding scraped static pages.

## Prompt Assembly

When generating images or SVGs, include:

1. The report/project context and real data.
2. The exact GBauto color/typography packet, or the compressed fingerprint
   packet when the generator has tight prompt/token limits.
3. The component packet for cards, pills, topbar, hover states, and report shell
   when brand fidelity is more important than prompt size.
4. Logo asset references if the output should include the GB mark.
5. A constraint to keep content high-signal, evidence-grounded, and not generic.

Do not ask the visual model to imitate screenshots loosely. Tell it to use the
GBauto component styling: cream background, compact bordered panels, small
uppercase metadata, Newsreader display type, Inter labels, terracotta accent
lines, and bottom metadata/report-footer structure.

For Image 2.0 report visuals, prefer the compressed fingerprint packet first.
Only expand to the full packet if the output drifts from the GBauto report
components.
