# Private Artist Packet Expert Atlas

`/atlas/artist-packet-expert` hosts the selected Forge document after website
sign-in. The GBAutomation portal dashboard links to it. The document comes from
a private, versioned S3 object, not from the public site bundle. A 60-second
signed URL is issued only after the Lambda verifies this deployment's Cognito
issuer, subject and `tenant-gbautomation` group. This first internal workspace
is available to that tenant group; other tenants require their own explicit
authorization and document bindings.

The parent verifies the document's SHA-256 and renders it in an opaque sandbox.
The frame cannot read parent credentials or localStorage. Its channel permits
only activity, planning and paginated history reads. Session text stays in
memory. The original offline document and loopback preview remain supported.
Layout changes and document notes in the hosted sandbox last for that open tab.

AppSync authenticates every read. The backend pins `gbautomation` and
`artist-packet-expert`; caller-supplied tenant/expert/SQL is rejected. The
service-only `agent_forge_atlas_read` RPC supplies existing session/message/trace,
PRD and Kanban projections. Explicit ownership is required, with no profile-name
fallback. The backend returns verified project-qualified Langfuse URLs. This is
a read-only control-panel slice; it does not dispatch arbitrary commands.

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
