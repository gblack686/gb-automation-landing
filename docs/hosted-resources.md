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

Registered expert IDs also accept the canonical two-character `pi` ID. Exact
subject membership and active registration remain required. The document host
and schedule reader share `shared/forge-expert-identity.mjs`: YouTube, News and
Pi bind to their canonical `expert-*` profiles. This mapping neither creates a
schedule nor enables chat or runtime actions. Missing schedule evidence stays
unavailable; a short agent slug is not a substitute for its profile identity.

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

## Workspace record navigation

The Factory window also accepts optional `outcome_evidence` from the paired
Factory Game snapshot producer. The producer replays the original D4 package
with a separately pinned authority, requires an exact match with the ledger
extension and every in-range hashed season entry, and projects only quests
whose explicit expert matches the selected workspace. Shared-seat totals never
assign an outcome to another expert. Missing packages show unavailable detail.

The strict hosted reader preserves reviewed activity, verified impact and
in-range ledger credit separately. Rejected, pending, failed and withdrawn
quests stay visible, with append-only reversals and fractional XP. These are
frozen evidence claims, never live acceptance or permission to award credit.
No endpoint, setting, writer, timer or scoring rule is added. Deploy the paired
reader and regenerated documents before publishing extended snapshots; restore
prior snapshot versions before reverting an older strict reader. Synthetic
test authorities and packages must never be published as real evidence.

Source checks: `node --test amplify/functions/forge-atlas/factory*.test.mjs`.
The outcome fixture/browser mode additionally verifies real paired producer
bytes, desktop/mobile history, foreign-owner denial, manual refresh failure
and the absence of reads while idle or any writes/model calls.

The Factory snapshot optionally includes `journey_evidence` from the paired
GBAutomation native YouTube/News adapters. Its original capture time and source
digest remain attached to the exact expert/configuration-bound snapshot. The
server validates bounded identities, original metric scope, null costs and
missing trace/target links. Old snapshots omit this extension and display a
clear unavailable state. Unknown fields and supplied URLs are rejected.

The existing Factory window exposes keyboard-accessible work/output/collector
details and explicitly aggregate target navigation. It does not equate artifact
verification or completion with delivery or acceptance, and it adds no polling.
Native output publication and real Langfuse/per-run target links remain open;
there is no invented link from an artifact ID to a resource or trace URL.

Deploy the paired reader before publishing a snapshot with this optional
extension. Rollback restores prior object versions and matching website source;
the old reader rejects new fields. Preserve immutable evidence and game state.
Validate `factory-journeys.test.mjs` plus the native journey browser scenarios
in `scripts/validate-atlas-factory-workspace.mjs`. These are source checks;
publication and real identity/mobile acceptance remain separate.

Verified YouTube outputs may also carry an explicit `hosted_binding`: the
registered resource ID, catalog digest/version and artifact digest/version.
GBAutomation prepares that binding from the exact native capture and verified
publication receipt. Verified News card exports also support this path. Their
`export_source_commit` identifies the capture producer, not the running News
agent. Recorded-only News cards and unverified outputs remain unavailable;
completion never implies publication.

An artifact request may include `catalog_version_id` with its catalog digest.
The storage adapter then reads only that immutable manifest version under the
existing private prefix, rather than following the active pointer. Registered
operator/expert authorization still runs before storage. The workspace checks
the artifact owner, resource identity, expected content digest and both versions
before rendering; signed URLs never enter the workspace document channel.
Refresh retries the same captured output. Missing/replaced archived objects
cannot silently substitute the latest result. Normal catalog reads are unchanged.

The existing read grants already cover versioned manifests and artifacts; no
new cloud resource, owner, schedule or IAM prefix is needed. Deploy readers
before snapshots/documents using output bindings. Restore earlier snapshots
and documents before rolling back those strict readers. Retain archived object
versions. Run the existing workspace browser validator normally and with
`FORGE_WORKSPACE_JOURNEY_OUTPUTS=1` using generated output fixtures for the latter.

