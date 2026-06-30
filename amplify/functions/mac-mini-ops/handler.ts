import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

// AppSync custom-query/mutation handler for the /ops/mac-mini dashboard.
//   macMiniTelemetry   (query)    -> { payload: { snapshot, generated_at } }
//   createMacMiniRequest (mutation) -> { payload: { id, action, status } }
//   macMiniRequest     (query)    -> { payload: { request } }
//   smokeClientChat    (mutation) -> { payload: { message, reply, status } }
//
// Auth is enforced by AppSync (allow.authenticated()); the requester's email comes from
// the verified Cognito identity. The Supabase service key never leaves this Lambda — it's
// read from Secrets Manager via the function's IAM role. The browser holds no DB creds.

const SECRET_ID = process.env.SUPABASE_SECRET_ID || 'gbautomation/infrastructure/supabase/gbauto';
const TELEMETRY_KEY = 'mac-mini-telemetry';
const ALLOWED_ACTIONS = ['memguard_report', 'tab_stats', 'tab_list', 'tab_dedupe_apply'];
const CHAT_TENANT = 'gbautomation';
const GB_AUTOMATION_GROUP = 'tenant-gbautomation';
const GB_AUTOMATION_EMAILS = new Set(['gblack686@gmail.com', 'greg@gbautomation.xyz']);

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

function groupsOf(event: Json): string[] {
  const raw = event?.identity?.claims?.['cognito:groups'];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') return raw.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

function requireGbautomationAccess(event: Json): void {
  const email = emailOf(event).toLowerCase();
  const groups = groupsOf(event);
  if (groups.includes(GB_AUTOMATION_GROUP) || GB_AUTOMATION_EMAILS.has(email)) return;
  throw new Error('tenant-gbautomation access required');
}

function normalizeSessionId(value: unknown): string {
  const raw = String(value || 'website').trim().toLowerCase();
  const safe = raw.replace(/[^a-z0-9._:-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96);
  return safe || 'website';
}

function clampLimit(value: unknown): number {
  const parsed = Number(value || 80);
  if (!Number.isFinite(parsed)) return 80;
  return Math.max(1, Math.min(Math.trunc(parsed), 200));
}

function normalizeMessageContent(value: unknown): string {
  const content = String(value || '').trim();
  if (!content) throw new Error('content is required');
  if (content.length > 8000) throw new Error('content must be 8000 characters or fewer');
  return content;
}

function message(role: 'user' | 'assistant' | 'system', text: string): Json {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    ts: new Date().toISOString(),
  };
}

function parseDispatch(text: string): { matched: boolean; write: boolean; request: string } {
  const trimmed = text.trim();
  const lowered = trimmed.toLowerCase();
  if (!lowered.startsWith('/dispatch')) return { matched: false, write: false, request: '' };
  const tokens = trimmed.slice('/dispatch'.length).trim().split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  let write = false;
  for (const token of tokens) {
    if (['--write', '--yes', '--approve', '--approved'].includes(token)) {
      write = true;
    } else {
      kept.push(token);
    }
  }
  return { matched: true, write, request: kept.join(' ').trim() };
}

function smokeClientReply(text: string): { text: string; mode: string } {
  const dispatch = parseDispatch(text);
  if (dispatch.matched) {
    if (!dispatch.request) {
      return {
        mode: 'dispatch-help',
        text: 'Dispatch command recognized. Use `/dispatch <request>` to stage a dry-run TAC plan for smoke-client.',
      };
    }
    const gate = dispatch.write
      ? 'Live worker-card writes are still gated on the Mac Mini poller; no cards were created from this Amplify path.'
      : 'Dry-run only; no worker cards were created.';
    return {
      mode: 'dispatch-dry-run',
      text: [
        'Planned TAC Hermes worker dispatch for smoke-client.',
        '',
        'Mode: `dry-run`',
        'Cards planned: 8',
        `Request: ${dispatch.request}`,
        gate,
      ].join('\n'),
    };
  }

  const lowered = text.toLowerCase();
  if (lowered.includes('help') || lowered.includes('dispatch') || lowered.includes('kanban')) {
    return {
      mode: 'help',
      text: 'Smoke-client chat is connected through the GB Auto Amplify backend. Use `/dispatch <request>` to stage a tenant-scoped TAC plan.',
    };
  }

  return {
    mode: 'ack',
    text: 'Smoke-client profile received your message. This tenant is scoped to `tenant=smoke-client`; use `/dispatch <request>` when you want a TAC Kanban plan from this chat.',
  };
}

function parseContext(value: unknown): Json {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
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

    if (op === 'smokeClientChat') {
      const text = String(args.text || '').trim();
      if (!text) return { payload: { error: 'Empty message ignored.' } };
      const context = parseContext(args.context);
      const dispatch = parseDispatch(text);
      if (dispatch.matched) {
        const reply = smokeClientReply(text);
        await pgInsert('chat_messages', {
          tenant: 'smoke-client',
          session_id: String(context?.website_nav?.session_id || 'web'),
          role: 'user',
          content: text,
          status: 'complete',
          context,
        });
        await pgInsert('chat_messages', {
          tenant: 'smoke-client',
          session_id: String(context?.website_nav?.session_id || 'web'),
          role: 'assistant',
          content: reply.text,
          status: 'complete',
          context: {
            ...context,
            response_mode: reply.mode,
          },
        });
        return {
          payload: {
            message: message('user', text),
            reply: message('assistant', reply.text),
            mode: reply.mode,
            delivered: true,
            connected: true,
            transport: 'amplify-smoke-client',
            status: 'Delivered',
          },
        };
      }
      await pgInsert('chat_messages', {
        tenant: 'smoke-client',
        session_id: String(context?.website_nav?.session_id || 'web'),
        role: 'user',
        content: text,
        status: 'complete',
        context,
      });
      return {
        payload: {
          delivered: true,
          transport: 'amplify-smoke-client',
          message: message('user', text),
          status: 'Sent',
        },
      };
    }

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

    if (op === 'gbautomationChatMessages') {
      requireGbautomationAccess(event);
      const sessionId = normalizeSessionId(args.sessionId);
      const limit = clampLimit(args.limit);
      const select = 'select=id,tenant,session_id,role,content,status,seq,created_at';
      const rows = await pgGet(
        `chat_messages?tenant=eq.${CHAT_TENANT}&session_id=eq.${encodeURIComponent(sessionId)}&${select}&order=created_at.asc&limit=${limit}`,
      );
      return {
        payload: {
          tenant: CHAT_TENANT,
          session_id: sessionId,
          messages: Array.isArray(rows) ? rows : [],
        },
      };
    }

    if (op === 'sendGbautomationChatMessage') {
      requireGbautomationAccess(event);
      const sessionId = normalizeSessionId(args.sessionId);
      const content = normalizeMessageContent(args.content);
      const rows = await pgInsert('chat_messages', {
        tenant: CHAT_TENANT,
        session_id: sessionId,
        role: 'user',
        content,
        status: 'complete',
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      return {
        payload: {
          tenant: CHAT_TENANT,
          session_id: sessionId,
          message: row || null,
        },
      };
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
