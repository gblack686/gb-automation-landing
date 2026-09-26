---
description: Propose a {{EXPERT_TITLE}} change with risk, rollback, validation, and the approval gates it must clear before any apply.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: <change request>
type: expert-file
parent: "[[{{EXPERT}}/_{{EXPERT}}]]"
file-type: command
command-name: "plan"
date: 2026-07-27
human_reviewed: false
tags: [expert-file, command, proposal, human-gated, {{EXPERT}}-expert]
related:
  - "[[{{EXPERT}}/expertise]]"
---
# {{EXPERT_TITLE}} Expert - Canonical Plan Adapter

> Compatibility entrypoint only. Durable planning is owned by
> `resources/skills/tac-plan/SKILL.md` and `/plan`.

## Variables

REQUEST: $ARGUMENTS
EXPERTISE_PATH: experts/{{TREE}}/{{EXPERT}}/expertise.md
PLAN_ORIGIN: expert:{{TREE}}:{{EXPERT}}:plan
ROUTE_DEPTH: 0
DELEGATED_TO_PLAN: false

## Workflow

1. Read `EXPERTISE_PATH` in full and identify relevant invariants, seams, and
   current-state claims. Treat it as priming context, not unquestioned truth.
2. Read back only the live sources needed to flag a material expertise mismatch
   before planning.
3. Set delegation metadata to `origin=PLAN_ORIGIN`, `route_depth=1`, and
   `delegated_to_plan=true`.
4. Delegate exactly once to `/plan $ARGUMENTS`. The canonical lifecycle owns
   repository priming, TAC reuse, the three-to-five-question intake, both
   provisional Mermaid diagrams, official artifacts, and approval gates.
5. Return the canonical lifecycle response. Apply no change from this route.

Do not copy a planning template into this file, create an official plan before
scope approval, or bypass the distinct implementation approval.
