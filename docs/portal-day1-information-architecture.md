# Day 1 Portal Information Architecture and Route Map

Source PRD: `/Users/greg/repos/gbautomation/second-brain/inbox/plans/2026-06-11-five-day-website-client-portal-sprint.md`

Brand source: `/Users/greg/repos/gbautomation/second-brain/systems/brand/gbauto-brand-tokens.md`

Machine-readable contract: `src/portal/portalRouteMap.js`

## Goal

Freeze the website application and client portal route map for the five-day sprint so the UI, auth, data, proof, and QA lanes can build from one contract.

## Non-negotiables

- P0 ships first; P1 only after P0 routes are functional.
- P2 is backlog unless every Day 1-5 gate is green.
- No named-client or numeric performance claims without source citations.
- Use canonical brand tokens directly from the second-brain brand file.
- Cards must use cream surfaces, stone borders, terracotta accents, Inter UI text, and Newsreader editorial headings.
- Ink is text/button fill only; never an app panel background.
- Auth protects client, teammate, and ops surfaces before data is wired.

## Route groups

### Public website

Intent: Explain the agent-team offer, show approved demos and artifacts, collect qualified inquiries, and route users into authenticated workspaces.

Shell: `src/pages/Home.jsx` plus public catalog pages.

Auth boundary: public for `/`, `/login`, `/prds`, and `/prds/:slug`; authenticated for app and artifact work surfaces in current v1.

Primary navigation:

- Home: `/`
- Apps: `/apps`
- Artifacts: `/artifacts`
- PRDs: `/prds`
- Login: `/login`
- Contact: homepage section anchor

### Client portal

Intent: Tenant-scoped workspace for systems, PRDs, reports, artifacts, run receipts, blockers, and delivery links.

Shell: `src/clients/shared/ClientPortalLayout.jsx`.

Auth boundary: tenant Cognito group or explicit allowlisted email.

Primary navigation comes from `tenantConfig.navItems`:

- Overview: `/clients/:tenant`
- Dashboard: `/clients/:tenant/dashboard`
- Apps: `/clients/:tenant/apps`
- Artifacts: `/clients/:tenant/artifacts`
- Reports: `/clients/:tenant/reports`
- Sync: `/clients/:tenant/sync`
- Validation: `/clients/:tenant/validation`

### Teammate build workspace

Intent: Execution surface for approved specs, active Kanban work, artifacts, run status, and safe dispatch receipts.

Shell: new `src/team/*` route group sharing client and ops primitives.

Auth boundary: teammate, admin, or operator role.

Primary navigation:

- Queue: `/team/builds`
- Receipt detail: `/team/builds/:taskId`
- Artifacts: `/team/artifacts`
- Decisions: `/team/decisions`

### Admin and operations

Intent: Operational mirror for systems, runs, Kanban state, data health, proof gates, and release readiness.

Shell: `src/ops/routes.jsx`.

Auth boundary: admin/operator group or GBAutomation allowlist.

Primary navigation from `OpsHeader`:

- Overview: `/ops`
- Systems: `/ops/systems`
- Runs: `/ops/runs`
- Kanban: `/ops/kanban`
- Data: `/ops/data`

## P0 page list

### Public P0

- `/` — Home. Existing `src/pages/Home.jsx`. Public.
- `/login` — Login. Existing `src/pages/Login.jsx`. Public with `next` redirect.
- `/apps` — App catalog. Existing `src/pages/Apps.jsx`. Gated in current App router.
- `/artifacts` — Artifact feed. Existing `src/pages/Artifacts.jsx`. Gated in current App router.
- `/artifacts/:client/:artifactId` — Artifact detail. Existing `src/pages/ArtifactView.jsx`. Gated in current App router.
- `/prds` — PRD index. Existing `src/pages/PRDIndex.jsx`. Public.
- `/prds/:slug` — PRD detail. Existing `src/pages/PRDView.jsx`. Public.

### Client P0

- `/clients/:tenant` — Client overview. Current concrete routes: `/clients/gbautomation`, `/clients/jid5274`.
- `/clients/:tenant/dashboard` — Client systems dashboard.
- `/clients/:tenant/apps` — Client app list.
- `/clients/:tenant/artifacts` — Client artifact list.
- `/clients/:tenant/artifacts/:artifactId` — Client artifact detail.
- `/clients/:tenant/reports` — Client reports.

### Teammate P0

- `/team/builds` — Approved build queue.
- `/team/builds/:taskId` — Build receipt detail.

### Admin/Ops P0

- `/ops` — Ops overview.
- `/ops/runs` — Run status mirror.
- `/ops/kanban` — Kanban board mirror.

## P1 page list

- `/clients/:tenant/reports/:reportId` — Report detail.
- `/clients/:tenant/sync` — Sync and receipt log.
- `/clients/:tenant/validation` — Tenant validation and proof checklist.
- `/team/artifacts` — Team artifact handoffs.
- `/team/decisions` — Decision queue and blockers.
- `/ops/systems` — Ops systems catalog.
- `/ops/data` — Data health, manifests, proof sources.

## P2 backlog

- `/pricing` — Standalone pricing page if homepage pricing needs shareable URL.
- `/case-studies` — Source-cited case studies only.
- `/clients/:tenant/settings` — Tenant settings for admins.
- `/ops/release` — Release receipt and deploy history.

## Role access matrix

