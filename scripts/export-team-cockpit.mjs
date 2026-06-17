import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const outputPath = process.env.TEAM_COCKPIT_OUTPUT || join(repoRoot, 'public', 'team', 'cockpit.json');

const inputs = {
  kanban: join(repoRoot, 'public', 'ops', 'hermes-kanban.json'),
  prds: join(repoRoot, 'public', 'prds', 'prds-manifest.json'),
  artifacts: join(repoRoot, 'public', 'artifacts', 'manifest.json'),
};

const absolutePathPattern = /(?:\/Users\/[A-Za-z0-9._-]+|\/var\/folders|\/tmp|\/private\/tmp|\/opt\/homebrew|\/usr\/local|\/home\/[A-Za-z0-9._-]+)(?:\/[^\s'"),;]+)*/g;
const homePathPattern = /~\/(?:\.hermes|\.openclaw|repos|Library)(?:\/[^\s'"),;]+)*/g;
const secretWordPattern = /(token|secret|password|passwd|private[_-]?key|authorization|bearer|oauth|cookie)/gi;
const envWordPattern = /\b[A-Z][A-Z0-9_]{2,}\b/g;
const rawDetailPattern = /(traceback|stack trace|raw log|stderr|stdout|prompt|payload)/gi;

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sanitize(value, limit = 180) {
  if (value === null || value === undefined) return null;
  let text = String(value).replace(/\s+/g, ' ').trim();
  text = text.replace(absolutePathPattern, '[redacted-path]');
  text = text.replace(homePathPattern, '[redacted-path]');
  text = text.replace(secretWordPattern, '[redacted-secret-word]');
  text = text.replace(envWordPattern, (match) => (match.includes('_') ? '[redacted-env]' : match));
  text = text.replace(rawDetailPattern, '[redacted-operational-detail]');
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trim()}...`;
}

function safeUrl(value, fallback = '/') {
  const url = sanitize(value, 180) || fallback;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return url;
  return fallback;
}

function prdItems(manifest) {
  const entries = Array.isArray(manifest?.items) ? manifest.items : Array.isArray(manifest) ? manifest : [];
  return entries.slice(0, 8).map((entry, index) => ({
    id: sanitize(entry.slug || entry.id || `prd-${index}`, 96),
    title: sanitize(entry.title || entry.name || 'Untitled PRD', 160),
    status: sanitize(entry.status || entry.approvalStatus || 'mirrored', 40),
    priority: sanitize(entry.priority || 'medium', 40),
    owner: sanitize(entry.client || entry.owner || 'TAC PRD queue', 80),
    url: safeUrl(entry.href || entry.url || (entry.slug ? `/prds/${entry.slug}` : '/prds')),
    receipt: 'Mirrored from approved PRD manifest. Browser surface is read-only.',
  }));
}

function kanbanTasks(kanban) {
  const tasks = [];
  for (const board of kanban?.boards || []) {
    for (const column of board.columns || []) {
      if (!['running', 'ready', 'blocked'].includes(column.name)) continue;
      for (const task of column.tasks || []) {
        tasks.push({
          id: sanitize(task.id, 80),
          title: sanitize(task.title || 'Untitled task', 140),
          status: sanitize(task.status || column.name, 40),
          assignee: sanitize(task.assignee || 'unassigned', 80),
          priority: Number(task.priority || 0),
          receipt: sanitize(task.latestSummary || task.bodyPreview || 'Sanitized Kanban task projection.', 180),
        });
      }
    }
  }
  return tasks
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 12);
}

function artifactItems(manifest) {
  const entries = Array.isArray(manifest?.artifacts)
    ? manifest.artifacts
    : Array.isArray(manifest?.items)
      ? manifest.items
      : Array.isArray(manifest)
        ? manifest
        : [];
  return entries.slice(0, 8).map((entry, index) => ({
    id: sanitize(entry.id || entry.slug || `artifact-${index}`, 96),
    title: sanitize(entry.title || entry.name || 'Untitled artifact', 160),
    status: sanitize(entry.status || 'mirrored', 40),
    kind: sanitize(entry.kind || entry.type || 'artifact', 60),
    url: safeUrl(entry.href || entry.url || '/artifacts'),
    receipt: 'Mirrored artifact row with bounded browser fields only.',
  }));
}

function runReceiptsFromKanban(kanban) {
  const runs = [];
  for (const board of kanban?.boards || []) {
    for (const column of board.columns || []) {
      for (const task of column.tasks || []) {
        if (!task.runCount && !task.latestSummary) continue;
        runs.push({
          id: sanitize(`run-${task.id}`, 96),
          title: sanitize(task.title || 'Mirrored Kanban run', 140),
          status: sanitize(task.status || column.name, 40),
          actor: sanitize(task.assignee || 'Hermes worker', 80),
          receipt: sanitize(task.latestSummary || task.resultPreview || 'Run receipt mirrored from sanitized Kanban state.', 180),
          evidence: [
            `task ${sanitize(task.id, 80)}`,
            `${Number(task.runCount || 0)} runs`,
            `${Number(task.eventCount || 0)} events`,
          ],
        });
      }
    }
  }
  return runs.slice(0, 10);
}

const kanban = readJson(inputs.kanban, null);
const prds = readJson(inputs.prds, null);
const artifacts = readJson(inputs.artifacts, null);
const generatedAt = new Date().toISOString();

const payload = {
  schemaVersion: 2,
  generatedAt,
  maxAgeMinutes: 90,
  source: {
    mode: 'static-read-only',
    description: 'Generated teammate cockpit receipts. Browser clients may read this file but must not mutate Kanban or dispatch builds.',
    inputs: ['prds-manifest', 'hermes-kanban-mirror', 'artifact-manifest'],
  },
  redaction: {
    absolutePathsIncluded: false,
    envNamesIncluded: false,
    logTextIncluded: false,
    payloadBodiesIncluded: false,
  },
  approvedPrds: prdItems(prds),
  buildStatus: {
    queueLabel: 'Hermes Kanban mirror',
    summary: 'Read-only build queue projection. Use the operator Kanban board for mutations.',
    activeTasks: kanbanTasks(kanban),
  },
  artifactReceipts: artifactItems(artifacts),
  runReceipts: runReceiptsFromKanban(kanban),
  releaseReceipts: [
    {
      id: 'release-static-cockpit-v2',
      title: 'Team cockpit generated read model',
      status: 'mirrored',
      version: 'v2',
      date: generatedAt.slice(0, 10),
      evidence: [
        'Generated from bounded manifests',
        'Static JSON reads only',
        'No browser dispatch or mutation controls',
      ],
    },
  ],
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);
console.log(`Projected ${payload.buildStatus.activeTasks.length} active task(s) and ${payload.runReceipts.length} run receipt(s).`);
