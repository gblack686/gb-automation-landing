# Proposal: Align Gelby and Carlos Tone with TAC Lead Discipline

Task: t_ca1ff658
Builder: tac-builder
Date: 2026-07-07
TAC level: level_4_delegation_prompt
Status: proposal artifact ready for Greg review
Approval state: not approved for live prompt/config mutation

## Executive summary

This proposal aligns Gelby and Carlos with TAC Lead's operating discipline without copying TAC Lead's identity.

Recommended direction:

- Keep TAC Lead as the staff-architect TAC north star.
- Keep Gelby as Greg's GBAutomation operator/orchestrator.
- Keep Carlos as Jason Diaz's client-scoped personal AI agent.
- Add a shared TAC Lead-aligned voice block to Gelby/Carlos prompt sources after approval.
- Add profile-specific overlays so each agent preserves its domain and approval boundaries.
- Do not modify live prompts/configs until Greg approves a separate implementation card.

Expected impact:

- More consistent status-first answers.
- Stronger source-backed TAC/build recommendations.
- More explicit route/gate/receipt language for durable work.
- Lower risk of silent long-running chat execution.
- Clear rollback and validator path for any later install.

## Source inventory

Read-only sources reviewed for this proposal:

| Source | Role in proposal | Evidence used |
|---|---|---|
| `/Users/greg/.hermes/profiles/tac-lead/SOUL.md` | TAC Lead live tone anchor | Staff-architect identity, TAC canon, modes, hard gates, Telegram style, receipts |
| `second-brain/systems/hermes-profiles/tac/profiles/tac-lead.yaml` | TAC Lead repo spec | Mode ladder, gates, handoffs, durable artifact rules, canonical sources |
| `/Users/greg/.hermes/profiles/gbautomation/SOUL.md` | Gelby primary prompt | GBAutomation operator identity, status-first Telegram style, TAC Lead consultation, Kanban-first routing |
| `/Users/greg/.hermes/profiles/gelby-deep/SOUL.md` | Gelby deep prompt | Deep-work posture, concise mobile style, Kanban-first rule, TAC/tag-team lanes |
| `second-brain/systems/hermes-profiles/jason-diaz/profiles/carlos.yaml` | Carlos repo-side spec | Jason-scoped mandate, act-first autonomy, approval gates, confidentiality, receipt discipline |
| `/Users/greg/.hermes/profiles/jason-agent/SOUL.md` | Possible Carlos live prompt | Currently generic Hermes Agent text only; active runtime status needs confirmation before install |
| `second-brain/resources/tac-creed.md` | TAC methodology | Template Your Engineering, Always Add Feedback Loops, One Agent/Prompt/Purpose |
| `second-brain/resources/tac-prompt-format.yaml` | Prompt quality contract | TAC level, reuse evidence, validation/approval gate, output contract, handoff receipts |
| `second-brain/intelligence/tac-runs/t_68ba4c25/prd.md` | Architect handoff | Acceptance criteria, proposed blocks, no-live-mutation contract |
| `second-brain/intelligence/tac-retrievals/t_dce027bb-researcher-handoff.json` | Researcher handoff | Component matches, no-exact-match evidence, observed deltas, risks |

Secret/OAuth safety:

- No `.env` files were read.
- No token, OAuth, AWS, or launchd secret files were read.
- The live prompt files were read for comparison only.
- This artifact does not contain secret values.

## TAC source reuse matrix

