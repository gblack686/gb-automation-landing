import assert from 'node:assert/strict';
import { buildWebsiteFeedbackPayload } from '../src/lib/feedbackContext.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log('website feedback CRUD smoke skipped: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(0);
}

function headers(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: headers(options.headers),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(detail || `Supabase ${response.status} on ${path}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

const marker = `feedback-crud-smoke-${Date.now()}`;
const context = {
  page_url: 'https://gbautomation.xyz/ops/test-feedback',
  route: '/ops/test-feedback',
  page_title: 'Feedback CRUD Smoke',
  referrer: null,
  client_slug: 'gbautomation',
  repo_slug: 'gbautomation',
  board_slug: 'gbautomation',
  profile: 'website',
  skill_name: null,
  obs_session_id: null,
  task_id: marker,
  run_id: null,
  langfuse_trace_id: null,
  feedback_type: 'website_feedback',
  user_agent: 'node-crud-smoke',
  session_id: marker,
  viewport: { width: 1, height: 1 },
  selected_text: 'CRUD smoke selected text',
  selected_text_hash: 'fnv1a32:test0000',
  selection_context: { common: 'p#crud-smoke' },
  element_context: null,
  agent_mode: 'triage_only',
  triage_status: 'new',
};

const payload = buildWebsiteFeedbackPayload(marker, 'feedback', context);

const inserted = await request('ops_website_feedback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify(payload),
});

const row = Array.isArray(inserted) ? inserted[0] : inserted;
assert.ok(row, 'insert returned no row');
assert.equal(row.message, marker);

const encoded = encodeURIComponent(marker);
const readRows = await request(`ops_website_feedback?select=*&message=eq.${encoded}&limit=1`);
assert.equal(readRows.length, 1);
assert.equal(readRows[0].metadata?.agent_mode, 'triage_only');
assert.equal(readRows[0].metadata?.selected_text, 'CRUD smoke selected text');

const id = readRows[0].id;
const selector = id ? `id=eq.${encodeURIComponent(id)}` : `message=eq.${encoded}`;

const updated = await request(`ops_website_feedback?${selector}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({
    metadata: {
      ...readRows[0].metadata,
      triage_status: 'crud_smoke_updated',
    },
  }),
});
assert.equal(updated[0].metadata?.triage_status, 'crud_smoke_updated');

await request(`ops_website_feedback?${selector}`, {
  method: 'DELETE',
  headers: { Prefer: 'return=minimal' },
});

const afterDelete = await request(`ops_website_feedback?select=message&message=eq.${encoded}&limit=1`);
assert.equal(afterDelete.length, 0);

console.log('website feedback CRUD smoke passed');