| Surface | Anonymous | Prospect | Client | Teammate | Admin | Operator |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | yes | yes | yes | yes | yes | yes |
| `/login` | yes | yes | yes | yes | yes | yes |
| `/prds`, `/prds/:slug` | yes | yes | yes | yes | yes | yes |
| `/apps` | no | no | yes | yes | yes | yes |
| `/artifacts`, `/artifacts/:client/:artifactId` | no | no | yes | yes | yes | yes |
| `/clients/:tenant/*` core overview/dashboard/apps/artifacts/reports | no | no | tenant only | assigned tenant/team only | yes | no by default |
| `/clients/:tenant/sync`, `/clients/:tenant/validation` | no | no | no by default | assigned tenant/team only | yes | no by default |
| `/team/*` | no | no | no | yes | yes | yes |
| `/ops/*` | no | no | no | no | yes | yes |

Implementation notes:

- Current router uses concrete tenant routes and allowlists in `src/App.jsx`.
- P0 can keep concrete routes for speed.
- P1 should migrate toward `/clients/:clientSlug/*` only if auth and tenant isolation tests stay green.
- Operators can see `/team/*` and `/ops/*`, but not client data unless explicitly assigned to a tenant.

## Navigation model

### Global navigation

- Marketing pages should not expose ops or team routes to anonymous users.
- Signed-in clients should see Portal, Apps, Artifacts, PRDs, and Sign out.
- Teammates should see Portal, Team, Apps, Artifacts, PRDs, and Sign out.
- Admin/operators should see Portal, Team, Ops, Apps, Artifacts, PRDs, and Sign out.

### Client navigation

- Use `tenantConfig.navItems` as the single source for tenant tabs.
- Tenant links must be absolute and tenant-scoped.
- Do not show other tenant slugs inside client nav.
- Quick links may point to `/apps` and `/ops` only when the role can access them.

### Teammate navigation

- Use task-first labels: Queue, Active Builds, Receipts, Artifacts, Decisions.
- Every build action must produce or link to a Kanban receipt.
- No production deploy or destructive action belongs in Day 1-3 teammate UI.

### Ops navigation

- Keep existing `OpsHeader` tabs for Overview, Systems, Runs, Kanban, Data.
- Add release receipt only as P2 after QA/deploy gates exist.
- Ops views can aggregate tenants; client views cannot.

### Mobile behavior

- Prefer horizontal overflow tabs first.
- Add a hamburger only if a role has more than eight visible links.
- Preserve visible sign-out affordance on authenticated shells.

## Five-day route map

### Day 1 — IA and auth shell

Outcome: route contract, access matrix, tenant nav, ops nav, and P0/P1/P2 list are frozen.

Routes in scope:

- `/`
- `/login`
- `/clients/:tenant`
- `/ops`

### Day 2 — Client data and artifacts

Outcome: P0 client dashboards, app list, artifact list/detail, reports list, PRD index/detail load from deterministic static sources.

Routes in scope:

- `/apps`
- `/artifacts`
- `/artifacts/:client/:artifactId`
- `/prds`
- `/prds/:slug`
- `/clients/:tenant/dashboard`
- `/clients/:tenant/apps`
- `/clients/:tenant/artifacts`
- `/clients/:tenant/artifacts/:artifactId`
- `/clients/:tenant/reports`

### Day 3 — Teammate build workspace

Outcome: teammate queue, receipt detail, run mirror, and Kanban mirror exist.

Routes in scope:

- `/team/builds`
- `/team/builds/:taskId`
- `/team/artifacts`
- `/ops/runs`
- `/ops/kanban`

### Day 4 — Brand, proof, integration

Outcome: brand gate and proof-vetting gate pass; unsupported named-client or numeric claims are removed or rewritten as uncited capabilities.

Routes in scope:

- `/clients/:tenant/validation`
- `/clients/:tenant/sync`
- `/team/decisions`
- `/ops/data`

### Day 5 — QA and release

Outcome: tests pass, build passes, browser smoke has zero JS errors, screenshot proof exists, and deploy preview URL or deploy blocker is recorded.

Routes in scope:

- P0 and P1 regression pass.
- P2 only if P0/P1 gates are green.

## UI lane handoff

- Use `src/portal/portalRouteMap.js` for route labels, groups, priorities, and nav rules.
- Build P0 surfaces with existing GBAuto idiom: cream background, cream-2 cards, stone borders, terracotta accents.
- Use Newsreader for headings and Inter for UI/body text.
- Avoid dark cards, Tailwind blues, Tailwind grays, and generic system font fallbacks.
- Do not add case-study claims unless the proof lane supplies citations.

## Auth lane handoff

- Current v1 `RequireAuth` supports `allowedGroups` and `allowedEmails`.
- Keep public PRD routes public unless a future source contains private client material.
- Add tests for anonymous redirects on `/apps`, `/artifacts`, `/clients/gbautomation`, `/team/builds`, and `/ops`.
- Add tests for forbidden tenant access using a non-matching group/email fixture.
- Prefer group-based tenant access over email allowlists for new tenants.

## Data lane handoff

- Treat static registries as v1 data lake:
  - `public/portfolio/apps-registry.json`
  - `public/artifacts/manifest.json`
  - `public/prds/manifest.json`
  - future `public/clients/<tenant>/*`
  - future `public/ops/kanban-snapshot.json`
- Normalize every deliverable into `PortalArtifact` from the PRD.
- Normalize every build into `BuildReceipt` from the PRD.
- Store source paths and quotes for any named-client or numeric claim.

## Validator

Run:

```bash
npm run test:routes
```

Expected:

- all required route groups are present
- P0 covers public, client, teammate, and ops surfaces
- role matrix contains every role
- day plan covers all five sprint days
- no route contains unsupported priority or group labels
