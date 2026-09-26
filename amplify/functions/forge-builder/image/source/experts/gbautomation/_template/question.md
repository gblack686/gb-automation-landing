---
description: Read-only Q&A over the {{EXPERT_TITLE}} mental model — answered from expertise.md without making any changes.
allowed-tools: Read, Glob, Grep
argument-hint: <question>
type: expert-file
parent: "[[{{EXPERT}}/_{{EXPERT}}]]"
file-type: command
command-name: "question"
date: 2026-07-27
human_reviewed: false
tags: [expert-file, command, read-only, {{EXPERT}}-expert]
related:
  - "[[{{EXPERT}}/expertise]]"
---

# {{EXPERT_TITLE}} Expert — Question Mode

> Read-only. Answers questions about {{ONE_LINE_DOMAIN}} from the mental model. Makes
> no changes to files, config, or live state.

## Usage

```
/experts:{{EXPERT}}:question [question]
```

## Variables

USER_QUESTION: $ARGUMENTS
EXPERTISE_PATH: experts/{{TREE}}/{{EXPERT}}/expertise.md
GROUND_TRUTH: {{SOURCE_PATHS}}

## Instructions

- IMPORTANT: This is a question-answering task only. DO NOT modify any file, config,
  or live state. DO NOT run mutating commands.
- `expertise.md` is the ground truth for this route. **Cite it by Part number.**
- If the answer is not in `expertise.md`, say so explicitly rather than inventing one.
  An unanswered question is a `self-improve` finding — name it as such.
- If the question requires a change, explain the approach conceptually and point at
  `/experts:{{EXPERT}}:plan`. Do not start making the change.
- If the question is about live state, use read-only inspection only, and never print
  secrets, tokens, or `.env` values.
- Distinguish clearly between what the model *asserts* and what you *verified* this
  run. Mark unverified claims as such.

## Workflow

1. Read `EXPERTISE_PATH` in full.
2. Identify which Parts bear on the question.
3. If the question concerns live state, read back the relevant ground-truth source
   (read-only) and note any disagreement with the model.
4. Answer directly, citing Parts.
5. If you found model-vs-reality drift, end with a one-line drift note recommending
   `/experts:{{EXPERT}}:self-improve`.

## Report

Answer in prose, leading with the direct answer. Cite `expertise.md` Parts inline.
Close with: sources read, anything verified live this run, and any drift noticed.
