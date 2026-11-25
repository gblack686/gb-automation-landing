// node --test src/lib/clientAccess.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { CLIENT_ACCESS_GATEWAY, exchangeForm, handoffState } from './clientAccess.js';

test('handoff state is read only from a well-formed fragment', () => {
  const s = 'A'.repeat(43);
  assert.equal(handoffState(`#state=${s}`), s);
  assert.equal(handoffState(`state=${s}`), s);
  for (const bad of ['', '#', '#state=', '#state=short', `#state=${'a'.repeat(129)}`, '#state=<script>aaaaaaaaaaaaaaaaaaaa', '#other=x'])
    assert.equal(handoffState(bad), null, bad);
});

test('the exchange form posts exactly id_token and state to the gateway, hidden', () => {
  const made = [];
  const doc = { createElement: (tag) => { const el = { tag, style: {}, children: [], appendChild(c) { this.children.push(c); } }; made.push(el); return el; } };
  const form = exchangeForm(doc, 'header.payload.sig', 'S'.repeat(43));
  assert.equal(form.method, 'POST');
  assert.equal(form.action, `${CLIENT_ACCESS_GATEWAY}/auth/exchange`);
  assert.equal(form.style.display, 'none');
  assert.deepEqual(form.children.map((c) => [c.type, c.name, c.value]), [['hidden', 'id_token', 'header.payload.sig'], ['hidden', 'state', 'S'.repeat(43)]]);
  assert.match(CLIENT_ACCESS_GATEWAY, /^https:\/\/gbautos-mac-mini-2\.tail4e0ac6\.ts\.net:10000$/);
});

test('the handoff page never logs, stores or puts the token in a URL', async () => {
  const page = await readFile(new URL('../pages/WorkspaceHandoff.jsx', import.meta.url), 'utf8');
  for (const banned of ['console.', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', '?id_token', 'location.href', 'fetch(']) assert.ok(!page.includes(banned), banned);
  assert.match(page, /fetchAuthSession\(\{ forceRefresh: true \}\)/);
  assert.match(page, /history\.replaceState/);
});
