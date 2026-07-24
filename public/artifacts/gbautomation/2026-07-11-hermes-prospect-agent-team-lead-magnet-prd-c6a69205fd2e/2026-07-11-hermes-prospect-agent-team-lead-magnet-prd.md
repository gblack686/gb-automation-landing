---
title: Hermes Prospect Agent-Team Lead Magnet PRD
slug: hermes-prospect-agent-team-lead-magnet
status: draft_for_greg_review
created: 2026-07-11
owner: tac-lead
client: gbautomation
execution_route: profile-team
planning_only: true
implementation_approved: false
target_skill: hermes-prospect-agent-team-lead-magnet
prd_level: level_3_agent_team_prd
source_task: t_979a5452
retrieval_artifacts:
  knowledge: second-brain/intelligence/tac-retrievals/2026-07-11-hermes-prospect-agent-team-lead-magnet-knowledge.json
  components: second-brain/intelligence/tac-retrievals/2026-07-11-hermes-prospect-agent-team-lead-magnet-components.json
historical_evidence:
  prior_card: gbautomation/t_5ead7b82
  prior_session: '@session:default/20260706_215500_0ea775'
  prior_missing_plan: second-brain/plans/2026-07-06-hermes-agent-team-lead-magnet-prd.md
  platinum_session: '@session:default/20260623_062528_f50c29d0'
  platinum_commit_checked: c4ba3c8308d3def381d80a116dd978f9458edcce
approval_gate: Greg must approve this PRD before any build, Netlify preview, outreach send, or 14-day activation.
---

# Hermes Prospect Agent-Team Lead Magnet PRD

## 1. Request summary

Build a reusable, TAC-grounded lead-magnet workflow that turns a prospect company URL plus optional person/context/outcome into a polished, prospect-specific interactive page: "I drafted a custom Hermes agent team for your business. If useful, I can activate it for a guided 14-day walkthrough."

This document is planning only. It intentionally does not implement, deploy, publish, email, or activate the lead magnet. Greg approval is required before build dispatch.

Required saved artifact path:

`/Users/greg/repos/gbautomation/second-brain/plans/2026-07-11-hermes-prospect-agent-team-lead-magnet-prd.md`

## 2. Recovery notes and verified history

What was recovered:

- The task references prior card `gbautomation/t_5ead7b82`. A session search found the live prior worker session as `@session:default/20260706_215500_0ea775`, started by `work kanban task t_5ead7b82` and ended with a claim that the plan was saved to `second-brain/plans/2026-07-06-hermes-agent-team-lead-magnet-prd.md`.
- Disk verification in this run found that prior plan path is absent from `/Users/greg/repos/gbautomation/second-brain/plans/`.
- The original source session id in the card, `@session:default/20260706_074621_af05b012`, was not found in the current default session database, so this PRD cites the recovered matching session `20260706_215500_0ea775` instead.
- The Platinum Angel session `@session:default/20260623_062528_f50c29d0` exists. The full read was large and not directly about this lead magnet in the first returned bookends, so this PRD treats it as historical context, not as direct product evidence.
- Commit `c4ba3c8308d3def381d80a116dd978f9458edcce` was verified with `git show --name-only`. It is a broad WIP parking commit and did not show `tac-team-deck-index.html` in the first 200 file names inspected. A repo-local file search for `*tac-team-deck-index*` returned no tracked file in `gbautomation`.

Historical conclusion:

- The previous plan should be treated as lost or not persisted in this checkout.
- This PRD materially upgrades the concept from a one-off landing page into a reusable Hermes skill package plus agent-team implementation graph with explicit proof, brand, logo, image, privacy, and approval gates.

## 3. Goals

1. Produce a reusable skill package spec named `hermes-prospect-agent-team-lead-magnet`.
2. Generate a prospect-specific Hermes agent-team lead magnet from public facts only.
3. Use GBAutomation Hermes profile conventions as structural references without copying secrets, chat ids, tokens, OAuth files, private paths, or client data.
4. Produce a branded interactive `index.html` entry page with smooth scroll, anchors, progress indicator, responsive mobile behavior, and print/PDF brief option.
5. Include a coherent Image 2.0 visual set with source-fact fingerprints, provenance, and fallback HTML/SVG rendering.
6. Require public-source citations for company facts, logo/brand asset verification, and claim substantiation before any prospect-visible artifact is approved.
7. Define a 14-day guided trial lifecycle with explicit activation, observability, expiry, shutdown, and optional conversion gates.
8. Register run/output receipts through the GBAutomation observability stack in the later implementation.

## 4. Non-goals

