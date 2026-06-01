import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const requiredPaths = [
  'src/clients/gbautomation/routes.jsx',
  'src/clients/shared/ClientPortalHeader.jsx',
  'src/clients/shared/ClientPortalLayout.jsx',
  'src/clients/shared/tenantConfig.js',
  'src/clients/gbautomation/pages/DashboardPage.jsx',
  'src/clients/gbautomation/pages/TenantDashboardPage.jsx',
  'src/clients/gbautomation/pages/AppsPage.jsx',
  'src/clients/gbautomation/pages/ArtifactsPage.jsx',
  'src/clients/gbautomation/pages/ArtifactDetailPage.jsx',
  'src/clients/gbautomation/pages/ReportsPage.jsx',
  'src/clients/gbautomation/pages/ReportDetailPage.jsx',
  'src/clients/gbautomation/pages/SyncPage.jsx',
  'src/clients/gbautomation/pages/ValidationPage.jsx',
  'public/clients/gbautomation/profile.json',
  'public/clients/gbautomation/dashboard.json',
  'public/clients/gbautomation/apps.json',
  'public/clients/gbautomation/artifacts.json',
  'public/clients/gbautomation/reports.json',
  'src/clients/jid5274/routes.jsx',
  '.github/workflows/tenant-sync.yml',
  '.github/workflows/jid5274-archon-sync.yml',
  'docs/tenant-source-notify-parent.yml',
  'docs/tenant-portals.md',
];

const failures = [];

for (const path of requiredPaths) {
  if (!existsSync(resolve(root, path))) {
    failures.push(`missing required path: ${path}`);
  }
}

const app = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');
if (!app.includes('/clients/gbautomation/*')) {
  failures.push('src/App.jsx does not mount /clients/gbautomation/*');
}

if (!app.includes('/clients/jid5274/*')) {
  failures.push('src/App.jsx does not mount /clients/jid5274/*');
}

const requireAuth = readFileSync(resolve(root, 'src/components/RequireAuth.jsx'), 'utf8');
if (!requireAuth.includes('allowedGroups')) {
  failures.push('RequireAuth does not expose allowedGroups tenant checks');
}

const registry = JSON.parse(readFileSync(resolve(root, 'public/portfolio/apps-registry.json'), 'utf8'));
const portalEntry = registry.apps?.find((appEntry) => appEntry.slug === 'client-portal-gbautomation');
if (!portalEntry) {
  failures.push('apps registry is missing client-portal-gbautomation');
} else if (portalEntry.app_path !== '/clients/gbautomation') {
  failures.push('client-portal-gbautomation app_path is not /clients/gbautomation');
}

const jid5274Entry = registry.apps?.find((appEntry) => appEntry.slug === 'client-portal-jid5274');
if (!jid5274Entry) {
  failures.push('apps registry is missing client-portal-jid5274');
} else if (jid5274Entry.app_path !== '/clients/jid5274') {
  failures.push('client-portal-jid5274 app_path is not /clients/jid5274');
}

if (failures.length) {
  console.error('Tenant portal validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Tenant portal validation passed.');
