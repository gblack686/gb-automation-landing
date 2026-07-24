#!/usr/bin/env node
// Build public/sankey/sankey-manifest.json by walking the committed sankey
// assets. Mirrors build_dags_manifest.mjs (the /observability precedent).
//
// The Mini-side generator (gbautomation repo: resources/skills/sankey3js/
// scripts/build_public_sankey.py) normally writes the manifest itself, but this
// keeps the site self-sufficient: drop <table>.html + <table>.aggregate.json
// into public/sankey/ and regenerate the index with `npm run sankey:manifest`.
//
// For each <table>.aggregate.json we read the aggregate-only meta
// ({table,dims,unit,title,count,records:[{...,n}]}); the standalone chart is the
// sibling <table>.html. Aggregate-only — no raw rows are read or emitted.
//
// Usage: node scripts/build_sankey_manifest.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'sankey');

const entries = [];
for (const file of readdirSync(DIR)) {
  if (!file.endsWith('.aggregate.json')) continue;
  const table = file.replace(/\.aggregate\.json$/, '');
  const htmlName = `${table}.html`;
  if (!existsSync(join(DIR, htmlName))) continue; // no chart -> skip

  let meta = {};
  try {
    meta = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  } catch {
    continue; // unreadable -> skip
  }
  const records = Array.isArray(meta.records) ? meta.records : [];
  const dims = Array.isArray(meta.dims) ? meta.dims : [];
  const rowTotal = records.reduce((s, r) => s + (Number(r.n) || 0), 0);

  entries.push({
    table,
    title: meta.title || table,
    unit: meta.unit || 'rows',
    group_count: typeof meta.count === 'number' ? meta.count : records.length,
    row_total: rowTotal,
    dims,
    default: dims.slice(0, 3),
    weight: 'n',
    html: htmlName,
    data: file,
  });
}

entries.sort((a, b) => a.table.localeCompare(b.table));
const out = join(DIR, 'sankey-manifest.json');
writeFileSync(out, JSON.stringify(entries, null, 2) + '\n', 'utf8');
console.log(`Wrote ${entries.length} entries -> ${out}`);
