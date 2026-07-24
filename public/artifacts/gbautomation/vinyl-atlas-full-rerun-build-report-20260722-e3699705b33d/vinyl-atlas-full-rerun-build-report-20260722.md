---
client: gbautomation
project: vinyl-atlas
artifact_kind: build-report
tags: [vinyl-atlas, tac, build-report, validation, gbautomation]
---
# Vinyl Atlas Full Rerun — Build Report

Marker: VA_FULL_RERUN_E2_BUILD_REPORT_20260722

Status: validated with advisories.

Generated: 2026-07-22T23:24:30Z
Task: t_22819df0
Repo: gbauto/vinyl-atlas
Worktree: /Users/greg/repos/vinyl-atlas-worktrees/vinyl-atlas-full-rerun-20260722/e2-report-artifacts

## Executive summary

Vinyl Atlas passed the D1-D5 validation set needed for operator-facing closeout. The only remaining issues are release-management advisories: npm audit findings, Vite bundle-size warnings, deferred real-audio smoke pending a lawful local audio fixture, and open-but-green PRs.

## Validation rollup

- D1 contract/policy: pass — Focused negative suites across C2-C10 passed; receipt d1-contract-policy-validation.yaml.
- D2 build/CI smoke: pass_with_advisories — npm ci/test/build/ci:verify passed; advisories: npm audit, Vite chunk warning, no explicit lint/typecheck scripts, recreated worktree scope.
- D3 authorized-audio benchmark: pass_with_advisories — Fixture-only metadata benchmark passed; real lawful local audio smoke deferred until operator supplies authorized file.
- D4 safety/legal audit: pass — Zero secret findings, zero raw-audio artifacts, zero unsafe download/rip/extract flow findings.
- D5 dossier/export gates: pass — Seven hard gates passed; export blocks/approval behavior exercised; no blocking findings.

## Risks and release notes

- D2 npm audit reports one low and one high vulnerability; owner: builder/security follow-up if release-bound.
- Vite chunk-size warning appears in D2/D5; non-blocking for validation, release owner may optimize bundle.
- PRs are clean and green but still open; no merge recorded at report time.
- D2 noted recreated/non-integrated worktree scope; integrated release branch should preserve validation receipts before merge.

## PR / merge state

- PR #2: open, clean, CI success — https://github.com/gbauto/vinyl-atlas/pull/2
- PR #1: open, clean, CI success — https://github.com/gbauto/vinyl-atlas/pull/1
- Merged recent PRs: none returned by gh at report time.

## Artifact policy

- Public-safe: this concise operator report and HTML surface only.
- Non-public: source validation receipts, raw YAML/JSON evidence, local Kanban run metadata, and full validator command logs remain local/internal.
- Never publish: raw audio/media, credentials, OAuth material, secret values, or unauthorized download/rip/extract content.
- D3 real-audio smoke remains deferred until lawful operator-supplied local audio exists; no substitute streamed/downloaded audio was used.

## Delivery proof required by E2

- Local report readback marker: VA_FULL_RERUN_E2_BUILD_REPORT_20260722.
- Source report path: artifacts/clients/gbautomation/vinyl-atlas-full-rerun/vinyl-atlas-full-rerun-build-report-20260722.md
- Source HTML path: artifacts/clients/gbautomation/vinyl-atlas-full-rerun/vinyl-atlas-full-rerun-build-report-20260722.html
- Artifact registry publication: recorded by the GBAuto artifact publisher receipt/output.
- Public URL: only valid after landing/Netlify publish exposes the registry copy; anonymous HTTP smoke should check this marker.
