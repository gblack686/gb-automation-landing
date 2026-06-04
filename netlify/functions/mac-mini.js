// Mac Mini ops API — backs the /ops/mac-mini dashboard.
//   GET  /api/mac-mini/telemetry        -> latest sanitized RAM + browser snapshot
//   POST /api/mac-mini/requests {action} -> enqueue an ALLOWLISTED intent row (pending)
//   GET  /api/mac-mini/requests?id=<id>  -> one request row (for result polling)
//   GET  /api/mac-mini/requests          -> recent request rows
//
// The browser never holds the Supabase service key or runs commands (the ops contract):
// this function (service key in Netlify env) writes the intent row; the Mac Mini
// action poller executes it and writes the result back. Unlike the open mall-scanner
// function, this one VERIFIES the Cognito ID token + an email allowlist, because the
// POST enqueues work the Mini will execute.
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_9C7FJkK9b';
const CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID || '58f42ihttmcqg3rqijtert476j';
const ALLOWED_EMAILS = (process.env.OPS_ALLOWED_EMAILS || 'gblack686@gmail.com,greg@gbautomation.xyz')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

// Mirrors the Mini poller's allowlist + the DB CHECK constraint (third layer).
const ALLOWED_ACTIONS = ['memguard_report', 'tab_stats', 'tab_list', 'tab_dedupe_apply'];
const TELEMETRY_KEY = 'mac-mini-telemetry';

const verifier = CognitoJwtVerifier.create({ userPoolId: USER_POOL_ID, tokenUse: 'id', clientId: CLIENT_ID });

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

async function authedEmail(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const payload = await verifier.verify(token);
    const email = String(payload.email || '').toLowerCase();
    return ALLOWED_EMAILS.includes(email) ? email : null;
  } catch {
    return null;
  }
}

async function pgGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function pgInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(204, {});

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json(503, { error: 'Supabase env not configured (set SUPABASE_URL + SUPABASE_SERVICE_KEY in Netlify)' });
  }

  const email = await authedEmail(event);
  if (!email) return json(401, { error: 'Unauthorized' });

  const route = (event.path || '')
    .replace(/^.*\/api\/mac-mini\/?/, '')
    .replace(/^.*\/mac-mini\/?/, '');
  const method = event.httpMethod;

  try {
    if (route === 'telemetry' && method === 'GET') {
      const rows = await pgGet(
        `ops_dashboard_snapshots?snapshot_key=eq.${TELEMETRY_KEY}&select=snapshot,generated_at,updated_at&limit=1`,
      );
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      return json(200, { snapshot: row?.snapshot || null, generated_at: row?.generated_at || null });
    }

    if (route === 'requests' && method === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const action = String(body.action || '').trim();
      if (!ALLOWED_ACTIONS.includes(action)) {
        return json(400, { error: `action must be one of ${ALLOWED_ACTIONS.join(', ')}` });
      }
      const rows = await pgInsert('mac_mini_action_requests', {
        action,
        params: body.params && typeof body.params === 'object' ? body.params : {},
        status: 'pending',
        requested_by: email,
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      return json(202, { id: row?.id, action, status: 'pending' });
    }

    if (route === 'requests' && method === 'GET') {
      const id = event.queryStringParameters?.id;
      const select = 'select=id,action,status,result,error,requested_by,requested_at,completed_at';
      if (id) {
        const rows = await pgGet(`mac_mini_action_requests?id=eq.${encodeURIComponent(id)}&${select}&limit=1`);
        return json(200, { request: Array.isArray(rows) && rows.length ? rows[0] : null });
      }
      const rows = await pgGet(`mac_mini_action_requests?${select}&order=requested_at.desc&limit=20`);
      return json(200, { requests: rows });
    }

    return json(404, { error: `Unknown Mac Mini route: ${route || '(root)'}` });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Mac Mini API error' });
  }
}
