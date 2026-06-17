# Portal reuse reference from TAC retrieval evidence

- fetched_at: `2026-06-11T19:21:44Z`
- evidence_json: `/tmp/gbauto-client-portal-components.json`
- created_at: `2026-06-11T19:17:46Z`
- schema_version: `tac-component-retrieval.v1`
- queries: client, portal, website, application, tenant, auth, dashboard, agent, workflow, amplify, supabase
- components_scanned: 1518
- match_count: 1493
- returned_count: 50
- retrieval_strategy: `score_diversified`; limit `50`; per_repo_limit `4`; per_primitive_limit `6`

## Top primitive mix in returned set

- `agent`: 6
- `command`: 6
- `hook`: 6
- `skill`: 6
- `adw`: 6
- `reference`: 6
- `data-output`: 4
- `migration`: 2
- `permissions-profile`: 2
- `output-style`: 2
- `programmable-agent`: 2
- `mcp-server`: 1
- `data-component`: 1

## Top source repos in returned set

- `building-specialized-agents`: 4
- `orchestrator-agent-with-adws`: 4
- `multi-agent-orchestration`: 4
- `tac-6`: 4
- `claude-code-hooks-multi-agent-observability`: 4
- `tac-collection`: 4
- `tac-8`: 4
- `claude-code-hooks-mastery`: 3
- `agent-experts`: 3
- `lead-agents`: 2
- `multi-agent-orchestration-the-o-agent`: 2
- `building-domain-specific-agents`: 2

## Reuse components for this sprint

- `agentic-finance-review:.claude/agents/graph-agent.md`
  - primitive: `agent`; score: 34; matched queries: auth, dashboard, agent
  - source: https://github.com/gbauto-tac/agentic-finance-review/blob/main/.claude/agents/graph-agent.md
  - use for portal sprint: Reach for graph-agent when you need a pipeline stage that both executes a deterministic script and generates novel code artifacts — it pairs a Bash-invoked standard graph script with AI-authored Python scripts for creative analysis, giving you reproducible baselines plus emergent insight in one focused unit. The Stop hook running graph-validator.py closes the loop automatically, embodying the 'Agents + Code' trust...
  - tags: autonomy/zero-touch, primitive/agent, role/scaffolder, tactic/8-prioritize-agentics
- `building-specialized-agents:.claude/commands/t_metaprompt_workflow.md`
  - primitive: `command`; score: 30; matched queries: auth, agent, workflow
  - source: https://github.com/gbauto-tac/building-specialized-agents/blob/main/.claude/commands/t_metaprompt_workflow.md
  - use for portal sprint: Reach for this when you need to stamp out new slash commands without hand-authoring the frontmatter, variable layout, and section scaffold every time — it is a prompt that engineers prompts, turning a high-level intent into a version-controlled, agent-ready command file. Ground in Lesson 11: once you are building domain-specific agents, the bottleneck shifts to prompt authoring volume; a meta-prompt closes that lo...
  - tags: autonomy/in-loop, output/export, primitive/command, primitive/machine-readable-output, role/meta-prompt, role/scaffolder
- `claude-code-hooks-mastery:.claude/hooks/subagent_stop.py`
  - primitive: `hook`; score: 30; matched queries: dashboard, agent, workflow
  - source: https://github.com/gbauto-tac/claude-code-hooks-mastery/blob/main/.claude/hooks/subagent_stop.py
  - use for portal sprint: Reach for this hook when you are running parallel Task agents and need real-time per-agent completion signals without watching logs — it fires automatically on SubagentStop and announces each agent's finish via LLM-generated TTS so you can stay in flow. It is the sensory layer that makes high-parallelism agentic workflows tractable: you hear each sub-agent land rather than polling.
  - tags: autonomy/zero-touch, hook/Stop, primitive/hook, role/observer, stack/python, tactic/1-stop-coding
- `multi-agent-orchestration:apps/orchestrator_db/migrations/1_agents.sql`
  - primitive: `migration`; score: 32; matched queries: auth, agent, workflow
  - source: https://github.com/gbauto-tac/multi-agent-orchestration/blob/main/apps/orchestrator_db/migrations/1_agents.sql
  - use for portal sprint: Reach for this migration when you need to bootstrap the agents registry table in a multi-agent orchestration system — it defines the canonical schema for tracking agent identity, runtime state (status/session_id), ADW workflow linkage, and cumulative cost accounting. Use it as the authoritative data contract whenever a new environment (dev/staging/prod) needs the agents table or when auditing what fields the orche...
  - tags: autonomy/zero-touch, data/archive, data/migration, data/retention-policy, data/schema-contract, data/validation-rule
