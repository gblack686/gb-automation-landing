# Quality fixtures (optional, non-collected -- not a `tests/` doc)

This directory is **authoring guidance**, not tests. Nothing here runs in CI,
is imported by pytest (`testpaths = tests` in `pytest.ini` only looks at the
repo-root `tests/` tree, never `experts/**`), or is replayed by
`scripts/replay_expert_tests.py` (which only reads a family's own `tests/`
directory of `.md` prompt/response docs -- `quality/` is a different name on
purpose, so it is never mistaken for that folder). `behavior-cases.json.example`
carries the `.example` suffix precisely so it is inert until an operator
renames and authors it.

## What's here

`behavior-cases.json.example` -- three illustrative scenario placeholders for
`{{EXPERT}}`: a **domain-positive** case, an **out-of-domain / no-match**
case, and an **invalid-input / boundary** case. Every `expected` value is
`null` (`expected_status: "UNIMPLEMENTED"`) on purpose.

## What this proves (nothing, yet)

This file existing -- or even being filled with realistic-looking `input`
text -- proves **nothing** about `{{EXPERT}}`'s actual behavior. It is a
starting shape for a human (or the expert's `self-improve` route) to adapt
into a real assertion. `just test`
(`python scripts/expert_ci_gate.py --expert {{EXPERT}} --replay`) never reads
this file. It is not in that trust chain until a real `test_*.py` module is
written and attributed, per the steps below.

## How to turn a case into evidence

1. Pick one scenario in `behavior-cases.json.example` (or add your own).
2. Write a real `test_{{EXPERT}}_<behavior>.py` module that asserts the
   *actual* behavior for that case, replacing the `null` / `"UNIMPLEMENTED"`
   expected value with a concrete, checked assertion. Any attributed
   `test_*.py` location is supported -- repo-root `tests/`, or elsewhere in
   the repo -- the gate discovers it through `owned_paths`, not by file
   location or folder convention.
3. Attribute that module's path in `config/agent-os/expert-ownership.yaml`'s
   `owned_paths` for `{{EXPERT}}`. An unattributed test module is invisible
   to the gate no matter where it lives.
4. Delete (or mark done) the corresponding case here once real coverage
   exists -- this file is a checklist toward readiness, not a permanent
   parallel record of it.

See `experts/gbautomation/_template/README.md`'s "Tests: what `just test`
actually measures" section for what the gate actually runs and why ownership
is not readiness.

## Routing evaluation

Add authored examples for `{{TREE}}/{{EXPERT}}` to the shared
`resources/tac/jev-routing-evaluation/dataset.v1.json`: two clear cases,
one neighboring-domain case, and at least one held-out clear case.
Use the existing expert and skill identities; do not copy their catalogs.
Run `python scripts/evaluate_jev_routing.py validate` before freezing a run.
See `docs/jev-routing-evaluation.md` for offline baseline and replay commands.
These cases measure routing labels; they do not prove domain behavior or
deployment readiness. Keep this scaffold's placeholders out of the benchmark.