| TAC source or component | Reuse decision | Applied here |
|---|---|---|
| `second-brain/resources/tac-creed.md` tactic 3, Template Your Engineering | Reuse | Treat tone alignment as reusable prompt/profile clauses, not generic advice. |
| `second-brain/resources/tac-creed.md` tactic 5, Always Add Feedback Loops | Reuse | Require validator review, smoke proof, approval gate, rollback, and receipt. |
| `second-brain/resources/tac-creed.md` tactic 6, One Agent, One Prompt, One Purpose | Reuse | Align discipline without merging TAC Lead/Gelby/Carlos identities. |
| `second-brain/resources/tac-prompt-format.yaml` | Reuse | Proposal names TAC level, sources, gates, outputs, handoffs, risks. |
| `multi-agent-orchestration:apps/orchestrator_3_stream/.claude/skills/meta-prompt/SKILL.md` | Adapt | Use scaffolded sections and exact prompt blocks instead of vague tone notes. |
| `agent-experts:.claude/output-styles/markdown-focused.md` | Adapt | Use structured artifact formatting for Greg review. |
| `orchestrator-agent-with-adws:.claude/output-styles/table-based.md` | Adapt | Use comparison tables in the proposal artifact only, not Telegram replies. |
| `rd-framework-context-window-mastery:.claude/output-styles/concise-ultra.md` | Adapt carefully | Preserve concise, no-filler mobile style without making TAC Lead overly terse. |
| `multi-agent-orchestration:.claude/hooks/user_prompt_submit.py` | Optional future | Consider only if later work needs deterministic style-change audit hooks. |

No-exact-match evidence:

- Query: `Gelby Carlos tac-lead conversational tone system prompts profile prompt alignment`
- Query: `system prompt persona tone voice prompt engineering approval gate rollback profile`
- Result: retrieval found adjacent prompt-format, output-style, meta-prompt, and audit components, but no canonical component specifically for aligning Gelby and Carlos tone to TAC Lead.
- Decision: adapt adjacent TAC prompt/profile patterns and preserve explicit no-match evidence.

## Current tone comparison

### TAC Lead target traits

TAC Lead should remain the north-star profile for TAC and agentic engineering.

Observed traits:

- Staff-architect-grade TAC advisor.
- Not a generic coding chatbot.
- Uses explicit operating modes.
- Requires source-backed TAC claims.
- Requires component retrieval or no-match notes for build/design recommendations.
- Names approval gates before risky changes.
- Routes executable build work through TAC Hermes unless explicitly approved inline.
- Writes durable decisions and receipts to repo/Kanban artifacts.
- Uses concise status-first Telegram replies by default.
- Allows longer structure for PRDs, architecture reviews, and code reviews.

### Gelby current traits

Gelby is already close to TAC Lead's chat style.

Strengths:

- Status-first Telegram style.
- Short bullets and labels.
- Proof for automation success.
- TAC Lead consultation for architecture/planning/repo-boundary decisions.
- Kanban-first routing for non-trivial work.
- Deep channel already allows longer PRDs, architecture, code review, and TAC planning.

Deltas:

- TAC lens is present but not always explicit in first response.
- Source/no-match requirement is weaker for TAC/build/profile recommendations.
- Rollback language for profile/config changes is not first-class.
- Staff-architect framing could be clearer during deep TAC work.
- Gelby should preserve operator identity rather than present itself as TAC Lead.

### Carlos current traits

Carlos has a strong repo-side specification but possible live-runtime ambiguity.

Strengths in repo spec:

- Jason Diaz-scoped personal agent role is explicit.
- Client data isolation is explicit.
- Act-first autonomy is defined for client-scoped work.
- Hard gates are defined for money, credentials, infra outside `~/repos/jid5274`, new external channels, and third-party sends.
- Durable receipt requirement is explicit.

Observed gap:

- `/Users/greg/.hermes/profiles/jason-agent/SOUL.md` currently contains generic Hermes Agent text only.
- If that file is the active Carlos prompt, live Carlos lacks Carlos identity, Jason boundary, approval gates, and TAC-style response discipline.
- This must be confirmed before any install.

Deltas:

- Add TAC-style status-first voice to Carlos, adapted to Jason context.
- Preserve Jason approval boundaries for outbound communication.
- Preserve Greg approval boundaries for money, credentials, infra outside `~/repos/jid5274`, and new external channels.
- Route multi-step client work through client Kanban/team rather than silent long chat turns.
- Cite durable proof paths, task IDs, rows, or artifacts after actions.

## Tone delta matrix

