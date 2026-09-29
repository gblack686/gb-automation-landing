#!/usr/bin/env python3
"""Verify a human approval event and narrowly resume declared Kanban targets."""
from __future__ import annotations

import argparse
import hashlib
import json
import secrets
import shutil
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.human_approval_gate import (  # noqa: E402
    canonical_json,
    load_json,
    normalize_packet,
    operator_status,
    validate_packet,
)


DEFAULT_DB = Path("/Users/greg/.hermes/kanban/boards/gbautomation/kanban.db")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def verify(
    packet: dict[str, Any],
    status: dict[str, Any],
    free_gib: float,
    min_free_gib: float,
    *,
    current_source_commit: str | None = None,
) -> dict[str, Any]:
    packet = normalize_packet(packet)
    validate_packet(packet)
    event = status.get("event") or {}
    capability = status.get("capability") or {}
    if not event:
        raise RuntimeError("approval event has not been recorded")
    verification = event.get("verification") or {}
    approval_channel = str(
        event.get("approval_channel")
        or verification.get("channel")
        or capability.get("approval_channel")
        or "report_capability"
    )
    if approval_channel not in {"report_capability", "sheet_adapter"}:
        raise RuntimeError(f"unsupported approval channel: {approval_channel}")
    source_sha = sha256(canonical_json(packet))
    context_sha = sha256(canonical_json(packet.get("context_packet") or {}))
    expected_targets = sorted(str(item) for item in packet["allowed_resume_targets"])
    checks = {
        "gate_id": event.get("gate_id") == packet["gate_id"] == capability.get("gate_id"),
        "run_id": event.get("run_id") == packet["run_id"] == capability.get("run_id"),
        "parent_task_id": event.get("parent_task_id") == packet["parent_task_id"] == capability.get("parent_task_id"),
        "decision_version": int(event.get("decision_version") or 0) == int(packet["decision_version"]) == int(capability.get("decision_version") or 0),
        "artifact_sha256": event.get("artifact_sha256") == source_sha == capability.get("artifact_sha256"),
        "context_packet_sha256": event.get("context_packet_sha256") == context_sha == capability.get("context_packet_sha256"),
        "source_commit": event.get("source_commit") == packet["source_commit"] == capability.get("source_commit"),
        "resume_targets": sorted(event.get("allowed_resume_targets") or []) == expected_targets == sorted(capability.get("allowed_resume_targets") or []),
        "capability_consumed": bool(capability.get("consumed_at")) and capability.get("consumed_event_id") == event.get("event_id"),
        "capability_not_revoked": not capability.get("revoked_at"),
        "approval_channel": approval_channel
        == str(capability.get("approval_channel") or approval_channel),
        "disk_gate": free_gib >= min_free_gib,
        "decision_allowed": event.get("decision") in packet["allowed_actions"],
    }
    if approval_channel == "report_capability":
        checks.update(
            {
                "signature_verified": bool(verification.get("signature_verified")),
                "claims_hash": verification.get("claims_sha256")
                == capability.get("claims_sha256"),
            }
        )
    else:
        checks.update(
            {
                "adapter_intent": bool(event.get("adapter_intent_id"))
                and event.get("adapter_intent_id")
                == capability.get("adapter_intent_id"),
                "adapter_signature_verified": bool(
                    verification.get("adapter_signature_verified")
                ),
                "registry_verified": bool(verification.get("registry_verified")),
                "actor_verified": bool(verification.get("actor_verified")),
                "row_version_verified": bool(
                    verification.get("row_version_verified")
                ),
                "gate_version_verified": bool(
                    verification.get("gate_version_verified")
                ),
                "artifact_hash_verified": bool(
                    verification.get("artifact_hash_verified")
                ),
                "context_hash_verified": bool(
                    verification.get("context_hash_verified")
                ),
                "source_commit_verified": bool(
                    verification.get("source_commit_verified")
                ),
                "resume_targets_verified": bool(
                    verification.get("resume_targets_verified")
                ),
                "adapter_body_hash": verification.get("canonical_body_sha256")
                == capability.get("claims_sha256"),
            }
        )
    if current_source_commit is not None:
        checks["source_checkout_unchanged"] = (
            current_source_commit == str(packet["source_commit"])
        )
    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        raise RuntimeError("approval resume verification failed: " + ", ".join(failed))
    return {
        "event": event,
        "capability": capability,
        "checks": checks,
        "artifact_sha256": source_sha,
        "context_packet_sha256": context_sha,
        "allowed_resume_targets": expected_targets,
        "approval_channel": approval_channel,
        "free_gib": round(free_gib, 2),
        "min_free_gib": min_free_gib,
    }


