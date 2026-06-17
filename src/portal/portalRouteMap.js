// Day 1 portal information architecture contract.
// Source PRD: /Users/greg/repos/gbautomation/second-brain/inbox/plans/2026-06-11-five-day-website-client-portal-sprint.md
// Brand source of truth: /Users/greg/repos/gbautomation/second-brain/systems/brand/gbauto-brand-tokens.md
//
// Keep this module free of client-proof claims. It is a route/access/navigation
// contract for UI, auth, and data lanes to consume during the five-day sprint.

export const roleIds = ['anonymous', 'prospect', 'client', 'teammate', 'admin', 'operator'];

export const routeGroups = [
  {
    id: 'public',
    label: 'Public website',
    intent: 'Explain the agent-team offer, show ungated demos, collect qualified inquiries, and route sign-in users into workspaces.',
    shell: 'src/pages/Home.jsx + public catalog pages',
    defaultPath: '/',
    authBoundary: 'public',
    primaryRoles: ['anonymous', 'prospect'],
    navModel: 'Top-level marketing sections with persistent utility links to Apps, PRDs, Login, and Contact.',
  },
  {
    id: 'client',
    label: 'Client portal',
    intent: 'Tenant-scoped workspace for systems, PRDs, reports, artifacts, run receipts, blockers, and delivery links.',
    shell: 'src/clients/shared/ClientPortalLayout.jsx',
    defaultPath: '/clients/:tenant',
    authBoundary: 'tenant group or allowlisted email',
    primaryRoles: ['client', 'teammate', 'admin'],
    navModel: 'Tenant header tabs sourced from tenantConfig.navItems; no cross-tenant discovery links.',
  },
  {
    id: 'teammate',
    label: 'Teammate build workspace',
    intent: 'Execution surface for approved specs, active Kanban work, artifacts, run status, and safe dispatch receipts.',
    shell: 'new src/team workspace sharing ops/client primitives',
    defaultPath: '/team/builds',
    authBoundary: 'teammate/admin/operator group',
    primaryRoles: ['teammate', 'admin', 'operator'],
    navModel: 'Build-focused tabs: Queue, Active Builds, Receipts, Artifacts, Decisions.',
  },
  {
    id: 'ops',
    label: 'Admin and operations',
    intent: 'Operational mirror for systems, runs, Kanban state, data health, proof gates, and release readiness.',
    shell: 'src/ops/routes.jsx',
    defaultPath: '/ops',
    authBoundary: 'admin/operator group or explicit GBAutomation allowlist',
    primaryRoles: ['admin', 'operator'],
    navModel: 'OpsHeader tabs; destructive actions stay out of v1 unless backed by an auditable receipt.',
  },
];