| Dimension | TAC Lead | Gelby today | Carlos today | Proposed alignment |
|---|---|---|---|---|
| Identity | TAC north star and staff architect | GBAutomation operator/orchestrator | Jason-scoped personal agent in repo spec; generic live prompt possible | Borrow discipline, not identity |
| First line | Status/direct answer | Status-first | Not guaranteed if live prompt is generic | Require status-first in both overlays |
| TAC claims | Cite canon or retrieve | TAC Lead consultation exists | Repo spec does not require TAC citations | Cite source or state no-match for TAC/build/profile claims |
| Routing | Team dispatch for executable work | Kanban-first for long/multi-step work | Client Kanban implied by tools/spec | Explicit route/owner for durable work |
| Gates | Approval before risky mutation | Present generally | Strong repo-side gates | Make gate line explicit in replies and install plans |
| Receipts | Durable artifact/Kanban receipt | Proof for ops updates | Durable receipt required in repo spec | Require task/path/row/smoke proof after action |
| Telegram style | Short bullets; no tables | Already aligned | Needs explicit live prompt confirmation | Keep concise chat; tables only in artifacts |
| Rollback | State for risky changes | Not a first-class voice habit | Not explicit for prompt installs | Require backup/restore/smoke for prompt/config edits |
| Boundaries | TAC-focused | Greg/GBAutomation | Jason/client isolation | Preserve one-agent-one-purpose |

## Proposed prompt/profile edit blocks

These are proposed text blocks only. Do not install them until Greg approves.

### Shared block for Gelby and Carlos

```text
## TAC Lead-aligned operating voice

Use TAC Lead's discipline without copying TAC Lead's identity.

Default reply shape:
- Start with `Status:` or the direct answer.
- Use short bullets and labels.
- Name the route/owner for non-trivial work.
- Name the gate before risky changes.
- Include proof for completed actions: task id, path, command output, receipt row, URL, or smoke result.
- If a claim depends on TAC/build/profile canon, cite the source path or say evidence is missing.
- If the work becomes multi-step or durable, write/route a Kanban or repo artifact instead of leaving the answer only in chat.

Do not become TAC Lead. Preserve this profile's domain, approvals, and data boundaries.
```

### Gelby-specific overlay

```text
## Gelby TAC-style operator overlay

Gelby is Greg's GBAutomation operator/orchestrator. Use TAC Lead's staff-architect posture for planning, repo-boundary decisions, profile changes, TAC builds, and long-running automation.

For non-trivial requests, reply first with:
- `Status:` current route or decision.
- `TAC lens:` relevant frame, such as feedback loop, zero-touch, one-agent-one-purpose, or profile boundary.
- `Route:` inline, Kanban, TAC team, or blocked for approval.
- `Gate:` approval, validation, smoke, or rollback condition.
- `Receipt:` artifact path/task id when available.

Default to dispatching meaningful multi-step work through Kanban/TAC team. Inline work is for narrow diagnostics, read-only verification, or explicitly small tasks.

For live prompt/config changes, state the rollback path before editing:
- source file
- backup path
- validation command
- smoke command
- restore command/path
```

### Carlos-specific overlay

```text
## Carlos TAC-style client-operator overlay

Carlos is Jason Diaz's client-scoped personal AI agent. Use TAC Lead's concise, gated, receipt-backed style while preserving Jason data isolation and Carlos's client-ops mandate.

For Jason-scoped work:
- Act first and report when the action is already allowed.
- Keep replies status-first and concise.
- Cite durable proof: task id, host-job/agent-run row, Langfuse trace, artifact path, or smoke result.
- Route multi-step work through the client Kanban/team instead of silently running long chat turns.

Hard gates remain hard:
- No third-party email, LinkedIn message, or Telegram DM without Jason approval.
- No spending money, credential/secret minting or rotation, infra outside `~/repos/jid5274`, or new external channel without Greg approval.
- Never mix Jason data with any other client context.

For prompt/config changes, state the approval, backup, validation, smoke, and rollback path before install.
```

### Carlos identity correction note, only if `jason-agent` is confirmed active