- `orchestrator-agent-with-adws:adws/adw_modules/adw_agents.py`
  - primitive: `adw`; score: 37; matched queries: agent, workflow
  - source: https://github.com/gbauto-tac/orchestrator-agent-with-adws/blob/main/adws/adw_modules/adw_agents.py
  - use for portal sprint: Reach for adw_agents.py when you need a reusable, typed abstraction for spawning and invoking Claude agents as discrete steps inside an AI Developer Workflow — it is the non-deterministic half of the deterministic/non-deterministic ADW split described in Lesson 14. It belongs in adw_modules/ (core infrastructure) rather than adw_workflows/, meaning it is a primitive your workflow files import, not a workflow itsel...
  - tags: autonomy/out-loop, primitive/adw, role/agent-executor, role/infrastructure, role/workflow-primitive, stack/python
- `claude-code-hooks-multi-agent-observability:apps/demo-cc-agent/.claude/settings.json`
  - primitive: `permissions-profile`; score: 22; matched queries: dashboard, agent
  - source: https://github.com/gbauto-tac/claude-code-hooks-multi-agent-observability/blob/main/apps/demo-cc-agent/.claude/settings.json
  - use for portal sprint: Reach for this component when you need a Claude Code agent to join a multi-agent observability grid instantly — it is the drop-in hook wiring that makes every tool call visible in real time on the dashboard. Per IDD's framing, this settings.json is how you build 'systems of trust' with agents: you cannot debug or improve what you cannot see, and this profile ensures no lifecycle event escapes telemetry.
  - tags: autonomy/zero-touch, hook/Notification, hook/PostToolUse, hook/PreCompact, hook/PreToolUse, hook/Stop
- `tac-7:adws/adw_modules/workflow_ops.py`
  - primitive: `adw`; score: 34; matched queries: auth, agent, workflow
  - source: https://github.com/gbauto-tac/tac-7/blob/main/adws/adw_modules/workflow_ops.py
  - use for portal sprint: Reach for workflow_ops.py when you need a single authoritative source for ADW workflow dispatch, GitHub issue tracking, and runtime workflow validation — it is the shared operations layer that glues agents to workflows without per-caller duplication. In ZTE pipelines (Lesson 7), this module is the connective tissue that lets the agentic layer classify, route, and execute the right isolated workflow without human s...
  - tags: autonomy/out-loop, primitive/adw, role/orchestrator, role/reference, stack/python, tactic/5-invest-agentic-layer
- `sample-multi-tenant-agent-core-app:test_results_dashboard.html`
  - primitive: `data-output`; score: 32; matched queries: tenant, dashboard, agent
  - source: https://github.com/gbauto-tac/sample-multi-tenant-agent-core-app/blob/main/test_results_dashboard.html
  - use for portal sprint: Reach for this component when you need a human-readable results surface that aggregates multi-tenant agent test runs into a single interactive dashboard — pass/fail/skip/running state with expandable trace log panels per test card. It is a pure static HTML artifact that ships alongside automated test suites to make agentic orchestrator output inspectable without additional tooling.
  - tags: autonomy/out-loop, data/validation-rule, output/dashboard, primitive/machine-readable-output, primitive/schema, role/observer
- `multi-agent-orchestration:apps/orchestrator_3_stream/app_docs/responsive-ui-implementation-report.md`
  - primitive: `data-output`; score: 27; matched queries: auth, dashboard, agent
  - source: https://github.com/gbauto-tac/multi-agent-orchestration/blob/main/apps/orchestrator_3_stream/app_docs/responsive-ui-implementation-report.md
  - use for portal sprint: Reach for this component when you need a build-agent's documented record of what responsive CSS changes were made and why — it captures the exact files touched, line counts, and key CSS snippets so a reviewing engineer can audit or revert without re-reading diffs. It also serves as a handoff artifact when another agent or human needs to continue mobile UI work without re-discovering the breakpoint decisions alread...
  - tags: autonomy/in-loop, data/archive, data/retention-policy, data/validation-rule, output/archive-bundle, output/dashboard
