---
type: expert-route
name: prime
file-type: command
command-name: prime
allowed-tools: Read, Bash, Grep, Glob
description: "Prime the {{EXPERT}} expert with bounded current context through the shared PRIME engine."
expert: "{{EXPERT}}"
tree: "{{TREE}}"
mode: read-only
status: active
human_reviewed: true
tags: [expert-route, prime-context, "{{EXPERT}}"]
---

# /experts:{{EXPERT}}:prime

Prime the **{{TREE}}/{{EXPERT}}** expert before domain work. Read `PRIME.md`
and `expertise.md`, then invoke `python scripts/prime_context_engine.py run`
with the tree-qualified expert profile. Return the bounded context plus its
`prime_context_receipt.v1` readback. This route is read-only and must never
copy PRIME policy, expose secrets, or mutate source/runtime state.

## Report outputs and seeded examples

Read `reports/outputs.yaml` in this expert family before report work. Follow its
`sample_library` pointer to `config/reports/sample-library.json`; read the
`discovery` links for the styled gallery, manifest, verified cloud receipt, and
restore guide. Resolve shared paths from the repository root. Use its
selected catalog outputs and primary specialized skills. Validate maintained
examples with `python scripts/validate_skill_samples.py` before changing a
selection or producing reports. Keep samples separate from actual outputs.

## Data surfaces

When present, read `data/surfaces.json` and its `data/README.md` before database
work. Find the rendered schema catalog under
`artifacts/schema-catalogs/{{TREE}}/{{EXPERT}}/index.html` and check `status.json`
for freshness and coverage. Treat incomplete/stale snapshots as evidence gaps.
The declaration and schema catalog do not grant database permissions.
