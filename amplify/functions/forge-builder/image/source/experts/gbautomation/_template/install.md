---
description: Deterministically sync the {{EXPERT_TITLE}} expert family from the vault to the installed Claude Code surface, then write a receipt.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[--check | --apply]"
type: expert-file
parent: "[[{{EXPERT}}/_{{EXPERT}}]]"
file-type: command
command-name: "install"
date: 2026-07-27
human_reviewed: false
tags: [expert-file, command, install, install-sync, human-gated, {{EXPERT}}-expert]
related:
  - "[[agent-install-and-maintenance]]"
  - "[[{{EXPERT}}/maintenance]]"
---

# {{EXPERT_TITLE}} Expert — Install

> Deterministic code performs the sync; this route reads the result, explains failures,
> and writes a durable receipt. Implements the install-sync contract in
> [[agent-install-and-maintenance]] for the `{{EXPERT}}` family only.

## Usage

```
/experts:{{EXPERT}}:install            # read-only drift check (default)
/experts:{{EXPERT}}:install --apply    # sync vault -> installed, after approval
```

## Variables

MODE: $ARGUMENTS
EXPERT: {{EXPERT}}
SOURCE: experts/{{TREE}}/{{EXPERT}}/
DEST: ~/.claude/commands/experts/{{EXPERT}}/
INSTALLER: scripts/install_experts.sh
BACKUP_ROOT: ~/.claude/experts-backups/YYYYMMDD/{{EXPERT}}/

## Instructions

- **Read-only check is the default.** `--apply` requires explicit operator approval in
  the conversation; do not infer it from the argument alone if it was not requested.
- The **vault is the source of truth**; the installed copy is generated. Never edit the
  installed copy as the durable source, and never sync in reverse.
- **Do not overwrite installed-only knowledge.** If the installed copy contains files
  absent from the vault (the `expertise.yaml` case in openclaw — aws-org and supabase
  migrated to `expertise.md` on 2026-07-28), STOP.
  Promote that content into the vault through review first, then install.
- Scope every command to this family — pass the expert name, never a bare `--apply`.
- A successful copy is not completion. Completion = post-apply readback reports
  `IN-SYNC` **and** a receipt exists.
- Never print secrets or token material found in any file.

## Workflow

1. Confirm the checkout is clean and based on current `origin/main`.
2. Run the deterministic check, scoped to this family:
   ```bash
   bash scripts/install_experts.sh --check {{EXPERT}}
   ```
3. Record the full output and exit code. Classify as `IN-SYNC`, `MISSING`, or `DRIFTED`.
4. If `IN-SYNC`: report and stop. Nothing to do.
5. If `DRIFTED`: diff both directions. Determine whether the vault or the installed copy
   is newer. If the installed copy holds un-promoted knowledge, STOP and report — this
   is a `/experts:{{EXPERT}}:maintenance` case, not an install.
6. Obtain explicit operator approval for the apply.
7. Apply, scoped:
   ```bash
   bash scripts/install_experts.sh --apply {{EXPERT}}
   ```
   The installer backs the target up under `BACKUP_ROOT` before mirroring.
8. Re-run step 2. It must now report `IN-SYNC`.
9. Write the receipt.

## Report

| Field | Required value |
|---|---|
| Status | `SUCCESS`, `FAILED`, or `BLOCKED` |
| Expert | `{{EXPERT}}` |
| Source | Repo-relative source dir + commit SHA |
| Destination | Installed target dir |
| Before | `IN-SYNC`, `MISSING`, or `DRIFTED` |
| Action | Exact command run, or `none` |
| Backup | Backup path, or `not-created` |
| After | Readback result |
| Failures | Errors with actionable context |
| Next | The next safe operator action |
| Resume | Harness, session ID, checkout, resume command |
