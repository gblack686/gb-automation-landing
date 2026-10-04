# Forge Workshop: first connected slice

The authenticated `/atlas/:agent_id` host can select Artist Packet Expert or
YouTube Intelligence for the exact legacy admin and main operator Cognito subjects
when the private S3 registry is absent. The YouTube document is the canonical `youtube-intel` package with
config SHA-256 `4e835524a45dacf2eb509b51809ca09ca2f805a28c57807acaf8a9eaba5389c7`.
The host verifies the signed document length, SHA-256, tenant, agent, and packaged
config binding before running its sandboxed iframe. Other accounts still require
explicit S3 registration. The selector provides scoped reads; command execution
remains the separate, gated Workshop route described below.

`/workshop` keeps the approved full-screen Studio interface and uses the existing
website Cognito session. The only connected capabilities are a private YouTube
expert configuration draft and the installed expert's `health` Justfile recipe.
Saving a draft does not apply it. Health does not validate unapplied draft settings.

Production activation completed on 2026-10-03. The deployed Lambda and Mac Mini
worker both have `FORGE_WORKSHOP_ENABLED=true`; the source function resource
contains the enabled Lambda flag. The main operator account
(`gblack686@gmail.com`) and the separate agent admin account are explicitly
linked to the existing Forge owner. Google OAuth remains optional future
federation; the existing email/password Cognito flow is sufficient for this slice.

## Request boundary

The React host owns Amplify calls with `authMode: userPool`. The iframe exchanges
four bounded request types with exact origin and source-window checks. It never
receives a token. AppSync authenticates the token; Lambda requires the deployed
pool issuer, UUID subject and `tenant-gbautomation` group. A service-only Supabase
RPC maps those verified claims to an explicitly linked existing Forge owner.
Email addresses, client-provided owners and automatic Supabase user creation are
not identity mechanisms. Existing discovery session contracts remain unchanged.

The adapter accepts one expert, a five-field configuration schema, and one recipe.
Name, purpose and scan cap are editable; model and manual approvals stay fixed.
Version checks preserve concurrent edits. Request IDs deduplicate save and run
retries. Private configuration stays out of the Studio layout/review localStorage.
The older Mac Mini ops read route excludes Forge health rows to prevent a second,
unscoped result-read path. The API never inherits RequireAuth's existing localhost
development bypass.

## Validation

Run from this checkout after `npm ci`. Vite requires an ignored
`amplify_outputs.json`; local validation used a synthetic auth-only fixture, never
production credentials.

```text
node --test amplify/functions/forge-workshop/contract.test.mjs
node --test amplify/functions/forge-workshop/infrastructure.test.mjs
npx tsc --project amplify/tsconfig.json --noEmit --incremental false
npx eslint src/pages/AgentWorkshop.jsx src/lib/forgeWorkshopClient.js public/workshop-ui/connected.js
npm run build
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5196 --strictPort
node scripts/validate-forge-workshop.mjs
```

The browser validator defaults to installed Chrome. `PLAYWRIGHT_EXECUTABLE` can
select an installed Playwright browser. It uses local test responses and exercises
the real React host, iframe, origin/source filtering, draft forms, error handling,
health states, official dark canvas and responsive layout. It is not proof of live
Cognito sign-in, production SQL, or Mac Mini execution. Evidence is written under
`artifacts/forge-workshop-validation/` (ignored machine output).

The companion monorepo tests execute the actual SQL migrations in a local PGlite
Postgres engine, including private-role denial, owner isolation, retry behavior,
version conflicts, abandoned jobs and data-preserving rollback. Worker tests run
bounded fixture child processes and verify sanitization, timeout, byte cap, revoked
bindings and failed claims. POSIX process-group cleanup needs the Mac canary.

## Coordinated activation

The companion source is `gbauto/gbautomation`, migration
`20260919190000_forge_workshop_identity_and_health.sql`, worker
`resources/skills/mac-mini-ops-telemetry/scripts/forge_health.py`, and runbook
`second-brain/operations/forge-workshop-activation.md`.

Website `master` has auto-build disabled. After merging a website PR, start an
Amplify `master` RELEASE job and wait for BUILD, DEPLOY, and VERIFY to succeed.
Release job 176 completed all three stages after PR #56. The reviewed migration,
Mini worker, account bindings, and both gates were activated in the coordinated
release. A direct production Lambda canary using the verified main account saved
and reloaded a draft and completed one `health` request through the Mini; this
checks the function and worker path but bypasses AppSync authentication. The
health result reported findings (`healthy: false`) rather than a transport failure.
The signed YouTube document was fetched and SHA-256 verified under the main
account, and the live Chrome session displayed its authenticated Studio and
registered-agent selector. Deployment must regenerate Amplify outputs so the
four new custom operations exist in the browser client.
Use the Amplify `amplify.yml` pipeline, which deploys the backend and generates
those outputs. The repository's older Netlify workflow writes placeholder auth
outputs and cannot activate this connection; do not use it as sign-in evidence.

Enable the Lambda with an explicit source change to its function resource, not an
unrecorded console-only setting. The worker requires a trusted `GBAUTO_REPO_ROOT`
and its separate opt-in flag. Durable or mutating actions continue through Hermes
Kanban. This route cannot install, apply proposals, or accept arbitrary commands.

Rollback disables both gates and the identity link; the companion rollback SQL
revokes the RPC while retaining drafts and audit history. Keep the old ops result
exclusion when rolling back so historical Forge receipts remain private.
