import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

function requirePath(relativePath) {
  if (!existsSync(resolve(root, relativePath))) failures.push(`missing required path: ${relativePath}`);
}

const requiredPaths = [
  'src/App.jsx',
  'src/clients/ClientPortalBoundary.jsx',
  'src/clients/workspace/ClientWorkspaceRoutes.jsx',
  'src/clients/registry/tenantRegistry.js',
  'src/clients/shared/PortalContentBlocks.jsx',
  'package.json',
  'src/content/clientWelcomeContent.generated.json',
  'src/content/clientWelcomeContent.js',
  'src/pages/Welcome.jsx',
  'src/pages/SalesHowItWorks.jsx',
  'src/clients/workspace/ClientGettingStartedPage.jsx',
  'src/clients/workspace/ClientRequirementsPage.jsx',
  'src/clients/workspace/ClientAdminChecklistsPage.jsx',
];

for (const path of requiredPaths) requirePath(path);

if (existsSync(resolve(root, 'src/App.jsx'))) {
  const app = read('src/App.jsx');
  for (const snippet of ['path="/welcome"', 'path="/sales/how-it-works"']) {
    if (!app.includes(snippet)) failures.push(`src/App.jsx missing ${snippet}`);
  }
  if (!app.includes('ClientPortalBoundary') || !app.includes('/clients/:clientSlug/*')) {
    failures.push('src/App.jsx missing generic client portal boundary route');
  }
}

if (existsSync(resolve(root, 'src/clients/ClientPortalBoundary.jsx'))) {
  const boundary = read('src/clients/ClientPortalBoundary.jsx');
  for (const snippet of ['RequireAuth', 'getTenantAuthPolicy', 'allowedGroups', 'allowedEmails']) {
    if (!boundary.includes(snippet)) failures.push(`ClientPortalBoundary missing tenant auth check: ${snippet}`);
  }
}

if (existsSync(resolve(root, 'src/clients/workspace/ClientWorkspaceRoutes.jsx'))) {
  const routes = read('src/clients/workspace/ClientWorkspaceRoutes.jsx');
  for (const snippet of ['path="getting-started"', 'path="requirements"', 'path="admin-checklists"']) {
    if (!routes.includes(snippet)) failures.push(`ClientWorkspaceRoutes missing ${snippet}`);
  }
}

if (existsSync(resolve(root, 'src/content/clientWelcomeContent.generated.json'))) {
  const artifact = JSON.parse(read('src/content/clientWelcomeContent.generated.json'));
  if (artifact.schema_version !== 'portal-content.v1') failures.push('artifact schema_version is not portal-content.v1');
  if (artifact.source_policy?.portal_may_edit !== false) failures.push('artifact must mark portal_may_edit false');
  if (artifact.validation?.redaction_scan_status !== 'passed') failures.push('artifact redaction scan did not pass');
  const routeKeys = ['/welcome', '/clients/:slug/getting-started', '/clients/:slug/requirements', '/clients/:slug/admin-checklists', '/sales/how-it-works'];
  for (const routeKey of routeKeys) {
    if (!artifact.routes?.[routeKey]) failures.push(`artifact missing route ${routeKey}`);
  }
  const welcome = artifact.routes?.['/welcome'];
  if (!welcome?.hero?.title) failures.push('/welcome missing hero title');
  if (!Array.isArray(welcome?.welcome_templates) || welcome.welcome_templates.length < 1) failures.push('/welcome missing welcome templates');
  if (!Array.isArray(welcome?.before_call_checklist) || welcome.before_call_checklist.length < 1) failures.push('/welcome missing before-call checklist');
  const gettingStarted = artifact.routes?.['/clients/:slug/getting-started'];
  if (!Array.isArray(gettingStarted?.steps) || gettingStarted.steps.length < 1) failures.push('/clients/:slug/getting-started missing steps');
  if (!Array.isArray(gettingStarted?.key_links)) failures.push('/clients/:slug/getting-started missing key links');
  const requirements = artifact.routes?.['/clients/:slug/requirements'];
  if (!Array.isArray(requirements?.requirements_checklists) || requirements.requirements_checklists.length < 1) failures.push('/clients/:slug/requirements missing checklist items');
  if (!Array.isArray(requirements?.integration_requirements)) failures.push('/clients/:slug/requirements missing integration requirements');
  const admin = artifact.routes?.['/clients/:slug/admin-checklists'];
  if (!Array.isArray(admin?.admin_checklists) || admin.admin_checklists.length < 1) failures.push('/clients/:slug/admin-checklists missing checklist items');
  const sales = artifact.routes?.['/sales/how-it-works'];
  if (!Array.isArray(sales?.pillars) || sales.pillars.length < 1) failures.push('/sales/how-it-works missing pillars');
  if (!Array.isArray(sales?.build_flow_steps) || sales.build_flow_steps.length < 1) failures.push('/sales/how-it-works missing build flow steps');
  if (!Array.isArray(sales?.trust_claims) || sales.trust_claims.length < 1) failures.push('/sales/how-it-works missing trust claims');
  const refs = new Map((artifact.shared?.source_refs || []).map((ref) => [ref.id, ref]));
  for (const [id, ref] of refs) {
    if (!ref.path || ref.path.includes('.env') || ref.path.includes('credentials')) failures.push(`unsafe source ref: ${id}`);
  }
  const serialized = JSON.stringify(artifact);
  const deniedPatterns = [
    { name: 'aws-account-id', pattern: /\b\d{12}\b/ },
    { name: 'private-or-public-host-ip', pattern: /\b(?:10|100|172|18|192)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ },
    { name: 'internal-secret-path', pattern: /gbautomation\/[a-z0-9-]+\/[a-z0-9-]+/i },
    { name: 'token-like-value', pattern: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{6,}["']/i },
  ];
  for (const { name, pattern } of deniedPatterns) {
    if (pattern.test(serialized)) failures.push(`artifact leaked denied source detail class: ${name}`);
  }
}

if (failures.length) {
  console.error('Portal content validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Portal content validation passed.');
