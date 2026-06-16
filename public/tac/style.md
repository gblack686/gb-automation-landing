# GBAutomation public style packet

Public, read-only style guidance for agents producing GB-branded frontend components, reports, decks, PDFs, SVGs, or image prompts.

## Endpoints

- JSON: `/tac/style.json`
- Agent markdown: `/tac/agent-style.md`
- TAC catalog: `/tac/catalog.json`
- Style primitives CSS: `/tac/style-primitives.css`
- Public assets JSON: `/tac/assets.json`
- Public assets markdown: `/tac/assets.md`
- LLM discovery: `/llms.txt`

## Required skill

Load `get-gbauto-theme` before specifying or implementing any GB-branded visual output.

## Typography

- Headlines: `Newsreader`
- Body/UI: `Inter`
- Do not use `system-ui`, Helvetica, Arial, Roboto, or JetBrains Mono for branded output.

## Colors

- Terracotta: `#D97757`
- Terracotta hover: `#B75F43`
- Ink: `#191919`
- Cream background: `#F3F1E7`
- Cream card surface: `#E6E4D9`
- Stone border: `#D6D4C8`
- Muted text: `#8C8A84`
- Secondary text: `#5C5C5C`

## Required primitives

Use these style primitives where applicable:

- `glass-panel`
- `hover-shiny`
- `hover-mini`
- `input-field`
- `reveal`
- `animate-marquee`


## Source evidence

Detailed primitives were found in the website source:

- CSS primitives: `src/index.css`
- Tailwind config: `tailwind.config.js`
- Public assets: `public/`

## Animation primitives

### `hover-shiny`

Yes — the website has a real shine animation. Use it for elevated cream/glass cards, feature tiles, and clickable panels.

Contract:

```css
@property --gradient-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
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

@keyframes border-spin {
  from { --gradient-angle: 0deg; }
  to { --gradient-angle: 360deg; }
}
```

Usage:

```jsx
<div className="glass-panel hover-shiny rounded-lg border border-[#D6D4C8] p-6 [--shiny-bg:#E6E4D9]">
  ...
</div>
```

Accessibility: respect `prefers-reduced-motion` and remove long-running hover animation for reduced-motion users.

Other primitives:

- `glass-panel`: translucent cream panel with 12px backdrop blur and soft stone border.
- `hover-mini`: small `translateY(-2px)` hover lift for buttons/links.
- `input-field`: cream-compatible field with terracotta focus state.
- `reveal`: opacity/translate reveal that becomes active with `.active`.
- `animate-marquee`: 30s horizontal marquee, paused on hover.

## Public assets

Use `/tac/assets.json` for the current public asset manifest. Recommended GB identity assets:

- `/gb-logo.png`
- `/gb-signature.png`

Do not use `/vite.svg` as a brand asset.

## Hard rules

- Background is cream, never pure white or pure black.
- Cards are cream-2 or `glass-panel`.
- Ink is for text and buttons only.
- Never use ink or black as a card panel background.
- No generic Tailwind blues/grays as the primary palette.
- Use Tailwind arbitrary-value classes or CSS variables that match the canonical tokens exactly.
- Verify with a screenshot/browser/render check when practical.

## Tailwind examples

```jsx
<section className="bg-[#F3F1E7] text-[#191919]">
  <div className="glass-panel hover-shiny rounded-lg border border-[#D6D4C8] p-6">
    <p className="text-[10px] uppercase tracking-[0.25em] text-[#8C8A84]">EYEBROW</p>
    <h2 className="font-serif text-4xl font-medium text-[#191919]">Newsreader headline</h2>
    <p className="text-sm text-[#5C5C5C]">Inter body copy.</p>
    <button className="hover-mini rounded-lg bg-[#D97757] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#F3F1E7] hover:bg-[#B75F43]">
      Terracotta CTA
    </button>
  </div>
</section>
```

## Public/private split

This endpoint is public style guidance only. Do not expose private TAC inventory, internal second-brain paths, credentials, client records, or agent dispatch commands through this public surface.
