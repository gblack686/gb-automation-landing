# Agent working contract

Read [README.md](README.md) and the relevant `docs/` guide. Work in a task
branch after checking Git status and other active writers. Preserve unrelated
changes, published reports and prior failed proof. This repository is public;
private receipts, prompt payloads and credentials do not belong in commits.

## Implementation requests

Before editing, record these fields in the task or PR with concrete paths and
acceptance criteria. Existing approvals carry forward within their scope.

- Where: identify the route/component and backend contract, related guide,
  source branch and any cross-repository dependency.
- Done means: identify observable behavior, negative/security cases, exact
  tests and review artifacts, and distinguish source acceptance from live
  deployment acceptance.
- Out of scope: identify excluded services, side effects and deployment changes.

For the approved hosted-access work:

Where: `src/` Forge resource gallery, `amplify/functions/forge-atlas/` private
resource/job/live-read contracts, and `docs/hosted-resources.md`. GBAutomation's
approved `2026-11-04-ui-hosted-access` plan binds the producer, SQL source and Pi
owner adapter work. Reuse existing Cognito/registered-expert authorization.

Done means: owner-filtered private catalog and version/digest-bound saved
artifacts; manual refresh and honest unavailable/last-good states; stable job
identity and fenced delivery; fixed, separately disabled benchmark capability.
Pass relevant API denial tests, backend typecheck/build, desktop/mobile browser
checks, and the real isolated cross-repository owner contract test. Record
exact source IDs and limitations in the private plan. Source PRs stay reviewable;
real cloud identity, mobile/laptop-off and infrastructure acceptance belong to
the separately approved activation.

Out of scope: production activation, DNS/IAM/SQL changes, broad Mini proxying,
new owners/pollers/schedules, public private data, paid services, enabling CI
elsewhere, bypassing branch protection, or rewriting historical approvals.

## Validation and release

Use the validation commands in README and the feature guide. Run source checks
against isolated fixtures. Never point worker tests at live state. Retain exact
receipts; keep unknown metrics unknown. A read-only verifier reports findings
without repairing its producer tree. After a terminal blocked review, retain
that receipt and document the material correction before a new bounded review.

Keep hosted settings default-off. AWS Secrets Manager remains canonical for
secrets; browser configuration carries no service credentials. A source push
does not authorize deployment. Production release needs reviewed source,
compatible rollback, explicit activation authority and live readback. The
existing legacy master exception is explained in README; do not rename it as
part of routine validation.

Source attribution: `source_kind: gbautomation_local`,
`source_label: GB Automation`. Attribute reused Pi/TAC patterns and later
corrections accurately in the owning private proof record.
