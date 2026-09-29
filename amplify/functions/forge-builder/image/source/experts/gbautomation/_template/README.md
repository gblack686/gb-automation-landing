---
type: expert-template
name: "_template"
description: Canonical scaffold for a GBauto expert command family. Copy this directory, rename it, and fill every {{PLACEHOLDER}}. Not an installable expert — the installer skips underscore-prefixed directories.
status: active
created: 2026-07-27
updated: 2026-07-27
tags: [expert-template, scaffold, experts, install, maintenance]
related:
  - "[[tac-expert-tuneup]]"
  - "[[agent-install-and-maintenance]]"
---

# Expert Family Template

This is the **copy source** for every new or backfilled expert family. It exists so
new experts are scaffolded from one reviewed place instead of cloned from whichever
live family happened to look closest.

Ratified by Greg on 2026-07-27 and extended with the fleet PRIME/profile/sprint
contract on 2026-08-17: **every expert family ships its canonical command files,
an installable Hermes profile distribution, a sprint contract, and a justfile.**

## The ten required family files

GBAutomation profile generation also consumes `config/agent-operating-policy.yaml`.
The Forge scaffolder and expert-estate renderer project its role, operation scopes,
handoffs, shared planning pointers and public report destination into
`x_gbautomation_operating_context`. New specialists receive no domain database
operations until their exact profile has a reviewed binding. This is a source
contract; it does not install runtime permissions or grant database access.
The optional `data/` tree declares the expert's data footprint and connects it
to the maintained schema catalog. It does not grant database operations.


| File | Route | Purpose |
|---|---|---|
| `_{{EXPERT}}.md` | `/experts:{{EXPERT}}:_{{EXPERT}}` | Banner / MOC. Indexes the family, states the domain boundary, routes to siblings. |
| `expertise.md` | *(not a route)* | The numbered-Part mental model. **The pivot every other route reads.** |
| `prime.md` | `…:prime` | Refresh bounded current context through the shared PRIME engine and return a redacted receipt. |
| `question.md` | `…:question` | Read-only Q&A answered from `expertise.md`. Never mutates. |
| `plan.md` | `…:plan` | Propose a change with risk, rollback, and the approval gates it must clear. |
| `self-improve.md` | `…:self-improve` | Validate `expertise.md` against live sources; propose (never auto-apply) updates. |
| `plan_build_improve.md` | `…:plan_build_improve` | The full ACT→LEARN→REUSE chain: plan, execute approved steps with receipts, then self-improve. |
| `install.md` | `…:install` | Deterministic install-sync of this family to `~/.claude/commands/experts/`, then a receipt. |
| `maintenance.md` | `…:maintenance` | Drift detection between vault source, installed copy, and live domain state; targeted repair. |
| `graph.md` | `…:graph` | Query the graphify knowledge graph over the second brain for this domain — neighbors, similarity, orphans, freshness. Read-only. |

Plus one non-route file:

| File | Purpose |
|---|---|
| `justfile` | Operator entry points, **rendered from the §1F standard** (`scripts/render_expert_justfiles.py`; `--check` is a CI gate). Deterministic recipes (`check`, `install`, `install-dry`, `verify`, `drift`, `routes`, `test`, `audit`) run code and print facts; agentic recipes (`question`, `plan`, `improve`, `graph`, `maintain`, `pbi`) hand the same work to Claude through the routes; `remote-status` reads this family's Hermes profile on the Mini. Family-specific recipes go under `domain-verbs` — the only section a re-render preserves. Run `just --list` inside any expert folder. `test` is a bare `python scripts/expert_ci_gate.py --expert {{expert}} --replay` — see "Tests" below for what that actually measures. |

Plus three expert-owned configuration trees:

| Path | Purpose |
|---|---|
| `profile/` | Installable Hermes distribution (`distribution.yaml`, `SOUL.md`, `config.yaml`) for isolated expert sessions. |
| `reports/` | Catalog selections, primary specialized skills, and always-required seeded example policy. New experts start with empty selections; adapt them before report work. |
| `sprint/` | `expert-sprint.yaml` binding the expert profile, 25-proposal floor, logical lane, cards, and spreadsheet projection. |

Plus one optional, non-collected guidance tree:

| Path | Purpose |
|---|---|
| `quality/` | `README.md` + `behavior-cases.json.example` -- illustrative domain-positive / out-of-domain / invalid-input placeholders to adapt into a real, attributed `test_*.py`. Never a `tests/` doc, never a `test_*.py` file, never collected or executed by anything. See `quality/README.md` once scaffolded, or the copy-source at `experts/gbautomation/_template/quality/README.md`. |
| `data/` | `README.md` + `surfaces.json.example` to declare only the expert's connections, tables/views, selected skills and shared dependencies. Register a populated declaration for nightly and after-migration schema catalogs. |

Domain-specific verb routes (e.g. github's `start`/`land`, ecom's `triage`) are
**additive** — they never replace one of the ten required family files.

⚠️ **`just` uses `{{ }}` for its own interpolation**, the same token as these
scaffold placeholders. Placeholders are substituted at scaffold time, so anything
still in braces in a generated justfile is just(1) syntax — do not "fix" it.

## How to scaffold a new expert

First select the new expert's MTG printing with Greg using the canonical
[`agent-card-forge` skill](../../../resources/skills/agent-card-forge/SKILL.md).
Use the expert's name and purpose to find candidates. Its
[visual pipeline](../../../resources/skills/agent-card-forge/reference/expert-visual-pipeline.md)
owns the portrait, full-character 3D asset, bounded costs and expert-scoped
artifact handoff. Carry an existing approved selection forward. This authoring
rule does not change scaffold CLI validation, authorize model purchases, or
activate runtime assets.

