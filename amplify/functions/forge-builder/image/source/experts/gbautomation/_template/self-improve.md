---
description: Validate {{EXPERT_TITLE}} expertise.md against live sources — deterministic pre-pass, canonical-fragment diffing, N-way triangulation — and propose (never auto-apply) updates.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[focus area]"
type: expert-file
parent: "[[{{EXPERT}}/_{{EXPERT}}]]"
file-type: command
command-name: "self-improve"
date: 2026-07-27
human_reviewed: false
tags: [expert-file, command, self-improve, drift-check, human-gated, {{EXPERT}}-expert]
related:
  - "[[{{EXPERT}}/expertise]]"
  - "[[{{EXPERT}}/maintenance]]"
  - "[[tac-expert-tuneup]]"
---

# {{EXPERT_TITLE}} Expert — Self-Improve Mode

> The LEARN step. Diffs the mental model against live reality and proposes updates.
> **Never writes to `expertise.md` without explicit operator approval.**

## Usage

```
/experts:{{EXPERT}}:self-improve [focus area]
```

## Variables

FOCUS: $ARGUMENTS
EXPERT: {{EXPERT}}
EXPERTISE_PATH: experts/{{TREE}}/{{EXPERT}}/expertise.md
GROUND_TRUTH: {{SOURCE_PATHS}}
CANONICAL_FRAGMENTS: (fill per expert) the artifacts that are UPSTREAM of a Part —
  e.g. `resources/skills/canopy/snippets/<snippet>.md`, `second-brain/systems/fleet-roster.yaml`,
  the owning `profile.yaml`. Drift against these has a direction: the fragment wins.
CONFLICT_RULE: (fill per expert) DECLARE ONE — either "no silent tiebreak: report the
  disagreement plainly" or a named authority (e.g. "the validation matrix wins for
  runtime facts"). A route that leaves this blank will silently pick a side.

## Scope boundary — this route owns ONE of three drift axes

| Axis | Compares | Owned by |
|---|---|---|
| **Model drift** | `expertise.md` ↔ live domain state | **this route** |
| Install drift | vault source ↔ `~/.claude` installed copy | `/experts:{{EXPERT}}:install` |
| Structural drift | this family ↔ the 9-route standard | `/experts:{{EXPERT}}:maintenance` |

Findings outside model drift are **named and handed off**, not fixed here.

## Instructions

- IMPORTANT: Read-only against `expertise.md`. Produce a diff proposal; do not apply it.
- **Never run a mutating validation.** No migration apply, no `install --apply`, no
  board write, no dispatch. Read-backs go through the sanctioned door only
  (`gbauto-supabase query` for Supabase, `mm.sh`/`mm2.sh` for the Minis).
- **Classify every check by cost before running any**: *free* (repo grep/read),
  *cheap-live* (read-only CLI or probe), *out-of-scope* (anything mutating). Run free
  first; spend cheap-live only where a free check cannot settle the question.
- The mental model is **not** domain truth. Verify against real code, schema, or
  runtime — never against another document that also restates the model.
- **Do not invent lessons.** Every finding cites evidence from a file, log, trace,
  test, or operator feedback. No evidence, no finding.
- Prefer removing a wrong claim over softening it. A hedged wrong claim still misleads.
- Prefer **one narrow durable improvement over a broad refactor**. Surgical section
  edits only — never a wholesale rewrite, and never broaden a gate because one run
  was messy.
- Mark unknowns `OPEN:` explicitly. Never guess, never silently omit.
- Never print secrets. Presence checks are `grep -c '^KEY='`, never `cat` of a secret
  file, never `bash -x`.

### Classification set

| Verdict | Meaning |
|---|---|
| `CONFIRMED` | Claim matches live state. |
| `DRIFTED` | Claim was true, live state moved. Propose the edit. |
| `STALE` | True when written, no longer relevant. Propose removal. |
| `UNVERIFIABLE` | Cannot be checked from here. Say why; mark `OPEN:`. |
| **`VIOLATION`** | **The live system is breaking its own invariant.** Not a documentation problem — a higher-severity finding about the world. Surface it loudly at the top of the report; never file it as `DRIFTED`. |

## Workflow

### Step 0 — Deterministic pre-pass (run BEFORE reading anything)

Cheap, exit-coded gates do the mechanical half. Paste raw output into the report and
begin reasoning from the *residue* — do not re-derive by hand what a script already proved.

