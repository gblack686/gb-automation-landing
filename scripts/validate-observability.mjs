import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'src/ops/data/controlPlaneReceipts.js');
const pagePath = path.join(root, 'src/ops/pages/OpsRuns.jsx');
const cardsPath = path.join(root, 'src/ops/components/OpsCards.jsx');
const kanbanPagePath = path.join(root, 'src/ops/pages/HermesKanban.jsx');
const freshnessPath = path.join(root, 'src/ops/data/mirrorFreshness.js');
const teamRoutesPath = path.join(root, 'src/team/routes.jsx');
const kanbanMirrorPath = path.join(root, 'public/ops/hermes-kanban.json');
const teamCockpitPath = path.join(root, 'public/team/cockpit.json');
const exportKanbanPath = path.join(root, 'scripts/export-hermes-kanban.mjs');
const exportTeamPath = path.join(root, 'scripts/export-team-cockpit.mjs');

const files = [
  sourcePath,
  pagePath,
  cardsPath,
  kanbanPagePath,
  freshnessPath,
  teamRoutesPath,
  kanbanMirrorPath,
  teamCockpitPath,
  exportKanbanPath,
  exportTeamPath,
];

const source = readFileSync(sourcePath, 'utf8');
const page = readFileSync(pagePath, 'utf8');
const cards = readFileSync(cardsPath, 'utf8');
const combined = `${source}\n${page}\n${cards}`;
const browserOutput = [kanbanMirrorPath, teamCockpitPath]
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');
const uiSource = [kanbanPagePath, teamRoutesPath, freshnessPath]
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const required = [
  'integration_agent_run_receipts_v1',
  'integration_langfuse_trace_receipts_v1',
  'task_id',
  'run_id',
  'status',
  'assignee',
  'profile',
  'started_at',
  'ended_at',
  'created_at',
  'langfuse_url',
];

const forbiddenSourceTokens = [
  'payload->',
  'payload.',
  'raw_payload',
  'raw prompt',
  'raw output',
  'SERVICE_ROLE',
  'service_role',
  'VITE_SUPABASE_SERVICE',
];

const forbiddenBrowserPatterns = [
  [/\/Users\/[A-Za-z0-9._-]+\//, 'raw absolute user path'],
  [/~\/(?:\.hermes|\.openclaw|repos|Library)\//, 'raw home path'],
  [/\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/, 'raw env-style name'],
  [/(sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9_]{12,}|xox[baprs]-[A-Za-z0-9-]{12,})/, 'token-like value'],
  [/(Authorization|Bearer\s+[A-Za-z0-9._-]{12,}|service_role)/i, 'auth material'],
  [/(raw_payload|rawLog|raw log|stack trace|traceback|stderr|stdout)/i, 'raw log or payload marker'],
];

const failures = [];
for (const token of required) {
  if (!combined.includes(token)) failures.push(`missing required token: ${token}`);
}

for (const token of forbiddenSourceTokens) {
  if (combined.includes(token)) failures.push(`forbidden browser token: ${token}`);
}

for (const [pattern, label] of forbiddenBrowserPatterns) {
  if (pattern.test(browserOutput)) failures.push(`forbidden browser output: ${label}`);
}

if (!source.includes('VITE_SUPABASE_ANON_KEY')) {
  failures.push('safe Supabase client must use VITE_SUPABASE_ANON_KEY');
}

if (!source.includes('controlPlaneFixture')) {
  failures.push('mocked safe data fixture is missing');
}

if (!source.includes('SAFE_RUN_SELECT') || !source.includes('SAFE_TRACE_SELECT')) {
  failures.push('safe view select lists are missing');
}

if (!uiSource.includes('getMirrorFreshness') || !uiSource.includes('Stale mirror')) {
  failures.push('ops and team stale-state UI is missing');
}

if (!readFileSync(exportKanbanPath, 'utf8').includes('redaction')) {
  failures.push('Kanban exporter must stamp redaction policy');
}

if (!readFileSync(exportTeamPath, 'utf8').includes('redaction')) {
  failures.push('team cockpit exporter must stamp redaction policy');
}

if (failures.length) {
  console.error('Observability dashboard validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Observability dashboard validation passed.');
for (const file of files) console.log(`Checked ${path.relative(root, file)}`);
