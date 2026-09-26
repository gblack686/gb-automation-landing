---
description: Full {{EXPERT_TITLE}} ACT→LEARN→REUSE chain — draft a plan, execute approved steps with receipts, then self-improve expertise against the new live state.
allowed-tools: Read, Glob, Grep, Bash, Write, Edit
argument-hint: <change request>
type: expert-file
parent: "[[{{EXPERT}}/_{{EXPERT}}]]"
file-type: command
command-name: "plan_build_improve"
date: 2026-07-27
human_reviewed: false
tags: [expert-file, command, act-learn-reuse, human-gated, {{EXPERT}}-expert]
related:
  - "[[{{EXPERT}}/expertise]]"
  - "[[{{EXPERT}}/plan]]"
  - "[[{{EXPERT}}/self-improve]]"
---
# {{EXPERT_TITLE}} Expert - Plan / Build / Improve Adapter

> Composition entrypoint for the canonical `/plan` lifecycle followed by an
> approved build and evidence-backed self-improvement.

## Variables

REQUEST: $ARGUMENTS
EXPERTISE_PATH: experts/{{TREE}}/{{EXPERT}}/expertise.md
PLAN_ORIGIN: expert:{{TREE}}:{{EXPERT}}:plan_build_improve
ROUTE_DEPTH: 0
DELEGATED_TO_PLAN: false

## Stage 1 - Plan

1. Read `EXPERTISE_PATH` in full and prime its invariants, seams, and relevant
   current-state claims.
2. Set delegation metadata to `origin=PLAN_ORIGIN`, `route_depth=1`, and
   `delegated_to_plan=true`.
3. Delegate exactly once to `/plan $ARGUMENTS`.
4. **STOP for the canonical lifecycle's formal implementation approval.**
   Intake scope confirmation is not implementation authorization.

## Stage 2 - Build only after approval

5. Validate the bound `gbauto-plan-intake.v1` receipt and approved
   `architecture-artifact.v1`. Require the plan hash, architecture hash, base
   commit, authorized phases, and exclusions to match the current build.
6. Execute only the approved plan through the `tac-plan` Build workflow in an
   isolated worktree. Capture validation and readback receipts. If current
   state materially diverges, stop and return to `/plan`.

## Stage 3 - Improve

7. After the approved build is green, run this family's `self-improve` route
   against the new state.
8. Propose evidence-backed expertise changes and reusable Canopy or team assets
   through their own review gates.

Never treat a successful copy or command exit as completion. Never activate an
installed runtime, sync a live projection, or perform a destructive action
unless that exact action has separate operator authorization.
