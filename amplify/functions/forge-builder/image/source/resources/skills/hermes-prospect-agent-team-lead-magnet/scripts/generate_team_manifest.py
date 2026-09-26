#!/usr/bin/env python
"""Stage 4: sanitized prospect agent-team manifest -> sanitized-hermes-team.yaml.

Uses GBAutomation Hermes profile conventions as STRUCTURE only. The manifest is
draft-only by schema: no tools/skills wired, no channels, no chat ids, no
secrets. Roles are derived deterministically from the desired business outcome
and the verified research facts. The serialized output is secret-scanned.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _common import (
    dump_yaml, fail_gate, load_artifact, load_schema, read_text, scan_secrets,
    slugify, validate_schema, workdir_arg,
)

# Role library: (id, display name, purpose template, tier). Deterministic and
# outcome-keyed — every prospect gets the core four plus keyword-matched extras.
CORE_SPECIALISTS = [
    ("customer-ops-scout", "Customer Ops Scout",
     "Watch public-facing customer surfaces for {company} and surface daily operational exceptions.", "luna"),
    ("workflow-mapper", "Workflow Mapper",
     "Map the operational workflows behind '{outcome}' into observable, improvable steps.", "terra"),
    ("proof-claims-guard", "Proof & Claims Guard",
     "Verify every statement the team makes about {company} against cited public sources.", "sol"),
    ("reporting-agent", "Daily Reporting Agent",
     "Assemble the morning brief and exception report for the {company} team.", "luna"),
]

KEYWORD_SPECIALISTS = [
    (("follow-up", "inbox", "email", "crm", "lead"),
     ("inbox-crm-analyst", "Inbox & CRM Analyst",
      "Classify inbound threads and keep follow-ups from slipping, aligned to '{outcome}'.", "terra")),
    (("exception", "operations", "ops", "manual", "process"),
     ("escalation-coordinator", "Escalation Coordinator",
      "Route exceptions that need a human at {company} with full context attached.", "terra")),
    (("content", "social", "marketing", "brand"),
     ("content-ops-agent", "Content Ops Agent",
      "Draft and stage recurring content operations for {company} review.", "terra")),
    (("inventory", "order", "fulfillment", "shipping", "ecom", "e-commerce", "store"),
     ("order-flow-analyst", "Order Flow Analyst",
      "Track order and fulfillment signals visible to {company} and flag anomalies.", "terra")),
]

# Draft skills each role would learn once activated — proposals only; nothing
# is wired (tools/skills stay [] in the sanitized manifest by schema).
PROPOSED_SKILLS = {
    "lead_agent": [
        ("daily-synthesis", "Fold every specialist report into one prioritized morning brief."),
        ("approval-routing", "Package anything external as an approve/edit/decline request."),
        ("scope-guard", "Refuse and flag any task outside the approved trial scope."),
    ],
    "customer-ops-scout": [
        ("surface-watch", "Poll approved public customer surfaces on a fixed cadence."),
        ("exception-detect", "Diff today's signals against baseline and flag anomalies."),
        ("context-capture", "Attach source links and evidence to every flagged exception."),
    ],
    "workflow-mapper": [
        ("process-trace", "Turn observed steps into a named, versioned workflow map."),
        ("bottleneck-scan", "Rank mapped steps by delay, rework, and handoff count."),
        ("improvement-draft", "Propose one bounded automation per bottleneck, human-gated."),
    ],
    "proof-claims-guard": [
        ("claim-audit", "Re-verify every outbound statement against its cited source."),
        ("fabrication-block", "Veto any draft containing unsupported or invented claims."),
        ("source-refresh", "Re-check citations for staleness on a weekly cycle."),
    ],
    "reporting-agent": [
        ("morning-brief", "Render the daily brief: wins, exceptions, approvals, next actions."),
        ("weekly-rollup", "Compile the Friday review with trend deltas."),
        ("receipt-ledger", "Log every report and approval as a durable receipt."),
    ],
    "inbox-crm-analyst": [
        ("thread-triage", "Classify inbound threads by intent, urgency, and owner."),
        ("follow-up-guard", "Track promised replies and surface anything about to slip."),
        ("crm-hygiene", "Draft CRM field updates from thread outcomes, human-approved."),
    ],
    "escalation-coordinator": [
        ("escalation-routing", "Match each exception to the right human with full context."),
        ("severity-triage", "Score incidents so the loudest thing isn't always first."),
        ("handoff-receipts", "Record every escalation and its resolution as a receipt."),
    ],
    "content-ops-agent": [
        ("content-calendar", "Maintain the recurring publication schedule as drafts."),
        ("draft-staging", "Stage every post/asset for human review — never auto-publish."),
        ("brand-check", "Lint drafts against the approved voice and claim map."),
    ],
    "order-flow-analyst": [
        ("order-watch", "Track order and fulfillment signals on approved public surfaces."),
        ("anomaly-flag", "Flag volume spikes, stalls, and returns drift with context."),
        ("season-baseline", "Maintain the seasonal baseline the anomaly checks diff against."),
    ],
}


def proposed_skills_for(role_key: str) -> list[dict]:
    return [{"name": n, "description": d, "status": "proposed_not_wired"}
            for n, d in PROPOSED_SKILLS.get(role_key, [])]


# Three-layer outline (vault doctrine, hermes-profile-creation-tac-pattern):
# Layer 1 = profiles (operating boundaries, role-tiered per
# team-composition-patterns), Layer 2 = skills (gbauto core rack shared by all
# agents + per-role proposed skills), Layer 3 = Canopy inherited behavior.
# (internal skill name, client-facing display name, client-readable description)
CORE_SKILL_RACK = [
    ("gbauto-supabase", "Audited Data Layer",
     "Every read and write goes through one audited door — no side channels, full history."),
    ("tac-hermes-dispatch", "Task Board Dispatch",
     "Work arrives as cards on a board you can see — never as ad-hoc prompts into a void."),
    ("check-langfuse-logs", "Run Traces & Receipts",
     "Every agent run is observable and every claim traceable back to its evidence."),
    ("canopy", "Shared Playbooks",
     "Behavior all agents share is written once and inherited — consistency by construction."),
    ("hermes-ci-gate", "Quality Gate",
     "Automated checks must pass before anything merge-dependent proceeds."),
    ("hermes-cron-manager", "Scheduled Routines",
     "Recurring jobs are managed and receipted — schedules are records, not folklore."),
    ("sprint-manager", "Sprint Cadence",
     "Approved tasks become tracked sprint work with progress readback — cadence is core, never an afterthought."),
]

CANOPY_INHERITANCE = [
    ("tac-contract-shared", "Reuse evidence, validation gate, and receipt required on every card."),
    ("git-staging-discipline", "Exact-path staging; no bulk adds; verify the diff before commit."),
]

# model tier -> role tier (team-composition-patterns role taxonomy)
ROLE_TIER = {"sol": "senior", "terra": "senior", "luna": "junior"}


def core_skill_rack() -> list[dict]:
    return [{"name": n, "display_name": friendly, "description": d,
             "status": "gbauto_core_shared"}
            for n, friendly, d in CORE_SKILL_RACK]


def canopy_inheritance() -> list[dict]:
    return [{"snippet": n, "behavior": d} for n, d in CANOPY_INHERITANCE]


def select_roles(outcome: str) -> list[tuple[str, str, str, str]]:
    """The deterministic role-library pick: core four + keyword-matched extras.

    Shared with roster_subagent.py so the generative rename stage proposes
    against exactly the roster this manifest will build.
    """
    picked = list(CORE_SPECIALISTS)
    outcome_lower = outcome.lower()
    for keywords, spec in KEYWORD_SPECIALISTS:
        if any(k in outcome_lower for k in keywords):
            picked.append(spec)
    return picked


def build_team(intake: dict, research: dict, roster: dict | None = None) -> dict:
    company = intake["company_name"]
    outcome = intake["desired_business_outcome"]
    fmt = {"company": company, "outcome": outcome}

    # Client-specific names/purposes from the roster subagent, keyed by the
    # STABLE library id — ids, tiers, archetypes and proposed skills never
    # change here, so art assets and profile pages keyed by id survive a rename.
    renames = {s["id"]: s for s in (roster or {}).get("specialists", [])}

    specialists = []
    for sid, name, purpose, tier in select_roles(outcome):
        rename = renames.pop(sid, {})
        specialists.append({
            "id": sid,
            "display_name": (rename.get("display_name") or name)[:80],
            "purpose": (rename.get("purpose") or purpose.format(**fmt))[:300],
            "model_tier": tier, "role_tier": ROLE_TIER[tier], "tools": [], "skills": [],
            "proposed_skills": proposed_skills_for(sid),
            "inputs": ["approved public surfaces"],
            "outputs": ["daily findings to lead agent"],
        })
    if renames:
        print(f"  roster overrides for unknown ids ignored: {', '.join(sorted(renames))}")

    public_sources = [
        {"url": src["url"], "title": src["title"], "accessed_at": src["accessed_at"],
         "facts_supported": [{"fact_id": fact["fact_id"]}]}
        for fact in research["facts"] for src in fact.get("sources", [])
    ]

    lead_rename = (roster or {}).get("lead") or {}
    return {
        "schema_version": "prospect-hermes-team.v1",
        "prospect": {
            "company_name": company,
            "company_url": intake["company_url"],
            "prospect_person": (intake.get("prospect") or {}).get("name"),
            "desired_business_outcome": outcome,
            "public_sources": public_sources,
        },
        "team": {
            "lead_agent": {
                "id": f"{slugify(company)}-ops-lead",
                "display_name": (lead_rename.get("display_name")
                                 or f"{company} Ops Lead")[:80],
                "purpose": (lead_rename.get("purpose")
                            or f"Synthesize specialist findings into one daily brief "
                               f"for {company}, aimed at: {outcome}")[:300],
                "model_tier": "sol",
                "role_tier": "team_leader",
                "acts_as_planning_leader": True,
                "tools": [],
                "skills": [],
                "proposed_skills": proposed_skills_for("lead_agent"),
                "memory_scope": "draft_only_no_private_memory",
                "approval_boundaries": [
                    "no_external_messages_without_human_approval",
                    "no_account_actions_without_activation",
                ],
            },
            "specialist_agents": specialists,
            "core_skill_rack": core_skill_rack(),
            "canopy_inheritance": canopy_inheritance(),
        },
        "workflow": {
            "trigger": "manual_preview_generation",
            "kanban_owner": "lead-magnet-orchestrator",
            "daily_report_shape": "morning brief: wins, exceptions, approvals needed, next actions",
            "escalation_rules": [],
        },
        "channels": {
            "preview_surface": "static_netlify_preview",
            "messaging": "none_until_activation",
            "chat_ids": "redacted_not_collected",
        },
        "observability": {
            "langfuse_tags": ["runtime:hermes", "surface:prospect-lead-magnet"],
            "supabase_run_table": "skill_runs",
            "supabase_output_table": "skill_outputs",
        },
        "trial": {
            "status": "draft",
            "starts_at": None,
            "expires_at": None,
            "shutdown_action": "revoke_channels_and_archive_receipts",
        },
        "safety": {
            "secrets_policy": "no_secrets_no_oauth_no_private_paths",
            "data_policy": "public_research_only_until_activation",
            "publication_policy": "netlify_preview_only_before_human_approval",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    args = parser.parse_args()

    workdir = Path(args.workdir)
    intake = load_artifact(workdir, "intake.json")
    research = load_artifact(workdir, "research-citations.json")
    roster = None
    if (workdir / "roster-content.json").exists():
        roster = load_artifact(workdir, "roster-content.json")
        print("  applying client-specific roster names from roster-content.json")

    manifest = build_team(intake, research, roster)
    errors = validate_schema(manifest, load_schema("sanitized-hermes-team.schema.json"), "manifest")
    if errors:
        fail_gate(errors, "manifest-schema")

    out_path = workdir / "sanitized-hermes-team.yaml"
    dump_yaml(out_path, manifest)
    leaks = scan_secrets(read_text(out_path))
    if leaks:
        out_path.unlink()
        fail_gate([f"secret pattern in manifest: {label}" for label in leaks], "manifest-secrets")

    total = 1 + len(manifest["team"]["specialist_agents"])
    print(f"OK sanitized team manifest: {total} agents -> sanitized-hermes-team.yaml")
    return 0


if __name__ == "__main__":
    sys.exit(main())