export const portalRoutes = [
  // Public P0
  { path: '/', group: 'public', priority: 'P0', page: 'Home', component: 'src/pages/Home.jsx', access: ['anonymous', 'prospect', 'client', 'teammate', 'admin', 'operator'], data: ['brandTokens'], nav: 'primary', day: 1 },
  { path: '/login', group: 'public', priority: 'P0', page: 'Login', component: 'src/pages/Login.jsx', access: ['anonymous', 'prospect', 'client', 'teammate', 'admin', 'operator'], data: ['authNextParam'], nav: 'utility', day: 1 },
  { path: '/apps', group: 'public', priority: 'P0', page: 'Apps catalog', component: 'src/pages/Apps.jsx', access: ['client', 'teammate', 'admin', 'operator'], data: ['public/portfolio/apps-registry.json'], nav: 'primary', day: 2 },
  { path: '/artifacts', group: 'public', priority: 'P0', page: 'Artifacts feed', component: 'src/pages/Artifacts.jsx', access: ['client', 'teammate', 'admin', 'operator'], data: ['public/artifacts/manifest.json'], nav: 'primary', day: 2 },
  { path: '/artifacts/:client/:artifactId', group: 'public', priority: 'P0', page: 'Artifact detail', component: 'src/pages/ArtifactView.jsx', access: ['client', 'teammate', 'admin', 'operator'], data: ['public/artifacts/manifest.json'], nav: 'contextual', day: 2 },
  { path: '/prds', group: 'public', priority: 'P0', page: 'PRD index', component: 'src/pages/PRDIndex.jsx', access: ['anonymous', 'prospect', 'client', 'teammate', 'admin', 'operator'], data: ['public/prds/manifest.json'], nav: 'primary', day: 2 },
  { path: '/prds/:slug', group: 'public', priority: 'P0', page: 'PRD detail', component: 'src/pages/PRDView.jsx', access: ['anonymous', 'prospect', 'client', 'teammate', 'admin', 'operator'], data: ['public/prds/*.html'], nav: 'contextual', day: 2 },

  // Client P0/P1
  { path: '/clients/:tenant', group: 'client', priority: 'P0', page: 'Client overview', component: 'src/clients/<tenant>/routes.jsx', access: ['client', 'teammate', 'admin'], data: ['tenantConfig', 'portalData'], nav: 'tenant-tab', day: 1 },
  { path: '/clients/:tenant/dashboard', group: 'client', priority: 'P0', page: 'Client systems dashboard', component: 'src/clients/<tenant>/pages/TenantDashboardPage.jsx', access: ['client', 'teammate', 'admin'], data: ['systems', 'metrics', 'runReceipts'], nav: 'tenant-tab', day: 2 },
  { path: '/clients/:tenant/apps', group: 'client', priority: 'P0', page: 'Client apps', component: 'src/clients/<tenant>/pages/AppsPage.jsx', access: ['client', 'teammate', 'admin'], data: ['apps'], nav: 'tenant-tab', day: 2 },
  { path: '/clients/:tenant/artifacts', group: 'client', priority: 'P0', page: 'Client artifacts', component: 'src/clients/<tenant>/pages/ArtifactsPage.jsx', access: ['client', 'teammate', 'admin'], data: ['artifacts'], nav: 'tenant-tab', day: 2 },
  { path: '/clients/:tenant/artifacts/:artifactId', group: 'client', priority: 'P0', page: 'Client artifact detail', component: 'src/clients/<tenant>/pages/ArtifactDetailPage.jsx', access: ['client', 'teammate', 'admin'], data: ['artifacts'], nav: 'contextual', day: 2 },
  { path: '/clients/:tenant/reports', group: 'client', priority: 'P0', page: 'Client reports', component: 'src/clients/<tenant>/pages/ReportsPage.jsx', access: ['client', 'teammate', 'admin'], data: ['reports'], nav: 'tenant-tab', day: 2 },
  { path: '/clients/:tenant/reports/:reportId', group: 'client', priority: 'P1', page: 'Client report detail', component: 'src/clients/<tenant>/pages/ReportDetailPage.jsx', access: ['client', 'teammate', 'admin'], data: ['reports'], nav: 'contextual', day: 3 },
  { path: '/clients/:tenant/sync', group: 'client', priority: 'P1', page: 'Client sync receipts', component: 'src/clients/<tenant>/pages/SyncPage.jsx', access: ['teammate', 'admin'], data: ['buildReceipts', 'syncLog'], nav: 'tenant-tab', day: 3 },
  { path: '/clients/:tenant/validation', group: 'client', priority: 'P1', page: 'Client validation', component: 'src/clients/<tenant>/pages/ValidationPage.jsx', access: ['teammate', 'admin'], data: ['proofChecklist', 'brandGate'], nav: 'tenant-tab', day: 4 },

  // Teammate P0/P1
  { path: '/team/builds', group: 'teammate', priority: 'P0', page: 'Build queue', component: 'src/team/pages/BuildQueuePage.jsx', access: ['teammate', 'admin', 'operator'], data: ['approvedPrds', 'kanbanTasks'], nav: 'team-tab', day: 3 },
  { path: '/team/builds/:taskId', group: 'teammate', priority: 'P0', page: 'Build receipt detail', component: 'src/team/pages/BuildReceiptPage.jsx', access: ['teammate', 'admin', 'operator'], data: ['buildReceipts', 'artifacts'], nav: 'contextual', day: 3 },
  { path: '/team/artifacts', group: 'teammate', priority: 'P1', page: 'Team artifact handoffs', component: 'src/team/pages/TeamArtifactsPage.jsx', access: ['teammate', 'admin', 'operator'], data: ['artifactManifest'], nav: 'team-tab', day: 3 },
  { path: '/team/decisions', group: 'teammate', priority: 'P1', page: 'Decision queue', component: 'src/team/pages/DecisionQueuePage.jsx', access: ['teammate', 'admin', 'operator'], data: ['blockers', 'clientApprovals'], nav: 'team-tab', day: 4 },

  // Admin/Ops P0/P1
  { path: '/ops', group: 'ops', priority: 'P0', page: 'Ops overview', component: 'src/ops/pages/OpsOverview.jsx', access: ['admin', 'operator'], data: ['opsData'], nav: 'ops-tab', day: 1 },
  { path: '/ops/systems', group: 'ops', priority: 'P1', page: 'Ops systems', component: 'src/ops/pages/OpsSystems.jsx', access: ['admin', 'operator'], data: ['systems'], nav: 'ops-tab', day: 3 },
  { path: '/ops/runs', group: 'ops', priority: 'P0', page: 'Ops runs', component: 'src/ops/pages/OpsRuns.jsx', access: ['admin', 'operator'], data: ['runStatus'], nav: 'ops-tab', day: 3 },
  { path: '/ops/kanban', group: 'ops', priority: 'P0', page: 'Kanban mirror', component: 'src/ops/pages/HermesKanban.jsx', access: ['admin', 'operator'], data: ['kanbanSnapshot'], nav: 'ops-tab', day: 3 },
  { path: '/ops/data', group: 'ops', priority: 'P1', page: 'Data health', component: 'src/ops/pages/OpsData.jsx', access: ['admin', 'operator'], data: ['manifestHealth', 'proofSources'], nav: 'ops-tab', day: 4 },

  // Backlog P2
  { path: '/pricing', group: 'public', priority: 'P2', page: 'Standalone pricing', component: 'src/pages/PricingPage.jsx', access: ['anonymous', 'prospect'], data: ['brandTokens'], nav: 'secondary', day: 5 },
  { path: '/case-studies', group: 'public', priority: 'P2', page: 'Case studies index', component: 'src/pages/CaseStudiesPage.jsx', access: ['anonymous', 'prospect'], data: ['claimSources'], nav: 'secondary', day: 5 },
  { path: '/clients/:tenant/settings', group: 'client', priority: 'P2', page: 'Client settings', component: 'src/clients/<tenant>/pages/SettingsPage.jsx', access: ['admin'], data: ['tenantConfig'], nav: 'secondary', day: 5 },
  { path: '/ops/release', group: 'ops', priority: 'P2', page: 'Release receipt', component: 'src/ops/pages/ReleaseReceiptPage.jsx', access: ['admin', 'operator'], data: ['releaseReceipt'], nav: 'secondary', day: 5 },
];

