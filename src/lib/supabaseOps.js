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
