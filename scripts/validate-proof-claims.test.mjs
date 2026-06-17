import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  detectClaimText,
  extractClaimsFromFile,
  validateProofClaims,
} from './validate-proof-claims.mjs';

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'proof-claims-'));
  mkdirSync(join(root, 'src/pages'), { recursive: true });
  mkdirSync(join(root, 'public/portfolio'), { recursive: true });
  mkdirSync(join(root, 'evidence/clients/acme'), { recursive: true });
  writeFileSync(
    join(root, 'evidence/clients/acme/profile.md'),
    'ACME rollout notes: 47 stores onboarded in pilot.\n',
  );
  return root;
}

test('detectClaimText flags named-client and quantified claims', () => {
  assert.equal(detectClaimText('ACME rolled out Hermes to 47 stores'), true);
  assert.equal(detectClaimText('A reusable private dashboard template'), false);
});

test('extractClaimsFromFile emits claim path and text from JSX strings and JSON registries', () => {
  const root = makeFixture();
  const jsxPath = join(root, 'src/pages/Home.jsx');
  const jsonPath = join(root, 'public/portfolio/apps-registry.json');
  writeFileSync(jsxPath, "export const Hero = () => <p>ACME saved 42 hours weekly</p>;\n");
  writeFileSync(jsonPath, JSON.stringify({ apps: [{ title: 'Mall client synced 112 brand pages' }] }, null, 2));

  const jsxClaims = extractClaimsFromFile(jsxPath, root);
  const jsonClaims = extractClaimsFromFile(jsonPath, root);

  assert.deepEqual(jsxClaims.map((claim) => claim.file), ['src/pages/Home.jsx']);
  assert.equal(jsxClaims[0].text, 'ACME saved 42 hours weekly');
  assert.deepEqual(jsonClaims.map((claim) => claim.jsonPath), ['apps.0.title']);
  assert.equal(jsonClaims[0].text, 'Mall client synced 112 brand pages');
});

test('validateProofClaims requires sourcePath and sourceQuote that matches source evidence', () => {
  const root = makeFixture();
  const pagePath = join(root, 'src/pages/Home.jsx');
  writeFileSync(
    pagePath,
    "export const Hero = () => <p>ACME rolled out to 47 stores</p>;\n",
  );

  const unsupported = validateProofClaims({
    rootDir: root,
    evidenceRoots: [join(root, 'evidence')],
    include: ['src/**/*.jsx'],
  });
  assert.equal(unsupported.ok, false);
  assert.match(unsupported.failures[0].claimText, /ACME rolled out/);
  assert.equal(unsupported.failures[0].file, 'src/pages/Home.jsx');

  writeFileSync(
    pagePath,
    "export const Hero = () => <p>ACME rolled out to 47 stores</p>;\nexport const proof = { sourcePath: 'evidence/clients/acme/profile.md', sourceQuote: '47 stores onboarded in pilot' };\n",
  );
  const supported = validateProofClaims({
    rootDir: root,
    evidenceRoots: [join(root, 'evidence')],
    include: ['src/**/*.jsx'],
  });
  assert.equal(supported.ok, true);
});
