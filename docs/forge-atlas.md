# Private Artist Packet Expert Atlas

## Expert chat from the Working Canvas

The 18-window document's Markdown preview can attach an expert-owned file path
and SHA-256 to **Discuss this file** in Conversation. The Expert chat tab appears
only when the authenticated host confirms that the private chat API and a
Mac Mini worker pulse from the last 60 seconds are available. The opaque iframe sends `start`, `send`, and `poll` through its
random channel; it receives no database, Cognito, or Hermes credentials.

The `forgeChatRead` and `forgeChatCommand` AppSync operations authenticate the
deployment issuer, tenant group, Cognito subject, and registered agent on every
call. They bind the selected agent to a server-owned Hermes profile and persist
only owner-scoped sessions and turns in service-only Supabase tables. `poll`
filters by tenant, owner subject, agent, profile, and session ID. The Mac Mini
worker verifies an attached Markdown file under the exact expert source root,
rejects symlinks, oversize files, and stale SHA values, then runs a bounded
`hermes chat` turn with `HERMES_CRON_SESSION=1` and the `clarify` toolset. The
worker stores the Hermes session ID and resumes it on later turns.

Deploy `20261006030000_forge_expert_chat.sql`, the website backend, the
matching private Forge document, and the Mini worker before expecting a live
reply. The worker install and readback order are in
`gbautomation/apps/forge-expert-chat/README.md`. A failed or absent backend
capability keeps the Expert chat tab hidden.

## ShapeShift workspace search

The Conversation window sends a bounded `search` read through the opaque-document host channel. Cognito and the registered agent list bind it to one tenant and expert. The Lambda returns a `forge-unified-search.v1` envelope with proposal, conversation-summary, PR, and Graft code hits, plus explicit coverage for each source. The document gets no credentials or write methods.

Proposal hits reuse the expert-owned `agent_os_proposals` projection and the scoped TAC PRD projection. Conversation hits use the service-only `forge_search_session_intents` RPC, which joins summaries to explicitly owned agent sessions and never returns raw transcripts. PR metadata is read from the allowlisted GBAutomation and website repositories. Graft runs on the Mini through a bounded Basic Auth protected sidecar route. Missing sources remain unavailable, not zero matches.

Optional Jev ranking reads the existing `gbautomation/typesafe/api-key` secret in Secrets Manager. The secret is a plain API key; JSON values with `api_key` or `TYPESAFE_API_KEY` are also accepted. When the secret or provider is unavailable, literal search still works. The SQL migration, Mini sidecar update, Lambda update, and regenerated private Forge document must all be present before live four-source readback.

## Primary operator workspace

The 18-window Forge document, evolved from the original 16-window design, is
the primary GBAutomation browser UI. The Hermes WebUI shell is retired. Its
working Mini sidecar stays online as an independent data service. The
`operatorData` read accepts only summary, artifact, graph, trace, report,
knowledge-search and fleet-schedule requests. It requires the exact operator
Cognito subject as well as normal tenant and registered-agent checks. The
Lambda holds the Mini Basic Auth credential and projects bounded display rows;
the opaque document receives no credential, raw SQL or arbitrary sidecar URL.
Run Console, Artifacts, Second Brain and Schedules render those reads inside
the existing workspace windows. The old WebUI bookmark should redirect to
Forge only after the 18-window document and Lambda are deployed and read back.

`/atlas/artist-packet-expert` hosts the selected Forge document after website
sign-in. The GBAutomation portal dashboard links to it. The document comes from
a private, versioned S3 object, not from the public site bundle. A 60-second
signed URL is issued only after the Lambda verifies this deployment's Cognito
issuer, subject and `tenant-gbautomation` group. This first internal workspace
is available to that tenant group; other tenants require their own explicit
authorization and document bindings.

The parent verifies the document's SHA-256 and renders it in an opaque sandbox.
The frame cannot read parent credentials or localStorage. Its channel permits
only scoped activity, planning, schedule and paginated history reads. Session text stays in
memory. The original offline document and loopback preview remain supported.
Layout changes and document notes in the hosted sandbox last for that open tab.

