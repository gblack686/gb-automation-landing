/**
 * jid5274 tenant-scoped data fetchers.
 *
 * Every fetch routes through the shared registry-driven anon reader
 * (`fetchView`) against the obs_jid5274_* curated views listed in the
 * dataset registry — NEVER the smoke-client (obs_smoke_*) views. Isolation
 * is enforced server-side by each tenant-scoped view; the browser only ever
 * issues read-only anon GETs with registry-allowlisted view/select values.
 */
import { fetchView } from '../../../lib/supabaseOps';
import { findDataset } from './datasets';

function fetchDataset(view, limit) {
  const dataset = findDataset(view);
  if (!dataset) throw new Error(`jid5274 portal: view not in registry: ${view}`);
  const order = dataset.defaultSort
    ? `${dataset.defaultSort.col}.${dataset.defaultSort.dir}`
    : undefined;
  return fetchView(dataset.view, { select: dataset.select, order, limit });
}

export function fetchJid5274Schedules({ limit = 50 } = {}) {
  return fetchDataset('obs_jid5274_schedules', limit);
}

export function fetchJid5274Runs({ limit = 50 } = {}) {
  return fetchDataset('obs_jid5274_runs', limit);
}

export function fetchJid5274RunOutputs({ limit = 200 } = {}) {
  return fetchDataset('obs_jid5274_run_outputs', limit);
}

export function fetchJid5274Board({ limit = 100 } = {}) {
  return fetchDataset('obs_jid5274_board', limit);
}
