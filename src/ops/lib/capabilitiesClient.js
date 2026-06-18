// Client for the capability catalog (skills / commands / experts / agents).
// Talks to the Amplify Data (AppSync) `Capability` model with Cognito auth
// (authMode userPool) — bodies are private (gbautomation repo is private), so the
// browser must be a signed-in tenant-gbautomation user to read them. Mirrors
// src/ops/lib/macMiniClient.js. Rows are written by the publish-capabilities
// GitHub Action in the gbautomation repo, never by the browser.
import { generateClient } from 'aws-amplify/data';

let _client;
function client() {
  if (!_client) _client = generateClient();
  return _client;
}

// Fetch every capability of one kind ('skill' | 'command' | 'expert' | 'agent'),
// sorted by slug. The table is small (~hundreds of rows), so a filtered list is
// fine; isolation/auth is enforced by the model (authenticated read only).
export async function listCapabilities(kind) {
  const { data, errors } = await client().models.Capability.list({
    filter: { kind: { eq: kind } },
    limit: 1000,
    authMode: 'userPool',
  });
  if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));
  return (data || []).slice().sort((a, b) => (a.slug || '').localeCompare(b.slug || ''));
}
