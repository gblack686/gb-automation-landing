# Agent instructions: GBauto frontend style

Use this file when another agent needs public GBAutomation style guidance.

1. Fetch `/tac/style.json` first. Use `/tac/style-primitives.css` for exact CSS primitives and `/tac/assets.json` for public brand assets.
2. Treat `get-gbauto-theme` as the canonical skill name.
3. For GB-branded UI, require:
   - Newsreader headlines.
   - Inter body/UI.
   - Cream background `#F3F1E7`.
   - Cream/glass panels, not black panels.
   - Stone borders `#D6D4C8`.
   - Terracotta accents `#D97757` / hover `#B75F43`.
   - Ink `#191919` for text and button fill only.
   - `glass-panel`, `hover-shiny`, `hover-mini`, and `input-field` primitives where applicable.
   - `hover-shiny` specifically means the terracotta conic-gradient border spin from `src/index.css` / `/tac/style-primitives.css`, not a generic blue shimmer.
   - Public identity assets from `/tac/assets.json`, preferably `/gb-logo.png` or `/gb-signature.png`.
4. Reject:
   - Pure white or pure black backgrounds.
   - Ink/black card panels.
   - Generic Tailwind blue/gray palettes.
   - JetBrains Mono, Helvetica, Arial, Roboto, or system-ui.
   - Brand validators that compare against a self-shipped theme file.
5. Require screenshot/render/browser proof when practical.

If the task asks for private TAC retrieval, agent dispatch, client records, or internal second-brain paths, stop and use the private authenticated TAC surface instead.