def git_head(repo: Path) -> str:
    proc = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repo,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=20,
        check=False,
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        raise RuntimeError(f"could not resolve source checkout HEAD: {proc.stderr[-300:]}")
    return proc.stdout.strip()


def append_event(conn: sqlite3.Connection, task_id: str, kind: str, payload: dict[str, Any], now: int) -> None:
    conn.execute(
        "INSERT INTO task_events (task_id, kind, payload, created_at) VALUES (?, ?, ?, ?)",
        (task_id, kind, json.dumps(payload, sort_keys=True), now),
    )


def apply_decision(db: Path, packet: dict[str, Any], proof: dict[str, Any], *, expected_targets: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    if not db.exists():
        raise FileNotFoundError(f"Kanban DB not found: {db}")
    event = proof["event"]
    decision = str(event["decision"])
    event_id = str(event["event_id"])
    now = int(time.time())
    changes: list[dict[str, str]] = []
    with sqlite3.connect(str(db), isolation_level="IMMEDIATE") as conn:
        conn.row_factory = sqlite3.Row
        # Serialize the duplicate check, receipt, context handoff and release.
        conn.execute("BEGIN IMMEDIATE")
        duplicate = conn.execute(
            "SELECT 1 FROM task_events WHERE kind = 'human_approval_resumed' AND payload LIKE ? LIMIT 1",
            (f'%"event_id": "{event_id}"%',),
        ).fetchone()
        if duplicate:
            return {"idempotent": True, "decision": decision, "changes": []}

        targets = proof["allowed_resume_targets"]
        rows = {
            row["id"]: row
            for row in conn.execute(
                "SELECT * FROM tasks WHERE id IN (%s)"
                % ",".join("?" for _ in targets),
                tuple(targets),
            )
        }
        missing = sorted(set(targets) - set(rows))
        if missing:
            raise RuntimeError("resume targets missing from Kanban: " + ", ".join(missing))
        if expected_targets is not None:
            if set(expected_targets) != set(targets):
                raise RuntimeError("registered target set changed")
            for task_id, binding in expected_targets.items():
                if binding.get("status") != "blocked" or binding.get("block_kind") != "needs_input":
                    raise RuntimeError("registered target requires a typed human-input block")
                if any(rows[task_id][key] != value for key, value in binding.items() if key != "block_event_id"):
                    raise RuntimeError(f"registered task ownership/workspace/block changed: {task_id}")
                block = conn.execute(
                    "SELECT id, kind FROM task_events WHERE task_id = ? AND kind IN ('blocked', 'unblocked') ORDER BY id DESC LIMIT 1",
                    (task_id,),
                ).fetchone()
                if block is None or block["kind"] != "blocked" or block["id"] != binding.get("block_event_id"):
                    raise RuntimeError("registered human-input block event changed")
        task_link_table = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'task_links'"
        ).fetchone()
        non_parent_targets = [
            task_id
            for task_id in targets
            if task_id != str(packet["parent_task_id"])
        ]
        if non_parent_targets:
            if not task_link_table:
                raise RuntimeError(
                    "task_links table is required to verify non-parent resume targets"
                )
            linked = {
                str(row[0])
                for row in conn.execute(
                    "SELECT child_id FROM task_links WHERE parent_id = ? "
                    "AND child_id IN (%s)"
                    % ",".join("?" for _ in non_parent_targets),
                    (str(packet["parent_task_id"]), *non_parent_targets),
                )
            }
            unlinked = sorted(set(non_parent_targets) - linked)
            if unlinked:
                raise RuntimeError(
                    "resume targets are not declared dependencies: "
                    + ", ".join(unlinked)
                )

        if decision == "approve":
            for task_id in targets:
                previous = str(rows[task_id]["status"])
                if previous not in {"blocked", "todo"}:
                    raise RuntimeError(f"resume target {task_id} is {previous}, expected blocked/todo")
                columns = {row[1] for row in conn.execute("PRAGMA table_info(tasks)")}
                assignments = ["status = 'ready'", "consecutive_failures = 0"]
                if "block_kind" in columns:
                    assignments.append("block_kind = NULL")
                if "block_recurrences" in columns:
                    assignments.append("block_recurrences = 0")
                if "last_failure_error" in columns:
                    assignments.append("last_failure_error = NULL")
                if "claim_lock" in columns:
                    assignments.append("claim_lock = NULL")
                if "claim_expires" in columns:
                    assignments.append("claim_expires = NULL")
                conn.execute(f"UPDATE tasks SET {', '.join(assignments)} WHERE id = ?", (task_id,))
                note = str(event.get("note") or "")
                context = (
                    f"\n\n## Human approval context\nGate: {packet['gate_id']}\n"
                    f"Event: {event_id}\nDecision: approve\n"
                    f"Additional context:\n{note or '(none)'}\n"
                )
                conn.execute("UPDATE tasks SET body = COALESCE(body, '') || ? WHERE id = ?", (context, task_id))
                if "block_kind" in columns:
                    # Hermes uses this event to end its sticky human-block state.
                    append_event(conn, task_id, "unblocked", {"reason": "verified human approval", "event_id": event_id}, now)
                changes.append({"task_id": task_id, "previous": previous, "new": "ready"})
        elif decision == "request_changes":
            title = f"[TAC Architect] Revision requested for gate {packet['gate_id']}"
            existing = conn.execute("SELECT id FROM tasks WHERE title = ? LIMIT 1", (title,)).fetchone()
            if not existing:
                revision_id = "t_" + secrets.token_hex(4)
                conn.execute(
                    "INSERT INTO tasks (id,title,body,assignee,status,priority,created_by,created_at,workspace_kind,workspace_path,consecutive_failures,skills) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                    (
                        revision_id,
                        title,
                        f"Human approval event {event_id} requested changes.\n\nNote: {event.get('note') or '(none)'}",
                        "tac-architect",
                        "ready",
                        0,
                        "human-approval-resume",
                        now,
                        "scratch",
                        "/Users/greg/.hermes/kanban/workspaces",
                        0,
                        json.dumps(["kanban-orchestrator", "tac-plan"]),
                    ),
                )
                changes.append({"task_id": revision_id, "previous": "missing", "new": "ready"})

        payload = {
            "schema_version": "human-approval-resume.v1",
            "event_id": event_id,
            "gate_id": packet["gate_id"],
            "decision": decision,
            "changes": changes,
            "report_url": packet.get("report_url"),
            "source_commit": packet["source_commit"],
            "note": str(event.get("note") or ""),
            "checks": proof.get("checks", {}),
            "allowed_resume_targets": targets,
            "artifact_sha256": proof.get("artifact_sha256"),
            "context_packet_sha256": proof.get("context_packet_sha256"),
            "verified_at": utc_now(),
        }
        for task_id in targets:
            append_event(conn, task_id, "human_approval_resumed", payload, now)
        conn.commit()
    return {"idempotent": False, "decision": decision, "changes": changes}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--packet", type=Path, required=True)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--repo", type=Path, default=ROOT)
    parser.add_argument("--data-volume", type=Path, default=Path("/System/Volumes/Data"))
    parser.add_argument("--min-free-gib", type=float, default=0.0)
    parser.add_argument(
        "--receipt-dir",
        type=Path,
        default=Path("artifacts/vault-exhaust/human-approval-resume"),
    )
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args(argv)

    packet = load_json(args.packet)
    usage = shutil.disk_usage(args.data_volume)
    free_gib = usage.free / 1024**3
    status = operator_status(str(packet["gate_id"]))
    proof = verify(
        packet,
        status,
        free_gib,
        args.min_free_gib,
        current_source_commit=git_head(args.repo),
    )
    result = apply_decision(args.db, packet, proof) if args.apply else {"applied": False, "decision": proof["event"]["decision"]}
    receipt = {
        "schema_version": "human-approval-resume.v1",
        "gate_id": packet["gate_id"],
        "event_id": proof["event"]["event_id"],
        "decision": proof["event"]["decision"],
        "approval_channel": proof["approval_channel"],
        "verified_at": utc_now(),
        "checks": proof["checks"],
        "free_gib": proof["free_gib"],
        "min_free_gib": proof["min_free_gib"],
        "allowed_resume_targets": proof["allowed_resume_targets"],
        "source_commit": packet["source_commit"],
        "artifact_sha256": proof["artifact_sha256"],
        "context_packet_sha256": proof["context_packet_sha256"],
        "apply": result,
    }
    day_dir = args.receipt_dir / time.strftime("%Y-%m-%d", time.gmtime())
    day_dir.mkdir(parents=True, exist_ok=True)
    receipt_path = day_dir / f"{packet['gate_id']}-{proof['event']['event_id']}.json"
    receipt_path.write_bytes(canonical_json(receipt))
    print(json.dumps({"ok": True, "receipt": str(receipt_path), "decision": receipt["decision"], "apply": result}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
