#!/usr/bin/env node
// Build public/observability/dags/dags-manifest.json by walking the copied DAG
// reports. Mirrors the prds-manifest pattern: one JSON array the index page reads.
//
// For each <slug>.html we read the sibling <slug>.dag-nodes.json (the
// gbauto-archon-dag.v1 contract) for node_count + a node-type breakdown, and
// pull the title from the HTML <title>. Slug convention: YYYY-MM-DD-<name>.
//
// Usage: node scripts/build_dags_manifest.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DAGS_DIR = join(ROOT, 'public', 'observability', 'dags');

function titleFromHtml(html) {
  const m = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return m ? m[1].trim() : null;
}

function dateFromSlug(slug) {
  const m = slug.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

const entries = [];
for (const file of readdirSync(DAGS_DIR)) {
  if (!file.endsWith('.html')) continue;
  const slug = file.replace(/\.html$/, '');
  const html = readFileSync(join(DAGS_DIR, file), 'utf8');

  let node_count = 0;
  let types = {};
  try {
    const dag = JSON.parse(readFileSync(join(DAGS_DIR, `${slug}.dag-nodes.json`), 'utf8'));
    const nodes = Array.isArray(dag.nodes) ? dag.nodes : [];
    node_count = nodes.length;
    for (const n of nodes) {
      const t = (n.nodeType || n.span_type || 'node').toLowerCase();
      types[t] = (types[t] || 0) + 1;
    }
  } catch { /* no dag-nodes.json -> counts stay 0 */ }

  entries.push({
    slug,
    title: titleFromHtml(html) || slug,
    date: dateFromSlug(slug),
    node_count,
    agent_count: types.agent || 0,
    types,
  });
}

entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const out = join(DAGS_DIR, 'dags-manifest.json');
writeFileSync(out, JSON.stringify(entries, null, 2) + '\n', 'utf8');
console.log(`Wrote ${entries.length} entries -> ${out}`);
