import { generateClient } from 'aws-amplify/data';

let _client;

function client() {
  if (!_client) _client = generateClient();
  return _client;
}

function unwrap({ data, errors }) {
  if (errors?.length) throw new Error(errors.map((error) => error.message).join('; '));
  let payload = data?.payload ?? data ?? {};
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      // Leave opaque string payloads untouched.
    }
  }
  if (payload?.error) throw new Error(payload.error);
  return payload;
}

export function getGbautomationChatSessionId() {
  const key = 'gbautomation.chat.session_id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const generated =
    typeof window.crypto?.randomUUID === 'function'
      ? `web-${window.crypto.randomUUID()}`
      : `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

export async function loadGbautomationMessages({ sessionId, limit = 120 } = {}) {
  return unwrap(
    await client().queries.gbautomationChatMessages(
      { sessionId, limit },
      { authMode: 'userPool' },
    ),
  );
}

export async function sendGbautomationMessage({ sessionId, content }) {
  return unwrap(
    await client().mutations.sendGbautomationChatMessage(
      { sessionId, content },
      { authMode: 'userPool' },
    ),
  );
}
