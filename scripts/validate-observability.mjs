import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const requiredPaths = [
  'src/ops/pages/OpsObservability.jsx',
  'src/ops/data/observabilityData.js',
  'netlify/functions/langfuse-traces.js',
  'public/observability/reports/ecom-telemetry-report-2026-06-02.html',
  'public/observability/reports/trace-attribution-standard-plan.html',
  'public/observability/reports/2026-06-01-activity-breakdown.md',
  'public/observability/reports/2026-06-01-enhanced-trace-analysis.md',
];

const failures = [];

for (const path of requiredPaths) {
  if (!existsSync(resolve(root, path))) {
    failures.push(`missing required path: ${path}`);
  }
}

const routes = readFileSync(resolve(root, 'src/ops/routes.jsx'), 'utf8');
for (const route of [
  'observability',
  'observability/traces',
  'observability/sessions',
  'observability/agents',
  'observability/reports',
  'observability/live',
]) {
  if (!routes.includes(`path="${route}"`)) failures.push(`missing /ops/${route} route`);
}

const header = readFileSync(resolve(root, 'src/ops/components/OpsHeader.jsx'), 'utf8');
if (!header.includes('/ops/observability')) {
  failures.push('ops header does not link to /ops/observability');
}

const data = readFileSync(resolve(root, 'src/ops/data/observabilityData.js'), 'utf8');
for (const token of ['traceFixtures', 'liveEvents', 'committers', 'worktrees', 'Pi observability template']) {
  if (!data.includes(token)) failures.push(`observability data missing ${token}`);
}

const page = readFileSync(resolve(root, 'src/ops/pages/OpsObservability.jsx'), 'utf8');
for (const token of ['LiveSingle', 'LiveSwimlane', 'LiveRace', 'useLangfuseTraces']) {
  if (!page.includes(token)) failures.push(`observability page missing ${token}`);
}

const fn = readFileSync(resolve(root, 'netlify/functions/langfuse-traces.js'), 'utf8');
for (const token of ['LANGFUSE_PUBLIC_KEY', 'LANGFUSE_SECRET_KEY', 'static-fallback', '/api/public/traces']) {
  if (!fn.includes(token)) failures.push(`Langfuse function missing ${token}`);
}

if (failures.length) {
  console.error('Observability validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Observability validation passed.');

