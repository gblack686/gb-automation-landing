# Proposal review in the private Forge workspace

The existing website is deployed at
`https://gbautomation.xyz/atlas/artist-packet-expert`. It uses the production
Cognito pool and the `tenant-gbautomation` group. Greg's existing
`gblack686@gmail.com` account is confirmed and already belongs to that group.
Sign-in and Forgot password use the existing website controls; this change
does not create another account or reset a password.

This extension adds a Proposals shortcut and Sign out to the authenticated
host. The shortcut opens `/atlas/artist-packet-expert?window=proposals` and
selects the proposal window in the private Forge document. Preview and
full-screen views continue to use the canonical Forge renderer.

The server reads the existing `agent_os_proposals` table through the existing
server-only Supabase secret. Every list and detail query pins the tenant to
`gbautomation` and the hosted expert `artist-packet-expert`. Ownership follows
the `producer_run_id` foreign key to `producer_runs.owner_expert` through an
inner join with tenant checks on both tables. This scopes counts, search, state,
pagination and detail reads equally; unassigned and other-expert records are
excluded. The adapter verifies returned tenant/expert scope too. Search, state and offset are bounded. Lists return 50 records at
most; details project the saved summary and action items, plus source-event,
producer and task identifiers. Provider payloads are not returned wholesale.

The iframe receives data through the existing random-channel/source-window
bridge. It receives no credentials and cannot make network requests. The
backend checks the deployed Cognito issuer, subject, tenant group and exact
read operation before querying. Returned ownership is checked a second time.

## Activation status

This PR enables read-only proposal review. Acceptance, email, scope/plan
decisions and execution remain disabled. Their pilot implementation landed in
`gbauto/gbautomation#1311` after all required checks passed. The billing blocker
was resolved. This read path needs no new database migration.

The selected interface is the newer 13-window Studio, packaged by the monorepo's
`render_forge_studio_private.py`. It retains the existing authenticated host and
read APIs. It excludes the public Studio's fixtures, simulation and localStorage.
Sessions/messages/traces, planning, activity and proposal review remain available.
Publish its reviewed private HTML to the existing versioned bucket only after
its source release gate passes. Keep the prior S3 version for rollback. Do not publish the
loopback pilot server, operator cookie or bootstrap on the public web.

Release proof must cover actual signed-in proposal list/search/detail reads,
other-expert and unassigned detail exclusion (including an empty expert inventory),
foreign-tenant API denial, unsigned S3 denial, matching document SHA-256 and
disabled writes. Fixture browser tests do not establish live readback.