- Do not implement or deploy the landing page in this planning card.
- Do not send outreach to any prospect.
- Do not activate a Hermes profile, bot, workspace, channel, or trial.
- Do not expose live GBAutomation config, credentials, chat ids, private client paths, private memory, or internal customer data.
- Do not imply partnership with Hermes, Nous Research, or the prospect company.
- Do not fabricate logos, facilities, employees, customers, quantified outcomes, operational workflows, or product screenshots.
- Do not use OpenRouter as primary or fallback for this workflow. Codex-only model routing is required.

## 5. TAC level and tactics

TAC level: `level_3_agent_team_prd`.

Reason: the project spans research, brand verification, profile architecture, external-facing copy, generated imagery, frontend assembly, browser validation, security review, publication gating, and trial lifecycle operations. It requires a multi-agent team, not a solo prompt.

Relevant TAC tactics from `second-brain/resources/tac-creed.md` and `second-brain/knowledge/tac-kb.md`:

- Stop Coding: Greg should command a reusable agent-team workflow rather than handcraft pages.
- Adopt Your Agent's Perspective: the build agents need public facts, brand tokens, logo rules, profile schema, and explicit no-fabrication examples because every agent starts brilliant but blind.
- Template Your Engineering: the lead magnet must become a repeatable skill, not a one-off page.
- Stay Out The Loop: the eventual flow uses PITER: Prompt/intake, Trigger/approved build card, Environment/isolated worktree, Review/Netlify preview plus receipts.
- Always Add Feedback Loops: validation gates cover citations, brand, logo license, image provenance, browser console, responsive screenshots, CTA smoke, Supabase receipts, and Langfuse readback.
- One Agent, One Prompt, One Purpose: split research, logo, profile architecture, copy, fabrication guard, visuals, frontend, validators, and release into separate roles.
- Target Zero-Touch Engineering: after approval, the skill should run out-loop through Hermes Kanban and eventually support zero-touch drafts with human approval gates.
- Prioritize Agentics: the durable deliverable is the reusable agentic layer that creates many lead magnets, not only one page.

## 6. Source-backed grounding

Canonical sources consulted:

- `second-brain/knowledge/tac-kb.md`: compiled TAC KB, 40 repos, 1518 components reported in the current file header.
- `second-brain/resources/tac-creed.md`: 8 tactics, Core Four, 12 Leverage Points, PITER, R&D, ACT-LEARN-REUSE.
- `second-brain/systems/hermes-profiles/tac/team.yaml`: TAC Hermes profile team, model-tier routing, hard gates, observability contract.
- `second-brain/systems/hermes-profiles/tac/profiles/tac-lead.yaml`: TAC Lead operating modes and source requirements.
- `resources/skills/tac-cli/SKILL.md`: TAC CLI contract, retrieval receipts, team dispatch packet, TAC Hermes profile source paths.
- `second-brain/systems/brand/gbauto-brand-tokens.md`: canonical GBAutomation visual tokens, component idiom, Image 2.0 fingerprint pointers.
- `second-brain/knowledge/domains/gbautomation/hermes-profile-creation-tac-pattern.md`: local Hermes profile creation pattern.
- `second-brain/knowledge/domains/gbautomation/hermes-report-manager-profile-architecture.md`: report-manager profile architecture precedent.
- Live landing style sources verified as present: `/Users/greg/repos/gb-automation-landing/src/components/Hero.jsx`, `Pricing.jsx`, `Features.jsx`, and `src/index.css`.

Retrieval receipts:

- Knowledge retrieval: `second-brain/intelligence/tac-retrievals/2026-07-11-hermes-prospect-agent-team-lead-magnet-knowledge.json`
  - `schema_version: tac-knowledge-query.v1`
  - `components_scanned: 1189`
  - `match_count: 1163`
  - `results: 20`
- Component retrieval: `second-brain/intelligence/tac-retrievals/2026-07-11-hermes-prospect-agent-team-lead-magnet-components.json`
  - `schema_version: tac-component-retrieval.v1`
  - `components_scanned: 1518`
  - `match_count: 334`
  - `returned: 50` in command stdout

Selected reuse and adaptation notes:

- `lead-agents:.claude/commands/plan-w-team.md` from TAC KB results: adapt the planning-only team decomposition pattern so the skill first drafts a team and brief before frontend build begins.
- `agentic-finance-review:.claude/settings.json` and related permissions-profile matches: adapt the permissions-boundary idea for zero-touch trial drafts, not the literal settings file.
- `claude-code-hooks-multi-agent-observability:.claude/settings.json`: adapt lifecycle observability and hook-based receipt ideas for the build receipts and trial run receipts.
- `multi-agent-orchestration:.claude/agents/playwright-validator.md`: adapt the browser validator role for desktop/mobile screenshots, console checks, anchor navigation, CTA smoke, and print/PDF check.
- `building-specialized-agents:.claude/commands/experts/cc_hook_expert/cc_hook_expert_build.md`: adapt the meta-prompt/scaffold pattern for generating the reusable Hermes skill package and validation hooks.
- `multi-agent-orchestration:apps/orchestrator_db/migrations/0_orchestrator_agents.sql`: adapt the durable agent/run schema concept for Supabase skill-run and output registration.
- `resources/skills/tac-cli/SKILL.md`: use the TAC CLI contract and retrieval receipt pattern as the read-only core under any future Telegram/MCP/HTTP adapter.
- `second-brain/systems/hermes-profiles/tac/team.yaml`: use TAC Hermes model-tier routing and hard gates as the team profile precedent.
- `second-brain/systems/brand/gbauto-brand-tokens.md`: use as sole GB visual source of truth; do not copy token values into the skill as a stale theme file.

No-match evidence:

- TAC inventory retrieval did not return an exact existing component for "prospect-specific Hermes agent-team lead magnet landing page" or "Image 2.0 prospect team visual generator." This is a build-new skill with adapted TAC components.
- Repo search did not find a current tracked `tac-team-deck-index.html` in `gbautomation`; any prior deck index should not be cited as available unless recovered separately.

## 7. Product concept

Input:

```yaml
schema_version: hermes-prospect-intake.v1
company_url: https://example.com
prospect:
  name: Jane Doe
  title: COO
  public_profile_url: https://www.linkedin.com/in/example
optional_context:
  - "Met through referral"
  - "Interested in operations automation"
desired_business_outcome: "Reduce manual follow-up and surface daily operational exceptions."
risk_level: external_prospect_preview
approval_mode: human_required_before_publish
```

Output package:

```text
/prospects/<slug>/
  index.html
  team-brief.md
  team-brief.pdf
  research-citations.json
  claim-map.json
  logo-verification.json
  image-provenance.json
  sanitized-hermes-team.yaml
  validation-receipt.json
  screenshots/
    desktop.png
    mobile.png
```

Core promise:

- "Here is a researched, custom Hermes agent team draft for your business. It is not active yet. If it looks useful, GBAutomation can activate a guided 14-day walkthrough with approval gates and a clean expiry path."

## 8. Prospect journey and information architecture

Entry page sections:

1. Personalized hero
   - Prospect/company name.
   - One-sentence custom team thesis.
   - CTA: "Review the drafted team" and secondary CTA: "Book the 14-day walkthrough."
   - Safety line: "Draft only. No systems connected. No accounts accessed."
2. Verified company snapshot
   - Public facts, citations, logo source, business model, visible operational surfaces.
   - Confidence labels: verified, inferred, needs call.
3. Opportunity map
   - Three to five operational opportunities derived from public facts and the stated desired outcome.
   - No invented metrics.
4. Proposed lead agent
   - One named lead agent role, its mission, model tier, approval boundary, and daily report shape.
5. Specialist-agent team
   - Required roles: customer-ops scout, inbox/CRM analyst, workflow mapper, proof/claims guard, reporting agent, escalation coordinator, etc. Actual role names vary by prospect.
6. Agent interactions and workflow
   - DAG or swimlane: intake signals -> specialist analysis -> lead synthesis -> approval gate -> daily brief -> escalation.
7. Safeguards and approval gates
   - Public-only research, no private access, draft-only profile, human approval before external action, trial expiry.
8. Example daily experience
   - Morning brief sample, exception report, approval request, weekly review, end-of-trial report.
9. Image 2.0 visual set
   - Coherent visuals with verified fact fingerprints and fallback rules.
10. 14-day trial plan
   - Day-by-day guided activation, checkpoints, expiry, export, and shutdown.
11. CTA
   - Book call, approve preview, ask for revision, or decline.
12. Print/download team brief
   - PDF or print-friendly brief for decision makers.

Interaction requirements:

- Sticky or compact anchor navigation.
- Smooth scroll between sections.
- Progress indicator tied to section scroll depth.
- Mobile nav collapse with readable cards and no horizontal overflow.
- Accessible heading order, landmarks, focus states, and reduced-motion fallback.
- CTA smoke path that records only approved test submissions in preview mode.

## 9. Reusable Hermes skill package spec

Skill name:

`hermes-prospect-agent-team-lead-magnet`

Target location after approval:

`/Users/greg/repos/gbautomation/resources/skills/hermes-prospect-agent-team-lead-magnet/`

Proposed package tree:

