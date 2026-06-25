# GBauto Component Inventory

Last audited: 2026-06-22.

Sources:

- Live: `https://gbautomation.xyz/ai-resume`
- Local landing repo: `../gb-automation-landing/public/ai-resume.html`
- Landing CSS: `../gb-automation-landing/src/index.css`
- Landing components: `VideoHero.jsx`, `Pricing.jsx`, `ArtifactsGallery.jsx`
- Theme examples: `examples/resume.html`, `examples/landing-page.html`,
  `examples/collapsible-report-template.html`,
  `examples/collapsible-report-mall.html`
- Aura-derived dashboard skin:
  `references/gbauto-aura-dashboard-overrides.css`

## Fonts

- Headings and editorial display: `Newsreader`, loaded from Google Fonts.
- Body and UI: `Inter`, loaded from Google Fonts.
- Mono chips and dates: system mono stack only.

Google Fonts URL used by `/ai-resume`:

```html
https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&display=swap
```

## Colors

Canonical palette observed across the current HTML and examples:

- `#F3F1E7` cream page background
- `#E6E4D9` cream panel
- `#D6D4C8` stone border
- `#191919` ink text/button fill
- `#5C5C5C` muted body
- `#8C8A84` metadata text
- `#D97757` terracotta accent
- `#B75F43` terracotta hover
- `#4F9D69` status green
- `#C08A3E` status amber
- `#3D6EA8` status blue
- `#B94A48` status red in report shells

## Landing / Resume Components

| Component | Classes / selectors | Notes |
|---|---|---|
| Ambient glow | `.ambient`, `.g1`, `.g2`, `.gb-ambient` | Fixed terracotta glow layer behind page content. |
| Watermark | `.watermark img` | `gb-signature.png`, grayscale, 3.5-4% opacity. |
| Fixed nav | `header.nav`, `.nav-inner`, `.brand-lockup`, `.nav-links`, `.nav-cta` | Cream translucent nav, stone border, uppercase 11px links. |
| Status pill | `.status-pill`, `.ping`, `.t` | White/60 pill with terracotta ping dot and uppercase label. |
| Hero title | `h1.name`, `.hero-title` | Newsreader, tight line-height, terracotta italic emphasis. |
| Contact card | `.contact-card.glass-panel`, `.contact-row` | Compact card with icon rows and CTA buttons. |
| Button | `.btn`, `.btn-primary`, `.btn-secondary`, `.hover-mini` | Pill or rounded-lg; primary ink fill, secondary white/invert. |
| Highlight metric | `.highlights`, `.hl`, `.big`, `.lbl` | 4-up stat tiles with Newsreader numerals. |
| Section heading | `.sec-head`, `.num`, `.rule` | Mono terracotta index, Newsreader title, trailing rule. |
| Skill card | `.skill-card.glass-panel`, `.badge`, `.tags` | Icon badge plus compact tag cloud. |
| Tag chip | `.tag`, `.tag.key`, `.gb-tag`, `.gb-tag.key` | 7px radius, stone border; key chips use terracotta tint. |
| Experience card | `.role.glass-panel.hover-shiny`, `.role-top`, `.role-co`, `.role-dates`, `.stack .sk` | Role cards use terracotta bullet dots and mono stack chips. |
| Education card | `.edu.glass-panel`, `.sch`, `.deg`, `.yr` | Small glass panels with Newsreader school name. |
| Footer lockup | `.foot`, `.who`, `.nm`, `.meta` | Signature image plus uppercase metadata. |

## Report Components

| Component | Classes / selectors | Notes |
|---|---|---|
| Report topbar | `.topbar`, `.topbar-inner`, `.brand-lockup`, `.brand-dot`, `.source-name` | Sticky cream report chrome. |
| Header | `.eyebrow`, `h1`, `.subtitle`, `.taxonomy-pills` | Report title and metadata pills. |
| Side menu | `.section-menu`, `.menu-title`, `.menu-actions`, `.toc`, `.toc-actions` | Sticky left navigation for long reports. |
| Collapsible section | `details.section`, `.section`, `.section-index`, `.section-title`, `.section-count`, `.section-body` | Primary report body pattern. |
| Ops accordion | `.gb-collapse`, `.gb-collapse-summary`, `.gb-collapse-region`, `.gb-collapse-body` | React-friendly version of the report section pattern. |
| Status chip | `.chip-*`, `.gb-chip-*` | Green, amber, blue, red low-opacity status chips. |
| Metadata footer | `.metadata-footer`, `.metadata-grid`, `.report-metadata` | Bottom report provenance. |
| Hypeframe package | `.visual-package`, `.hypeframes`, `.hypeframe`, `.hypeframe-actions` | Report visual review/approval surface. |

## Dashboard / Control-Plane Skin

The Aura-derived GBauto dashboard skin is saved at
`references/gbauto-aura-dashboard-overrides.css`. Use it for internal ops
surfaces, Hermes dashboards, and control-plane pages when the app should keep
its native navigation/components but take on the fuller GBautomation visual
system.

Key patterns:

- Cream page canvas with terracotta ambient glow pseudo-elements.
- Sticky or persistent native sidebar/nav remains intact.
- Cards use translucent cream or white fills, stone borders, 8px radius, and
  restrained shadows.
- Operation launcher tiles use terracotta icon badges, uppercase Inter labels,
  muted descriptions, and a small action affordance.
- Generated icon/dashboard cards can use `.gb-icon-card` or `.gb-glass-card`:
  a 2px silver-forward animated edge with restrained cyan/violet RGB, a small
  terracotta pass, neutral RGB hover fill, and a thin silver depth line.
- Apply as scoped theme CSS/customCSS where possible; do not iframe or embed
  scraped static Aura pages into production dashboards.

## React / Tailwind Components

| Component | Source | Pattern |
|---|---|---|
| Hero | `VideoHero.jsx` | Full-screen video/image background, cream overlay, watermark, fixed nav, status pill, Newsreader H1, ink CTA. |
| Pricing card | `Pricing.jsx` | `glass-panel p-8 rounded-3xl border border-[#D6D4C8] hover-shiny bg-[#E6E4D9]`. |
| Pricing icon badge | `Pricing.jsx` | Primary badge is `bg-[#D97757]/10 border-[#D97757]/20 text-[#D97757]`. |
| Artifact filter | `ArtifactsGallery.jsx` | Active filter is ink fill/cream text; inactive is white/stone with terracotta hover border. |
| Artifact card | `ArtifactsGallery.jsx` | White card, stone border, square cream preview, terracotta uppercase type label. |

## Tailwind Notes

The landing repo uses Tailwind as a utility compiler, not as a brand-token
registry. Use arbitrary values:

- `bg-[#F3F1E7]`
- `text-[#191919]`
- `text-[#5C5C5C]`
- `text-[#8C8A84]`
- `text-[#D97757]`
- `border-[#D6D4C8]`
- `bg-white/45`, `bg-white/60`, `bg-[#D97757]/10`

Do not use `primary: #2563eb` or `secondary: #7c3aed` from
`tailwind.config.js`; they are legacy/default values and not GBauto brand.