The saved-result viewer recognizes `forge-news-card-export.v1` JSON. It presents
the captured headline, summary and native card/task/generation identities, with
the complete source record available in a details control. All native text is
inserted through text nodes; it cannot create scripts, links or image requests.
Existing artifact verification, sandboxing and the no-network document policy
remain in force. Other JSON and native card variants keep the generic source
view. Recognized but malformed or foreign-expert News exports are rejected.

Workspace search carries typed exact destinations for proposals, indexed plans
and sessions. Proposal details use the existing owned reader even when the
record is outside the current catalog page. Plans open their scoped index and
only show a packaged document when its digest matches. Sessions require an
explicit `session_key`; an intent ID or native `session_id` is never guessed
to be a history key. Identities are preserved or rejected, never shortened.

The companion source migration
`20261106100000_forge_search_session_identity.sql` adds that explicit key to
the existing service-only title-search RPC. It is not applied by a source push.
Old RPC responses remain searchable with an unavailable destination. The old
website ignores the additive field, so source rollback need not revert SQL.

PR and code results are shared repository context, not expert ownership claims.
Navigation accepts only exact PR/blob locations in the two configured repos.
History and proposal reads allow bounded concurrency; late replies cannot
replace a newer selection. Opening a result grants no approval or write rights.
Mobile account controls wrap, and the document follows the measured header
height. No model calls, typing-triggered queries or polling are added.

Validation adds `shared/forgeSearchNavigation.test.mjs` and the exact-record
scenarios in `scripts/validate-atlas-factory-workspace.mjs`. These use synthetic
transport; real publication and identity acceptance remain release gates.

The optional Factory benchmark scorecard can carry a `timeline` binding. Its
resource must be `ui.<selected-expert>.benchmark-timeline`; both manifest and
artifact versions are explicit. The existing authenticated saved-output reader
and sandbox handle this chart. A missing archived chart cannot fall back to the
current catalog. This is a historical synthetic-task view and grants no target
credit, game progress, review approval or publication authority.

The producer builds separate Pi, YouTube and News artifacts. Expert filtering
cannot reveal rows that are not present in that expert's artifact. Validate real
Bokeh rendering, playback, owner isolation and missing-archive behavior with
`FORGE_WORKSPACE_BENCHMARK_TIMELINES=1` in the existing workspace browser
validator. Its transport and object versions are synthetic; it is not cloud
acceptance. Install this compatible reader before extended snapshots and
documents. For rollback, restore snapshots/documents first and retain archives.

## Native operation evidence

The existing Factory snapshot also accepts optional `continuity_evidence` from
the paired native replay producer. `factory-continuity.mjs` checks exact expert
and lane ownership, bounded identities, immutable source manifests, capture
times, complete denominators and qualification consistency. The native Pi
reducer and qualifier remain the acceptance authority; this display reader
cannot promote a slot pass into live acceptance.

Operation evidence shows the selected expert's scheduled slots and all verdict
counts. Overall qualification explicitly covers News, trusted YouTube and liked
videos together. Fixture and historical evidence are labeled. Missing
qualification stays unavailable. Native observation roots are not trace IDs,
and native accepted-content hashes are not exported HTML/JSON artifact hashes.
No trace URL or saved-output join is inferred. There is no new endpoint,
capability flag, polling, approval write or execution action.

The standard Atlas Node suite uses committed, hash-bound synthetic outputs in
`amplify/functions/forge-atlas/fixtures/factory/` for continuity, native links
and domain improvements. A clean checkout needs no private repository or
fixture environment variables. These are frozen consumer contract checks;
they do not claim a fresh producer run. Explicit fixture variables below
remain available for paired producer validation and fail on invalid paths.

Validate with `FORGE_WORKSPACE_CONTINUITY_FIXTURES` for the colocated reader
test and `FORGE_WORKSPACE_CONTINUITY=1` plus `FORGE_WORKSPACE_FIXTURES` for the
existing workspace browser validator. Fixtures come from GBAutomation's
`scripts/build_atlas_continuity_fixtures.py` and are never publication inputs.
Install the compatible reader and regenerated documents before extended
snapshots; restore compatible snapshot versions before reverting the reader.
Source tests do not establish hosted or live acceptance.