```text
resources/skills/hermes-prospect-agent-team-lead-magnet/
  SKILL.md
  references/
    workflow.md
    public-research-citation-policy.md
    logo-and-brand-asset-policy.md
    hermes-profile-sanitization-policy.md
    image2-provenance-policy.md
    fabrication-guard-policy.md
    netlify-preview-and-approval-policy.md
    trial-lifecycle-policy.md
    gbauto-brand-source-pointer.md
  templates/
    intake.schema.json
    research-citations.schema.json
    claim-map.schema.json
    logo-verification.schema.json
    image-provenance.schema.json
    sanitized-hermes-team.schema.json
    lead-magnet-page.spec.md
    team-brief.md.j2
    prospect-index.html.j2
    validation-receipt.schema.json
    implementation-card.yaml.j2
  scripts/
    run_intake.py
    research_company.py
    verify_logo_asset.py
    generate_team_manifest.py
    substantiate_claims.py
    generate_image_prompts.py
    assemble_index.py
    render_team_brief.py
    validate_lead_magnet.py
    smoke_preview.py
    publish_preview.py
    expire_trial.py
  assets/
    README.md
    placeholder-logo-lockup.svg
    deterministic-visual-fallbacks/
      hero-world.svg.j2
      team-collaboration.svg.j2
      industry-workflow.svg.j2
```

SKILL.md required sections:

- Purpose.
- Variables.
- Inputs and scope gates.
- Workflow steps 1 through 12.
- Output contract.
- Validation gates.
- Approval gates.
- Receipts and observability.
- Safety and no-fabrication rules.
- Related source pointers.

The skill must point to canonical brand tokens instead of copying them:

- `second-brain/systems/brand/gbauto-brand-tokens.md`
- `resources/skills/get-gbauto-theme/references/gbauto-component-prompt-packet.md`
- `resources/skills/get-gbauto-theme/references/gbauto-image2-fingerprints.md`

## 10. Sanitized Hermes team-config schema

The lead magnet must not generate a runnable live config by default. It generates a sanitized prospect manifest that can later be transformed into a real profile only after activation approval.

```yaml
schema_version: prospect-hermes-team.v1
prospect:
  company_name: string
  company_url: string
  prospect_person: string | null
  desired_business_outcome: string
  public_sources:
    - url: string
      title: string
      accessed_at: string
      facts_supported:
        - fact_id: string
team:
  lead_agent:
    id: string
    display_name: string
    purpose: string
    model_tier: sol
    tools: []
    skills: []
    memory_scope: draft_only_no_private_memory
    approval_boundaries:
      - no_external_messages_without_human_approval
      - no_account_actions_without_activation
  specialist_agents:
    - id: string
      display_name: string
      purpose: string
      model_tier: luna | terra | sol
      tools: []
      skills: []
      inputs: []
      outputs: []
workflow:
  trigger: manual_preview_generation
  kanban_owner: lead-magnet-orchestrator
  daily_report_shape: string
  escalation_rules: []
channels:
  preview_surface: static_netlify_preview
  messaging: none_until_activation
  chat_ids: redacted_not_collected
observability:
  langfuse_tags:
    - runtime:hermes
    - surface:prospect-lead-magnet
  supabase_run_table: skill_runs
  supabase_output_table: skill_outputs
trial:
  status: draft | preview_approved | active | expired | converted | shut_down
  starts_at: null
  expires_at: null
  shutdown_action: revoke_channels_and_archive_receipts
safety:
  secrets_policy: no_secrets_no_oauth_no_private_paths
  data_policy: public_research_only_until_activation
  publication_policy: netlify_preview_only_before_human_approval
```

Model policy:

- Sol: architecture, personalization synthesis, final proof review, self-improvement.
- Terra: implementation, frontend assembly, validators, bounded debugging.
- Luna: deterministic research packaging, citation extraction, monitoring, release mechanics.
- Provider: `openai-codex` only.
- No OpenRouter primary or fallback.

## 11. Required agent team

Mandatory build team for later approval:

1. `scaffold-agent`
   - Model tier: Terra.
   - Purpose: create package skeleton, schemas, tests, and deterministic script stubs.
   - Gate: no build proceeds until required folders and validation entrypoints exist.
2. `docs-research-agent`
   - Model tier: Luna.
   - Purpose: fetch and cache current docs for Netlify CLI, browser validation, PDF/print renderer, logo verification sources, and Image 2.0 provider interface.
   - Gate: docs stored under `ai_docs/` with source URLs and access timestamps.
3. `lead-magnet-orchestrator`
   - Model tier: Sol.
   - Purpose: coordinate specialists, enforce one-agent-one-purpose, write final build report, and stop at approval gates.