AppSync authenticates every read. The backend pins `gbautomation` and
`artist-packet-expert`; caller-supplied tenant/expert/SQL is rejected. The
service-only `agent_forge_atlas_read` RPC supplies existing session/message/trace,
PRD and Kanban projections. Explicit ownership is required, with no profile-name
fallback. The backend returns verified project-qualified Langfuse URLs. This is
a read-only control-panel slice; it does not dispatch arbitrary commands.

The Schedules window requests one Pacific date through the same authenticated
bridge. The backend fixes the expert from the Cognito registration, fetches the
Mini's existing schedule projection through the HTTPS Basic Auth gate, and
returns only Hermes jobs whose profile exactly matches the server-owned binding.
The existing website ID `youtube-intel` binds explicitly to the installed
`expert-gbautomation-youtube-intel` profile; other IDs use their exact name.
It reads
the operator gateway credential from the existing Secrets Manager secret;
the browser receives neither that credential nor the fleet response. Missing
expert catalogs fail as unavailable. Launchd and other profiles stay in the
operator fleet calendar. The rendered Forge document must be republished from
the matching monorepo renderer before this window appears on the signed-in site.
For YouTube, render the 18-window workspace from the canonical
`build_youtube_forge.py` profile projection using `assemble_index.py
--forge-workspace`. The document must bind website agent `youtube-intel`,
Hermes profile `expert-gbautomation-youtube-intel`, and the registered config
digest. The host checks all three before running the document. The currently
published 13-window private Studio has no Schedules window.

## Release and readback

1. Merge the monorepo's hosted bridge/RPC and apply
   `20260922200000_forge_atlas_hosted_read.sql` through `gbauto-supabase`.
   Verify anon/authenticated EXECUTE is false and service_role is true.
2. Merge this website PR through green CI. Amplify must deploy the backend and
   regenerate outputs. Keep held YouTube Workshop PRs separate.
3. Render the reviewed private profile with the merged renderer. Upload only
   `index.html` to the output `custom.forge_atlas_bucket_name`, key
   `gbautomation/artist-packet-expert/index.html`, with metadata `sha256` set to
   the file's SHA-256, content type `text/html`, cache control `private, no-store`.
   For YouTube Schedules, use the reviewed 18-window document and the separate
   `gbautomation/youtube-intel/index.html` key. Preserve the previous S3 object
   version for rollback and verify the uploaded bytes and document binding.
   Do not upload raw answers, local logs, generation requests or transcripts.
4. Verify signed-out redirect, foreign-tenant API denial, unsigned S3 denial,
   real-account document open, source hash, scoped data and trace navigation.
   A successful empty read does not prove runtime capture. Record the real-turn
   capture canary separately from website publication.

Rollback removes the portal link and denies the backend operation while retaining
the S3 object/version and all existing runtime records. Revoke the RPC service
grant only when disabling all consumers. No data deletion is needed.

## Tests

`node --test amplify/functions/forge-atlas/*.test.mjs` checks authentication,
ownership, paging, safe errors, metric bounds, trace URLs, private storage,
offline S3 signing and the production Lambda bundle. The bundle check resolves
the actual handler's transitive dependencies, which frontend compilation and
TypeScript alone do not exercise.
`scripts/validate-forge-atlas.mjs` tests the React host with synthetic transport;
`FORGE_ATLAS_HTML` optionally supplies the actual generated document. The monorepo
also runs the real SQL in PGlite and the full Forge document inside an opaque
browser sandbox. `scripts/validate-forge-atlas-anonymous.mjs` checks the production
build's signed-out redirect without replacing authentication or API modules.
Set `FORGE_ATLAS_BASE` to check the live website. Live Cognito, S3 and Supabase
require release readback.

The opt-in live canary uses Python `boto3` and `playwright` plus operator AWS
credentials. It creates one temporary Cognito account with email suppressed,
checks denial before group membership, signs in again after adding the existing
tenant group, verifies private S3 and live Supabase reads, then deletes the
temporary account in `finally`. No passwords, tokens or message text are saved.

```text
python scripts/validate-forge-atlas-live.py --outputs amplify_outputs.json --create-test-user
```

Its count-only receipt is local browser evidence, not proof of runtime capture.
The S3 SDK and presigner are pinned to the existing AWS SDK version; scoped
Smithy overrides keep the presigner's types compatible without upgrading the
rest of Amplify's dependency graph.

The proposal review extension and its release dependency are documented in
[forge-proposals-web.md](forge-proposals-web.md).
