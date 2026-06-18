# hermes-chat-gateway

Authed reverse-proxy that brokers the smoke-client **Chat with Hermes** embed
(`/clients/smoke-client/chat`). It is the trust boundary between the public,
token-less React bundle and the credentialed upstream Hermes session.

> **Status: CODE ONLY — do NOT auto-deploy.** This directory is committed as the
> reference implementation. Deploying it is a deliberate, manual operator step
> (see [Deploy](#deploy)).

---

## Security contract (non-negotiable)

1. **Every** request is verified against Cognito (RS256, JWKS) and **MUST** carry
   the `tenant-smoke-client` group. A valid token without the group is rejected
   `403` and is **never** proxied. No token / bad token => `401`.
2. The browser **never** holds the Hermes token. The React iframe points only at
   this gateway's **public** URL (`VITE_SMOKE_CHAT_URL`).
3. The Hermes token is read from `HERMES_SMOKE_TOKEN` (env) and injected into the
   upstream request **server-side**. The caller's inbound Cognito `Authorization`
   header and cookies are **stripped** before proxying, so the upstream never
   sees the Cognito token and the browser never sees the Hermes token.
4. **No secret is hardcoded** anywhere. Endpoint, token, and pool config come
   from env vars only. `.env` is gitignored; only `.env.example` is committed.

The verification mirrors the client-side auth pattern in the landing repo
(`src/lib/mallScannerClient.js` `authHeaders()` -> `fetchAuthSession()` ->
`idToken` Bearer): the SPA attaches the Cognito token, this gateway validates it
and swaps in the server credential.

---

## Required env vars

| Var | Required | Purpose |
| --- | --- | --- |
| `PORT` | no (default `3050`) | Listener port. Matches the `customer-gateway-proxy:3050` pattern. |
| `COGNITO_REGION` | no (default `us-east-1`) | Cognito region. |
| `COGNITO_USER_POOL_ID` | **yes** | Pool to verify against (`us-east-1_9C7FJkK9b`). Without it, all requests are rejected. |
| `COGNITO_REQUIRED_GROUP` | no (default `tenant-smoke-client`) | Mandatory group claim. |
| `COGNITO_CLIENT_ID` | no | When set, enforces `aud` (ID-token audience). |
| `COGNITO_JWKS_URL` | no | Override; derived from the pool when unset. |
| `HERMES_SMOKE_ENDPOINT` | **yes** | Upstream Hermes chat URL. Requests 503 until set. |
| `HERMES_SMOKE_TOKEN` | **yes** | Server-held upstream bearer token. **Secret.** |
| `HERMES_TOKEN_HEADER` | no (default `authorization`) | Header to inject the token on (`authorization` => `Bearer <token>`; otherwise verbatim). |

Copy `.env.example` -> `.env` and fill in (or inject via systemd
`EnvironmentFile=` / `op run` / AWS SM). Never commit a real value.

---

## Run locally

```sh
cd services/hermes-chat-gateway
npm install
cp .env.example .env   # fill in HERMES_SMOKE_ENDPOINT + HERMES_SMOKE_TOKEN + COGNITO_USER_POOL_ID
npm start
# GET http://localhost:3050/healthz  -> config booleans, no secrets
```

Unauthorized probes return `401`/`403` and never touch the upstream.

---

## Deploy

Reuse the existing `apps/hermes-chat-expose` Cloudflare-tunnel +
`customer-gateway-proxy:3050` pattern (do **not** invent new infra):

1. Provision the runtime (Mac Mini / host) with the env vars above, secrets
   pulled from AWS SM at launch — never written to disk in plaintext argv.
   Bind the process to `127.0.0.1:3050`.
2. Front it with a Cloudflare tunnel (the `hermes-chat-expose` ingress) so the
   gateway gets a stable **public HTTPS hostname**. That hostname (path to the
   chat surface) is what becomes `VITE_SMOKE_CHAT_URL` in the Amplify build env.
3. Set `VITE_SMOKE_CHAT_URL` in the landing app's Amplify build environment to
   the tunnel URL. It is inlined at build time into the bundle — it must be the
   **public proxy URL only, never a token.**
4. Verify: an authed `tenant-smoke-client` user loads
   `/clients/smoke-client/chat` and the iframe renders the live session; a user
   in another group gets `403` from the gateway (and never reaches Hermes).

If `VITE_SMOKE_CHAT_URL` is unset, the chat page degrades gracefully to a themed
"Chat connecting…" empty state — it never renders a broken iframe.

---

## Notes

- `jose` is used for JWKS verification (cached, rotation-safe). If adding the dep
  is undesirable in a given runtime, swap `auth.js` for an `aws-jwt-verify`
  implementation — the `verifyRequest()` contract (`{ ok, status, error, claims }`)
  stays the same.
- Websocket upgrades are authorized with the same `verifyRequest()` gate before
  the proxy upgrade is allowed.
- This service does **not** fork or modify `hermes-agent` / `hermes-webui`.
