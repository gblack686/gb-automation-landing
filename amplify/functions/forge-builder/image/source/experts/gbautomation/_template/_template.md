---
type: expert
name: "{{EXPERT}}"
description: Banner page for the {{EXPERT_TITLE}} expert command set — {{ONE_LINE_DOMAIN}}. Routes are read-only Q&A, gated change plans, self-improve drift-check, install-sync, and maintenance.
domain: [{{EXPERT}}]
specialty: "{{EXPERT_TITLE}}"
status: active
date: 2026-07-27
created: 2026-07-27
updated: 2026-07-27
human_reviewed: false
tags: [expert, domain-expertise, {{EXPERT}}-expert]
related:
  - "[[{{EXPERT}}/expertise]]"
  - {{RELATED}}
---

# {{EXPERT_TITLE}} Expert

## Domain Overview

{{ONE_LINE_DOMAIN}}. Expand to a short paragraph: what this expert owns, where its
authority stops, and which neighbouring expert picks up on the other side of each seam.

## Expert Type

**{{Operations | Architecture | Delivery}} Expert** for {{EXPERT_TITLE}}. Pairs with
{{sibling experts}} at the {{named seam}}.

## Core Insight

> **Key Insight**: {{the one non-obvious thing that, if forgotten, causes the most
> expensive mistake in this domain}}

## Key Capabilities

- **{{Capability}}** — {{what it covers}}
- **{{Capability}}** — {{what it covers}}
- **{{Capability}}** — {{what it covers}}

## Route Index

| Route | Mode | Use when |
|---|---|---|
| `/experts:{{EXPERT}}:prime` | read-only context | You need current bounded context and a PRIME receipt before domain work. |
| `/experts:{{EXPERT}}:question` | read-only | You need an answer from the mental model, no changes. |
| `/experts:{{EXPERT}}:plan` | proposal | You want a change designed with risk, rollback, and gates. |
| `/experts:{{EXPERT}}:plan_build_improve` | gated ACT→LEARN→REUSE | An approved plan should be executed with receipts, then folded back. |
| `/experts:{{EXPERT}}:self-improve` | proposal | `expertise.md` may have drifted from live state. |
| `/experts:{{EXPERT}}:install` | gated apply | Sync this family from vault to the installed Claude Code surface. |
| `/experts:{{EXPERT}}:maintenance` | diagnostic | Drift is suspected between vault, installed copy, or live domain state. |

{{Add domain-specific verb routes here if this family has any.}}

## Ground Truth

`expertise.md` in this folder is the mental model every route reads. It is a model,
**not** domain truth — validate against these live sources before accepting changes:

- `{{SOURCE_PATHS}}`

## Hard Rules

- {{Invariant that must never be violated in this domain.}}
- Never print secrets, tokens, OAuth material, or `.env` values.
- Vault is the source of truth; `~/.claude/commands/experts/{{EXPERT}}/` is generated.
