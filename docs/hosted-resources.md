# Private expert resource delivery

Source implementation for GBAutomation's approved hosted-access plan, phases 1–5.
Production activation is a separate release. `FORGE_RESOURCES_ENABLED` defaults
to `false`; enabling it is an explicit backend configuration change. This source
does not deploy a bucket, publish objects, or change Amplify auto-build settings.

`forgeAtlasRead` accepts `resourceCatalog` and `resourceArtifact` only after the
existing deployment issuer, tenant, registered active agent and exact operator
checks. The operator catalog is a private fleet index. The selected agent remains
registered on every request; `owner` filters refer to canonical catalog owners,
including the existing short names `pi` and `ci`, and do not change authorization.

The server reads `gbautomation/resources/active.json` from the existing private,
versioned Forge bucket. Its `hosted-resource-pointer.v1` payload names the hash
and exact S3 version of an immutable manifest at
`gbautomation/resources/manifests/<sha256>.json`. Both objects are size bounded
and verified against their SHA-256 metadata. The manifest uses
`hosted-resource-delivery.v1`, with one resource ID, canonical owner, kind,
delivery mode, source commit, capture/expiry time and optional artifact binding
per record. The local bundle producer lives in GBAutomation's
`resources/lib/hosted_resources.py`; it emits candidates without invented cloud
versions. A publisher must upload and verify artifacts before binding versions,
then upload and verify the manifest before replacing the active pointer.

Catalog responses contain at most 50 rows. They omit filesystem paths, local
URLs, object keys, version IDs and service credentials. Unknown targets and
caller-supplied URLs/keys are rejected. An artifact request binds the resource ID
and the displayed catalog hash. Its server-owned object version must match the
reviewed digest, size and media type before a 60-second GET is signed. The browser
fetches without credentials or redirects, verifies the actual bytes, and renders
them in an opaque `allow-scripts` frame with restrictive CSP and no host bridge.
HTML, plain text, Markdown, JSON and PNG are the initial reviewed types.

The gallery opens through the Expert resources button or
`/atlas/<registered-agent>?window=resources&owner=<canonical-owner>`. The existing
Character Forge local gallery also links to the signed-in host. An opaque Forge
document can request `resourceGalleryOpen` with only `{kind:'ui'|'kb'|'process'}`;
the host opens its own gallery and retains all credentials. Local navigation is
preserved. Live-app records show unavailable until their separate gateway
capability is implemented and enabled. Browsing makes no model calls and adds
no periodic polling. Manual refresh failures retain labeled last-good results;
stale captures keep their original capture time.

Validation: `node --test amplify/functions/forge-atlas/*.test.mjs`, backend
TypeScript, `npm run build`, `scripts/validate-hosted-resources.mjs`, and the
existing `scripts/validate-forge-atlas.mjs`. Browser tests use synthetic transport
and private-object fixtures, not production identities. Release acceptance must
still prove real sign-in, unsigned S3 denial, session expiry, off-site/mobile
access and exact object/config versions. No previous factory soak supplies that
acceptance.

Rollback disables `FORGE_RESOURCES_ENABLED` and restores the previous paired
website build and private object versions. Retain all immutable artifacts,
manifests and job ledgers. No object deletion is required.

## Bounded Pi requests

`FORGE_PI_JOBS_ENABLED` independently defaults to false. `forgePiRead` and
`forgePiCommand` reuse the Cognito operator and registered expert checks. Every
submission binds the resource owner, displayed catalog digest, fixed action and
stable UUID request key. The API derives the actor and input digest; callers
cannot select a URL, credential, command, path or budget. Broker credentials
remain server-side and no lease token appears in browser responses.

The gallery stores its pending request identity in session storage before
submission. A lost response offers retry with that same identity. Status is an
explicit read; there is no idle browser polling. Refresh publishes a prepared,
reviewed bundle. The YouTube report action uses the existing Pi admission budget
and returns native acceptance, not invented report completion or publication.

The additive GBAutomation migration `20261105090000_forge_pi_jobs.sql` creates a
separate disabled namespace with atomic claims, expiring leases and fenced
completion. It has not been deployed. Private Realtime publication and policy
enablement are separate release steps. Pi owns a delivery ledger inside its
existing process and reconciles uncertain effects before replay. Rollback first
disables commands, retains both ledgers and reconciles claimed/uncertain work.

Phase 3 proof includes 45 website API tests, synthetic browser retries and
status checks, 8 isolated PostgreSQL tests, 28 Pi delivery/exporter tests and 22
host regression tests. The embedded SQL engine is not a multi-connection race
proof. Live identity, broker subscription and cloud permissions remain release
acceptance work. Private receipts are in the GBAutomation hosted-access plan.
