# GBAuto Component Prompt Packet

Copy this packet into prompts for report HTML, SVG, PNG/image generation,
decks, and client-facing artifacts that must match GB Automation.

## Brand Identity

GBAutomation visual style is quiet, technical, cream-based, and report-native.
It should feel like a precise consulting artifact, not a generic SaaS landing
page or a PowerPoint slide.

Use:

- Page/background: `#F3F1E7`
- Panel/card: `#E6E4D9`, `rgba(230, 228, 217, 0.6)`, or white at 45-70% opacity
- Border/divider: `#D6D4C8`
- Ink/text: `#191919`
- Muted body: `#5C5C5C`
- Muted metadata: `#8C8A84`
- Terracotta accent: `#D97757`
- Terracotta hover: `#B75F43`
- Status green: `#1f7a3a` or `#4F9D69`
- Status amber: `#C08A3E`
- Status blue: `#3D6EA8`
- Status red: `#B94A48`

Typography:

- Headings: Newsreader, serif, 300-500 weight, optionally italic for emphasis.
- Body/UI: Inter, 300-600 weight.
- Mono only for code/data chips: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`.

Never use generic Tailwind blue/purple gradients, black page backgrounds, pure
white document backgrounds, JetBrains Mono, Helvetica, Arial, Roboto, or dark
ink cards as a dominant surface.

## Website CSS Packet

Use these exact live-site primitives:

```css
:root {
  --cream-bg: #F3F1E7;
  --cream-panel: #E6E4D9;
  --text-main: #191919;
  --text-muted: #5C5C5C;
  --text-light: #8C8A84;
  --border: #D6D4C8;
  --terracotta: #D97757;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--cream-bg);
  color: var(--text-main);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, h4, .font-serif-display {
  font-family: 'Newsreader', serif;
}

.glass-panel {
  background: rgba(230, 228, 217, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(214, 212, 200, 0.6);
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.hover-shiny {
  --shiny-bg: #E6E4D9;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hover-shiny:hover {
  background: linear-gradient(var(--shiny-bg), var(--shiny-bg)) padding-box,
    conic-gradient(from var(--gradient-angle), transparent 20%, #D97757 50%, transparent 80%) border-box !important;
  border-color: transparent !important;
  animation: border-spin 3s linear infinite;
  box-shadow: 0 12px 40px -12px rgba(217, 119, 87, 0.15);
  transform: translateY(-4px);
}

.hover-mini {
  transition: all 0.2s ease-out;
}

.hover-mini:hover {
  transform: translateY(-2px);
}

.gb-glass-card,
.gb-icon-card {
  --gb-edge-width: 2px;
  --gb-shine-alpha: 0.24;
  --gb-edge-gradient:
    conic-gradient(
      from var(--gb-gradient-angle),
      rgba(214,212,200,.74) 0 16%,
      rgba(119,220,234,.24) 26%,
      rgba(217,119,87,.34) 42%,
      rgba(232,235,232,.76) 56%,
      rgba(154,122,216,.22) 70%,
      rgba(214,212,200,.68) 86% 100%
    );
  border: var(--gb-edge-width) solid rgba(214,212,200,.72);
  background:
    linear-gradient(145deg, rgba(255,255,255,.72), rgba(230,228,217,.48)) padding-box,
    linear-gradient(145deg, rgba(255,255,255,.8), rgba(214,212,200,.62)) border-box;
  backdrop-filter: blur(16px) saturate(1.18);
  box-shadow:
    0 22px 60px -34px rgba(25,25,25,.38),
    inset 0 1px 0 rgba(255,255,255,.72);
}

.gb-glass-card:hover,
.gb-icon-card:hover {
  border-color: transparent;
  background:
    radial-gradient(circle at 18% 10%, rgba(119,220,234,.28), transparent 44%) padding-box,
    radial-gradient(circle at 82% 18%, rgba(154,122,216,.24), transparent 46%) padding-box,
    radial-gradient(circle at 42% 92%, rgba(216,108,184,.16), transparent 48%) padding-box,
    linear-gradient(145deg, rgba(239,247,246,.82), rgba(232,226,239,.72) 58%, rgba(230,228,217,.64)) padding-box,
    var(--gb-edge-gradient) border-box;
  box-shadow:
    0 2px 0 rgba(184,187,184,.7),
    0 30px 80px -38px rgba(25,25,25,.44),
    0 16px 42px -28px rgba(217,119,87,.14),
    inset 0 1px 0 rgba(255,255,255,.78);
  transform: translateY(-4px);
}

.input-field {
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid #D6D4C8;
  color: #191919;
  transition: all 0.3s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--terracotta);
  background: white;
  box-shadow: 0 0 0 1px var(--terracotta);
}
```

## Report HTML Component Packet

Use this shell for GBauto HTML reports and PRDs:

```html
<div class="topbar">
  <div class="topbar-inner">
    <div class="brand-lockup">
      <span class="brand-dot"></span>
      <span class="brand-text">GBAutomation</span>
    </div>
    <div class="source-name">source-file-or-report-name.md</div>
  </div>
</div>

<header>
  <div class="eyebrow">Report Type</div>
  <h1>Descriptive Report Title</h1>
  <p class="subtitle">One concise sentence describing the artifact and decision context.</p>
  <div class="taxonomy-pills">
    <span class="pill"><span class="pill-value">Build</span></span>
    <span class="pill"><span class="pill-value">Langfuse</span></span>
    <span class="pill"><span class="pill-value">Architecture</span></span>
  </div>
</header>

<main class="layout">
  <aside class="section-menu">
    <p class="menu-title">Sections</p>
    <div class="menu-actions">
      <button>Open All</button>
      <button>Close All</button>
    </div>
    <nav>
      <button><span>01</span> Overview</button>
    </nav>
  </aside>
  <div class="sections">
    <details class="section" open>
      <summary>
        <span class="section-index">01</span>
        <span class="section-title">Overview</span>
        <span class="section-count">120 words</span>
      </summary>
      <div class="section-body">...</div>
    </details>
  </div>
</main>

<footer class="metadata-footer">
  <div class="metadata-grid">
    <div><span>Generated</span><strong>2026-06-11</strong></div>
    <div><span>Source</span><strong>report.md</strong></div>
  </div>
</footer>
```

Report shell CSS:

```css
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid rgba(214, 212, 200, .7);
  background: rgba(243, 241, 231, .93);
  backdrop-filter: blur(12px);
}
.topbar-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 13px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
.brand-lockup { display: inline-flex; align-items: center; gap: 9px; min-height: 28px; }
.brand-dot {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(217, 119, 87, .18);
}
.brand-dot::after { content: ""; width: 8px; height: 8px; border-radius: 999px; background: #D97757; }
.brand-text {
  font-family: Newsreader, serif;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .08em;
  font-size: 12px;
}
.source-name { color: #5C5C5C; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
header { max-width: 1180px; margin: 0 auto; padding: 34px 24px 26px; }
.eyebrow { color: #D97757; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
h1 {
  max-width: 920px;
  margin: 10px 0 18px;
  font-family: Newsreader, serif;
  font-size: clamp(30px, 4vw, 48px);
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: 0;
}
.taxonomy-pills { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 14px; }
.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 23px;
  padding: 2px 8px;
  border: 1px solid #D6D4C8;
  border-radius: 999px;
  line-height: 1;
  background: rgba(255, 255, 255, .45);
}
.pill-value { color: #191919; font-size: 11px; font-weight: 600; }
.layout {
  max-width: 1180px;
  margin: 0 auto;
  padding: 22px 24px 56px;
  display: grid;
  grid-template-columns: 252px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}
.section-menu {
  position: sticky;
  top: 64px;
  border: 1px solid #D6D4C8;
  border-radius: 8px;
  background: rgba(230, 228, 217, .62);
  backdrop-filter: blur(12px);
  padding: 12px;
}
.menu-title { margin: 0 0 10px; color: #8C8A84; font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.menu-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
.menu-actions button,
.section-menu nav button {
  min-height: 34px;
  border: 1px solid #D6D4C8;
  border-radius: 6px;
  background: rgba(255, 255, 255, .46);
  color: rgba(25, 25, 25, .72);
  cursor: pointer;
  transition: border-color .18s ease, color .18s ease, background .18s ease;
}
.section-menu nav { display: grid; gap: 5px; }
.section-menu nav button {
  width: 100%;
  display: grid;
  grid-template-columns: 30px 1fr;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  text-align: left;
  font-size: 12px;
  line-height: 1.25;
}
.section-menu nav button span { color: #D97757; font-size: 10px; font-weight: 700; letter-spacing: .08em; }
.menu-actions button:hover,
.section-menu nav button:hover,
.section-menu nav button.active {
  border-color: #D97757;
  background: rgba(255, 255, 255, .72);
  color: #191919;
}
.sections { display: grid; gap: 10px; }
details.section {
  border: 1px solid #D6D4C8;
  border-radius: 8px;
  background: rgba(255, 255, 255, .5);
  overflow: hidden;
}
details.section[open] { background: rgba(255, 255, 255, .68); }
details.section summary {
  min-height: 52px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  cursor: pointer;
  list-style: none;
}
.section-index { color: #D97757; font-size: 11px; font-weight: 700; letter-spacing: .1em; }
.section-title { font-family: Newsreader, serif; font-size: 18px; font-weight: 500; line-height: 1.18; }
.section-count { color: #8C8A84; font-size: 11px; font-weight: 600; white-space: nowrap; }
.section-body { border-top: 1px solid rgba(214, 212, 200, .75); padding: 4px 18px 18px 68px; }
```

## Website Component Patterns

These patterns are audited from the live landing repo and `/ai-resume` static
HTML. The Tailwind config is not the source of truth; GBauto uses CSS variables,
custom classes, and arbitrary Tailwind values.

Navigation/header:

- Fixed/sticky cream top bar: `bg-[#F3F1E7]/80` to `bg-[#F3F1E7]/95`
- Border: `border-[#D6D4C8]/60`
- Brand lockup: `/gb-signature.png`, Newsreader wordmark, uppercase small nav.
- Nav links: `text-[11px] font-medium tracking-widest uppercase text-[#8C8A84]`, hover terracotta.

Hero:

- First screen can use a soft real/video/image background, tinted with `#F3F1E7` at 70%.
- Watermark logo: `/gb-signature.png`, very low opacity (`0.04`), grayscale.
- Status pill: white/60, stone border, terracotta dot.
- H1: Newsreader, `#191919`, large but not crowded, terracotta italic highlight.
- CTA: rounded-full or rounded-lg ink fill, cream text, subtle lift.

Cards:

```jsx
className="glass-panel p-8 rounded-3xl border border-[#D6D4C8] hover-shiny flex flex-col items-start text-left bg-[#E6E4D9]"
```

Icon/dashboard cards with the selected silver-lean RGB shine:

```jsx
className="gb-icon-card p-6 rounded-xl bg-[#E6E4D9]"
```

Use this for generated icon cards, dashboard tiles, and visual preview cards
that should shift to a neutral RGB body color on hover. The border is 2px,
silver-forward, with restrained cyan/violet RGB and a small terracotta pass.

Use icon badges:

```jsx
className="mb-4 p-2 rounded-lg bg-[#D97757]/10 border border-[#D97757]/20 text-[#D97757]"
```

Buttons:

```jsx
// Primary
className="bg-[#191919] border border-transparent hover:bg-[#333] text-[#F3F1E7] shadow-lg hover-mini"

// Secondary
className="bg-white border border-[#D6D4C8] hover:bg-[#191919] hover:text-[#F3F1E7] text-[#191919] hover-mini"

// Terracotta
className="bg-[#D97757] hover:bg-[#B75F43] text-[#F3F1E7] hover-mini"
```

Filter pills:

```jsx
className={active
  ? 'bg-[#191919] text-[#F3F1E7] border-[#191919]'
  : 'bg-white text-[#191919]/70 border-[#D6D4C8] hover:border-[#D97757]'}
```

Metric cards:

```jsx
<article className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
  <p className="text-xs font-semibold uppercase text-[#191919]/45">Label</p>
  <p className="mt-3 font-serif text-4xl text-[#191919]">Value</p>
  <p className="mt-3 text-sm leading-6 text-[#191919]/65">Detail</p>
</article>
```

Status badges:

- Ready/scheduled: muted blue chip.
- Passed/active/done: green chip.
- Blocked: red chip.
- Degraded/needs instrumentation: amber chip.
- Planned/todo: cream panel chip.
- This build/triage: terracotta chip.

## Static HTML / Resume Component Patterns

The `/ai-resume` surface and `examples/resume.html` use the same vocabulary as
the landing site but in self-contained CSS:

- `.ambient` with `.g1` and `.g2`: fixed blurred terracotta glow layer.
- `.watermark`: centered `gb-signature.png` at 3.5-4% opacity, grayscale.
- `header.nav` / `.nav-inner`: fixed 60px cream nav with stone bottom border.
- `.brand-lockup`: signature image plus Newsreader wordmark.
- `.status-pill`: rounded white/60 pill, stone border, terracotta ping dot,
  uppercase 10px label.
- `h1.name`: Newsreader, `clamp(2.8rem, 6.4vw, 5rem)`, tight line-height,
  optional terracotta italic `em`.
- `.contact-card glass-panel`: compact contact surface with rows and icon links.
- `.btn`, `.btn-primary`, `.btn-secondary`: pill CTAs; primary is ink fill,
  secondary is white fill that inverts on hover.
- `.hl`: metric tile with white/45 background, stone border, Newsreader number.
- `.sec-head`: mono terracotta section number, Newsreader title, trailing rule.
- `.skill-card`: glass panel with terracotta icon badge and `.tag` cloud.
- `.tag` / `.tag.key`: compact keyword chip; `.key` is terracotta-tinted.
- `.role`: experience card with Newsreader company, mono date, terracotta role
  title, custom bullet dots, and `.stack .sk` mono chips.
- `.edu`: small glass education cards.
- `.foot`: footer lockup with signature and uppercase metadata.

Print mode intentionally switches to white background and removes decorative
chrome for ATS-friendly output.

## Report / Ops Chrome Component Patterns

The newer `src/index.css` ports report and `/ai-resume` primitives into reusable
classes for ops surfaces:

- `.gb-ambient`: fixed ambient glow shell.
- `.gb-eyebrow`: 10px uppercase metadata label.
- `.sec-head`: numbered section heading with trailing rule.
- `.gb-pill`: compact taxonomy pill.
- `.gb-tag` and `.gb-tag.key`: keyword chips matching resume tags.
- `.gb-chip-green`, `.gb-chip-amber`, `.gb-chip-blue`, `.gb-chip-red`: status
  chips with low-opacity fill and colored border.
- `.gb-collapse`, `.gb-collapse-summary`, `.gb-collapse-region`,
  `.gb-collapse-body`: report-style accordion with smooth grid-row transition.
- `.gb-glass-card` / `.gb-icon-card`: 2px silver-lean animated edge with
  neutral RGB hover fill, thin silver depth line, restrained terracotta pass.

## Tailwind Notes

Use arbitrary values and existing custom classes for GBauto surfaces:

```jsx
className="bg-[#F3F1E7] text-[#191919] border-[#D6D4C8]"
className="glass-panel hover-shiny rounded-3xl bg-[#E6E4D9]"
className="gb-icon-card rounded-xl bg-[#E6E4D9]"
className="bg-white/60 border border-[#D6D4C8] text-[#191919]"
className="text-[#D97757] bg-[#D97757]/10 border-[#D97757]/20"
```

Do not use `theme.extend.colors.primary` or `secondary` from the landing repo's
Tailwind config. Those are legacy blue/purple defaults and are not part of the
brand.

## Image/SVG Prompt Addendum

For generated report images:

- Use the GB Automation report style, not stock startup aesthetics.
- Treat the image as a precise data artifact embedded in a report.
- Use compact labels, data chips, thin stone dividers, terracotta active paths,
  and evidence/status chips at the bottom.
- The design should look native beside the HTML report shell, with matching
  cream background and compact bordered components.
- Include the GB mark only when helpful, usually as a small top-left lockup or
  faint watermark. Do not let the logo dominate the visualization.
- Prefer real chart/data structures over decorative cards: DAG, telemetry
  waterfall, matrix heatmap, Sankey, ribbon, radial proof timeline, contour,
  beeswarm, or lane chart.

Logo/image asset references:

- `resources/skills/get-gbauto-theme/assets/gb-logo.png`
- `resources/skills/get-gbauto-theme/assets/gb-signature.png`
- `resources/skills/get-gbauto-theme/assets/gb-logo-chrome.png`
- Website public paths: `/gb-logo.png`, `/gb-signature.png`
- Live hero video reference from site:
  `https://res.cloudinary.com/doevp9obh/video/upload/v1751630378/social_u7865913127_httpss.mj.runfy9I6hP3bjY_A_serene_cinematic_anima_3732f431-944f-4ee3-9b66-c82c1462de47_1_vjttzg.mp4`
