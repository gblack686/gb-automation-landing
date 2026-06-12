// Architecture-only route inventory for the website + client portal boundary.
//
// Keep this manifest declarative: src/App.jsx owns the React Router wiring, while
// docs/route-registry.md explains migration notes and temporary exceptions.

export const routeGroups = [
  {
    id: 'public',
    label: 'Public website',
    owner: 'website',
    authBoundary: 'public',
    routes: [
      { path: '/', source: 'src/App.jsx', element: 'Home' },
      { path: '/login', source: 'src/App.jsx', element: 'Login' },
      { path: '/prds', source: 'src/App.jsx', element: 'PRDIndex' },
      { path: '/prds/:slug', source: 'src/App.jsx', element: 'PRDView' },
    ],
  },
  {
    id: 'authenticated-app',
    label: 'Authenticated app shell',
    owner: 'website',
    authBoundary: 'RequireAuth: signed-in user',
    routes: [
      { path: '/plan', source: 'src/App.jsx', element: 'Plan' },
      { path: '/apps', source: 'src/App.jsx', element: 'Apps' },
      { path: '/apps/youtube-intel', source: 'src/App.jsx', element: 'YouTubeIntel' },
      { path: '/apps/mall-scanner', source: 'src/App.jsx', element: 'MallScanner' },
      { path: '/artifacts', source: 'src/App.jsx', element: 'Artifacts' },
      { path: '/artifacts/archive', source: 'src/App.jsx', element: 'Artifacts' },
      { path: '/artifacts/:client/:artifactId', source: 'src/App.jsx', element: 'ArtifactView' },
      { path: '/blockers', source: 'src/App.jsx', element: 'Blockers' },
      { path: '/ui-agent', source: 'src/App.jsx', element: 'UiAgent' },
    ],
  },
  {
    id: 'client',
    label: 'Client portal',
    owner: 'client-portal',
    authBoundary: 'RequireAuth: tenant auth resolved from src/clients/shared/tenantConfig.js',
    boundaryPath: '/clients/:clientSlug/*',
    routes: [
      { path: '/clients/:clientSlug', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'DashboardPage' },
      { path: '/clients/:clientSlug/dashboard', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'TenantDashboardPage' },
      { path: '/clients/:clientSlug/apps', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'AppsPage' },
      { path: '/clients/:clientSlug/artifacts', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'ArtifactsPage' },
      { path: '/clients/:clientSlug/artifacts/:artifactId', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'ArtifactDetailPage' },
      { path: '/clients/:clientSlug/reports', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'ReportsPage' },
      { path: '/clients/:clientSlug/reports/:reportId', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'ReportDetailPage' },
      { path: '/clients/:clientSlug/sync', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'SyncPage' },
      { path: '/clients/:clientSlug/validation', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'ValidationPage' },
      { path: '/clients/:clientSlug/decisions', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'WorkspaceDecisionsPage' },
      { path: '/clients/:clientSlug/receipts', source: 'src/clients/workspace/ClientWorkspaceRoutes.jsx', element: 'WorkspaceReceiptsPage' },
      { path: '/clients/:clientSlug/*', source: 'src/clients/ClientPortalBoundary.jsx', element: 'tenant module fallback' },
    ],
  },
  {
    id: 'teammate',
    label: 'Teammate build cockpit',
    owner: 'team',
    authBoundary: 'RequireAuth: teammate/admin groups plus Greg operator emails',
    routes: [
      { path: '/team', source: 'src/team/routes.jsx', element: 'OverviewPage' },
      { path: '/team/builds', source: 'src/team/routes.jsx', element: 'BuildsPage' },
      { path: '/team/runs', source: 'src/team/routes.jsx', element: 'RunsPage' },
      { path: '/team/prds', source: 'src/team/routes.jsx', element: 'PrdsPage' },
      { path: '/team/artifacts', source: 'src/team/routes.jsx', element: 'ArtifactsPage' },
      { path: '/team/receipts', source: 'src/team/routes.jsx', element: 'ReceiptsPage' },
      { path: '/team/dispatch', source: 'src/team/routes.jsx', element: 'redirect to /team/builds' },
    ],
  },
  {
    id: 'ops',
    label: 'Ops dashboard',
    owner: 'ops',
    authBoundary: 'RequireAuth: tenant-gbautomation or Greg operator emails',
    boundaryPath: '/ops/*',
    routes: [
      { path: '/ops', source: 'src/ops/routes.jsx', element: 'OpsOverview' },
      { path: '/ops/systems', source: 'src/ops/routes.jsx', element: 'OpsSystems' },
      { path: '/ops/runs', source: 'src/ops/routes.jsx', element: 'OpsRuns' },
      { path: '/ops/kanban', source: 'src/ops/routes.jsx', element: 'HermesKanban' },
      { path: '/ops/data', source: 'src/ops/routes.jsx', element: 'OpsData' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin controls',
    owner: 'admin',
    authBoundary: 'planned RequireAuth: operator/admin groups only',
    routes: [
      { path: '/admin/tenants', source: 'planned', element: 'tenant admin' },
      { path: '/admin/proof', source: 'planned', element: 'proof vetting' },
      { path: '/admin/release-receipts', source: 'planned', element: 'release receipts' },
    ],
  },
  {
    id: 'temporary-exceptions',
    label: 'Temporary compatibility exceptions',
    owner: 'client-portal',
    authBoundary: 'resolved by tenant auth policy before mounting exception',
    routes: [
      {
        path: '/clients/jid5274/*',
        source: 'src/clients/jid5274/routes.jsx',
        element: 'Jid5274Portal',
        note: 'Archon iframe/static surface remains tenant-specific until migrated into shared workspace pages.',
      },
      {
        path: '/clients/gbautomation/*',
        source: 'src/clients/gbautomation/routes.jsx',
        element: 'GbautomationPortal',
        note: 'Compatibility wrapper around GenericClientPortalRoutes; App.jsx no longer mounts it directly.',
      },
    ],
  },
];

export function flattenRoutes(groups = routeGroups) {
  return groups.flatMap((group) =>
    group.routes.map((route) => ({
      group: group.id,
      groupLabel: group.label,
      owner: group.owner,
      authBoundary: group.authBoundary,
      ...route,
    })),
  );
}
