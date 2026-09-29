# {{EXPERT_TITLE}} report outputs

Select the output IDs this expert needs in `outputs.yaml`, using the shared
report catalog and current template registry. Keep selection here; rendering,
report contracts, and immutable template approval remain with Report Manager.

Follow `outputs.yaml`'s `sample_library` pointer to
`config/reports/sample-library.json` before report work. Its `discovery` object
locates the styled gallery, manifest, and verified private cloud archive. Read
`config/reports/README.md` to restore the gallery when local artifacts are absent.
Resolve these paths from the repository root. New experts inherit this pointer;
keep archive identities in the shared config rather than copying them here.

Every selected output must resolve to a maintained `native_output` example in
its owning skill's `samples/manifest.yaml`. Declare only this expert's primary,
specialized skills in `primary_skills`; each must keep seeded examples under
the shared policy at
`resources/skills/_templates/seeded-examples.md`.

Run `python scripts/validate_skill_samples.py --expert {{TREE}}/{{EXPERT}}`.
Samples stay available alongside real outputs and never count as execution,
approval, or deployment evidence. Empty selection means no report workflow is
configured; it does not enable every catalog entry.

Shared supporting skills need an example only for explicitly selected outputs.
This requirement does not extend to every installed skill or dependency.

## Shared primary email example

For plan notification emails, use the maintained compact brief C sample at
`resources/skills/prd-render-and-email/samples/compact-brief.sample.html`.
Its sibling `README.md` supplies fictional input, provenance and validation.
These are repository-root paths. This pointer is inherited by new experts;
keep the artifact with its shared renderer rather than copying the HTML here.

The canonical template and style guide are
`second-brain/resources/templates/primary-email.md` and
`second-brain/systems/brand/gbauto-email-style-guide.md`.
Adapt declared agent/status/category metadata for the actual plan. The sample
is an email preview with a placeholder link, not a live report, execution record
or grant of send/approval authority. Referencing it does not select a report
workflow or add a primary skill to this expert's empty selection.