export const navigationModel = {
  global: [
    { label: 'Home', to: '/', visibility: ['anonymous', 'prospect', 'client', 'teammate', 'admin', 'operator'] },
    { label: 'Apps', to: '/apps', visibility: ['client', 'teammate', 'admin', 'operator'] },
    { label: 'Artifacts', to: '/artifacts', visibility: ['client', 'teammate', 'admin', 'operator'] },
    { label: 'PRDs', to: '/prds', visibility: ['anonymous', 'prospect', 'client', 'teammate', 'admin', 'operator'] },
    { label: 'Portal', to: '/clients/gbautomation', visibility: ['client', 'teammate', 'admin'] },
    { label: 'Ops', to: '/ops', visibility: ['admin', 'operator'] },
  ],
  clientTabs: ['Overview', 'Dashboard', 'Apps', 'Artifacts', 'Reports', 'Sync', 'Validation'],
  teammateTabs: ['Queue', 'Active Builds', 'Receipts', 'Artifacts', 'Decisions'],
  opsTabs: ['Overview', 'Systems', 'Runs', 'Kanban', 'Data'],
  mobileRule: 'Collapse tabs to horizontal overflow first; only add hamburger if route count exceeds eight visible items.',
};

export const accessMatrix = roleIds.reduce((matrix, role) => {
  matrix[role] = portalRoutes
    .filter((route) => route.access.includes(role))
    .map((route) => route.path);
  return matrix;
}, {});

export const sprintDayRoutePlan = [
  { day: 1, label: 'IA and auth shell', outcome: 'Freeze route contract, existing auth boundaries, tenant nav, ops nav, and P0/P1/P2 list.', p0Routes: ['/', '/login', '/clients/:tenant', '/ops'] },
  { day: 2, label: 'Client data and artifacts', outcome: 'Ship P0 client dashboard, app, artifact, report, and PRD surfaces against static registries.', p0Routes: ['/apps', '/artifacts', '/artifacts/:client/:artifactId', '/prds', '/prds/:slug', '/clients/:tenant/dashboard', '/clients/:tenant/apps', '/clients/:tenant/artifacts', '/clients/:tenant/reports'] },
  { day: 3, label: 'Teammate build workspace', outcome: 'Ship build queue, receipt detail, ops run mirror, and Kanban receipt path.', p0Routes: ['/team/builds', '/team/builds/:taskId', '/ops/runs', '/ops/kanban'] },
  { day: 4, label: 'Brand, proof, and integration', outcome: 'Run proof-vetting and brand gates; expose validation and data health pages.', p0Routes: [] },
  { day: 5, label: 'QA and release', outcome: 'Run tests, build, browser smoke, screenshot, deploy preview, and release receipt.', p0Routes: [] },
];

export function getRoutesByPriority(priority) {
  return portalRoutes.filter((route) => route.priority === priority);
}

export function getRoutesByGroup(group) {
  return portalRoutes.filter((route) => route.group === group);
}