```bash
just drift          # check_expert_source_drift.py --expert {{EXPERT}} — cited sources resolve?
just check          # install_experts.sh --check {{EXPERT}} — install axis (hand off, don't fix)
just routes         # structural axis (hand off, don't fix)
just test           # replay_expert_tests.py, if this family ships tests/
```

Also run, where relevant to this domain:
`python scripts/forest_gate.py --json` (F1 skill cap ≤15, F4 expert resolves) and
`python scripts/build_expert_canopy_map.py --check` (ownership map staleness).

### Step 1 — Bound the audit set

Read `expertise.md` frontmatter. Using `last_validated` / `validated_against`, diff each
ground-truth subtree from that point to now:

```bash
git log --oneline <recorded-ref>..HEAD -- <ground-truth-paths>
```

An empty diff for a subtree is a legitimate `CONFIRMED` **without re-reading it**. A
non-empty diff bounds exactly what must be read. This makes the run incremental and
provably complete for the interval — unbounded "read everything" is neither.

### Step 2 — Canonical-fragment diff (direction is known)

For each Part that is a *derived view* of a `CANONICAL_FRAGMENTS` artifact, diff the Part
against the fragment. **The fragment always wins** — no adjudication needed, the Part is
simply stale. Handle these before the ambiguous checks; they are free and decisive.

### Step 3 — Triangulate the rest

For each remaining checkable claim, gather every column that applies:

| Column | Source |
|---|---|
| Model says | `expertise.md`, cited by Part |
| Live says | read-only readback of the running system |
| Upstream says | vendored/upstream HEAD, package version, external API — catches changes the repo can never show you |
| Registry says | `fleet-roster.yaml` / `profile.yaml` / catalog rows |

Where three sources assert the same fact (the classic Part-table ↔ roster ↔ profile
triple), diff **all three**. On disagreement apply `CONFLICT_RULE` — and if that rule is
"no silent tiebreak", say so plainly in the report rather than picking.

### Step 4 — Outcome claims

For any claim asserting a rate, threshold, or cap, **recompute it** from logs, receipts,
or eval output and print measured-vs-claimed. Binary criteria only — never a subjective
score, never a stored baseline where a fresh one can be computed.

### Step 5 — Gaps and ownership

Find domain truth that exists in the repo or runtime but is **missing** from the model —
gaps count as findings. Then classify each finding by what should actually change:
*expertise Part / skill / script / docs / profile / observability / no-op*. A finding
that belongs to a skill is not an `expertise.md` edit.

### Step 6 — Rank and propose

Rank by cost-of-being-wrong, proxied concretely: how many routes cite that Part, and
whether any invariant (Forest F-check, CI gate, contract) depends on it.

Emit one **`status: proposed`** card per actionable finding with a deterministic id so
reruns upsert rather than duplicate:

```
task_id: {{EXPERT}}:self-improve:<stable-hash-of-finding>
kind:    self-improve
status:  proposed
```

Gate A reviews before any central mutation; Gate B before commit/merge.
**There is no auto-merge path.**

### Step 7 — Run until stable

Re-run Step 0 after proposals are applied by an approved route. Repeat until
discrepancies reach zero. A run that finds nothing is a legitimate outcome — receipt it
as `no_op`, never as silence.

## Report

| Section | Contents |
|---|---|
| **Live contract violations** | `VIOLATION` findings first, loudly. The live system breaking its own invariant. Empty if none. |
| Verdict | `improved` \| `no_op` \| `deferred` |
| Scope | What was checked; what was skipped and why; cost tier of each check run. |
| Deterministic pre-pass | Raw output/exit codes from Step 0. |
| Audit bounds | The ref/date range covered, and which subtrees were empty-diff `CONFIRMED`. |
| Verdict table | Claim → Part → Model / Live / Upstream / Registry → status → evidence path. |
| Canonical-fragment drift | Part ↔ fragment diffs, with the fragment as the winner. |
| Outcome claims | Measured vs claimed, for rate/threshold claims. |
| Gaps | Domain truth absent from the model. |
| Ownership | Findings that belong to a skill/script/profile, not to `expertise.md`. |
| Conflicts | Disagreements, and the `CONFLICT_RULE` applied. Never silently resolved. |
| Proposed cards | One per finding, `task_id` shown, all `status: proposed`. |
| Metadata | Whether `last_validated` / `validated_against` need updating. |
| Deferred | What was consciously not done, and who owns it next. |

End by stating that `expertise.md` is unchanged and listing exactly what would change
on approval.
