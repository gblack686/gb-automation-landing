# UI Agent — Page Map & Uniformity Plan

Generated 2026-06-01 by the `/ui-agent` route.

The UI Agent bridges the [`ui-agents`](https://github.com/gblack686-openclaw/ui-agents)
multi-team agent repo into this site. The Vue auditor itself is not embedded
inline — instead the canonical `gbautomation` brand spec (originating in
`ui-agents/apps/infinite-ui/src/brands/gbautomation/brand.yaml`) is mirrored
into `public/ui-agent/gbautomation-brand.json` and a declarative page inventory
lives at `public/ui-agent/page-inventory.json`. The React page at `/ui-agent`
reads both and renders the audit.

## Surface taxonomy

The site has seven distinct surface groups. The first column matches the
`surfaceGroups[].id` in `page-inventory.json`.

| Group | Auth class | What lives here | Recommended action |
| --- | --- | --- | --- |
| `public-marketing` | public | `/`, `/login`, `/prds`, `/prds/:slug` | unify (PRD drift) |
| `public-static-artifacts` | public | `/portfolio.html`, `/test.html`, `/previews/report-artifacts/*` | investigate |
| `gated-internal-apps` | gated | `/plan`, `/apps`, `/apps/youtube-intel`, `/apps/mall-scanner`, `/artifacts`, `/artifacts/archive`, `/blockers`, `/ui-agent` | unify |
| `ops-dashboard` | tenant:gbautomation | `/ops`, `/ops/systems`, `/ops/runs`, `/ops/kanban`, `/ops/data` | keep |
| `client-portals` | tenant:per-portal | `/clients/gbautomation/*`, `/clients/jid5274/*` | unify |
| `dynamic-generated` | mixed | `/prds/:slug`, `/artifacts/:client/:artifactId`, `/ops/*`, `/clients/:tenant/*`, `/clients/jid5274/archon/*` | investigate |
| `data-json-surfaces` | public | `/portfolio/*.json`, `/prds/prds-manifest.json`, `/artifacts/manifest.json`, `/ops/hermes-kanban.json`, `/ui-agent/*.json` | investigate |

## Routes by surface group

### 1. Public marketing & docs

First-touch surfaces. Anonymous. SEO-relevant.

| Path | Source | Header | Footer | Action |
| --- | --- | --- | --- | --- |
| `/` | `src/pages/Home.jsx` | none (own hero) | yes | keep |
| `/login` | `src/pages/Login.jsx` | boxed-icon (stripped) | no | unify |
| `/prds` | `src/pages/PRDIndex.jsx` (manifest-driven) | gradient-gb-circle | no | unify |
| `/prds/:slug` | `src/pages/PRDView.jsx` (embeds `public/prds/<slug>.html`) | gradient-gb-circle | no | unify |

The PRD subgroup is the single biggest brand drift on the site (italic Newsreader,
inline `pillStyle()`, `max-w-5xl` container).

### 2. Public static artifacts

Plain HTML files in `/public` served directly by Netlify. Each is its own little
world — no React shell, often its own brand interpretation. Pinned in
`public/_redirects` with forced 200s for the `/previews/*` family.

| Path | Source | Action |
| --- | --- | --- |
| `/portfolio.html` | `public/portfolio.html` (Tailwind CDN) | investigate, then archive |
| `/test.html` | `public/test.html` (early diagnostics, blue palette) | archive |
| `/previews/report-artifacts/prd-email-artifact.html` | `public/previews/...` | generate-sample |
| `/previews/report-artifacts/build-report-artifact.html` | `public/previews/...` | generate-sample |

### 3. Gated internal apps

Signed-in surfaces for any authenticated user — operator-facing tools,
registries, and the UI Agent itself.

| Path | Source | Header | Footer | Action |
| --- | --- | --- | --- | --- |
| `/plan` | `src/pages/Plan.jsx` (bare PRDGenerator) | none | no | unify |
| `/apps` | `src/pages/Apps.jsx` ← `apps-registry.json` | minimalist-dot | yes | keep |
| `/apps/youtube-intel` | `src/pages/YouTubeIntel.jsx` | minimalist-dot | yes | keep |
| `/apps/mall-scanner` | `src/pages/MallScanner.jsx` | minimalist-dot | yes | keep |
| `/artifacts` | `src/pages/Artifacts.jsx` ← `manifest.json`, `artifacts-feed.json` | minimalist-dot | yes | keep |
| `/artifacts/archive` | `src/pages/Artifacts.jsx` (archivedOnly) | minimalist-dot | yes | keep |
| `/blockers` | `src/pages/Blockers.jsx` (live blockers.md via AppSync) | minimalist-dot | yes | unify (width) |
| `/ui-agent` | `src/pages/UiAgent.jsx` | minimalist-dot | yes | keep |

### 4. Ops dashboard

Tenant-restricted operations console — group `tenant-gbautomation` plus the
allowlist `gblack686@gmail.com` / `greg@gbautomation.xyz`.

| Path | Source | Header | Footer | Action |
| --- | --- | --- | --- | --- |
| `/ops` | `src/ops/pages/OpsOverview.jsx` | boxed-icon | no | keep |
| `/ops/systems` | `src/ops/pages/OpsSystems.jsx` | boxed-icon | no | keep |
| `/ops/runs` | `src/ops/pages/OpsRuns.jsx` | boxed-icon | no | keep |
| `/ops/kanban` | `src/ops/pages/HermesKanban.jsx` ← `/ops/hermes-kanban.json` | boxed-icon | no | keep |
| `/ops/data` | `src/ops/pages/OpsData.jsx` | boxed-icon | no | keep |

### 5. Client portals

Per-tenant portals nested under `/clients/<slug>/*`. Each tenant has its own
group + email allowlist.

| Path | Source | Auth | Action |
| --- | --- | --- | --- |
| `/clients/gbautomation` | `src/clients/gbautomation/pages/DashboardPage.jsx` | tenant:gbautomation | keep |
| `/clients/gbautomation/sync` | `src/clients/gbautomation/pages/SyncPage.jsx` | tenant:gbautomation | keep |
| `/clients/gbautomation/validation` | `src/clients/gbautomation/pages/ValidationPage.jsx` | tenant:gbautomation | keep |
| `/clients/jid5274/*` | `src/clients/jid5274/routes.jsx` (iframe shell) | tenant:jid5274 | unify |
| `/clients/jid5274/archon/index.html` | `public/clients/jid5274/archon/` (synced SPA) | tenant:jid5274 | keep (upstream-owned) |
| `/clients/jid5274/archon/artifacts/*.html` | bundled artifact HTML | tenant:jid5274 | generate-sample |

### 6. Dynamic & generated content

Route patterns whose bodies come from manifests, generated files, or external
sync. The pattern is stable; the body is generated.

| Pattern | Fed by | Auth | Action |
| --- | --- | --- | --- |
| `/prds/:slug` | `public/prds/prds-manifest.json` + `public/prds/<slug>.html` | public | unify |
| `/artifacts/:client/:artifactId` | `public/artifacts/manifest.json` + `public/artifacts/<client>/<artifactId>/` | gated | generate-sample |
| `/ops/*` | `src/ops/routes.jsx` | tenant:gbautomation | keep |
| `/clients/:tenant/*` | `src/clients/<tenant>/routes.jsx` | tenant:per-portal | keep |
| `/clients/jid5274/archon/*` | external repo sync into `public/clients/jid5274/archon/` | tenant:jid5274 | keep |

### 7. Data JSON surfaces

No UI of their own; they drive the visual surfaces above. Listed so the UI
Agent can audit data contracts alongside pages.

| Path | Feeds | Action |
| --- | --- | --- |
| `/portfolio/apps-registry.json` | `/apps`, Portfolio | keep |
| `/portfolio/portfolio.json` | Portfolio | keep |
| `/portfolio/artifacts-feed.json` | `/artifacts` | keep |
| `/portfolio/claude-code-projects.json` | Portfolio drill-down | investigate |
| `/portfolio/gbautomation-projects.json` | Portfolio drill-down | investigate |
| `/portfolio/revstar-projects.json` | Portfolio drill-down | investigate |
| `/prds/prds-manifest.json` | `/prds`, `/prds/:slug` | keep (normalize hosts) |
| `/artifacts/manifest.json` | `/artifacts`, `/artifacts/:client/:artifactId` | investigate (drift) |
| `/ops/hermes-kanban.json` | `/ops/kanban` | keep |
| `/ui-agent/gbautomation-brand.json` | `/ui-agent` | keep |
| `/ui-agent/page-inventory.json` | `/ui-agent` | keep (this file) |

## Findings (sorted by severity)

### F1 — Three distinct header families compete for the same brand voice (high)
A first-time visitor crossing from `/apps` → `/ops` → `/prds` sees three different
brand presentations. **Recommendation:** extract a single
`src/components/PageHeader.jsx`. Promote the `boxed-icon` family as the tool
surface (Ops, Portal, Apps, Artifacts, Blockers, UI Agent) and reserve
`gradient-gb-circle` for marketing/PRD reading only.

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
Ops, or Portal — effectively undiscoverable from the main nav.
**Recommendation:** move the nav into a single source of truth
(e.g. `src/lib/navigation.js`) consumed by every header. Group by surface family.

### F6 — Heading style drift (low)
Most pages: `font-serif font-medium`. PRD pages: inline-style italic Newsreader.
**Recommendation:** if italic is intentional for PRDs, add a
`.font-serif-display-italic` utility in `index.css`. Otherwise normalize to
`font-serif font-medium tracking-tight`.

### F7 — Tree coverage vs. ui-agents `trees.yaml` (info)
`trees.yaml` declares hero, portfolio, features, process, pricing, testimonials,
contact, about, blog, calculator. Live site has hero, portfolio, features,
process, pricing, contact. Missing: testimonials, about, blog, calculator.

### F8 — `public/artifacts/manifest.json` is out of sync with disk (medium)
manifest.json lists only `acme-co/brief-bdfbfda44fbb`. The disk tree also
contains `gbautomation/`, `fisch-group/`, `sylvan-hills/`. `/artifacts` may show
stale or partial data. **Recommendation:** re-run the artifact registry build
so the manifest enumerates every tenant tree, or document the exclusion.

### F9 — Legacy standalone HTML in `/public` has unclear ownership (low)
`public/portfolio.html` (Tailwind CDN marketing variant) and `public/test.html`
(early diagnostics, blue palette) coexist with the React routes that supersede
them. **Recommendation:** confirm nothing links to either, then archive.

## Prioritized UI-Agent / design plan

The plan is grouped by surface so each work item is a self-contained run for the
UI Generation Team and validates against a clear surface group.

### P0 — Stand up shared building blocks
1. **Build `src/components/PageHeader.jsx`** with `{ surface: 'tool' | 'reading' | 'marketing', active }`. Replace inline headers in Apps, Artifacts, Blockers, UI Agent, YouTubeIntel, MallScanner. Then replace `OpsHeader` and `PortalHeader` with the `surface: 'tool'` variant. (F1, F5.)
2. **Add `src/lib/navigation.js`** exporting the canonical nav arrays for each surface family. Source of truth for cross-page links. (F5.)
3. **Introduce `src/components/Layout.jsx`** with `{ width: '7xl' | '4xl' | '3xl', padded?: boolean }` and migrate pages onto it. (F2.)

### P1 — Brand-align the PRD surface (group: public-marketing)
4. **Extract `<Pill />`** that reads from the brand JSON; rewrite PRDIndex/PRDView to use it. (F4.)
5. **Replace gradient-gb-circle header** with `PageHeader surface="reading"` reusing the gradient circle as an `accentIcon` slot only. Normalize container width and typography. (F1, F2, F6.)

### P2 — Generate the artifact / preview template family (groups: public-static-artifacts, client-portals, dynamic-generated)
6. **Define a canonical artifact HTML template** from `/previews/report-artifacts/*` and re-render `public/artifacts/<client>/<id>/*.html` against it. (Action: generate-sample.)
7. **Reconcile `public/artifacts/manifest.json`** with the disk tree (gbautomation, fisch-group, sylvan-hills). (F8.)
8. **Port `src/clients/jid5274/routes.jsx`** header to the new `PageHeader` with a tenant theme. Leave the iframe contents alone. (F1.)

### P3 — Trim legacy and tighten data contracts (groups: public-static-artifacts, data-json-surfaces)
9. **Archive `/portfolio.html` and `/test.html`** (or move to `/previews/legacy/`). (F9.)
10. **Audit `claude-code-projects.json`, `gbautomation-projects.json`, `revstar-projects.json`** — confirm consumers. Delete or document.
11. **Normalize `prds-manifest.json` hosts** — two entries point at the netlify preview rather than `gbautomation.xyz`.

### P4 — Fill brand coverage gaps (group: dynamic-generated)
12. **Sync `trees.yaml`** with the live site — drop empty branches or schedule generation runs to fill `testimonials`, `about`, `blog`, `calculator` via the UI Generation Team. (F7.)

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
