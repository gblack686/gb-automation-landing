import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientRoot = process.env.PORTAL_CLIENT_ROOT || '/Users/greg/repos/gbautomation/second-brain/clients';
const failures = [];

const forbiddenPatterns = [
  { name: 'raw local user path', pattern: /\/Users\/[A-Za-z0-9._-]+\// },
  { name: 'home-relative runtime path', pattern: /(^|[\s"'`:])~\// },
  { name: '1Password URI', pattern: /op:\/\//i },
  { name: 'AWS Secrets Manager command', pattern: /aws\s+secretsmanager/i },
  { name: 'literal secret-string flag', pattern: /secret-string/i },
  { name: 'placeholder token literal', pattern: /token_here/i },
  { name: 'environment credential variable', pattern: /[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|OAUTH|COOKIE|CREDENTIAL|API_KEY)[A-Z0-9_]*/ },
];

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`missing generated manifest: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch (error) {
    failures.push(`invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

function readProfileStatus(profilePath) {
  const text = readFileSync(profilePath, 'utf8');
  const frontmatter = text.startsWith('---') ? text.split('---')[1] || '' : '';
  const get = (key) => frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
  return {
    client: get('client'),
    status: get('status'),
  };
}

function activeClientSlugs() {
  if (!existsSync(clientRoot)) {
    failures.push(`client root missing: ${clientRoot}`);
    return [];
  }
  return readdirSync(clientRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => {
      const profilePath = path.join(clientRoot, entry.name, 'profile.md');
      if (!existsSync(profilePath)) return null;
      const profile = readProfileStatus(profilePath);
      if (profile.status !== 'active') return null;
      return (profile.client || entry.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    })
    .filter(Boolean)
    .sort();
}

function scanForbidden(relativePath, value, trail = '') {
  if (value == null) return;
  if (typeof value === 'string') {
    for (const { name, pattern } of forbiddenPatterns) {
      if (pattern.test(value)) failures.push(`${relativePath}${trail} contains ${name}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbidden(relativePath, item, `${trail}[${index}]`));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) scanForbidden(relativePath, child, `${trail}.${key}`);
  }
}

function isProofedRow(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
  const proofStatus = value.proof?.status || value.proofStatus;
  const sourcePath = value.sourcePath || value.source_path || value.source?.sourcePath || value.source?.source_path;
  return Boolean(sourcePath && proofStatus);
}

function checkRows(relativePath, value, trail = '') {
  if (Array.isArray(value)) {
    const objectItems = value.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
    for (const [index, item] of value.entries()) {
      if (item && typeof item === 'object') {
        if (objectItems.length && !isProofedRow(item)) failures.push(`${relativePath}${trail}[${index}] missing sourcePath plus proof.status`);
        checkRows(relativePath, item, `${trail}[${index}]`);
      }
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) checkRows(relativePath, child, `${trail}.${key}`);
  }
}

function validateManifest(relativePath) {
  const payload = readJson(relativePath);
  if (!payload) return null;
  scanForbidden(relativePath, payload);
  checkRows(relativePath, payload);
  if (!payload.generated_at && !payload.updated_at) failures.push(`${relativePath} missing generated_at or updated_at`);
  return payload;
}

const slugs = activeClientSlugs();
const registry = validateManifest('public/clients/registry.json');
if (registry) {
  const exported = (registry.clients || []).map((client) => client.slug).sort();
  for (const slug of slugs) {
    if (!exported.includes(slug)) failures.push(`active client missing from public/clients/registry.json: ${slug}`);
  }
}

for (const slug of slugs) {
  const profile = validateManifest(`public/clients/${slug}/profile.json`);
  const dashboard = validateManifest(`public/clients/${slug}/dashboard.json`);
  const apps = validateManifest(`public/clients/${slug}/apps.json`);
  const artifacts = validateManifest(`public/clients/${slug}/artifacts.json`);
  const reports = validateManifest(`public/clients/${slug}/reports.json`);

  if (profile?.tenant?.status !== 'active') failures.push(`${slug} profile tenant.status must be active`);
  if (!Array.isArray(dashboard?.metrics)) failures.push(`${slug} dashboard metrics must be an array`);
  if (!Array.isArray(apps?.apps)) failures.push(`${slug} apps must be an array`);
  if (!Array.isArray(artifacts?.artifacts)) failures.push(`${slug} artifacts must be an array`);
  if (!Array.isArray(reports?.reports)) failures.push(`${slug} reports must be an array`);

  for (const report of reports?.reports || []) {
    validateManifest(`public/clients/${slug}/reports/${report.id}.json`);
  }
}

const routeManifestPath = path.join(root, 'src/routes/routeManifest.js');
const routeManifest = existsSync(routeManifestPath) ? readFileSync(routeManifestPath, 'utf8') : '';
for (const group of ['public', 'client', 'teammate', 'ops']) {
  if (!routeManifest.includes(`id: '${group}'`)) failures.push(`route manifest missing required route group: ${group}`);
}

const routeMatrixPath = 'docs/portal-route-source-matrix.md';
const routeMatrix = existsSync(path.join(root, routeMatrixPath)) ? readFileSync(path.join(root, routeMatrixPath), 'utf8') : '';
for (const token of ['Public website', 'Client portal', 'Teammate build cockpit', 'Ops dashboard']) {
  if (!routeMatrix.includes(token)) failures.push(`${routeMatrixPath} missing ${token}`);
}

const opsManifest = readJson('public/ops/hermes-kanban.json');
if (opsManifest) {
  if (opsManifest.source?.mode !== 'sanitized-read-only') failures.push('public/ops/hermes-kanban.json source.mode must be sanitized-read-only');
  if (!opsManifest.generatedAt) failures.push('public/ops/hermes-kanban.json missing generatedAt');
}

const artifactManifest = validateManifest('public/artifacts/manifest.json');
if (artifactManifest && !Array.isArray(artifactManifest.artifacts)) failures.push('public/artifacts/manifest.json artifacts must be an array');
validateManifest('public/portfolio/apps-registry.json');

if (failures.length) {
  console.error('Generated manifest validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Generated manifest validation passed for ${slugs.length} active clients.`);
