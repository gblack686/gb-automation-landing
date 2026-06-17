const baseTheme = {
  accent: '#D97757',
  background: '#F3F1E7',
  ink: '#191919',
  border: '#D6D4C8',
  panel: '#E6E4D9',
};

export const tenantRegistry = {
  gbautomation: {
    slug: 'gbautomation',
    name: 'GBAutomation',
    eyebrow: 'Internal Client Portal',
    productLabel: 'Template Tenant',
    repository: 'gbauto/gbautomation',
    dataPath: '/clients/gbautomation',
    auth: {
      allowedGroups: ['tenant-gbautomation'],
      allowedEmails: ['gblack686@gmail.com'],
    },
    routes: {
      basePath: '/clients/gbautomation',
      routeModule: 'generic',
      modules: ['portal-workspace', 'dashboard', 'apps', 'artifacts', 'reports', 'receipts', 'decisions', 'sync', 'validation'],
    },
    navItems: [
      { label: 'Overview', to: '/clients/gbautomation' },
      { label: 'Getting Started', to: '/clients/gbautomation/getting-started' },
      { label: 'Requirements', to: '/clients/gbautomation/requirements' },
      { label: 'Admin', to: '/clients/gbautomation/admin-checklists' },
      { label: 'Dashboard', to: '/clients/gbautomation/dashboard' },
      { label: 'Apps', to: '/clients/gbautomation/apps' },
      { label: 'Artifacts', to: '/clients/gbautomation/artifacts' },
      { label: 'Reports', to: '/clients/gbautomation/reports' },
      { label: 'Receipts', to: '/clients/gbautomation/receipts' },
      { label: 'Decisions', to: '/clients/gbautomation/decisions' },
      { label: 'Sync', to: '/clients/gbautomation/sync' },
      { label: 'Validation', to: '/clients/gbautomation/validation' },
    ],
    quickLinks: [
      { label: 'Apps', to: '/apps' },
      { label: 'Ops', to: '/ops' },
    ],
    ...baseTheme,
  },
  jid5274: {
    slug: 'jid5274',
    name: 'Jason Diaz',
    eyebrow: 'Practice Management Consultants',
    productLabel: 'PMC Workspace',
    repository: 'gbauto/jid5274',
    dataPath: '/clients/jid5274',
    auth: {
      allowedGroups: ['tenant-jid5274'],
      allowedEmails: ['jid5274@gmail.com'],
    },
    routes: {
      basePath: '/clients/jid5274',
      routeModule: 'jid5274Archon',
      modules: ['archon-static'],
      migrationNote: 'Temporary Archon iframe/static exception until jid5274 becomes a normal shared workspace tenant.',
    },
    navItems: [
      { label: 'Archon', to: '/clients/jid5274' },
    ],
    quickLinks: [],
    ...baseTheme,
  },
};

export const routeAuthPolicies = {
  ops: {
    allowedGroups: ['tenant-gbautomation'],
    allowedEmails: ['gblack686@gmail.com', 'greg@gbautomation.xyz'],
  },
  team: {
    allowedGroups: ['teammate', 'admin'],
    allowedEmails: ['gblack686@gmail.com', 'greg@gbautomation.xyz'],
  },
};

export function getRouteAuthPolicy(routeKey) {
  return routeAuthPolicies[routeKey] || null;
}

export function getTenantContract(slug) {
  return tenantRegistry[slug] || null;
}

export function listTenantContracts() {
  return Object.values(tenantRegistry);
}

export function getTenantAuthPolicy(slug) {
  const tenant = getTenantContract(slug);
  if (!tenant) return null;
  return {
    allowedGroups: tenant.auth?.allowedGroups || [],
    allowedEmails: tenant.auth?.allowedEmails || [],
  };
}

export function getEnabledTenantRouteModules(slug) {
  return getTenantContract(slug)?.routes?.modules || [];
}
