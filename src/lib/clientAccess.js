// Client access gateway for invite-only YouTube Intel clients (client access plan).
// The gateway runs on Mac Mini 2 behind Tailscale Funnel :10000 and owns sign-in sessions there.
const DEFAULT_GATEWAY = 'https://gbautos-mac-mini-2.tail4e0ac6.ts.net:10000';

export const CLIENT_ACCESS_GATEWAY = String(import.meta.env?.VITE_CLIENT_ACCESS_GATEWAY || DEFAULT_GATEWAY).replace(/\/+$/, '');
export const CLIENT_GROUP = 'youtube-intel-client';

/** The single-use sign-in state the gateway put in the handoff URL fragment, or null. */
export function handoffState(hash) {
  const value = new URLSearchParams(String(hash || '').replace(/^#/, '')).get('state');
  return value && /^[A-Za-z0-9_-]{20,128}$/.test(value) ? value : null;
}

/** Builds (never logs or stores) the form that carries the fresh ID token to the gateway. */
export function exchangeForm(doc, idToken, state) {
  const form = doc.createElement('form');
  form.method = 'POST';
  form.action = `${CLIENT_ACCESS_GATEWAY}/auth/exchange`;
  form.style.display = 'none';
  for (const [name, value] of [['id_token', idToken], ['state', state]]) {
    const input = doc.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  return form;
}
