const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://aejkzyjrlsfryfidwedm.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlamt6eWpybHNmcnlmaWR3ZWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mzc5MTUsImV4cCI6MjA5NDExMzkxNX0.UFowowM9b9fkIhrUdQ4B8uGJwbEqGPBr-bPSQe8CKA0';

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra,
  };
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: supabaseHeaders(options.headers),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Supabase request failed with ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function insertContactSubmission(payload) {
  return supabaseFetch('contact_submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
}

export async function insertWebsiteFeedback(payload) {
  return supabaseFetch('ops_website_feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchPublicOpsFeed({ limit = 6 } = {}) {
  const params = new URLSearchParams({
    select: 'session_id,pool,agent_name,provider,model,last_ts,event_count,board,tenant,profile,severity,error_count,needs_review_count,total_tokens,cost_total,avg_latency_ms,health,has_trace',
    order: 'last_ts.desc',
    limit: String(limit),
  });

  return supabaseFetch(`obs_public_ops_feed?${params.toString()}`);
}

// --- smoke-client tenant portal views (anon-readable, server-side scoped) ---

export async function fetchSmokeSchedules({ limit = 50 } = {}) {
  const params = new URLSearchParams({
    select: 'name,cron_id,host,profile,schedule,mode,script_or_skill,bucket,state,last_green_at,manifest_synced_at,tenant,updated_at',
    order: 'name.asc',
    limit: String(limit),
  });

  return supabaseFetch(`obs_smoke_schedules?${params.toString()}`);
}

export async function fetchSmokeRuns({ limit = 50 } = {}) {
  const params = new URLSearchParams({
    select: 'tick_id,cron_name,started_at,ended_at,elapsed_ms,picked_count,ok_count,fail_count,skipped_count,total_cost_usd,host',
    order: 'started_at.desc',
    limit: String(limit),
  });

  return supabaseFetch(`obs_smoke_runs?${params.toString()}`);
}

export async function fetchSmokeRunOutputs({ limit = 200 } = {}) {
  const params = new URLSearchParams({
    select: 'output_id,tick_id,issue_id,status,branch,pr_url,cost_usd,turns,duration_s,agent_summary',
    limit: String(limit),
  });

  return supabaseFetch(`obs_smoke_run_outputs?${params.toString()}`);
}

export async function fetchSmokeBoard({ limit = 100 } = {}) {
  const params = new URLSearchParams({
    select: 'run_id,task_id,client_slug,board_slug,profile,assignee,title,status,started_at,ended_at,created_at,updated_at,step_key',
    order: 'updated_at.desc',
    limit: String(limit),
  });

  return supabaseFetch(`obs_smoke_board?${params.toString()}`);
}

/**
 * Generic, registry-driven view reader for the curated data explorer.
 *
 * SECURITY: this issues a plain anon REST GET against a single curated,
 * already-tenant-scoped view. It accepts NO raw SQL and NO arbitrary filters —
 * isolation is enforced server-side by the view. The caller is expected to pass
 * `view` + `select` straight from a dataset-registry allowlist entry; the
 * `view` name is additionally shape-validated here as defence-in-depth. Only
 * the params that are provided are appended to the query string.
 */
export async function fetchView(view, { select, order, limit } = {}) {
  if (!view || typeof view !== 'string' || !/^[a-zA-Z0-9_]+$/.test(view)) {
    throw new Error('fetchView: invalid view name');
  }

  const params = new URLSearchParams();
  if (select) params.set('select', select);
  if (order) params.set('order', order);
  if (limit != null) params.set('limit', String(limit));

  const qs = params.toString();
  return supabaseFetch(qs ? `${view}?${qs}` : view);
}

/**
 * Registry-driven freshness probe for a single curated view.
 *
 * Returns the live exact row COUNT (read from the PostgREST `Content-Range`
 * header via `Prefer: count=exact`) plus the single most-recent row, fetched
 * with `Range: 0-0` so only one row crosses the wire. Callers order by a
 * timestamp column descending to surface the most-recent timestamp.
 *
 * SECURITY: identical posture to `fetchView` — a plain anon REST GET against a
 * single curated, already-tenant-scoped view. No raw SQL, no arbitrary filters;
 * the `view` name is shape-validated as defence-in-depth.
 */
export async function fetchViewMeta(view, { select, order } = {}) {
  if (!view || typeof view !== 'string' || !/^[a-zA-Z0-9_]+$/.test(view)) {
    throw new Error('fetchViewMeta: invalid view name');
  }

  const params = new URLSearchParams();
  if (select) params.set('select', select);
  if (order) params.set('order', order);
  const qs = params.toString();
  const path = qs ? `${view}?${qs}` : view;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: supabaseHeaders({ Prefer: 'count=exact', Range: '0-0', 'Range-Unit': 'items' }),
  });

  // PostgREST replies 206 (Partial Content) when a Range is applied, 200 when
  // the range covers the whole (possibly empty) result.
  if (!response.ok && response.status !== 206) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Supabase request failed with ${response.status}`);
  }

  const rows = await response.json().catch(() => []);
  const contentRange = response.headers.get('content-range') || '';
  const totalPart = contentRange.includes('/') ? contentRange.split('/').pop() : '';
  const count = /^\d+$/.test(totalPart) ? Number(totalPart) : null;

  return { count, row: Array.isArray(rows) ? rows[0] ?? null : null };
}
