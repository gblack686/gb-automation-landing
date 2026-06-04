import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

// AppSync custom-query/mutation handler for the /ops/mac-mini dashboard.
//   macMiniTelemetry   (query)    -> { payload: { snapshot, generated_at } }
//   createMacMiniRequest (mutation) -> { payload: { id, action, status } }
//   macMiniRequest     (query)    -> { payload: { request } }
//
// Auth is enforced by AppSync (allow.authenticated()); the requester's email comes from
// the verified Cognito identity. The Supabase service key never leaves this Lambda — it's
// read from Secrets Manager via the function's IAM role. The browser holds no DB creds.

const SECRET_ID = process.env.SUPABASE_SECRET_ID || 'gbautomation/infrastructure/supabase/gbauto';
const TELEMETRY_KEY = 'mac-mini-telemetry';
const ALLOWED_ACTIONS = ['memguard_report', 'tab_stats', 'tab_list', 'tab_dedupe_apply'];

type Json = Record<string, any>;

let cached: { url: string; serviceKey: string } | null = null;

async function getSupabase(): Promise<{ url: string; serviceKey: string }> {
  if (cached) return cached;
  const client = new SecretsManagerClient({});
  const res = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
  const secret: Json = JSON.parse(res.SecretString || '{}');
  cached = {
    url: String(secret.url || secret.supabase_url || '').replace(/\/$/, ''),
    serviceKey: String(secret.service_key || secret.service_role_key || ''),
  };
  if (!cached.url || !cached.serviceKey) throw new Error(`${SECRET_ID} missing url/service_key`);
  return cached;
}

async function pgGet(path: string): Promise<any> {
  const { url, serviceKey } = await getSupabase();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function pgInsert(table: string, row: Json): Promise<any> {
  const { url, serviceKey } = await getSupabase();
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

function emailOf(event: Json): string {
  const id = event?.identity || {};
  return String(id?.claims?.email || id?.username || 'ops-user');
}

// Route by AppSync field name, falling back to argument shape (the 3 ops have distinct args).
function opOf(event: Json): string {
  const field = event?.info?.fieldName || event?.fieldName;
  if (field) return field;
  const a = event?.arguments || {};
  if (a.action) return 'createMacMiniRequest';
  if (a.id) return 'macMiniRequest';
  return 'macMiniTelemetry';
}

export const handler = async (event: Json) => {
  try {
    const op = opOf(event);
    const args: Json = event?.arguments || {};

    if (op === 'createMacMiniRequest') {
      const action = String(args.action || '').trim();
      if (!ALLOWED_ACTIONS.includes(action)) {
        return { payload: { error: `action must be one of ${ALLOWED_ACTIONS.join(', ')}` } };
      }
      let params: Json = {};
      if (args.params) params = typeof args.params === 'string' ? JSON.parse(args.params) : args.params;
      const rows = await pgInsert('mac_mini_action_requests', {
        action,
        params,
        status: 'pending',
        requested_by: emailOf(event),
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      return { payload: { id: row?.id, action, status: 'pending' } };
    }

    if (op === 'macMiniRequest') {
      const id = String(args.id || '');
      const sel = 'select=id,action,status,result,error,requested_by,requested_at,completed_at';
      const rows = await pgGet(`mac_mini_action_requests?id=eq.${encodeURIComponent(id)}&${sel}&limit=1`);
      return { payload: { request: Array.isArray(rows) && rows.length ? rows[0] : null } };
    }

    // default: macMiniTelemetry
    const rows = await pgGet(
      `ops_dashboard_snapshots?snapshot_key=eq.${TELEMETRY_KEY}&select=snapshot,generated_at,updated_at&limit=1`,
    );
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    return { payload: { snapshot: row?.snapshot || null, generated_at: row?.generated_at || null } };
  } catch (error) {
    return { payload: { error: error instanceof Error ? error.message : 'mac-mini-ops failed' } };
  }
};
