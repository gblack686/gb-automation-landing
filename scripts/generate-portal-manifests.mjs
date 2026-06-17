import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const landingRoot = path.resolve(__dirname, '..');
const gbautomationRoot = process.env.GBAUTOMATION_ROOT || path.resolve(landingRoot, '..', 'gbautomation');
const sourceRoot = process.env.PORTAL_SOURCE_ROOT || path.join(gbautomationRoot, 'second-brain');
const generatedAt = process.env.PORTAL_GENERATED_AT || new Date().toISOString();
const clients = process.env.PORTAL_CLIENTS
  ? process.env.PORTAL_CLIENTS.split(',').map((value) => value.trim()).filter(Boolean)
  : [];

const args = [
  '-m',
  'scripts.portal_export.export_client',
  '--source-root',
  sourceRoot,
  '--website-root',
  landingRoot,
  '--generated-at',
  generatedAt,
];

if (clients.length) {
  for (const client of clients) args.push('--client', client);
} else {
  args.push('--all');
}

const result = spawnSync('python3', args, {
  cwd: gbautomationRoot,
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
