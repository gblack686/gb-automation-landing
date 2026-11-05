# GB Automation Website and Forge

## Purpose

GB Automation's public Agentic Systems Program website and authenticated Forge
workspace. The public landing page explains the offer and collects contact
requests. Forge provides expert workspaces, proposals, private resources and
review surfaces. Existing Pi owners execute Mini work; this frontend does not
start another owner or expose arbitrary Mini routes.

## Status

Active application using React 18.3, Vite 7, Tailwind CSS and AWS Amplify Gen 2
(Cognito, AppSync, Lambda, DynamoDB and private S3). Source provenance:
`source_kind: gbautomation_local`, `source_label: GB Automation`.

Hosted resource delivery, bounded Pi requests and benchmark reads are source
prepared and disabled by default. They require separate deployment and real
identity/infrastructure acceptance. Local fixtures and CI do not prove live
activation. See [hosted resources](docs/hosted-resources.md).

## Repository Layout

| Path | Responsibility |
| --- | --- |
| `src/` | React routes, public components and Forge UI |
| `amplify/` | Backend definitions, functions and colocated `*.test.mjs` tests |
| `scripts/` | Browser validators, deterministic build and operator tools |
| `docs/` | Feature contracts and operational guides |
| `public/` | Public static assets and intentionally published reports |
| `.github/workflows/` | Source checks; distinct from production deployment |
| `amplify.yml` | Reviewed Amplify build/deployment recipe |
| `artifacts/` | Local generated proof; do not publish private receipts here |

There is no separate top-level tests directory: backend tests are colocated,
browser checks live in `scripts/`, and the landing smoke is `test-site.js`.

## Setup

Use Node 24.22.1 for the hosted-access candidate (the validated runtime) and the
committed npm lockfile:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Vite normally serves `http://127.0.0.1:5173`. An existing environment's
`amplify_outputs.json` supplies browser-safe endpoint/auth identifiers. Private
server configuration is described in the feature docs; never put service keys
in Vite variables or source. AWS Secrets Manager is the secret authority.
Offline browser validators use synthetic fixtures. Live sign-in needs an
authorized deployed backend; starting Vite does not provision it.

## Validation

Run the relevant source checks from the repository root:

```sh
node --test amplify/functions/forge-atlas/*.test.mjs
node --test amplify/functions/forge-workshop/*.test.mjs
npx tsc --noEmit -p amplify/tsconfig.json
npm run build
```

With a local Vite server running, `node scripts/validate-hosted-resources.mjs`
and `node scripts/validate-forge-atlas.mjs` exercise browser fixtures; follow
their documented fixture variables and base URL in the script source.
`npm test`, `npm run test:tenant` and `npm run test:client-hub` cover other
surfaces. Run the checks for the changed feature; do not treat an unrelated
landing smoke as authenticated Forge acceptance. Keep failed attempts and
exact source/test identities in the private implementation evidence.

## Operations

`npm run dev` runs the local UI; `npm run preview` serves the built frontend.
Development output is in the terminal. Authorized deployed backend diagnostics
use the existing Amplify and Lambda logs; never paste secrets into receipts.

Production uses Amplify Hosting. At the hosted-access review on 2026-11-05,
auto-build was disabled: pushing a branch did not deploy it. `amplify.yml` uses
the Amplify pipeline deployment command in its hosting environment. Both
`npm run amplify:sandbox` and the misleadingly named `npm run amplify:deploy`
provision a sandbox (the latter adds `--once`); neither is a local-only build
nor this production release procedure. They require explicit cloud authority.

For release, pin merged source, preserve the previous website/backend/config
tuple, apply only the approved delta, and run real identity/private-object
checks. Roll back compatible paired versions and disable new admissions first.
Keep immutable objects and job ledgers. The scoped hosted rollback is in
[hosted resources](docs/hosted-resources.md); detailed private release evidence
lives in GBAutomation's approved plan, not this public repo.

## Agent Notes

Read [AGENTS.md](AGENTS.md) and the relevant feature guide before editing:

- [Forge Atlas](docs/forge-atlas.md)
- [Private resources and hosted capabilities](docs/hosted-resources.md)
- [Forge proposals](docs/forge-proposals-web.md)
- [Forge Workshop](docs/forge-workshop.md)
- [Visual generation](docs/forge-visual-generation.md)
- [Tenant portals](docs/tenant-portals.md)
- [Particle homepage](docs/particle-homepage.md)

Check for concurrent writers. Preserve another session's reports and existing
dirty files. Do not include private `artifacts/` evidence in this public repo.

## Ownership

Owner: Greg Black / GB Automation. GitHub pull requests track source review.
The authoritative private implementation and acceptance record for hosted
access is GBAutomation's `second-brain/plans/2026-11-04-ui-hosted-access/`.
Forge owns browser/auth boundaries; the existing Pi owner owns Mini execution.
This is a GB Automation output reusing documented patterns, not original TAC canon.

## Branch migration

Default branch: `master`

Migration blocker: The existing Amplify production branch tracks master. A
rename requires a coordinated hosting configuration migration and rollback;
those cloud/branch changes are outside the approved hosted-access source work.
Retain master until that migration is separately reviewed.

## Contact form and customization

The Amplify data model in `amplify/data/resource.ts` is authoritative for contact
submissions. The landing form collects name, email, company, phone, project
description and message; follow the model for status and server timestamps.
Check that schema when changing fields or notifications.

Public offer content lives in `src/components/Hero.jsx`, `Features.jsx`,
`Process.jsx`, `Pricing.jsx`, `ContactForm.jsx` and `Footer.jsx`. Theme settings
live in `tailwind.config.js` and the source styles. Validate mobile layout,
accessibility and contact behavior after changing the landing page. Domain,
analytics and notification changes need their own release scope.

## License and support

Copyright GB Automation. All rights reserved. Contact greg@gbautomation.xyz.
