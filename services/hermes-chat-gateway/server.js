/**
 * server.js — Authed reverse-proxy for the smoke-client Hermes chat embed.
 *
 * Flow:
 *   1. Every request is verified against Cognito (RS256 JWKS) and MUST carry
 *      the `tenant-smoke-client` group. Failures => 401/403 and the request is
 *      NEVER forwarded upstream.
 *   2. Authorized requests are reverse-proxied to HERMES_SMOKE_ENDPOINT.
 *   3. The server-held Hermes token (HERMES_SMOKE_TOKEN) is injected into the
 *      upstream request server-side. The browser never sees it.
 *
 * Security contract:
 *   - No secret is hardcoded. Endpoint + token + pool come from env only.
 *   - The client's inbound Authorization header (its Cognito token) is stripped
 *     before proxying and replaced with the Hermes token, so the upstream never
 *     receives the Cognito token and the browser never receives the Hermes one.
 *
 * NOT auto-deployed. See README.md for the Cloudflare-tunnel deploy pattern.
 */

import http from 'node:http';
import express from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { verifyRequest, config } from './auth.js';

const PORT = Number(process.env.PORT || 3050);

// Upstream Hermes chat endpoint, e.g. https://hermes.internal:8788 — env only.
const HERMES_SMOKE_ENDPOINT = process.env.HERMES_SMOKE_ENDPOINT || '';
// Server-held bearer token for the upstream Hermes session — env only, never
// shipped to the browser.
const HERMES_SMOKE_TOKEN = process.env.HERMES_SMOKE_TOKEN || '';
// How to inject the token upstream: 'bearer' (Authorization) or a header name.
const HERMES_TOKEN_HEADER = process.env.HERMES_TOKEN_HEADER || 'authorization';

const app = express();
app.disable('x-powered-by');

// Liveness probe (unauthenticated, no upstream contact, no secrets).
app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    requiredGroup: config.REQUIRED_GROUP,
    issuerConfigured: Boolean(config.ISSUER),
    endpointConfigured: Boolean(HERMES_SMOKE_ENDPOINT),
    tokenConfigured: Boolean(HERMES_SMOKE_TOKEN),
  });
});

// --- Auth gate: runs BEFORE the proxy for everything except /healthz. --------
app.use(async (req, res, next) => {
  const result = await verifyRequest(req);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return; // hard stop — never reaches the proxy
  }
  // Stash claims for downstream logging / per-tenant routing if needed.
  req.cognitoClaims = result.claims;
  next();
});

// Fail fast if the upstream isn't configured, rather than proxying to nowhere.
app.use((req, res, next) => {
  if (!HERMES_SMOKE_ENDPOINT) {
    res.status(503).json({ error: 'upstream_not_configured' });
    return;
  }
  next();
});

const proxy = createProxyMiddleware({
  target: HERMES_SMOKE_ENDPOINT,
  changeOrigin: true,
  ws: true, // chat may upgrade to a websocket
  xfwd: true,
  logger: console,
  on: {
    proxyReq: (proxyReq) => {
      // Strip the caller's Cognito credential — upstream must never see it.
      proxyReq.removeHeader('authorization');
      proxyReq.removeHeader('Authorization');
      proxyReq.removeHeader('cookie');
      // Inject the server-held Hermes token.
      if (HERMES_SMOKE_TOKEN) {
        if (HERMES_TOKEN_HEADER.toLowerCase() === 'authorization') {
          proxyReq.setHeader('authorization', `Bearer ${HERMES_SMOKE_TOKEN}`);
        } else {
          proxyReq.setHeader(HERMES_TOKEN_HEADER, HERMES_SMOKE_TOKEN);
        }
      }
      fixRequestBody(proxyReq);
    },
    error: (err, _req, res) => {
      console.error('[hermes-chat-gateway] proxy error:', err.message);
      if (res && 'writeHead' in res && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'bad_gateway' }));
      }
    },
  },
});

app.use(proxy);

const server = http.createServer(app);
// Authorize websocket upgrades the same way as HTTP requests.
server.on('upgrade', async (req, socket, head) => {
  const result = await verifyRequest(req);
  if (!result.ok) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  proxy.upgrade(req, socket, head);
});

server.listen(PORT, () => {
  console.log(`[hermes-chat-gateway] listening on :${PORT}`);
  console.log(`[hermes-chat-gateway] required group: ${config.REQUIRED_GROUP}`);
  console.log(`[hermes-chat-gateway] issuer configured: ${Boolean(config.ISSUER)}`);
  console.log(`[hermes-chat-gateway] upstream configured: ${Boolean(HERMES_SMOKE_ENDPOINT)}`);
});
