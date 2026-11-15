# Authenticated Whale Room

Whale Room opens from the existing Forge **Resources** window at
`/atlas/<registered-expert>?window=resources&owner=<registered-expert>`.
Its reviewed first-party modules run inside the host-owned resource window.
The host installs `WealthHost.fetch` and the session listener before mounting
the app. Saved arbitrary HTML retains its opaque `allow-scripts` sandbox,
restrictive CSP and lack of a host bridge. Public landing routes are unchanged.

The approved service and capture connector run on MM2. Supabase is the canonical
saved store; MM2 can retain a private outbox for unacknowledged work. This reader
does not activate portfolio, research, bot archive, trading or order APIs.
Cloud saved reads remain available when the MM2 capture connector is disabled.
An unavailable MM2 service or Supabase store remains an explicit failure.

## Source and packaging

`scripts/wealth-package.lock.json` pins the reviewed upstream files by byte
length and SHA-256. `source_commit` identifies the upstream base;
`source_state: coordinator-frozen-working-tree` explicitly means the hashes,
rather than that base alone, identify the reviewed uncommitted snapshot.
The upstream is GBAutomation `apps/wealth-platform`. Attribution is
`source_kind: gbautomation_local`, `source_label: GB Automation`.

With Node 24.22.1 and the committed npm lockfile:

```sh
npm ci
npm run wealth:package -- --source-root <frozen-wealth-platform-root>
npm run wealth:check
node scripts/validate-whale-source.mjs tests typecheck package build
```

The importer verifies every source before writing and refuses extra output
files. Only `forge-contract.mjs`, `forge-client.mjs`, `capture-response.mjs`, `whale-cloud.js`,
`whale-browser-captures.js`, `whale-room.css` and generated provenance are public.
The gateway is copied separately into `amplify/functions/forge-atlas/wealth-vendor`.
No full-app entry, fixture, server listener, database, screenshot, owner mapping
or credential is packaged. `npm run build` checks the package before Vite.
Coordinate upstream corrections, replace reviewed lock hashes, reimport and
repeat affected checks. Do not patch vendored bytes independently.

If the checkout lacks ignored `amplify_outputs.json`, use
`node scripts/validate-whale-source.mjs package build-offline` for a production-mode
compilation and `node scripts/whale-offline-vite.mjs serve` for browser fixtures.
These supply an in-memory `.invalid` deployment configuration without writing
outside the evidence scope. That synthetic build must not be deployed. A release
must rebuild with coordinator-owned real Amplify outputs.

## Authorization and transport

`forgeWealthRead` is an authenticated AppSync Query; `forgeWealthCommand` is an
authenticated Mutation. Both use `input: AWSJSON` and `ForgeAtlasResult.payload`.
The browser explicitly uses `authMode: userPool`. The unrelated public model's
API-key default does not authorize these fields.

The input is exactly `{expert_id,resource_id,catalog_sha256,operation,args}`.
Every request invokes the existing trusted Cognito issuer/subject/group verifier,
operator policy, current active subject registration and digest-verified private
resource manifest. The row must match the configured resource, owner, app,
source commit and catalog digest. The server resolves a verified subject digest
to a Wealth tenant UUID. Neither raw claims, owner/tenant IDs nor destinations
are accepted from the browser. The MM2 receiver and Supabase transactions must
independently enforce that owner mapping.

| Operation | Field | Exact args |
| --- | --- | --- |
| `captureStatus` | Read | `{}` |
| `captureList` | Read | Optional `offset` (0..5000), `revision`, `channel_id` |
| `captureDetail` | Read | `id` (64 lowercase hex) |
| `captureRun` | Read | `request_id` |
| `captureStart` | Command | `request_id`, `requested_at` (UTC ISO), `channel_id` |
| `captureDelete` | Command | `request_id`, `requested_at`; optional `id`, omitted for delete-all |

Request IDs use 8..80 ASCII letters, digits, underscores or hyphens. The frozen
contract is authoritative for all shapes and bounds. The capture-only gateway
rejects the broader upstream Wealth operations before signing or dispatching.

The destination is one server-configured HTTPS tailnet origin, optionally port
8443, with fixed `/hosted-apps/wealth/read` and `/hosted-apps/wealth/command`
paths. Separate keys sign exact POST/path/JSON bytes. Response-domain signatures
bind nonce, actor, tenant, resource and operation. Redirects, cookies, mismatched
identity/signatures and oversized streams fail closed. Limits are 300,000 input
bytes, 330,000 signed request bytes, 800,000 response bytes, 900,000 serialized
GraphQL bytes, a 30-second signing window and a 12-second transport deadline.
No browser credential or cookie is sent to MM2.
The frozen capture-response validator also enforces exact successful response
fields, source provenance, transcript limits and async states at both server and
browser boundaries. Unknown owner, credential or driver fields are rejected.

## Capture and session lifecycle

Capture requires an explicit click and returns HTTP 202 while pending. Lambda
does not wait for the native capture. The UI polls a known run and distinguishes
`pending`, `upload_pending`, `complete` and failure. Only acknowledged Supabase
completion is shown as saved. The capture panel preserves request ID, timestamp
and channel when admission acknowledgement is lost. Backend durable idempotency,
expiry and delete fences remain authoritative; browser abort is not cancellation.

