import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const gbautomationRoot = process.env.GBAUTOMATION_REPO || path.resolve(repoRoot, '..', 'gbautomation');
const inventoryDir = path.join(gbautomationRoot, 'tac-inventory');
const scalePath = path.join(gbautomationRoot, 'outputs', 'tac_inventory_scale.json');
const weeklyScanDir = path.join(gbautomationRoot, 'second-brain', 'intelligence', 'tac-cli', 'weekly-scan');
const outputPath = path.join(repoRoot, 'public', 'tac', 'catalog.json');

function countBy(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

function repoSource(repoName, originalTacRepos, provenance = {}) {
  const remoteUrl = String(provenance?.remote_url || '');
  if (originalTacRepos.has(repoName) || /github\.com[/:](?:gbauto-tac|disler)\//i.test(remoteUrl)) {
    return {
      source_kind: 'original_tac',
      source_label: 'Original TAC',
    };
  }
  return {
    source_kind: 'gbautomation_local',
    source_label: 'GB Automation',
  };
}

function safeComponent(repoName, component, source) {
  const tags = Array.isArray(component.tags) ? component.tags : [];
  const sourcePath = component.source_path || component.path || '';
  return {
    id: component.component_id || `${repoName}:${sourcePath}:${component.source_symbol || ''}`,
    repo: repoName,
    repo_source_kind: source.source_kind,
    repo_source_label: source.source_label,
    path: sourcePath,
    source_symbol: component.source_symbol || null,
    name: component.name || path.basename(sourcePath || 'component'),
    primitive: component.canonical_method || component.primitive || 'unknown',
    secondary_methods: Array.isArray(component.secondary_methods) ? component.secondary_methods : [],
    surface: component.surface || 'legacy/unknown',
    component_source_kind: component.source_kind || 'runtime_owned',
    tags,
    why_use: component.why_use || '',
    frontmatter: component.frontmatter || {},
    relationships: Array.isArray(component.relationships) ? component.relationships : [],
    evidence: Array.isArray(component.evidence) ? component.evidence : [],
    confidence: Number(component.confidence ?? 1),
    raw_source: component.raw_source || null,
  };
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function latestWeeklyScan() {
  try {
    const files = (await readdir(weeklyScanDir))
      .filter((file) => file.endsWith('.json'))
      .sort();
    if (!files.length) return null;
    return readJson(path.join(weeklyScanDir, files.at(-1)), null);
  } catch {
    return null;
  }
}

async function main() {
  const files = (await readdir(inventoryDir)).filter((file) => file.endsWith('.json')).sort();
  const weeklyScan = await latestWeeklyScan();
  const originalTacRepos = new Set(
    (weeklyScan?.github_repos || [])
      .filter((repo) => repo?.status === 'listed' && repo?.org === 'gbauto-tac' && repo?.name)
      .map((repo) => repo.name)
  );
  const repos = [];
  const components = [];

  for (const file of files) {
    const doc = await readJson(path.join(inventoryDir, file), {});
    const repoName = doc.repo_name || path.basename(file, '.json');
    const source = repoSource(repoName, originalTacRepos, doc.provenance);
    const repoComponents = Array.isArray(doc.components) ? doc.components.map((component) => safeComponent(repoName, component, source)) : [];
    components.push(...repoComponents);

    const tags = repoComponents.flatMap((component) => component.tags);
    repos.push({
      name: repoName,
      ...source,
      stack: Array.isArray(doc.stack) ? doc.stack : [],
      component_count: repoComponents.length,
      primitive_counts: countBy(repoComponents.map((component) => component.primitive)).slice(0, 12),
      top_tags: countBy(tags).slice(0, 12),
      surface_counts: countBy(repoComponents.map((component) => component.surface)).slice(0, 16),
      coverage: doc.reconciliation || null,
      provenance: doc.provenance || null,
    });
  }

  const scale = await readJson(scalePath, {});
  const allTags = components.flatMap((component) => component.tags);
  const payload = {
    schema_version: 'gbautomation.tac-catalog.v2',
    generated_at: new Date().toISOString(),
    source: {
      inventory_dir: 'gbautomation/tac-inventory',
      scale_report: 'gbautomation/outputs/tac_inventory_scale.json',
      weekly_scan_report: weeklyScan ? 'gbautomation/second-brain/intelligence/tac-cli/weekly-scan' : null,
    },
    summary: {
      repositories: repos.length,
      original_tac_repositories: repos.filter((repo) => repo.source_kind === 'original_tac').length,
      gbautomation_repositories: repos.filter((repo) => repo.source_kind === 'gbautomation_local').length,
      components: components.length,
      primitives: countBy(components.map((component) => component.primitive)).length,
      surfaces: countBy(components.map((component) => component.surface)).length,
      relationships: components.reduce((total, component) => total + component.relationships.length, 0),
      unexplained_files: repos.reduce((total, repo) => total + Number(repo.coverage?.unexplained_file_count || 0), 0),
      tags: countBy(allTags).length,
      transcripts: scale?.metrics?.transcripts?.count || 0,
      plans_run: scale?.metrics?.plans_run?.count || 0,
      tac_builds_done: scale?.metrics?.tac_builds_done?.count || 0,
      traces: scale?.metrics?.traces?.count || 0,
      unique_components_used: scale?.metrics?.top_components_used?.unique_components_used || 0,
      total_component_usage_refs: scale?.metrics?.top_components_used?.total_component_usage_refs || 0,
    },
    top_components_used: scale?.metrics?.top_components_used?.components || [],
    primitive_counts: countBy(components.map((component) => component.primitive)),
    surface_counts: countBy(components.map((component) => component.surface)),
    source_kind_counts: countBy(components.map((component) => component.component_source_kind)),
    tag_counts: countBy(allTags),
    tactic_counts: countBy(allTags.filter((tag) => tag.startsWith('tactic/'))),
    role_counts: countBy(allTags.filter((tag) => tag.startsWith('role/'))),
    repos: repos.sort((a, b) => b.component_count - a.component_count || a.name.localeCompare(b.name)),
    components: components.sort((a, b) => a.repo.localeCompare(b.repo) || a.path.localeCompare(b.path) || String(a.source_symbol || '').localeCompare(String(b.source_symbol || ''))),
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`wrote ${path.relative(repoRoot, outputPath)} (${payload.summary.repositories} repos, ${payload.summary.components} components)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
