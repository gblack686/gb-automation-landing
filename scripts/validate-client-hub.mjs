import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const failures = [];
const requiredPaths = [
  'src/clients/gbautomation/pages/ClientHubPage.jsx',
  'public/clients/gbautomation/client-hub-index.json',
];

for (const path of requiredPaths) {
  if (!existsSync(resolve(root, path))) {
    failures.push(`missing required path: ${path}`);
  }
}

function readIfExists(path) {
  const full = resolve(root, path);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

const routes = readIfExists('src/clients/gbautomation/routes.jsx');
if (!routes.includes('ClientHubPage')) failures.push('routes.jsx does not import ClientHubPage');
if (!routes.includes('path="hub"')) failures.push('routes.jsx does not mount /clients/gbautomation/hub');

const tenantConfig = readIfExists('src/clients/shared/tenantConfig.js');
if (!tenantConfig.includes("label: 'Client Hub'")) failures.push('tenant nav does not include Client Hub');

const app = readIfExists('src/App.jsx');
if (!app.includes('path="/hub"')) failures.push('src/App.jsx does not expose public /hub shortcut');

const page = readIfExists('src/clients/gbautomation/pages/ClientHubPage.jsx');
for (const phrase of [
  'PRD Index',
  'Artifact Index',
  'PRD State',
  'Pickup Ideas',
  'Kanban Portfolio',
  'Drafts & Review',
  'Blocked Work',
  'Latest Plans & Reports',
  'Recently Merged',
  'freshness_label',
  'stale_reason',
]) {
  if (!page.includes(phrase)) failures.push(`ClientHubPage missing visible/contract phrase: ${phrase}`);
}

const dataText = readIfExists('public/clients/gbautomation/client-hub-index.json');
if (dataText) {
  const data = JSON.parse(dataText);
  const expected = [
    'prd_index',
    'artifact_index',
    'prd_merge_state',
    'pickup_ideas',
    'kanban_portfolio',
    'drafts_review_queue',
    'blocked_work',
    'latest_plans_reports',
    'recently_merged_work',
  ];
  const surfaces = new Set((data.surfaces || []).map((surface) => surface.surface));
  for (const surface of expected) {
    if (!surfaces.has(surface)) failures.push(`client hub JSON missing surface: ${surface}`);
  }
}

if (failures.length) {
  console.error('Client hub validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Client hub validation passed.');