4. `company-research-agent`
   - Model tier: Luna.
   - Purpose: collect public company facts, business model evidence, visible ops surfaces, and citations.
   - Gate: every fact maps to `research-citations.json`.
5. `workflow-opportunity-architect`
   - Model tier: Sol.
   - Purpose: translate verified facts into operational opportunity hypotheses and prospect-specific workflows.
   - Gate: label each item verified, inferred, or needs-call.
6. `hermes-profile-architect`
   - Model tier: Sol.
   - Purpose: produce sanitized manifest using GBAutomation Hermes profile conventions as structure only.
   - Gate: no secrets, chat ids, private paths, OAuth hints, client data, or live profile writes.
7. `copywriting-agent`
   - Model tier: Terra.
   - Purpose: write prospect-facing copy with cautious, specific, non-fabricated claims.
   - Gate: all claims appear in `claim-map.json`.
8. `proof-vetting-fabrication-guard-agent`
   - Model tier: Sol.
   - Purpose: block invented metrics, partnerships, customers, workflows, logos, facilities, results, or live capabilities.
   - Gate: FABRICATED verdict blocks preview.
9. `brand-and-logo-agent`
   - Model tier: Terra.
   - Purpose: verify company logo source/license guidance and GB brand fidelity.
   - Gate: if logo rights are unclear, use text lockup; if Hermes asset guidance is unclear, use text attribution only.
10. `image-2-visual-agent`
    - Model tier: Terra.
    - Purpose: generate coherent Image 2.0 prompts and provenance receipts for the visual set.
    - Gate: no images depicting unverified people, facilities, products, customers, or results.
11. `frontend-experience-agent`
    - Model tier: Terra.
    - Purpose: assemble `index.html`, interactions, print/PDF path, and responsive UI.
    - Gate: desktop/mobile screenshots, console clean, anchor nav, progress indicator, no horizontal overflow.
12. `security-privacy-validator`
    - Model tier: Terra.
    - Purpose: scan for secrets, private paths, chat ids, tokens, OAuth, raw client data, and unsafe outbound claims.
    - Gate: no-secret report must pass before preview.
13. `browser-accessibility-validator`
    - Model tier: Terra.
    - Purpose: browser smoke, mobile smoke, accessibility, console, CTA/form test, print/PDF test.
    - Gate: zero browser-console errors and screenshots attached.
14. `release-receipt-agent`
    - Model tier: Luna.
    - Purpose: prepare Netlify preview only after approval, collect receipts, readback deployed content type, and register outputs.
    - Gate: no production route, no prospect send, no activation without a second explicit gate.

## 12. Implementation graph for later approval

Do not dispatch these cards until Greg approves this PRD.

```yaml
schema_version: hermes-kanban-implementation-graph.v1
board: gbautomation
root:
  title: "Implement Hermes prospect agent-team lead magnet skill"
  assignee: tac-director
  workspace_kind: worktree
  repo: /Users/greg/repos/gbautomation
  gate: Greg approval of this PRD
cards:
  - id: phase_0_scaffold
    title: "Scaffold reusable lead-magnet skill package"
    assignee: tac-builder
    model_tier: terra
    parents: [root]
    outputs:
      - resources/skills/hermes-prospect-agent-team-lead-magnet/SKILL.md
      - references/templates/scripts/assets skeleton
    acceptance:
      - package tree matches PRD
      - scripts import under Python runtime selected by repo
      - schemas parse
  - id: phase_0_5_docs
    title: "Research current docs for Netlify, browser/PDF, logo, Image 2.0"
    assignee: tac-researcher
    model_tier: luna
    parents: [root]
    outputs:
      - ai_docs/netlify.md
      - ai_docs/browser-validation.md
      - ai_docs/logo-verification.md
      - ai_docs/image2.md
  - id: phase_1_research_pipeline
    title: "Build public company research and citation pipeline"
    assignee: tac-builder
    model_tier: terra
    parents: [phase_0_scaffold, phase_0_5_docs]
    acceptance:
      - public URLs only
      - citations schema populated
      - no login or private surfaces
  - id: phase_2_profile_and_claims
    title: "Build sanitized Hermes team manifest and claim-map generator"
    assignee: tac-architect
    model_tier: sol
    parents: [phase_1_research_pipeline]
    acceptance:
      - profile manifest validates
      - no secret/private path patterns
      - claim map blocks unsubstantiated claims
  - id: phase_3_visuals
    title: "Build Image 2.0 prompt/provenance and deterministic visual fallback"
    assignee: tac-artifact-generator
    model_tier: terra
    parents: [phase_2_profile_and_claims]
    acceptance:
      - three visual candidates defined
      - prompt fingerprints include verified facts and GB visual constraints
      - fallback SVG/HTML works with no image provider
  - id: phase_4_frontend
    title: "Assemble interactive index.html and print/PDF team brief"
    assignee: tac-builder
    model_tier: terra
    parents: [phase_3_visuals]
    acceptance:
      - required sections present
      - smooth scroll, anchors, progress indicator, mobile nav
      - print/PDF brief generated
  - id: phase_5_validation
    title: "Validate no-fabrication, secrets, brand, browser, accessibility"
    assignee: tac-validator
    model_tier: terra
    parents: [phase_4_frontend]
    acceptance:
      - zero console errors
      - phone and desktop screenshots
      - CTA/form smoke test
      - no-secret scan
      - brand token gate against canonical source
  - id: phase_6_preview_receipts
    title: "Prepare Netlify preview and observability receipts"
    assignee: tac-ops
    model_tier: luna
    parents: [phase_5_validation]
    gate: approval_required_before_any_netlify_preview_or_external_send
    acceptance:
      - preview-only route
      - content-type/readback proof
      - Supabase skill run/output registration or local fallback receipt
      - Langfuse trace/readback receipt
  - id: phase_7_self_improve
    title: "Patch TAC skill/process learnings after build"
    assignee: tac-self-improve
    model_tier: sol
    parents: [phase_6_preview_receipts]
    gate: consult_TAC_Lead_before_reusable_profile_or_skill_changes
```