The optional `journey_links` object now binds the original journey capture to
displayed native operation slots and their saved output identities. The paired
producer replays pinned native observation/span functions and reads source and
relay databases in read-only transactions. News native-content and exported-JSON
hashes remain distinct; HTML run reports are not accepted YouTube summaries.
Every expected span, payload and recorded readback must match the original sink
capture before a trace ID is exposed. The display reader binds expert, source,
journey digest, run, output and readback fields. It verifies trace/root identity
namespaces and accepts no caller-supplied project URL.

Factory supports keyboard navigation between the exact journey and operation
slot. Missing source closure, changed bytes, absent/conflicting readbacks and
older snapshots remain explicit. A verified link grants no target acceptance or
game credit, and whole-run trace scope does not change generation-only metrics.
Use `FORGE_WORKSPACE_NATIVE_LINK_FIXTURES` for reader tests and
`FORGE_WORKSPACE_NATIVE_LINKS=1` for the browser scenario. The paired synthetic
builder is `scripts/build_atlas_native_links_fixtures.mjs` in GBAutomation.
Private live joins and hosted acceptance still require release evidence.

## Domain improvement review

Native improvement review also supports the exact News and YouTube expert.
The paired producer replays immutable native daily-finding, decision and
protected domain-grader declarations, retaining separate original/projection
hashes. Its independently pinned input packet binds daily receipts, source
evidence, comparison/holdout suites and native observation artifacts. No model
or benchmark worker is started by the read path.

`factory-domain-improvements.mjs` validates owner/repository, source manifest,
completeness and domain gates. The existing Factory window shows both cohort
denominators, correctness/privacy/quality and native probe cost/p95 ratios.
Probe ratios cover zero-model-call checks; proposal tokens and estimates are
separate. Missing evidence remains incomplete, and synthetic mode is visible.
Domain proposal references bind full domain/source evidence in addition to the
existing cycle, candidate, policy and receipts. Canonical detail lookup verifies
the proposal's exact expert. Factory proposal identities remain unchanged.

Use `FORGE_DOMAIN_IMPROVEMENT_FIXTURES` for reader tests and
`FORGE_WORKSPACE_DOMAIN_IMPROVEMENTS=1` for browser checks. Install compatible
readers and regenerated documents before domain snapshots; restore compatible
snapshots before reverting readers. Retain all proposals, decisions and native
receipts. Source tests and fixture observations do not establish actual sandbox
execution, publication, live expert acceptance or release approval.

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

## App-specific live reads

`forgeAppRead` adds one separately disabled `benchmark-comparison` capability on
the canonical Pi resource. A configured `FORGE_LIVE_APP_CONFIG` pins the HTTPS
Mini origin, source commit, receipt hash, resource ID and current catalog digest.
`FORGE_LIVE_APP_SECRET_ARN` identifies one AWS Secrets Manager secret containing
a dedicated HMAC key. Its exact read grant exists only when configured. Neither
setting is populated by default. No new account or secret has been created.

After the normal operator/registry checks, the server verifies the current
private catalog binding and signs a 30-second request for the fixed
`/hosted-apps/read` route. It forwards no user header, URL, cookie or bearer token.
Redirects, returned cookies, replaced bytes, identity mismatches, oversize
responses and unknown fields fail closed. Host errors become a generic
unavailable state. At most 200 reviewed historical attempts are returned.

The gallery renders metrics as React text, preserving unknown measurements,
event time, receipt identity and retrieval time. It does not frame a Mini app,
change its CSP or enable WebSockets. Refresh is manual and last-good data is
labeled after an outage. Interactive saved Bokeh HTML uses the existing opaque
artifact sandbox. The MM2 edge is an exact release prerequisite, not a completed
live transport claim. All other app routes remain disabled.
