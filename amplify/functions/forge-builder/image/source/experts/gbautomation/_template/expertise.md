---
type: expert-file
name: "{{EXPERT}}-expertise"
description: "{{EXPERT_TITLE}} mental model — {{ONE_LINE_DOMAIN}}. Ground truth every {{EXPERT}} route cites."
parent: "[[{{EXPERT}}/_{{EXPERT}}]]"
file-type: expertise
date: 2026-07-27
last_validated: 2026-07-27
human_reviewed: false
validated_against: []
tags: [expert-file, expertise, mental-model, {{EXPERT}}-expert]
related:
  - {{RELATED}}
---

# {{EXPERT_TITLE}} — Expertise

> The mental model every `{{EXPERT}}` route reads. Numbered Parts are stable citation
> anchors: routes cite "Part 3", not a line number.
>
> **This is a model, not domain truth.** Before any self-improve change is accepted,
> every claim here must be checked against the live sources in Part 1.

## Part 1 — Ground truth sources

The files, schemas, and runtime surfaces this model is derived from and must be
re-validated against. Each row is what `self-improve` and `maintenance` read back.

| Source | Path / surface | What it proves |
|---|---|---|
| {{source}} | `{{SOURCE_PATHS}}` | {{claim it grounds}} |

## Part 2 — The domain in one picture

{{A short structural description: the planes/stages/lanes of this domain and how they
connect. Prose or a mermaid diagram. Linear input→output flows use `flowchart LR`;
agent DAGs and large system maps stay `flowchart TD`.}}

## Part 3 — Core concepts

### {{Concept}}
{{What it is, why it exists, and the failure it prevents.}}

## Part 4 — Invariants

Rules that must hold. A violation is a bug, not a preference.

| # | Invariant | Why | How it is enforced |
|---|---|---|---|
| I1 | {{invariant}} | {{rationale}} | {{CI gate / hook / review}} |

## Part 5 — Boundaries and seams

Where this expert's authority stops and which expert takes over.

| Seam | This expert owns | Neighbour owns |
|---|---|---|
| {{seam}} | {{ours}} | {{theirs — [[other/expertise]]}} |

## Part 6 — Operating procedures

The canonical sequences for the recurring work in this domain. Each step names the
command, its gate, and its receipt.

## Part 7 — Failure modes and gotchas

Symptom → root cause → fix. Non-obvious traps that have actually bitten, with dates.

| Symptom | Root cause | Fix |
|---|---|---|
| {{symptom}} | {{cause}} | {{fix}} |

## Part 8 — Open questions

Unresolved items awaiting an operator ruling. Each names what is blocked on it.

- {{question}} — blocks {{what}}.