Dependencies:

- Phase 0 and 0.5 can run in parallel after approval.
- Research must precede copy, imagery, and profile manifest generation.
- Fabrication guard gates frontend and preview.
- Netlify preview and trial activation are separate approval gates.

## 13. Lead-magnet artifact requirements

`index.html` must include:

- Personalized hero.
- Verified company snapshot.
- Opportunity map.
- Proposed lead agent.
- Specialist-agent team.
- Agent interactions/workflow.
- Safeguards/approval gates.
- Example daily experience.
- Image 2.0 visual set or deterministic fallback.
- 14-day trial plan.
- CTA.
- Downloadable or print-friendly team brief/PDF option.

Design requirements:

- Use canonical GBAutomation tokens via `get-gbauto-theme` and `gbauto-brand-tokens.md`.
- Use live `gb-automation-landing` component idiom for hero, cards, CTAs, nav, section headers, and glass panels.
- Never validate against a self-shipped theme file only.
- Use prospect logo only when verified and usage is clear.
- Use a text lockup when logo availability or rights are unclear.
- Include Hermes attribution only after checking official asset and license/brand guidance. If unclear, use text such as "Drafted for a Hermes-based guided walkthrough" without logo usage or partnership implication.

## 14. Image 2.0 asset list and prompt inputs

Required candidates:

1. Hero world/operations image
   - Use: hero background or framed visual.
   - Prompt inputs: company industry, geography if public and relevant, public operational surfaces, brand color hints from verified logo, GB visual constraints.
   - Prohibited: depicting actual offices, employees, customers, products, dashboards, or results unless source-provided and licensed.
2. Team collaboration image
   - Use: agent-team section.
   - Prompt inputs: abstract agent nodes, workflow paths, glass-panel/cream/terracotta GB style, no humans unless generic silhouettes are approved.
   - Prohibited: real people, prospect staff likeness, implied live monitoring.
3. Industry-specific workflow image
   - Use: opportunity map or workflow section.
   - Prompt inputs: verified industry category, public service/product categories, generic operational objects.
   - Prohibited: fabricated facilities, fabricated before/after metrics, customer names, private system UIs.

Provenance schema:

```yaml
schema_version: image2-provenance.v1
asset_id: hero_world
provider: image_2_0 | deterministic_svg_fallback
model: string | null
seed: string | null
prompt_fingerprint: sha256
source_fact_ids: []
company_logo_colors_used: []
gbauto_constraints_source: second-brain/systems/brand/gbauto-brand-tokens.md
prompt: string
negative_prompt: string
output_path: string | null
approval_status: draft | approved | rejected | fallback_used
review_notes: string
```

If Image 2.0 is unavailable:

- Use deterministic HTML/SVG visuals derived from `assets/deterministic-visual-fallbacks/`.
- Mark `provider: deterministic_svg_fallback`.
- Do not block the lead magnet if the fallback passes brand and no-fabrication gates.

## 15. Copy and claim substantiation

Every external-facing claim must appear in `claim-map.json`:

```yaml
schema_version: prospect-claim-map.v1
claims:
  - claim_id: c001
    text: string
    location: index.html#company-snapshot
    claim_type: company_fact | inferred_opportunity | gbauto_capability | trial_process | limitation
    support:
      - source_url: string
        source_title: string
        quote_or_fact: string
        accessed_at: string
    confidence: verified | inferred | needs_call
    allowed_in_preview: true | false
    reviewer_verdict: pass | revise | block
```

Rules:

- Company facts require public citations.
- Opportunities can be inferred only when labeled as hypotheses.
- GBAutomation capability claims should cite internal public-safe capability docs or use modest language.
- No client social proof, quantified metrics, testimonials, named prior outcomes, or case studies unless separately verified.
- The proof-vetting agent can block the entire preview.

## 16. 14-day guided trial lifecycle

Trial states:

```text
draft -> preview_approved -> activation_approved -> active -> day_7_review -> day_14_closeout -> expired | converted | shut_down
```

Lifecycle:

- Draft: static preview generated from public facts only. No systems connected.
- Preview approved: Greg approves showing/sending the lead magnet to the prospect.
- Activation approved: prospect and Greg approve a guided 14-day trial scope.
- Active day 1: create sanitized profile/workspace, connect only explicitly approved tools/channels, and log activation receipt.
- Days 2 to 6: daily guided reports, all external actions approval-gated.
- Day 7: mid-trial checkpoint with what worked, what was noisy, and scope changes.
- Days 8 to 13: continue with bounded workflows and updated approval rules.
- Day 14: closeout report with keep/kill/convert recommendation.
- Expiry: revoke trial channels, archive receipts, export allowed artifacts, remove temporary credentials/channels, and mark trial expired.
- Conversion: separate paid-engagement gate, new repo/runtime boundary, explicit secrets and OAuth setup.

Shutdown/expiry behavior:

- Set trial `status: expired` when no conversion approval exists.
- Disable scheduled jobs and channels created for the trial.
- Preserve sanitized receipts, reports, and public research artifacts.
- Delete or rotate temporary credentials according to credential hygiene policy.
- Never keep prospect data in a default/shared memory scope.

## 17. Validation gates and smoke proof

Pre-build gates:

- PRD approved by Greg.
- Component retrieval artifacts present.
- One PRD = one board = one isolated integration worktree.
- Secret/OAuth safety review complete.

Build gates:

- Package tree exists and schemas validate.
- Public research citations present for all company facts.
- Logo and asset policy receipt present.
- Hermes attribution/license guidance checked.
- Sanitized Hermes manifest contains no secrets, chat ids, private paths, OAuth fields, or client data.
- Claim map contains every external-facing claim.
- Image provenance exists for every generated or fallback visual.
- Brand gate reads canonical `gbauto-brand-tokens.md` directly.
- Frontend has required sections and interactions.

Browser and accessibility gates:

- Desktop screenshot.
- Phone screenshot.
- Zero browser console errors.
- Anchor navigation and smooth scroll work.
- Progress indicator updates.
- Mobile nav works.
- No horizontal overflow.
- CTA/form smoke test works in preview mode.
- Print/PDF brief renders.
- Basic accessibility: headings, labels, contrast, focus, reduced motion.

Release gates:

- Netlify preview only before human approval.
- Content-type and readback verification.
- No public production route before approval.
- No prospect send before approval.
- Supabase skill-run/output registration and Langfuse trace/readback in implementation.

## 18. Observability and receipts

Required receipt paths for implementation:

```text
second-brain/intelligence/tac-retrievals/<run-id>-knowledge.json
second-brain/intelligence/tac-retrievals/<run-id>-components.json
second-brain/intelligence/prospect-lead-magnets/<prospect-slug>/research-citations.json
second-brain/intelligence/prospect-lead-magnets/<prospect-slug>/claim-map.json
second-brain/intelligence/prospect-lead-magnets/<prospect-slug>/logo-verification.json
second-brain/intelligence/prospect-lead-magnets/<prospect-slug>/image-provenance.json
second-brain/intelligence/prospect-lead-magnets/<prospect-slug>/validation-receipt.json
second-brain/intelligence/prospect-lead-magnets/<prospect-slug>/screenshots/desktop.png
second-brain/intelligence/prospect-lead-magnets/<prospect-slug>/screenshots/mobile.png
second-brain/intelligence/prospect-lead-magnets/<prospect-slug>/netlify-preview-receipt.json
```

Supabase and Langfuse:

- Use existing `skill_runs` and `skill_outputs` pattern when available.
- If remote write is unavailable, write local JSONL fallback and mark `remote_registration: skipped_with_reason`.
- Langfuse observations should include `runtime:hermes`, `surface:prospect-lead-magnet`, `skill:hermes-prospect-agent-team-lead-magnet`, `prospect_slug`, and `approval_state`.
- Do not log raw secrets, private config, private client data, or prospect PII beyond approved public/contact metadata.

## 19. Secrets, OAuth, and safety

Hard rules:

- Do not read or copy `/Users/greg/.hermes/config.yaml` into outputs. Use it only as structural reference if explicitly needed by an implementation agent, and redact all values.
- Do not print or save tokens, OAuth files, `.env` contents, chat ids, bot ids, client data, or private paths in prospect artifacts.
- Do not create live Telegram/Discord/SMS/email channels during preview generation.
- Do not log into prospect sites or access account/private surfaces for research.
- Do not perform scraping that violates explicit site terms or moves beyond public pages without a separate approval gate.
- Do not imply that the prospect already has a working agent team. The copy must say it is drafted, proposed, or previewed.
- Do not send external messages without explicit approval.

## 20. Files expected to change after approval

Likely implementation files:

```text
resources/skills/hermes-prospect-agent-team-lead-magnet/SKILL.md
resources/skills/hermes-prospect-agent-team-lead-magnet/references/*.md
resources/skills/hermes-prospect-agent-team-lead-magnet/templates/*
resources/skills/hermes-prospect-agent-team-lead-magnet/scripts/*.py
resources/skills/hermes-prospect-agent-team-lead-magnet/assets/*
tests/skills/test_hermes_prospect_agent_team_lead_magnet_*.py
second-brain/intelligence/prospect-lead-magnets/.gitkeep or README.md
```

Possible supporting docs:

```text
second-brain/systems/hermes-profiles/tac/examples/prospect-team-manifest.example.yaml
second-brain/intelligence/decisions/<date>-prospect-lead-magnet-safety-boundary.md
```

Do not mutate live Hermes runtime config in the build PR.

## 21. Acceptance criteria

Planning acceptance for this card:

- This PRD exists at the requested path.
- It includes the skill package spec, target layout, implementation graph, information architecture, sanitized config schema, Image 2.0 plan, 14-day lifecycle, validation gates, risks, approval gates, and retrieval receipts.
- It does not implement or deploy the landing page.

Implementation acceptance after Greg approval:

- Skill package exists and can be loaded/read by agents.
- Scripts have deterministic CLI contracts and tests.
- A sample prospect dry run can generate local preview artifacts using public sources or fixtures.
- Validation catches missing citations, fabricated claims, unclear logo rights, secrets/private paths, brand drift, console errors, and broken CTA smoke.
- Netlify preview path is gated and readback-verified.
- Observability receipts are written.
- Final report includes artifacts, screenshots, validation output, and approval state.

## 22. Risks and mitigations

Risk: fabricated prospect claims.
Mitigation: claim map, proof-vetting agent, FABRICATED verdict blocks preview.

Risk: logo or brand misuse.
Mitigation: logo verification receipt, text lockup fallback, Hermes attribution check.

Risk: private config leakage.
Mitigation: sanitized manifest schema, secret scanner, no raw config output, no live profile writes.

Risk: generic landing page with weak personalization.
Mitigation: public citations, opportunity architecture, prospect-specific workflow map, example daily experience.

Risk: Image 2.0 produces misleading visuals.
Mitigation: provenance schema, negative prompts, no real facilities/people/results, deterministic fallback.

Risk: over-automation creates a trial without consent.
Mitigation: separate approval gates for build, preview publish, prospect send, and 14-day activation.

Risk: brand drift.
Mitigation: validator reads canonical `gbauto-brand-tokens.md`, not a copied theme.

Risk: stale TAC evidence.
Mitigation: retrieval artifacts are saved and cited; implementation must refresh retrieval if delayed materially.

## 23. Approval gates

Gate 1: PRD approval.

- Required before creating implementation Kanban cards.

Gate 2: Build completion review.

- Required before Netlify preview publication.

Gate 3: Preview publication.

- Required before sharing with any prospect.

Gate 4: Prospect send.

- Required before email/DM/form submission or any external communication.

Gate 5: 14-day activation.

- Required before connecting tools, channels, calendars, inboxes, CRMs, or scheduled jobs.

Gate 6: Conversion.

- Required before turning trial artifacts into a paid engagement or live production runtime.

## 24. Proposed next step

If Greg approves this PRD, TAC Lead should create a new root Kanban implementation card for `tac-director` with this PRD path as the authoritative spec. The director should fan out the implementation graph above and keep all build work in an isolated worktree. No implementation cards should be created from this planning task without explicit approval.
