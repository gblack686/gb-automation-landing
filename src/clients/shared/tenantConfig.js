// Tenant configuration registry for the reusable client portal shell.
//
// The website router currently mounts each tenant explicitly under
// /clients/<slug>/* with its own auth guard (see src/App.jsx). The recommended
// generic route pattern is /clients/:clientSlug/* with auth resolved from
// this registry (see docs/ui-agent-page-map.md for the migration plan).
//
// GBAutomation is the template tenant. Its config and sample data under
// public/clients/gbautomation/ are the reference for every new client.

export const tenantConfigs = {
  gbautomation: {
    slug: 'gbautomation',
    name: 'GBAutomation',
    eyebrow: 'Internal Client Portal',
    productLabel: 'Template Tenant',
    repository: 'gbauto/gbautomation',
    accent: '#D97757',
    background: '#F3F1E7',
    ink: '#191919',
    border: '#D6D4C8',
    panel: '#E6E4D9',
    dataPath: '/clients/gbautomation',
    adapter: 'react-pages',
    auth: {
      allowedGroups: ['tenant-gbautomation'],
      allowedEmails: ['gblack686@gmail.com'],
    },
    navItems: [
      { label: 'Overview', to: '/clients/gbautomation' },
      { label: 'Dashboard', to: '/clients/gbautomation/dashboard' },
      { label: 'Apps', to: '/clients/gbautomation/apps' },
      { label: 'Artifacts', to: '/clients/gbautomation/artifacts' },
      { label: 'Reports', to: '/clients/gbautomation/reports' },
      { label: 'Sync', to: '/clients/gbautomation/sync' },
      { label: 'Validation', to: '/clients/gbautomation/validation' },
    ],
    quickLinks: [
      { label: 'Apps', to: '/apps' },
      { label: 'Ops', to: '/ops' },
    ],
  },
  jid5274: {
    slug: 'jid5274',
    name: 'Jason Diaz',
    eyebrow: 'Practice Management Consultants',
    productLabel: 'PMC Workspace',
    repository: 'gbauto/jid5274',
    accent: '#D97757',
    background: '#F3F1E7',
    ink: '#191919',
    border: '#D6D4C8',
    panel: '#E6E4D9',
    dataPath: '/clients/jid5274',
    adapter: 'static-bundle',
    auth: {
      allowedGroups: ['tenant-jid5274'],
      allowedEmails: ['jid5274@gmail.com'],
    },
    navItems: [
      { label: 'Archon', to: '/clients/jid5274' },
    ],
    quickLinks: [],
  },
};

export function getTenantConfig(slug) {
  return tenantConfigs[slug] || null;
}
