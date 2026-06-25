import assert from 'node:assert/strict';
import { buildWebsiteFeedbackPayload } from '../src/lib/feedbackContext.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLEANUP = process.argv.includes('--cleanup');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log('website-nav Supabase smoke skipped: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
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

const marker = `website-nav-smoke-${Date.now()}`;
const context = {
  website_nav: {
    skill: 'website-nav',
    version: 1,
    route: '/chat',
    page_url: 'https://gbautomation.xyz/chat',
    page_title: 'Chat - GB Automation',
    referrer: 'https://gbautomation.xyz/',
    client_slug: 'smoke-client',
    profile: 'smoke-client',
    session_id: marker,
    selected_text: null,
    selected_text_hash: null,
    viewport: { width: 1440, height: 900 },
    source: 'gbautomation-landing',
  },
  agent_mode: 'triage_only',
  response_policy: 'database_receipt_first',
};

const chatRows = await request('chat_messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({
    tenant: 'smoke-client',
    session_id: marker,
    role: 'user',
    content: marker,
    status: 'complete',
    context,
  }),
});

const chatRow = Array.isArray(chatRows) ? chatRows[0] : chatRows;
assert.equal(chatRow.content, marker);
assert.equal(chatRow.context?.website_nav?.skill, 'website-nav');

const feedbackPayload = buildWebsiteFeedbackPayload(marker, 'feedback', {
  page_url: 'https://gbautomation.xyz/chat',
  route: '/chat',
  page_title: 'Chat - GB Automation',
  referrer: 'https://gbautomation.xyz/',
  client_slug: 'smoke-client',
  repo_slug: 'gbautomation',
  board_slug: 'gbautomation',
  profile: 'smoke-client',
  skill_name: 'website-nav',
  obs_session_id: null,
  task_id: marker,
  run_id: null,
  langfuse_trace_id: null,
  feedback_type: 'website_feedback',
  user_agent: 'website-nav-smoke',
  session_id: marker,
  viewport: { width: 1440, height: 900 },
  selected_text: 'Smoke selected text',
  selected_text_hash: 'fnv1a32:smoke000',
  selection_context: { common: 'body' },
  element_context: null,
  agent_mode: 'triage_only',
  triage_status: 'new',
});

const feedbackRows = await request('ops_website_feedback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify(feedbackPayload),
});

const feedbackRow = Array.isArray(feedbackRows) ? feedbackRows[0] : feedbackRows;
assert.equal(feedbackRow.message, marker);
assert.equal(feedbackRow.metadata?.agent_mode, 'triage_only');
assert.equal(feedbackRow.metadata?.selected_text, 'Smoke selected text');

const encoded = encodeURIComponent(marker);
const chatReadback = await request(`chat_messages?select=id,tenant,role,content,context,created_at&tenant=eq.smoke-client&content=eq.${encoded}&limit=1`);
const feedbackReadback = await request(`ops_website_feedback?select=feedback_id,feedback_type,message,metadata,created_at&message=eq.${encoded}&limit=1`);

assert.equal(chatReadback.length, 1);
assert.equal(feedbackReadback.length, 1);

if (CLEANUP) {
  await request(`chat_messages?id=eq.${encodeURIComponent(chatReadback[0].id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  await request(`ops_website_feedback?feedback_id=eq.${encodeURIComponent(feedbackReadback[0].feedback_id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
}

console.log(JSON.stringify({
  marker,
  cleanup: CLEANUP,
  chat: chatReadback[0],
  feedback: feedbackReadback[0],
}, null, 2));