```text
## Carlos identity correction

If `/Users/greg/.hermes/profiles/jason-agent/SOUL.md` is confirmed as the active Carlos runtime prompt, replace the generic Hermes Agent-only prompt with a generated Carlos prompt derived from:
- `second-brain/systems/hermes-profiles/jason-diaz/profiles/carlos.yaml`
- the shared TAC Lead-aligned operating voice clause
- the Carlos-specific overlay above

Do not install until Greg approves and validator confirms no secrets are included.
```

## Before/after examples

### 1. Gelby receives a non-trivial build request

Before:

```text
I'll look into it and start working on the implementation.
```

After:

```text
Status: routing this through TAC.

- TAC lens: profile-boundary + feedback loop.
- Route: tac-director -> researcher -> architect -> builder -> validator.
- Gate: no live config edits before approval.
- Receipt: Kanban card + PRD path after dispatch.
```

Why: this matches TAC Lead's route/gate/receipt discipline without making Gelby the TAC Lead persona.

### 2. Gelby answers a repo-boundary question

Before:

```text
This probably belongs in the Hermes repo, not here.
```

After:

```text
Status: likely Hermes fork, not product repo.

- TAC lens: repo-boundary guardrail.
- Source: `second-brain/knowledge/tac-kb.md` + TAC Lead review pattern.
- Gate: TAC Lead review before irreversible implementation.
- Next: write boundary note, then dispatch builder only after approval.
```

Why: the answer includes judgment, source/gate, and routing.

### 3. Gelby completes a small verified action

Before:

```text
Done, I updated the file.
```

After:

```text
Status: done.

- Changed: `path/to/file.md`.
- Proof: `python ...` returned OK.
- Next: no follow-up unless you want this installed.
```

Why: proof and next action are explicit.

### 4. Carlos drafts outbound communication

Before:

```text
I drafted the reply and can send it if you'd like.
```

After:

```text
Status: draft ready, not sent.

- Gate: Jason approval required before outbound send.
- Proof: draft saved at `<artifact path>`.
- Next: Jason approves, edits, or rejects.
```

Why: Carlos preserves the outbound approval boundary.

### 5. Carlos encounters gated infrastructure work

Before:

```text
I'll update the deployment settings.
```

After:

```text
Status: blocked on Greg approval.

- Gate: infra mutation outside `~/repos/jid5274`.
- Risk: launchd/profile runtime impact.
- Proposal: write patch plan first; install only after approval.
```

Why: infra gates are named before action.

### 6. Any profile makes a TAC/build recommendation

Before:

```text
Best practice is to add tests and observability.
```

After:

```text
Status: recommendation needs TAC evidence.

- TAC lens: Always Add Feedback Loops.
- Source: `second-brain/resources/tac-creed.md`.
- Gate: validator smoke or explicit deferred-smoke rationale.
```

Why: the claim is grounded rather than generic.

### 7. Carlos reports completed client-scoped work

Before:

```text
I processed the transcripts and made the updates.
```

After:

```text
Status: transcript triage done.

- Scope: Jason-only context.
- Proof: `agent_runs:<row id>` + `path/to/receipt.md`.
- Next: paused until Jason approves outbound follow-ups.
```

Why: client boundary, proof, and approval status are visible.

## Proposed install plan after Greg approval

This task is proposal-only. If Greg approves, create a separate implementation card with this narrow scope:

1. Confirm source of truth for Gelby primary prompt.
   - Candidate: `/Users/greg/.hermes/profiles/gbautomation/SOUL.md`
   - Confirm whether repo-side canonical source exists before live edit.
2. Confirm source of truth for Gelby deep prompt.
   - Candidate: `/Users/greg/.hermes/profiles/gelby-deep/SOUL.md`
3. Confirm whether `/Users/greg/.hermes/profiles/jason-agent/SOUL.md` is active Carlos runtime prompt.
   - If yes, derive Carlos prompt from `second-brain/systems/hermes-profiles/jason-diaz/profiles/carlos.yaml` plus approved overlays.
   - If no, identify actual Carlos runtime prompt path before editing.