- `tac-6:.claude/hooks/subagent_stop.py`
  - primitive: `hook`; score: 27; matched queries: agent, workflow
  - source: https://github.com/gbauto-tac/tac-6/blob/main/.claude/hooks/subagent_stop.py
  - use for portal sprint: Reach for this hook when you are running specialized subagents — Lesson 6's One Agent, One Prompt, One Purpose model — and need passive, zero-intervention visibility into every subagent completion without adding a single token to any agent's context window. It appends a structured record to a per-session log automatically, giving you the audit trail you need to debug KPI regressions (attempts up, streak down) whil...
  - tags: autonomy/zero-touch, hook/Stop, primitive/hook, role/observer, stack/python, tactic/6-one-agent-one-prompt
- `tac-6:adws/adw_modules/workflow_ops.py`
  - primitive: `adw`; score: 27; matched queries: agent, workflow
  - source: https://github.com/gbauto-tac/tac-6/blob/main/adws/adw_modules/workflow_ops.py
  - use for portal sprint: Reach for workflow_ops.py whenever you need the shared backbone that routes GitHub-triggered events to the correct SDLC agent (plan, build, test, review, document) without re-inventing agent dispatch logic in every workflow module. Per Lesson 6, this is the orchestration glue that lets each specialized ADW agent stay laser-focused on its single purpose by centralizing cross-cutting concerns—issue message formattin...
  - tags: autonomy/out-loop, primitive/adw, role/orchestrator, role/reference, stack/python, tactic/6-one-agent-one-prompt-one-purpose
- `agent-experts:.claude/hooks/subagent_stop.py`
  - primitive: `hook`; score: 24; matched queries: agent
  - source: https://github.com/gbauto-tac/agent-experts/blob/main/.claude/hooks/subagent_stop.py
  - use for portal sprint: Reach for this hook when running multi-agent Act-Learn-Reuse pipelines where subagents operate autonomously and you need ambient awareness of completion without polling or watching a terminal — it closes the human feedback loop at the boundary between the Act and Learn phases. It embodies zero-touch observability: the engineer hears a spoken signal and knows the next pipeline stage can proceed, reducing cognitive ...
  - tags: autonomy/zero-touch, hook/Stop, primitive/hook, role/observer, stack/python, tactic/8-prioritize-agentics

## Portal architecture implications

- Agent wrappers (`graph-agent`, `build-agent`, `meta-agent`) support the PRD's specialist lane model: scaffold, docs, IA, UI, auth, data, proof, and QA can be validated separately.
- Hook components (`subagent_stop.py`, observability settings) are reusable for sprint validators and receipts, especially Stop hooks that gate completion.
- Schema/migration components (`1_agents.sql`, `0_orchestrator_agents.sql`) are strongest precedents for durable run status, teammate workspace records, and receipt state.
- Data-output/dashboard components (`test_results_dashboard.html`, responsive UI reports, CSV/JSONL outputs) support static, inspectable portal pages before live APIs exist.
- ADW modules (`adw_agents.py`, `workflow_ops.py`, `agent.py`) are precedents for programmatic dispatch and workflow receipt generation, not UI code to paste into React.

## P0/P1/P2 reuse guidance

### P0: ship the portal shell safely

- Reuse route/auth patterns already in the landing repo.
- Use static registries under `public/` as deterministic portal data.
- Cite TAC components only as implementation precedents; do not market them as client outcomes.
- Build receipt pages from JSON snapshots first, then layer live Kanban integration later.

### P1: teammate build workspace

- Model active agents/builds after `multi-agent-orchestration` schema fields: identity, status, session/run id, workflow linkage, and cost/progress metadata where available.
- Use observability hook patterns for lifecycle receipts and validator output.
- Add static dashboards for test/build/screenshot receipts before adding mutating dispatch buttons.

### P2: richer automation backlog

- Programmatic ADW dispatch and branch deploy automation can follow `workflow_ops.py`/`agent.py` patterns.
- Automatic deploy subdomains and live Kanban mirrors should wait until P0 auth/proof/brand gates are stable.

## Claim-safety notes

- TAC retrieval evidence proves reusable internal component patterns, not client results.
- Do not convert repository names, scores, match counts, or component counts into public marketing proof unless cited as internal engineering evidence.
- Placeholder clients or generated sample data must stay inside authenticated/demo surfaces.
