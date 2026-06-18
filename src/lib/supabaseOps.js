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
