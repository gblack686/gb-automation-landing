// Client for the Mac Mini ops dashboard. Talks to the Amplify Data (AppSync) custom
// query/mutation backed by the macMiniOps Lambda — Cognito auth is handled by Amplify
// (authMode userPool), so the browser never holds a Supabase/DB credential. Mirrors
// src/ops/lib/langfuseClient.js.
import { generateClient } from 'aws-amplify/data';

let _client;
function client() {
  if (!_client) _client = generateClient();
  return _client;
}

function unwrap({ data, errors }) {
  if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
  let payload = data?.payload ?? data ?? {};
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { /* leave as-is */ }
  }
  if (payload?.error) throw new Error(payload.error);
  return payload;
}

// -> { snapshot, generated_at }
export async function getTelemetry() {
  return unwrap(await client().queries.macMiniTelemetry({}, { authMode: 'userPool' }));
}

// -> { id, action, status }
export async function createActionRequest(action, params = {}) {
  return unwrap(await client().mutations.createMacMiniRequest(
    { action, params: JSON.stringify(params) },
    { authMode: 'userPool' },
  ));
}

// -> { request }
export async function getRequest(id) {
  return unwrap(await client().queries.macMiniRequest({ id }, { authMode: 'userPool' }));
}