```bash
EXPERT=my-expert
ROOT=experts/gbautomation   # or experts/consulting
cp -r "$ROOT/_template" "$ROOT/$EXPERT"
cd "$ROOT/$EXPERT"
mv _template.md "_$EXPERT.md"
rm README.md
# then replace every {{PLACEHOLDER}} in all files
grep -rn '{{[A-Z_]*}}' . --include='*.md'   # must return nothing when you are done
just --list                                # justfile must parse (its {{ }} are just(1) syntax)
```

Then install and verify:

```bash
bash scripts/install_experts.sh --check
bash scripts/install_experts.sh --apply "$EXPERT"
bash scripts/install_experts.sh --check      # must report IN-SYNC
```

## Placeholders

| Placeholder | Meaning | Example |
|---|---|---|
| `{{EXPERT}}` | Directory/route slug, kebab-case | `hermes-dashboard` |
| `{{EXPERT_TITLE}}` | Human title | `Data Contract Steward` |
| `{{TREE}}` | Source root | `gbautomation` or `consulting` |
| `{{ONE_LINE_DOMAIN}}` | What this expert owns, one sentence | `the RLS-private base / anon-safe obs_ view boundary` |
| `{{SOURCE_PATHS}}` | Live ground-truth paths this expert validates against | `supabase/migrations/, ops_schema_catalog` |
| `{{RELATED}}` | Wikilinks to the canonical docs | `[[gbauto-supabase-architecture]]` |

## Tests: what `just test` actually measures

`just test` inside a family folder runs
`python scripts/expert_ci_gate.py --expert {{expert}} --replay` — the same gate CI
runs. It does three things and only three things:

1. **Lint** — every `.py` under this family's own directory, plus anything the
   ownership registry (`config/agent-os/expert-ownership.yaml`) attributes to
   this expert's `owned_paths` even when that file lives elsewhere in the repo.
2. **Owned pytest modules** — every `test_*.py` the SAME registry entry
   attributes to this expert in `owned_paths` (any attributed `test_*.py` is
   supported: repo-root `tests/` is the common convention, e.g.
   `tests/test_{{EXPERT}}_<behavior>.py`, but the gate discovers the module by
   its `owned_paths` declaration, not by folder location).
3. **This family's own `tests/` replay** — if this directory ships a `tests/`
   subfolder of `*.md` docs (`## Prompt N:` / `**Question**` / `**Response**`
   blocks), `scripts/replay_expert_tests.py` structurally replays it: every doc
   must have at least one prompt block and every block must carry both a
   non-empty question and a non-empty expected response. This is optional —
   most families ship none — and it never calls a model in CI.

**Ownership is not readiness.** `config/agent-os/expert-ci-policy.yaml` graduates
experts onto a *required* list one at a time (only `youtube-intel` today); a
required expert that owns zero pytest modules fails the gate. But the gate can
only check that an *attributed* module exists and passes — a module that is
`def test_placeholder(): assert True` satisfies the gate's plumbing and asserts
nothing about this expert's real behavior. Do not conform an expert (add it to
`tests_required`) on the strength of a placeholder. Write a real assertion
against this expert's actual output before making that claim.

This family's scaffolded `quality/README.md` and
`quality/behavior-cases.json.example` (copied and placeholder-substituted by
`scripts/scaffold_expert_from_config.py`) give three illustrative starting
scenarios -- domain-positive, out-of-domain/no-match, invalid-input/boundary
-- to adapt into the real modules below. They are guidance only: not
collected, not executed, and proving nothing until authored for real.

Starter shapes to adapt, not commit as-is:

```python
# test_{{EXPERT}}_<behavior>.py  (any attributed location is fine -- e.g.
# repo-root tests/ -- then attribute it in
# config/agent-os/expert-ownership.yaml's owned_paths for this expert)
"""ADAPT ME: replace with a real assertion about {{EXPERT}}'s actual behavior
before this module is treated as evidence of readiness."""


def test_TODO_replace_with_a_real_domain_assertion():
    raise NotImplementedError(
        "starter stub from experts/gbautomation/_template/README.md -- "
        "write a real assertion, then delete this line"
    )
```

```markdown
<!-- experts/{{TREE}}/{{EXPERT}}/tests/<name>.md — structural replay doc.
     ADAPT ME: real question, real expected response. -->
## Prompt 1: <name this scenario>

**Question**: <a real question this expert must answer correctly>

**Response**: <the real expected answer — what "correct" means for this expert>
```

## Authoring rules

1. **`expertise.md` is the pivot.** Every other route reads it and cites it by
   section. Routes must not restate domain knowledge inline — that is how the two
   copies drift.
2. **Mental models are not domain truth.** Per the Agent Experts pattern, every
   claim in `expertise.md` must be checked against real code, schema, or runtime
   before a self-improve change is accepted.
3. **Read-only by default.** `question` never mutates. `plan` proposes.
   `self-improve` proposes. Only `plan_build_improve` and `install` may act, and
   only after explicit operator approval.
4. **Never print secrets** — no tokens, OAuth material, `.env` values, or key
   files in output, logs, or receipts.
5. **Vault is the source of truth.** `~/.claude/commands/experts/` is a generated
   copy. Never edit the installed copy as the durable source.
6. **A copy is not completion.** Completion requires a post-apply readback plus a
   durable receipt.
