---
description: Detect drift across the {{EXPERT_TITLE}} vault source, installed copy, and live domain state; propose targeted repair with a receipt.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[focus area]"
type: expert-file
parent: "[[{{EXPERT}}/_{{EXPERT}}]]"
file-type: command
command-name: "maintenance"
date: 2026-07-27
human_reviewed: false
tags: [expert-file, command, maintenance, drift-check, human-gated, {{EXPERT}}-expert]
related:
  - "[[agent-install-and-maintenance]]"
  - "[[{{EXPERT}}/install]]"
  - "[[{{EXPERT}}/self-improve]]"
---

# {{EXPERT_TITLE}} Expert — Maintenance

> Diagnostic route. Runs when repo sources change, the harness is upgraded, or a drift
> check fails. **Starts with a check, never with an apply.**

## Usage

```
/experts:{{EXPERT}}:maintenance [focus area]
```

## Variables

FOCUS: $ARGUMENTS
EXPERT: {{EXPERT}}
SOURCE: experts/{{TREE}}/{{EXPERT}}/
DEST: ~/.claude/commands/experts/{{EXPERT}}/
GROUND_TRUTH: {{SOURCE_PATHS}}

## Three drift axes

| Axis | Compares | Repaired by |
|---|---|---|
| **Install drift** | vault source ↔ installed copy | `/experts:{{EXPERT}}:install` |
| **Model drift** | `expertise.md` ↔ live domain state | `/experts:{{EXPERT}}:self-improve` |
| **Structural drift** | this family ↔ the 8-route standard | backfill the missing routes from `_template/` |

## Instructions

- Diagnose all three axes before recommending any repair; they have different fixes and
  are easy to confuse.
- **Never start with an apply**, and never run a broad `--apply` across all experts.
- If the installed copy holds knowledge absent from the vault, that content must be
  **promoted into the vault through review** — never preserved only in the generated
  target, and never silently overwritten.
- Report a human-readable result **even when the outcome is BLOCKED**. A blocked run
  with a clear reason is a success for this route.
- Never print secrets, tokens, or `.env` values.

## Workflow

1. **Install axis** — run the read-only check for this family:
   ```bash
   bash scripts/install_experts.sh --check {{EXPERT}}
   ```
   On `DRIFTED`, diff both directions and identify which side is newer.
2. **Structural axis** — list this family's route files and compare against the eight
   required routes. Note any missing route, and any file still carrying unfilled
   scaffold placeholders (double-brace tokens copied from `_template/`).
3. **Model axis** — spot-check `expertise.md` Part 1 sources: do they still exist at
   those paths? Is `last_validated` stale relative to recent changes in the domain?
4. Classify every finding by axis and by whether repair is mechanical or needs judgment.
5. Recommend the specific route that repairs each finding. Do not perform the repair
   here beyond lossless, explicitly-approved actions.
6. Write the result, including a `BLOCKED` reason if you stopped.

## Report

| Field | Contents |
|---|---|
| Status | `SUCCESS`, `FAILED`, or `BLOCKED` |
| Expert | `{{EXPERT}}` |
| Install drift | Check output + which side is newer |
| Structural drift | Missing routes; unfilled placeholders |
| Model drift | Stale/missing ground-truth sources; `last_validated` age |
| Un-promoted content | Installed-only files needing review before any install |
| Recommended repairs | Finding → the route that fixes it, in order |
| Next | The next safe operator action |
