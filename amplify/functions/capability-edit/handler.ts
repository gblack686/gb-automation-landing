import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

// AppSync custom-mutation handler for the agent-mediated, PR-gated capability write-back.
//   editCapability (mutation) -> { payload: { prUrl, branch } }
//
// Auth is enforced by AppSync (allow.authenticated(); the field is further gated to the
// tenant-gbautomation Cognito group). The requester's email comes from the verified
// Cognito identity and is recorded in the PR body for provenance.
//
// SECURITY: this Lambda holds NO credentials in code. The fine-grained GitHub PAT is read
// from AWS Secrets Manager at runtime via the function's IAM role (SecretId from env). The
// PAT is provisioned at deploy time and scoped to ONLY the single gbautomation repo with
//   contents:write + pull_requests:write
// (see resource.ts / backend.ts). GitHub markdown stays canonical: this handler creates a
// branch, puts the file content, and opens a pull request — it NEVER mutates AppSync.

const SECRET_ID = process.env.CAPABILITY_EDIT_SECRET_ID || 'gbautomation/github/website-crud-pat';
const TARGET_REPO = process.env.TARGET_REPO || 'gbauto/gbautomation';
const TARGET_DEFAULT_BRANCH = process.env.TARGET_DEFAULT_BRANCH || 'main';

const GH_API = 'https://api.github.com';
const ALLOWED_KINDS = ['skill', 'command', 'expert', 'agent'];

type Json = Record<string, any>;

let cachedToken: string | null = null;

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const client = new SecretsManagerClient({});
  const res = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
  const raw = res.SecretString || '';
  // Tolerate either a bare token string or a JSON blob ({ token | pat | github_pat }).
  let token = raw.trim();
  if (token.startsWith('{')) {
    const secret: Json = JSON.parse(raw);
    token = String(secret.token || secret.pat || secret.github_pat || '').trim();
  }
  if (!token) throw new Error(`${SECRET_ID} missing GitHub PAT`);
  cachedToken = token;
  return cachedToken;
}

async function gh(path: string, init: Json = {}): Promise<any> {
  const token = await getToken();
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'gb-automation-landing-capability-edit',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${await res.text()}`);
  return res.json();
}

function emailOf(event: Json): string {
  const id = event?.identity || {};
  return String(id?.claims?.email || id?.username || 'ops-user');
}

// base64 of a UTF-8 string (GitHub Contents API wants base64-encoded content).
function b64(s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64');
}

function slugify(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'capability';
}

export const handler = async (event: Json) => {
  try {
    const args: Json = event?.arguments || {};
    const kind = String(args.kind || '').trim();
    const path = String(args.path || '').trim();
    const title = String(args.title || '').trim();
    const body = String(args.body ?? '');
    const summary = String(args.summary || '').trim();

    if (!ALLOWED_KINDS.includes(kind)) {
      return { payload: { error: `kind must be one of ${ALLOWED_KINDS.join(', ')}` } };
    }
    if (!path) return { payload: { error: 'path is required' } };
    if (!body) return { payload: { error: 'body is required' } };

    const author = emailOf(event);

    // 1) Resolve the head SHA of the gbautomation default branch.
    const ref = await gh(`/repos/${TARGET_REPO}/git/ref/heads/${TARGET_DEFAULT_BRANCH}`);
    const baseSha = String(ref?.object?.sha || '');
    if (!baseSha) throw new Error(`could not resolve ${TARGET_DEFAULT_BRANCH} head sha`);

    // 2) Create a new branch off the default branch.
    const stamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const branch = `capability-edit/${kind}-${slugify(title || path)}-${stamp}`;
    await gh(`/repos/${TARGET_REPO}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
    });

    // 3) Put the markdown file content at the target path on the new branch.
    //    If a file already exists at path, its blob sha is required to update it.
    let existingSha: string | undefined;
    try {
      const existing = await gh(
        `/repos/${TARGET_REPO}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`,
      );
      existingSha = Array.isArray(existing) ? undefined : String(existing?.sha || '') || undefined;
    } catch {
      // 404 -> new file; nothing to do.
    }

    await gh(`/repos/${TARGET_REPO}/contents/${encodeURI(path)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `capability-edit: ${title || path}`,
        content: b64(body),
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    // 4) Open a pull request for human review. Markdown stays canonical; AppSync is
    //    re-synced by the existing publish Action only after this PR merges.
    const prBody = [
      summary || `Agent-mediated ${kind} edit via /ops/capabilities.`,
      '',
      `- kind: \`${kind}\``,
      `- path: \`${path}\``,
      `- requested by: ${author}`,
      '',
      '_Opened by the capability-edit Lambda. Review and merge to publish._',
    ].join('\n');

    const pr = await gh(`/repos/${TARGET_REPO}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: `capability-edit: ${title || path}`,
        head: branch,
        base: TARGET_DEFAULT_BRANCH,
        body: prBody,
      }),
    });

    return { payload: { prUrl: String(pr?.html_url || ''), branch } };
  } catch (error) {
    return { payload: { error: error instanceof Error ? error.message : 'capability-edit failed' } };
  }
};
