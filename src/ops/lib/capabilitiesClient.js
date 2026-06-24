// Client for the capability catalog (skills / commands / experts / agents).
// Talks to the Amplify Data (AppSync) `Capability` model with Cognito auth
// (authMode userPool) — bodies are private (gbautomation repo is private), so the
// browser must be a signed-in tenant-gbautomation user to read them. Mirrors
// src/ops/lib/macMiniClient.js. Rows are written by the publish-capabilities
// GitHub Action in the gbautomation repo, never by the browser.
import { generateClient } from 'aws-amplify/data';
import { LOCAL_CAPABILITY_PREVIEW } from '../data/localCapabilityPreview';

let _client;
function client() {
  if (!_client) _client = generateClient();
  return _client;
}

// Fetch every capability of one kind ('skill' | 'command' | 'expert' | 'agent'),
// sorted by slug. The table is small (~hundreds of rows), so a filtered list is
// fine; isolation/auth is enforced by the model (authenticated read only).
export async function listCapabilities(kind) {
  try {
    const capabilityModel = client().models.Capability;
    if (!capabilityModel) throw new Error('Capability model is not present in amplify_outputs.json.');

    const { data, errors } = await capabilityModel.list({
      filter: { kind: { eq: kind } },
      limit: 1000,
      authMode: 'userPool',
    });
    if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
    return (data || []).slice().sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));
  } catch (error) {
    const localDev = import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!localDev) throw error;
    return LOCAL_CAPABILITY_PREVIEW
      .filter((item) => item.kind === kind)
      .sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));
  }
}

// Fetch every whitelisted second-brain VaultDoc, sorted by path. Same auth posture as
// listCapabilities (authMode userPool) — bodies are private, so the browser must be a
// signed-in tenant-gbautomation user. Rows are written by the publish GitHub Action.
export async function vaultDocList() {
  const { data, errors } = await client().models.VaultDoc.list({
    limit: 1000,
    authMode: 'userPool',
  });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
  return (data || []).slice().sort((a, b) => (a.path || '').localeCompare(b.path || ''));
}

// Agent-mediated, PR-gated writes. These call custom AppSync mutations backed by the
// capabilityEdit Lambda, which branches + commits the markdown and opens a PR against the
// gbautomation repo — the browser never holds a GitHub credential and never mutates the
// catalog directly. Each returns { prUrl } for the success affordance.
function unwrapEdit({ data, errors }) {
  if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
  const prUrl = data?.prUrl || null;
  const branch = data?.branch || null;
  if (!prUrl) throw new Error('No PR URL returned from capabilityEdit.');
  return { prUrl, branch };
}

// input: { kind, path?, title, body, summary? } -> { prUrl, branch }
export async function createSkill(input) {
  return unwrapEdit(
    await client().mutations.createCapabilityDraft(input, { authMode: 'userPool' }),
  );
}

// input: { kind, path, title, body, summary? } -> { prUrl, branch }
export async function editSkill(input) {
  return unwrapEdit(
    await client().mutations.editCapability(input, { authMode: 'userPool' }),
  );
}
