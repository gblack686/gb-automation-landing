import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const requiredPaths = [
  'src/clients/gbautomation/routes.jsx',
  'src/clients/gbautomation/components/PortalHeader.jsx',
  'src/clients/gbautomation/pages/DashboardPage.jsx',
  'src/clients/gbautomation/pages/SyncPage.jsx',
  'src/clients/gbautomation/pages/ValidationPage.jsx',
  '.github/workflows/tenant-sync.yml',
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

if (failures.length) {
  console.error('Tenant portal validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Tenant portal validation passed.');
