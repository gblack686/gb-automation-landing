import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const steps = [
  ['Kanban mirror', ['node', ['scripts/export-hermes-kanban.mjs']]],
  ['Team cockpit mirror', ['node', ['scripts/export-team-cockpit.mjs']]],
  ['Observability validator', ['npm', ['run', 'test:observability']]],
];

for (const [label, [command, args]] of steps) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`${label} failed with exit code ${result.status}`);
    process.exit(result.status || 1);
  }
}

console.log('\nOps mirrors refreshed and validated.');
