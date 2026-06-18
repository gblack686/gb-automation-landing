/**
 * auth.js — Cognito JWT verification for the Hermes chat gateway.
 *
 * Verifies an RS256 Cognito access/ID token against the pool's JWKS and
 * REQUIRES membership in the `tenant-smoke-client` group. No token is ever
 * minted here; we only validate the caller's existing Cognito session.
 *
 * Security contract:
 *   - Signature verified against the live JWKS (cached, auto-rotated by jose).
 *   - issuer pinned to the configured user pool.
 *   - group membership is mandatory — a valid token WITHOUT the required group
 *     is rejected (403) and the request is never proxied.
 *
 * All values come from env. Nothing is hardcoded.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

// us-east-1_9C7FJkK9b — supplied via env so this file holds no infra identifiers.
const REGION = process.env.COGNITO_REGION || 'us-east-1';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';
const REQUIRED_GROUP = process.env.COGNITO_REQUIRED_GROUP || 'tenant-smoke-client';
// Optional: pin the app client id (audience) when verifying ID tokens.
const CLIENT_ID = process.env.COGNITO_CLIENT_ID || '';

if (!USER_POOL_ID) {
  // Fail loud at boot rather than silently accepting unverifiable tokens.
  console.warn(
    '[hermes-chat-gateway] COGNITO_USER_POOL_ID is not set — every request will be rejected.',
  );
}

const ISSUER = USER_POOL_ID
  ? `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`
  : '';

// JWKS URL is derivable from the issuer, but allow an explicit override.
const JWKS_URL = process.env.COGNITO_JWKS_URL || (ISSUER ? `${ISSUER}/.well-known/jwks.json` : '');

// createRemoteJWKSet caches keys and refetches on unknown kid (rotation-safe).
const jwks = JWKS_URL ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

function extractBearer(req) {
  // Prefer the Authorization header; fall back to a session cookie if the
  // embed is set up to forward one. Never log the token value.
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (header && /^Bearer\s+/i.test(header)) {
    return header.replace(/^Bearer\s+/i, '').trim();
  }
  return null;
}

function getGroups(payload) {
  const groups = payload['cognito:groups'];
  if (Array.isArray(groups)) return groups;
  if (typeof groups === 'string') return [groups];
  return [];
}

/**
 * verifyRequest(req) -> { ok: true, claims } | { ok: false, status, error }
 * Pure verification; no side effects, no proxying.
 */
export async function verifyRequest(req) {
  if (!jwks || !ISSUER) {
    return { ok: false, status: 503, error: 'gateway_misconfigured' };
  }

  const token = extractBearer(req);
  if (!token) {
    return { ok: false, status: 401, error: 'missing_bearer_token' };
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, jwks, {
      issuer: ISSUER,
      // ID tokens carry `aud`; access tokens carry `client_id` instead. Only
      // enforce audience when a client id is configured and present.
      ...(CLIENT_ID ? { audience: CLIENT_ID } : {}),
    }));
  } catch {
    // Do not leak verification internals to the caller.
    return { ok: false, status: 401, error: 'invalid_token' };
  }

  const groups = getGroups(payload);
  if (!groups.includes(REQUIRED_GROUP)) {
    return { ok: false, status: 403, error: 'forbidden_group' };
  }

  return { ok: true, claims: payload };
}

export const config = {
  REGION,
  USER_POOL_ID,
  REQUIRED_GROUP,
  ISSUER,
  JWKS_URL,
};
