# UI Agent — Page Map & Uniformity Plan

Generated 2026-06-01 by the `/ui-agent` route.

The UI Agent bridges the [`ui-agents`](https://github.com/gblack686-openclaw/ui-agents)
multi-team agent repo into this site. The Vue auditor itself is not embedded
inline — instead the canonical `gbautomation` brand spec (originating in
`ui-agents/apps/infinite-ui/src/brands/gbautomation/brand.yaml`) is mirrored
into `public/ui-agent/gbautomation-brand.json` and a declarative page inventory
lives at `public/ui-agent/page-inventory.json`. The React page at `/ui-agent`
reads both and renders the audit.

## Header families in use

| Family | Used by | Visual fingerprint |
| --- | --- | --- |
| `minimalist-dot` | `/apps`, `/artifacts`, `/artifacts/archive`, `/artifacts/:client/:id`, `/blockers`, `/apps/youtube-intel`, `/apps/mall-scanner`, `/ui-agent` | `py-10` header, terracotta dot logo, inline nav, active link uses `font-bold border-b border-[#D97757]` |
| `boxed-icon` | `/ops/*`, `/clients/gbautomation/*`, `/clients/jid5274/*`, `/login` | `py-5` header, rounded-square icon tile, brand label + serif title, nav pill (`bg-[#E6E4D9]/70`) |
| `gradient-gb-circle` | `/prds`, `/prds/:slug` | Inline-style gradient circle with italic "gb", italic Newsreader headings, `max-w-5xl` container, no nav |
| `none` | `/`, `/plan` | Page provides its own hero (Home → VideoHero) or no chrome (Plan → bare PRDGenerator) |

## Route inventory

| Path | File | Auth | Header family | Footer | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | `src/pages/Home.jsx` | public | none | yes | Canonical brand surface — VideoHero stack. |
| `/login` | `src/pages/Login.jsx` | public | boxed-icon | no | Hosts Amplify Authenticator. |
| `/prds` | `src/pages/PRDIndex.jsx` | public | gradient-gb-circle | no | Inline-styled, `max-w-5xl`. |
| `/prds/:slug` | `src/pages/PRDView.jsx` | public | gradient-gb-circle | no | Embeds PRD HTML inside `glass-panel`. |
| `/plan` | `src/pages/Plan.jsx` | gated | none | no | Just `<PRDGenerator />` — no site chrome. |
| `/apps` | `src/pages/Apps.jsx` | gated | minimalist-dot | yes | Hosts `AppsGallery`. |
| `/artifacts` | `src/pages/Artifacts.jsx` | gated | minimalist-dot | yes | Adds Archive sub-link. |
| `/artifacts/archive` | `src/pages/Artifacts.jsx` | gated | minimalist-dot | yes | Same component, archived mode. |
| `/artifacts/:client/:artifactId` | `src/pages/ArtifactView.jsx` | gated | minimalist-dot | yes | Single artifact detail. |
| `/blockers` | `src/pages/Blockers.jsx` | gated | minimalist-dot | yes | `max-w-4xl` long-form. |
| `/apps/youtube-intel` | `src/pages/YouTubeIntel.jsx` | gated | minimalist-dot | yes | Metric cards. |
| `/apps/mall-scanner` | `src/pages/MallScanner.jsx` | gated | minimalist-dot | yes | Mirrors YouTubeIntel layout. |
| `/ui-agent` | `src/pages/UiAgent.jsx` | gated | minimalist-dot | yes | This auditor. |
| `/ops` | `src/ops/pages/OpsOverview.jsx` | tenant:gbautomation | boxed-icon | no | Header in `OpsHeader.jsx`. |
| `/ops/systems` | `src/ops/pages/OpsSystems.jsx` | tenant:gbautomation | boxed-icon | no | |
| `/ops/runs` | `src/ops/pages/OpsRuns.jsx` | tenant:gbautomation | boxed-icon | no | |
| `/ops/kanban` | `src/ops/pages/HermesKanban.jsx` | tenant:gbautomation | boxed-icon | no | |
| `/ops/data` | `src/ops/pages/OpsData.jsx` | tenant:gbautomation | boxed-icon | no | |
| `/clients/gbautomation` | `src/clients/gbautomation/pages/DashboardPage.jsx` | tenant:gbautomation | boxed-icon | no | |
| `/clients/gbautomation/sync` | `src/clients/gbautomation/pages/SyncPage.jsx` | tenant:gbautomation | boxed-icon | no | |
| `/clients/gbautomation/validation` | `src/clients/gbautomation/pages/ValidationPage.jsx` | tenant:gbautomation | boxed-icon | no | |
| `/clients/jid5274/*` | `src/clients/jid5274/routes.jsx` | tenant:jid5274 | boxed-icon | no | Visual parity with PortalHeader to be verified. |

## Findings (sorted by severity)

### F1 — Three distinct header families compete for the same brand voice (high)
A first-time visitor crossing from `/apps` → `/ops` → `/prds` sees three different
brand presentations. **Recommendation:** extract a single `src/components/PageHeader.jsx`
component. Promote the `boxed-icon` family as the tool surface (Ops, Portal, Apps,
Artifacts, Blockers, UI Agent) and reserve `gradient-gb-circle` for marketing/PRD
reading only. Then align typography + container width with the rest of the site
even on that surface.

### F2 — Inconsistent main container widths (medium)
Most pages: `max-w-7xl px-6 py-16`. PRDs: `max-w-5xl px-4 py-12`. Blockers: `max-w-4xl px-6 py-16`.
**Recommendation:** standardize tool routes on `max-w-7xl`; reserve `max-w-3xl`
for long-form text (Blockers markdown). Codify in a Layout primitive.

### F3 — Footer presence is inconsistent across gated routes (medium)
Home/Apps/Artifacts/Blockers/YouTubeIntel/MallScanner render `<Footer />`; Ops
and client portals do not. **Recommendation:** decide per surface family. Add a
slim status strip (build sha, env) for tool surfaces. Keep full Footer on consumer
surfaces.

### F4 — PRDIndex / PRDView use heavy inline styles (medium)
Pills are constructed via `pillStyle(color)` inline rather than Tailwind tokens.
**Recommendation:** extract a `<Pill kind="status|wave|priority" value={...} />`
component that reads from `/ui-agent/gbautomation-brand.json`.

### F5 — Cross-surface navigation is uneven (low)
None of the `minimalist-dot` headers expose YouTubeIntel, MallScanner, UI Agent,
Ops, or Portal — effectively undiscoverable from the main nav. **Recommendation:**
move the nav into a single source of truth (e.g. `src/lib/navigation.js`)
consumed by every header. Group by surface family.

### F6 — Heading style drift (low)
Most pages: `font-serif font-medium`. PRD pages: inline-style italic Newsreader.
**Recommendation:** if italic is intentional for PRDs, add a `.font-serif-display-italic`
utility in `index.css`. Otherwise normalize to `font-serif font-medium tracking-tight`.

### F7 — Tree coverage vs. ui-agents `trees.yaml` (info)
`trees.yaml` declares hero, portfolio, features, process, pricing, testimonials,
contact, about, blog, calculator. Live site has hero, portfolio, features,
process, pricing, contact. Missing: testimonials, about, blog, calculator.
**Recommendation:** either drop empty branches from `trees.yaml` or schedule
generation runs to fill them in via the UI Generation Team.

## Uniformity action plan (prioritized)

1. **Build `src/components/PageHeader.jsx`** that takes `{ activeSlot, surface: 'tool' | 'reading' }`. Replace inline headers in Apps, Artifacts, Blockers, UI Agent, YouTubeIntel, MallScanner. Then replace `OpsHeader` and `PortalHeader` with a tool-surface variant. (Addresses F1, F5.)
2. **Add `src/lib/navigation.js`** exporting the canonical nav arrays for each surface family. Source of truth for cross-page links. (F5.)
3. **Introduce `src/components/Layout.jsx`** with `{ width: '7xl' | '4xl' | '3xl', padded?: boolean }` and migrate pages onto it. (F2.)
4. **Extract `<Pill />` component** that reads from the brand JSON, rewrite PRDIndex/PRDView to use it. (F4.)
5. **Define a `<StatusStrip />`** for tool surfaces — Ops, Portal — that prints build sha + env. (F3.)
6. **Decide PRD italic question** — normalize heading style across PRD and the rest of the site. (F6.)
7. **Sync `trees.yaml`** with the live site — drop empty branches or schedule generation runs to fill them. (F7.)

## Regenerating the brand spec

The brand spec is the *output* of the multi-team agent system. To refresh:

```bash
# in ~/repos/ui-agents — edit src/brands/gbautomation/brand.yaml
# then re-export tokens into this site:
cp ~/repos/ui-agents/apps/infinite-ui/src/brands/gbautomation/brand.yaml \
   ~/repos/gb-automation-landing/.ui-agent-source.yaml
# convert yaml -> JSON via yq/python and overwrite
# public/ui-agent/gbautomation-brand.json
```

To run the upstream Vue auditor locally (separate dev server):

```bash
cd ~/repos/ui-agents/apps/infinite-ui
bun install      # or npm install
bun run dev      # serves the Vue Workspace at http://localhost:5173
```
