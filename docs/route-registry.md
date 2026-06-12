# Portal route registry and client boundary

## Decision

`src/App.jsx` now owns one client portal mount:

- `/clients/:clientSlug/*`
- Auth owner: `src/clients/ClientPortalBoundary.jsx`
- Auth policy source: `src/clients/registry/tenantRegistry.js`
- Route inventory source: `src/routes/routeManifest.js`

This replaces direct App-level ownership of `/clients/gbautomation/*` and `/clients/jid5274/*`. Named clients are registry data, not top-level router branches.

## Route groups

### Public

Auth boundary: public.
Owner: website.
Source: `src/App.jsx` and `src/routes/routeManifest.js`.

- `/` -> `Home`
- `/login` -> `Login`
- `/prds` -> `PRDIndex`
- `/prds/:slug` -> `PRDView`

### Authenticated website app

Auth boundary: signed-in Cognito user via `RequireAuth`.
Owner: website.
Source: `src/App.jsx` and `src/routes/routeManifest.js`.

- `/plan` -> `Plan`
- `/apps` -> `Apps`
- `/apps/youtube-intel` -> `YouTubeIntel`
- `/apps/mall-scanner` -> `MallScanner`
- `/artifacts` -> `Artifacts`
- `/artifacts/archive` -> `Artifacts`
- `/artifacts/:client/:artifactId` -> `ArtifactView`
- `/blockers` -> `Blockers`
- `/ui-agent` -> `UiAgent`

### Client portal

Auth boundary: tenant-specific policy resolved by `ClientPortalBoundary` from `tenantRegistry`.
Owner: client portal.
Boundary: `/clients/:clientSlug/*`.
Route inventory source: `src/routes/routeManifest.js`.
Runtime tenant source: `src/clients/registry/tenantRegistry.js`.

Shared workspace routes:

- `/clients/:clientSlug` -> overview/dashboard landing
- `/clients/:clientSlug/dashboard` -> tenant dashboard
- `/clients/:clientSlug/apps` -> tenant apps
- `/clients/:clientSlug/artifacts` -> artifact list
- `/clients/:clientSlug/artifacts/:artifactId` -> artifact detail
- `/clients/:clientSlug/reports` -> report list
- `/clients/:clientSlug/reports/:reportId` -> report detail
- `/clients/:clientSlug/sync` -> sync/read-model status
- `/clients/:clientSlug/validation` -> validation/proof status
- `/clients/:clientSlug/decisions` -> shared decision queue
- `/clients/:clientSlug/receipts` -> release/kanban receipts

Current tenant contracts:

- `gbautomation`
  - Auth groups: `tenant-gbautomation`
  - Auth emails: `gblack686@gmail.com`
  - Route module: `generic`
  - Existing route file mapping: `src/clients/gbautomation/routes.jsx` is now a compatibility wrapper around `src/clients/workspace/ClientWorkspaceRoutes.jsx`.
- `jid5274`
  - Auth groups: `tenant-jid5274`
  - Auth emails: `jid5274@gmail.com`
  - Route module: `jid5274Archon`
  - Temporary exception: `src/clients/jid5274/routes.jsx` keeps the Archon iframe/static surface until that tenant can use the shared workspace pages.

### Teammate cockpit

Auth boundary: `teammate` or `admin` Cognito groups, plus Greg operator emails via `RequireAuth`.
Owner: team.
Source: `src/App.jsx`, `src/team/routes.jsx`, and `src/routes/routeManifest.js`.

- `/team` -> `OverviewPage`
- `/team/builds` -> `BuildsPage`
- `/team/prds` -> `PrdsPage`
- `/team/artifacts` -> `ArtifactsPage`
- `/team/receipts` -> `ReceiptsPage`
- `/team/dispatch` -> redirect to `/team/builds`

### Ops

Auth boundary: `tenant-gbautomation` or Greg operator emails via `RequireAuth`.
Owner: ops.
Source: `src/ops/routes.jsx` and `src/routes/routeManifest.js`.

- `/ops` -> `OpsOverview`
- `/ops/systems` -> `OpsSystems`
- `/ops/runs` -> `OpsRuns`
- `/ops/kanban` -> `HermesKanban`
- `/ops/data` -> `OpsData`

### Admin

Auth boundary: planned operator/admin groups only.
Owner: admin.
Inventory only; UI is outside this card.

- `/admin/tenants`
- `/admin/proof`
- `/admin/release-receipts`

## Existing route mapping

### `src/App.jsx`

Mapped public routes:

- `/`
- `/login`
- `/prds`
- `/prds/:slug`

Mapped signed-in website routes:

- `/plan`
- `/apps`
- `/artifacts`
- `/artifacts/archive`
- `/artifacts/:client/:artifactId`
- `/blockers`
- `/apps/youtube-intel`
- `/apps/mall-scanner`
- `/ui-agent`

Mapped privileged route groups:

- `/ops/*` remains ops-owned and operator-gated.
- `/clients/:clientSlug/*` is now registry-owned and tenant-gated.

Removed App-level hard-coding:

- `/clients/gbautomation/*`
- `/clients/jid5274/*`
- Inline `tenant-gbautomation` policy for the client portal
- Inline `tenant-jid5274` policy
- Inline client email policy

### `src/clients/gbautomation/routes.jsx`

Existing child routes mapped to the shared generic route module:

- index -> `DashboardPage`
- `dashboard` -> `TenantDashboardPage`
- `apps` -> `AppsPage`
- `artifacts` -> `ArtifactsPage`
- `artifacts/:artifactId` -> `ArtifactDetailPage`
- `reports` -> `ReportsPage`
- `reports/:reportId` -> `ReportDetailPage`
- `sync` -> `SyncPage`
- `validation` -> `ValidationPage`
- `*` -> redirect to `/clients/${slug}`

### `src/clients/jid5274/routes.jsx`

Existing route mapped as a temporary tenant module:

- `/clients/jid5274/*` -> `Jid5274Portal`
- The module renders `/clients/jid5274/archon/` in an iframe and provides an Open link.
- This is intentionally not generalized yet because the Archon static artifact is tenant-specific.

### `src/ops/routes.jsx`

Existing ops child routes:

- index -> `OpsOverview`
- `systems` -> `OpsSystems`
- `runs` -> `OpsRuns`
- `kanban` -> `HermesKanban`
- `data` -> `OpsData`
- `*` -> redirect to `/ops`

## Migration notes

- `jid5274` Archon is the explicit temporary exception.
- Keep it behind the registry auth boundary.
- Do not add new client routes directly to `src/App.jsx`.
- Add future tenants by extending `tenantRegistry`.
- Use `routeModule: 'generic'` for normal clients.
- Use a named `routeModule` only for a temporary adapter with a migration note.
- The Vue/FastAPI client portal proof remains a source-contract reference, not a production route owner.

## Verification commands

- `npm run build`
- `node scripts/validate-tenant-registry-policy.mjs`