Saved lists load before capture status. Detail renders text with `textContent`
and only exact Discord channel links are navigable. Delete-all requires an
explicit confirmation. Pending deletion and minimal replay receipts are labeled.
The channel rail filters saved history with the exact `channel_id`; its one
active item uses `aria-current`. **All saved captures** clears that filter.
Selecting a channel resets pagination and discards late list/detail responses.
The capture target remains a separate explicit selector. Empty cloud history
names the prepared Mac mini #2 browser and the actual capture button.
Forge provides **Back to gallery** and **Close expert resources**, so this mount
omits the optional inner `onBack` callback and its workspace button.
The app reads status metadata every 15 seconds while mounted; this does not
capture or read a source browser. Run polling is limited to known pending work.

The host checks the Cognito session before and after each operation, fences
late replies, listens for sign-out, new sign-in and refresh failures, and sets a
local token-expiry timer. Account storage changes and focus/visibility checks
also invalidate changed identity. Invalidation aborts requests, clears module
state and private DOM, and removes `WealthHost`. Reopen after signing in again.

## Activation inputs

Activation is coordinator-owned. Source tests do not activate or establish a
working deployment. The additive configuration defaults off:

- `FORGE_RESOURCES_ENABLED=true` is required alongside Wealth configuration.
- `FORGE_WEALTH_CONFIG` is JSON with exactly `enabled:true`, `origin`,
  `expert_id`, `resource_id`, `catalog_sha256`, `source_commit`, `tenant_bindings`.
  `tenant_bindings` maps SHA-256 of lowercased verified Cognito subjects to
  existing tenant UUIDs, with 1..20 mappings. Keep it private.
- Existing `COGNITO_ISSUER` supplies issuer authority. Existing
  `FORGE_LEGACY_OPERATOR_SUB` and operator policy continue to apply.
- `FORGE_WEALTH_READ_SECRET_ARN` names one dedicated Secrets Manager secret.
  Optional `FORGE_WEALTH_COMMAND_SECRET_ARN` separately enables commands.
  Each SecretString is exactly 64 lowercase hex characters. Keys and ARNs must
  differ; neither ARN can reuse `FORGE_LIVE_APP_SECRET_ARN`. IAM grants only
  `GetSecretValue` for those exact configured ARNs.

During authorized activation, the coordinator must provision an explicit
private app registration with `agent_id:wealth-platform`, display name
`Whale Room`, active status, the reviewed app configuration digest and only
the verified operator subject. This is the requested app's registry entry,
not an autonomous agent or a code bootstrap fallback. It is not a claim that
this registration currently exists. When materializing the private registry,
preserve the existing Artist Packet and YouTube operator entries and access.
Publish the
matching private catalog row with `kind:ui`, `delivery_mode:live_app`,
`id:ui.whale-room`, `app_id:wealth-platform`, `owner_expert:wealth-platform`,
exact source and real observation/expiry
times. The immutable manifest SHA/version and active pointer follow the existing
[hosted resource contract](hosted-resources.md). Pin the same issuer, expert,
resource, catalog, source, owner mapping and separate keys on MM2. Preserve its
existing HTTPS 443 root. Never put these private bindings in browser config.
Hosting must serve `/apps/wealth/*.mjs` as JavaScript, with SPA fallback rewrites
excluding `.mjs`; verify that these URLs return module bytes, never `index.html`.
The host's script/style CSP must permit its own reviewed static assets.

## Verification and rollback

Run `node scripts/validate-whale-browser.mjs` against a local Vite server on
127.0.0.1:5199. It executes the real React mount and packaged browser modules
through the actual signed gateway and receiver with synthetic SDK/storage seams.
Run `node scripts/validate-whale-regressions.mjs <frozen-wealth-platform-root>`
on the same local server to check existing resource/benchmark/Pi windows,
opaque saved artifacts, Atlas chat hosting and the real Node-to-Python signed
capture receiver contract. The runner verifies upstream package hashes first
and passes all synthetic environment settings directly to child processes.
Evidence belongs only in local `artifacts/whaleroom-production-evidence` and must
be excluded from commits. Live identity, deployed API-key/foreign denial,
mobile/cross-device, real MM2/Supabase capture and Windows-off proof remain
separate coordinator acceptance.

After the offline production build, run
`node scripts/validate-whale-presentation.mjs <frozen-wealth-platform-root>`.
It serves the compiled app on loopback, uses the actual Amplify SDK with a
synthetic Cognito cache and intercepted GraphQL, and blocks external requests.
It checks channel filtering, pagination, late-response fences, truthful labels,
selected/focus styles, desktop/mobile layouts and keyboard navigation with all
twelve upstream registry labels. Its fixture transcripts never enter the bundle.
The synthetic model introspection in the offline builder exists only for these
checks. Rebuild with real coordinator-owned Amplify outputs for release.

For rollback, first remove command authority and reconcile admitted/uncertain
requests using their existing identities. Remove `FORGE_WEALTH_CONFIG` to disable
the app without changing the benchmark or other Forge resources. Restore the
compatible website/backend/config/catalog/MM2 tuple; retain Supabase content,
the outbox and minimal replay receipts. Disabling this capability never requires
deleting captures or changing unrelated root proxies.
