# Portal route inventory — Day 1 scaffold

Generated: 2026-06-11T19:23:58Z
Task: t_0d10ec0e
Branch: kanban/gbautomation/portal-sprint-scaffold
Worktree: /Users/greg/repos/gb-automation-landing-worktrees/t_0d10ec0e

## Canonical references loaded

- PRD: /Users/greg/repos/gbautomation/second-brain/inbox/plans/2026-06-11-five-day-website-client-portal-sprint.md
- Brand tokens: /Users/greg/repos/gbautomation/second-brain/systems/brand/gbauto-brand-tokens.md

Do not duplicate brand tokens here. The scaffold points future UI work to the canonical token file.

## Package scripts verified

From `package.json`:

- `dev`: `vite`
- `build`: `vite build`
- `lint`: `eslint .`
- `preview`: `vite preview`
- `test`: `node test-site.js`
- `test:tenant`: `node scripts/validate-tenant-portal.mjs`
- `ops:kanban:export`: `node scripts/export-hermes-kanban.mjs`
- `amplify:sandbox`: `ampx sandbox`
- `amplify:deploy`: `ampx sandbox --once`

Dependency state: `node_modules` was missing in the clean scaffold worktree and was installed with `npm install`.
Install warnings: Amplify peer dependency overrides and audit findings remain; no audit fix was run during scaffold.

## Route map from `src/App.jsx`

### Public routes

- `/` → `src/pages/Home.jsx`
- `/login` → `src/pages/Login.jsx`
- `/prds` → `src/pages/PRDIndex.jsx`
- `/prds/:slug` → `src/pages/PRDView.jsx`

### Auth-gated public app routes

All routes below are wrapped in `src/components/RequireAuth.jsx`:

- `/plan` → `src/pages/Plan.jsx`
- `/apps` → `src/pages/Apps.jsx`
- `/artifacts` → `src/pages/Artifacts.jsx`
- `/artifacts/archive` → `src/pages/Artifacts.jsx`
- `/artifacts/:client/:artifactId` → `src/pages/ArtifactView.jsx`
- `/blockers` → `src/pages/Blockers.jsx`
- `/apps/youtube-intel` → `src/pages/YouTubeIntel.jsx`
- `/apps/mall-scanner` → `src/pages/MallScanner.jsx` (scaffold placeholder added; full app UI remains out of scope for this lane)
- `/ui-agent` → `src/pages/UiAgent.jsx`

### Ops/admin routes

Parent route:

- `/ops/*` → `src/ops/routes.jsx`

Auth shell:

- `RequireAuth` with `allowedGroups=['tenant-gbautomation']`
- `allowedEmails=['gblack686@gmail.com', 'greg@gbautomation.xyz']`

Nested ops routes:

- `/ops` → `src/ops/pages/OpsOverview.jsx`
- `/ops/systems` → `src/ops/pages/OpsSystems.jsx`
- `/ops/runs` → `src/ops/pages/OpsRuns.jsx`
- `/ops/kanban` → `src/ops/pages/HermesKanban.jsx`
- `/ops/data` → `src/ops/pages/OpsData.jsx`

### Client portal routes

Parent routes:

- `/clients/gbautomation/*` → `src/clients/gbautomation/routes.jsx`
- `/clients/jid5274/*` → `src/clients/jid5274/routes.jsx`

GBAutomation auth shell:

- `RequireAuth` with `allowedGroups=['tenant-gbautomation']`
- `allowedEmails=['gblack686@gmail.com']`

GBAutomation nested routes:

- `/clients/gbautomation` → `DashboardPage`
- `/clients/gbautomation/dashboard` → `TenantDashboardPage`
- `/clients/gbautomation/apps` → `AppsPage`
- `/clients/gbautomation/artifacts` → `ArtifactsPage`
- `/clients/gbautomation/artifacts/:artifactId` → `ArtifactDetailPage`
- `/clients/gbautomation/reports` → `ReportsPage`
- `/clients/gbautomation/reports/:reportId` → `ReportDetailPage`
- `/clients/gbautomation/sync` → `SyncPage`
- `/clients/gbautomation/validation` → `ValidationPage`

JID5274 auth shell:

- `RequireAuth` with `allowedGroups=['tenant-jid5274']`
- `allowedEmails=['jid5274@gmail.com']`

JID5274 nested route:

- `/clients/jid5274` → iframe wrapper for `/clients/jid5274/archon/`

## Existing client portal shell files

Shared shell:

- `src/clients/shared/ClientPortalLayout.jsx`
- `src/clients/shared/ClientPortalHeader.jsx`
- `src/clients/shared/tenantConfig.js`
- `src/clients/shared/useTenantData.js`
- `src/clients/shared/ClientSection.jsx`
- `src/clients/shared/ClientMetric.jsx`
- `src/clients/shared/ClientAppsList.jsx`
- `src/clients/shared/ClientArtifactList.jsx`
- `src/clients/shared/ClientReportList.jsx`

GBAutomation tenant data and pages:

- `public/clients/gbautomation/profile.json`
- `public/clients/gbautomation/dashboard.json`
- `public/clients/gbautomation/apps.json`
- `public/clients/gbautomation/artifacts.json`
- `public/clients/gbautomation/reports.json`
- `public/clients/gbautomation/reports/*.json`
- `src/clients/gbautomation/data/portalData.js`
- `src/clients/gbautomation/pages/*.jsx`

## Auth shell verified

- `src/App.jsx` wraps gated routes with `RequireAuth`.
- `src/components/RequireAuth.jsx` checks `getCurrentUser()`.
- Tenant/admin authorization checks Cognito groups and ID token email via `fetchAuthSession()`.
- Unauthenticated users redirect to `/login?next=<requested-path>`.
- Unauthorized authenticated users see a branded 403 panel.

## P0 gaps for next lanes

- PRD sample route `/client/:tenant` is represented today as `/clients/<slug>/*`; migration to generic `/clients/:clientSlug/*` is noted in `tenantConfig.js` but not implemented.
- PRD sample teammate route `/team/builds` is not present yet.
- Ops run surface exists as `/ops/runs`; teammate build workspace needs its own role-gated route in a later lane.
- No deploy preview was created in this scaffold lane.
