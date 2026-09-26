# Lead-magnet page spec

The contract `assemble_index.py` + `validate_lead_magnet.py` enforce over
`templates/prospect-index.html.j2`. Change the template and this spec together.

## Required sections (in order, by element id)

Neon-oiran theme (default — zero-touch narrative, 2026-07-12):

1. `hero` — personalized headline, thesis, safety line, dual CTA, hero visual
2. `zero-touch` — the philosophy: humans keep strategy/judgment/review, agents carry execution; links gbautomation.xyz/zero-touch-engineering
3. `prd-gates` — the PRD system's two human gates: plan approval + report review
4. `lead-agent` — one accountable synthesizer with approval boundaries
5. `team` — three-layer roster (role-tiered profiles / shared core rack / canopy)
6. `transcript-pipeline` — Google Meet transcript → triage gate → sprint tasks; links the transcript report template
7. `core-profiles` — gbauto core manager profiles (sprint-manager is core)
8. `specialist-profiles` — how custom specialists are derived from the outcome
9. `reports` — the collapsible report + feedback widget review surface; links a live example
10. `trial-plan` — day-by-day 14-day walkthrough
11. `cta` — book / revise / decline paths
12. `brief` — print / save-as-PDF path

Gbauto theme keeps the original section set (company-snapshot, opportunity-map,
workflow, safeguards, daily-experience, visuals) — see THEME_SECTION_IDS in
`scripts/validate_lead_magnet.py`.

## Interaction requirements

- Sticky nav with anchor links; mobile nav collapse (details/summary, no JS dependency)
- `#progress` scroll-depth indicator
- `.reveal` IntersectionObserver fade-in with `prefers-reduced-motion` fallback
- `@media print` stylesheet (the PDF brief path)
- No horizontal overflow (`overflow-x:hidden` on body + fluid grids)
- Vanilla JS only, strict mode, zero console errors

## Brand

Tokens come from `second-brain/systems/brand/gbauto-brand-tokens.md` — the
validator diffs every hex in the page against that file, so a palette change
lands there first. Cream field, terracotta accents, ink text; Newsreader
headlines, Inter body.
