# forge-window-projection.v1

This is a local, normalized UI projection contract, not a database migration or
a complete row-insert contract. `data.js` retains the source identity/relationship
column names needed for a design review. It omits unrelated required database
columns and adds a clearly separated `ui` object for presentation and simulated
associations. The records must never be submitted directly as database rows.

## Envelope and keys

The dataset contains `schema_version: forge-window-projection.v1`, `demo: true`,
the existing recipe snapshot revision, named record arrays, and explicit `uiLinks`.
Each array has a unique primary identity declared in `FORGE_CONTRACTS.keys`.
`FORGE_CONTRACTS.tables` maps its UI collection to the existing relation or file
contract. `FORGE_CONTRACTS.relations` declares a source collection/field, target
collection, relationship class, display label, and source citation.

| UI collection | Source identity | Relation / contract |
| --- | --- | --- |
| experts | expert_key | agent_experts |
| skills | skill_name | ops_skills_registry |
| routes | route_key | agent_expert_routes |
| sessions | session_key | agent_sessions |
| messages | message_key | agent_session_messages |
| runs | run_id | skill_runs |
| artifacts | artifact_id | generated_artifacts |
| runArtifacts | link_id | run_artifact_links |
| storage | storage_object_id | artifact_storage_objects |
| sources | source_artifact_id | source_artifacts |
| sourceEvents | source_event_id | source_events |
| producers | producer_run_id | producer_runs |
| proposals | proposal_id | agent_os_proposals |
| tasks | task_id | kanban_task_proposals |
| prds | prd_id | prd_artifacts |
| intents | intent_id | gate_ledger_intents |
| approvals | event_id | approval_events, non-authorizing projection |
| configs | config_id | agent-configuration.v1 |
| checks | check_id | UI-only check projection |
| commands | id | Existing Justfile snapshot |

## Evidence classes

- `fk`: an explicit foreign key in a committed migration. The source is evidence
  of the declared design, not proof that it is installed in the live database.
- `conditional-fk`: the migration adds the constraint only when its dependency
  exists. The artifact-to-source and artifact-to-PRD paths use this label.
- `reference`: joinable keys without an enforced constraint verified here.
- `contract`: references required by an existing typed configuration document.
- `demo`: proposed UI context association, outside the source's FK contract.

The full field-to-field ledger and exact migration locations are exposed under
Data map and the per-record inspector. Source names and line spans live in
`FORGE_CONTRACTS.sources`. Key sources:

- `20260728120000_create_agent_expert_catalog_and_run_previews.sql`: routes to
  experts and registered skills, lines 48-70.
- `20260624224000_create_agent_session_history.sql`: messages to sessions,
  lines 114-149. Session identity is `session_key`, not an assumed global session_id.
- `20260517000001_create_skill_runs.sql` and its v2 migration: run metadata,
  outputs, and self-referencing parent_run_id.
- `20260814223000_run_artifact_receipt_lineage.sql`: many-to-many skill/cron
  run-to-artifact links, lines 7-23. The UI resolves this bridge rather than
  assuming generated_artifacts.run_id is a universal enforced run FK.
- `20260812130000_adr21_create_artifact_spine.sql`: generated artifact identity,
  versions, conditional source/PRD constraints, and storage-object FK.
- `20260809_agent_os_v2_4_contracts.sql`: proposal source/producer/task FKs,
  lines 189-247. A blocked proposal names its blocker and next safe action.
- `20260813010000_adr14_approval_event_spine.sql`: gate/event identity and
  `approval_events.intent_id`, lines 43-85 and 124-186.
- `agent-configuration.v1.schema.json`: owner expert, profile, and pinned skills.
- `agent-os-supabase-evidence-map.md`: existing soft session/task/trace links.

## Deliberate UI-only fields

`ui.scope` is an explicit sample workstream membership, not a new database column.
Task dependency and owner/due/progress presentation, check definitions, friendly
titles, avatar state, per-run terminal fixtures, source-event-to-source associations,
run-to-session associations, selected conversation context, and the proposal-to-gate
binding are marked UI-only. Some are plausible future read-model joins, but no
constraint or live join is claimed for them. The inspector displays their class.

Configuration-to-expert and configuration-to-skill references are shown as typed
contract bindings. Source recipe names/parameters/text come from the original
approved snapshot. The remaining records, membership, timing, statuses, summaries,
traces, byte counts, and output documents are sample data. The live expert's actual
run/approval/readiness state is unknown to this page.

## Local mutation contracts

1. A run gets a unique ID and one state: running, ok, error, or cancelled. A
   successful simulation creates a unique artifact and a run_artifact_links row.
   Failure/stop preserve output without fabricating a successful artifact.
2. A saved configuration draft creates a proposal, intent, and prepared event.
   The diff stores exact before/after field values; the source configuration is
   unchanged. No credentials or permission expansions are entered or exported.
3. A demo decision updates the sample view of the gate and proposal. An artifact
   review affects only the selected version; a dependent task can become ready.
   The projected event is `modified` or `shelved` with `authorization_method: none`
   and `ui.demo_decision`. No `approved` or `ticket_redeemed` authorization event,
   stamp, capability, or live action is minted by the preview.
4. Source attachment changes the local conversation context. Chat replies are
   fixed examples, not an LLM response or outbound message.
5. A readiness demo may verify the sample configuration checks; it leaves live
   activation pending. A completed inspection is separate from all checks passing.
6. Drafts and review notes are keyed to their record/version. Back navigation
   restores selection/filter state. A page refresh stops an unfinished simulation.

## Validation and output

The browser validator checks unique identities, every declared relationship,
task references, cross-window state, exact selection on navigation, filter isolation,
input escaping, drafts, version comparison, demo mutations, and exports. It repeats
integrity checks after mutations and reload. All 13 windows are checked in both
sizes across multiple widths. No remote page requests are allowed in the receipt.

The export envelope is `schema_version`, `demo: true`, `runtime_authorized: false`,
`data`, and `review`. Its data obeys this UI projection contract, not the full SQL
insert schema. `validation/browser-checks.json` records pass/fail and errors;
`manifest.json` records output file hashes, sizes, and source references.

TAC tags: `data/schema-contract`, `storage/local-filesystem`, `output/html`,
`output/dashboard`, `format/json`. No ingest, publish, upload, dispatch, archive,
cleanup, or database-write boundary is crossed.