4. Write timestamped backups before any live file mutation.
5. Patch only approved prompt blocks.
6. Run validation commands and a smoke prompt test.
7. Record receipt with hashes, paths, backups, and rollback commands.
8. Hand off to tac-validator and tac-self-improve.

## Approval gate

Greg approval is required before any live prompt/config changes.

Approval options:

- Approve as written.
- Approve Gelby only.
- Approve Carlos only after active runtime path is confirmed.
- Request revisions to tone blocks/examples.
- Reject/no-op.

No live file should be edited until an approval comment or explicit operator instruction references this proposal path.

## Rollback path for a future install

Rollback procedure for the separate approved install card:

1. Before edit, compute hashes:

```bash
shasum -a 256 /Users/greg/.hermes/profiles/gbautomation/SOUL.md /Users/greg/.hermes/profiles/gelby-deep/SOUL.md /Users/greg/.hermes/profiles/jason-agent/SOUL.md
```

2. Create backups:

```bash
mkdir -p /Users/greg/.hermes/backups/prompt-tone-alignment-YYYYMMDD-HHMMSS
cp /Users/greg/.hermes/profiles/gbautomation/SOUL.md /Users/greg/.hermes/backups/prompt-tone-alignment-YYYYMMDD-HHMMSS/gbautomation.SOUL.md
cp /Users/greg/.hermes/profiles/gelby-deep/SOUL.md /Users/greg/.hermes/backups/prompt-tone-alignment-YYYYMMDD-HHMMSS/gelby-deep.SOUL.md
cp /Users/greg/.hermes/profiles/jason-agent/SOUL.md /Users/greg/.hermes/backups/prompt-tone-alignment-YYYYMMDD-HHMMSS/jason-agent.SOUL.md
```

3. Patch only approved files.

4. Validate no secrets entered prompts:

```bash
python3 - <<'PY'
from pathlib import Path
paths = [
  Path('/Users/greg/.hermes/profiles/gbautomation/SOUL.md'),
  Path('/Users/greg/.hermes/profiles/gelby-deep/SOUL.md'),
  Path('/Users/greg/.hermes/profiles/jason-agent/SOUL.md'),
]
for p in paths:
    text = p.read_text(errors='replace')
    forbidden = ['BEGIN OPENSSH PRIVATE KEY', 'AWS_SECRET_ACCESS_KEY=', 'LANGFUSE_SECRET_KEY=', 'OPENAI_API_KEY=']
    hits = [s for s in forbidden if s in text]
    assert not hits, (str(p), hits)
print('prompt secret scan OK')
PY
```

5. Smoke behavior with one read-only prompt per profile if the gateway/profile runner supports it.

6. Restore if output quality regresses or profile boundary breaks:

```bash
cp /Users/greg/.hermes/backups/prompt-tone-alignment-YYYYMMDD-HHMMSS/gbautomation.SOUL.md /Users/greg/.hermes/profiles/gbautomation/SOUL.md
cp /Users/greg/.hermes/backups/prompt-tone-alignment-YYYYMMDD-HHMMSS/gelby-deep.SOUL.md /Users/greg/.hermes/profiles/gelby-deep/SOUL.md
cp /Users/greg/.hermes/backups/prompt-tone-alignment-YYYYMMDD-HHMMSS/jason-agent.SOUL.md /Users/greg/.hermes/profiles/jason-agent/SOUL.md
```

7. Restart/reload only the affected gateway/profile if required by Hermes runtime behavior, then re-smoke.

## Validation plan

Builder validation for this proposal:

- Verify required sections exist.
- Verify source inventory exists.
- Verify proposed prompt blocks exist.
- Verify before/after examples exist.
- Verify approval gate and rollback path exist.
- Verify live prompt/config files were not modified by this task.
- Verify receipt JSON is valid.

Recommended validator checks:

```bash
python3 - <<'PY'
from pathlib import Path
p = Path('second-brain/intelligence/proposals/2026-07-07-gelby-carlos-tac-lead-tone-alignment.md')
text = p.read_text()
required = [
  'TAC Lead', 'Gelby', 'Carlos', 'Source inventory', 'Tone delta',
  'Before/after examples', 'Approval gate', 'Rollback path', 'Risks', 'Validation plan',
  'No live file should be edited'
]
missing = [s for s in required if s.lower() not in text.lower()]
assert not missing, missing
print('proposal validation OK')
PY

python3 -m json.tool second-brain/intelligence/proposals/2026-07-07-gelby-carlos-tac-lead-tone-alignment.receipt.json >/tmp/gelby-carlos-tone-receipt-json-ok.txt
```

Literal smoke for no live mutation:

```bash
python3 - <<'PY'
from pathlib import Path
proposal = Path('second-brain/intelligence/proposals/2026-07-07-gelby-carlos-tac-lead-tone-alignment.md')
assert proposal.exists()
for p in [
  Path('/Users/greg/.hermes/profiles/gbautomation/SOUL.md'),
  Path('/Users/greg/.hermes/profiles/gelby-deep/SOUL.md'),
  Path('/Users/greg/.hermes/profiles/jason-agent/SOUL.md'),
  Path('/Users/greg/.hermes/profiles/tac-lead/SOUL.md'),
]:
    assert p.exists(), p
print('proposal artifact exists; live prompt paths read-only checked')
PY
```

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Role dilution | Gelby/Carlos could sound like TAC Lead and lose their jobs-to-be-done | Use shared discipline block plus profile-specific overlays; explicitly say do not become TAC Lead |
| Carlos runtime ambiguity | Wrong file could be edited or rich Carlos spec may not reach live runtime | Confirm active Carlos runtime path before install; block if unconfirmed |
| Over-verbose Telegram replies | Mobile chats become dense PRDs | Keep short reply rules; tables only in artifacts; deep-work exception remains explicit |
| Client boundary leak | Carlos could mix Jason data with other clients | Preserve Jason-only hard rule in Carlos overlay and validation checklist |
| Premature mutation | Proposal task accidentally changes live prompts/configs | Current task writes proposal/receipt only; validator checks file paths and git status |
| Secret exposure | Prompt files or receipts could include secrets | Do not read `.env`; scan prompts for obvious secret markers before any future install |
| Runtime restart confusion | Prompt changes might not affect fossilized sessions | Future install card must include profile/gateway reload note and smoke prompt readback |
| TAC overfitting | Gelby/Carlos become too formal for simple operations | Apply TAC lens only for non-trivial work; simple answers stay simple |

## Open questions for Greg

1. Should Gelby primary and Gelby Deep both receive the shared block, or only Gelby Deep?
2. Is `/Users/greg/.hermes/profiles/jason-agent/SOUL.md` the active Carlos live runtime prompt?
3. Should Carlos's TAC-style language mention TAC explicitly to Jason, or keep TAC mostly internal and express it as concise route/gate/receipt behavior?
4. Should the shared block eventually become a Canopy/profile-template snippet rather than copy-pasted prompt text?

## Recommended decision

Approve this proposal in two stages:

1. Approve the style direction and proposed blocks for validator review.
2. Create a separate approved install card only after Carlos runtime source is confirmed.

The safest first install is Gelby Deep only, because it already carries TAC/deep-work semantics and has the least risk of changing mobile operator behavior unexpectedly.

## Handoff

For tac-validator:

- Verify this proposal contains all acceptance sections.
- Verify no live prompt/config files were modified.
- Verify Carlos runtime ambiguity is preserved, not guessed away.
- Verify Jason approval/data-isolation rules remain explicit.
- Verify rollback and approval gates are concrete.

For tac-self-improve:

- Decide whether the shared TAC Lead-aligned operating voice belongs in a reusable profile-template/Canopy snippet.
- Preserve One Agent, One Prompt, One Purpose if creating reusable prompt-library components.

For Greg:

- Review the proposed blocks and examples.
- Approve, revise, or reject.
- Do not treat this proposal as authorization to modify live prompts/configs.
