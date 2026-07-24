---
client: gbautomation
project: artifact-pipeline-enforcement
task_id: t_7409231c
artifact_kind: enforcement-audit
---

# GBAuto Artifact Pipeline Enforcement Audit

Task: `t_7409231c`

## Summary

This run audited TAC/report-producing paths for generated `.md`, `.html`, and `.pdf` artifacts that can bypass the canonical GBAuto artifact publisher.

Low-risk patch applied:
- `scripts/render_tac_report_package.py` now calls the canonical artifact publisher after generating TAC report deliverables.
- The call uses `/Users/greg/.hermes/skills/devops/gbauto-artifact-pipeline/scripts/artifact_publish_hook.py` when present, with an in-repo fallback for CI.
- The call runs `--dry-run --no-drive`, which still validates files, copies local registry/site mirror entries, and updates the manifest without external Drive/GCS writes.

Validation:
- `python3 -m pytest tests/test_render_tac_report_package.py -q` -> `2 passed`.
- `python3 -m py_compile scripts/render_tac_report_package.py /Users/greg/.hermes/skills/devops/gbauto-artifact-pipeline/scripts/artifact_publish_hook.py resources/skills/gbauto-artifact-pipeline/scripts/artifact_publish_hook.py` -> pass.

## Audited paths

### Patched

- `scripts/render_tac_report_package.py`
  - Writes TAC package Markdown, HTML, deployment report HTML/Markdown, PDF, SVG, email draft, and optional MP4.
  - Now calls the publisher after output generation.

### Bypasses still found

- `resources/lib/report_artifacts.py`
  - `render_build_artifacts()` writes build email/public HTML and result JSON under `~/.hermes/state/build-renders/`.
  - It records a predicted `public_url`, but does not read back an artifact registry entry.
  - This should become a shared publisher helper integration before Telegram/email can trust those URLs.

- `resources/skills/prd-render-and-email/scripts/render_build_report_html.py`
  - Calls `render_build_artifacts()` and inherits that bypass.

- `resources/skills/prd-render-and-email/scripts/email_build_report.py`
  - Calls `render_build_artifacts()` and can email before a registry/readback join exists.

- `scripts/render_jid5274_weekly_report_package.py`
  - Writes client-facing PDF, package Markdown/HTML, manifest JSON, charts, and email draft.
  - No canonical publisher call.
  - High sensitivity because it is client-facing and includes Jason/Carlos readiness context.

- `scripts/render_the_mall_client_report_package.py`
  - Writes package Markdown/HTML and manifest JSON.
  - No canonical publisher call.
  - Needs client slug/provenance frontmatter before any automated publishing.

- `resources/skills/report-package/scripts/render_collapsible_report.py`
  - Generic package renderer writes HTML and manifest JSON.
  - No publisher call.
  - Should probably expose a publish flag/helper, not auto-publish every local render.

- `resources/skills/sprint-manager/scripts/render_weekly_sprint_report.py`
  - Writes sprint report Markdown and manifest JSON.
  - No publisher call.

- `resources/skills/extract-session-todos/scripts/generate_report.py`
  - Writes client-facing session recap PDFs and fallback HTML.
  - No publisher call.

- `apps/transcript-app/legacy/extract-session-todos/scripts/generate_report.py`
  - Legacy copy of the same session recap PDF/HTML path.
  - No publisher call.

- `scripts/task_telegram_notify.py`
  - Message shape supports artifact links, but trusts `TaskEvent.artifacts` payloads.
  - It does not resolve artifacts through task_id/run_id/artifact_id/readback joins.
  - This is the primary Telegram deliverability risk: raw local paths or inferred URLs can leak into notifications if upstream payloads are weak.

## Enforcement plan

1. Keep renderer-level publisher calls safe by default:
   - local registry/site mirror only;
   - no Drive/GCS unless a trusted job sets explicit write env;
   - fail fast only for generated artifact validation errors.

2. Add a shared helper in `resources/lib` next:
   - normalize artifact paths;
   - call canonical hook;
   - return manifest entries by exact SHA/artifact_id readback;
   - include task_id/run_id/project/client metadata.

3. Move high-risk producers to the helper:
   - PRD/build report renderer first;
   - client weekly packages second;
   - transcript/session recap package third.

4. Harden Telegram notifications:
   - prefer `web_route`, Drive/GCS/GitHub/Netlify URLs, or native PDF/PNG attachments;
   - never infer links by filename/title;
   - require task_id/run_id/artifact_id/readback joins where possible;
   - degrade to “artifact registered but no public URL” rather than printing raw local paths.

5. Separate public publishing from registry publishing:
   - registry writes are normal report finalization;
   - Drive/GCS/Netlify public URLs need explicit trusted env and anonymous/readback verification.

## Provenance rule

Do not infer artifact links by filename or title similarity. Link only from deterministic joins: generated path -> sha256/artifact_id -> manifest entry -> verified public/native deliverable surface.
