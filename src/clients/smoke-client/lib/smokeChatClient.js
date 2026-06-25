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
    try {
      payload = JSON.parse(payload);
    } catch {
      // Leave opaque payloads as-is.
    }
  }
  if (payload?.error) throw new Error(payload.error);
  return payload;
}

export async function sendSmokeChat(text, context = null) {
  return unwrap(await client().mutations.smokeClientChat(
    { text, context },
    { authMode: 'userPool' },
  ));
}
