#!/usr/bin/env python3
"""Poll only explicitly registered approval gates; credentials stay in memory."""
from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from resources.lib.tracing import trace_agent
from scripts.human_approval_gate import canonical_json, load_json, normalize_packet, operator_status, validate_packet
from scripts.human_approval_resume import apply_decision, git_head, sha256, utc_now, verify

BINDING_KEYS = ("assignee", "workspace_kind", "workspace_path", "status", "block_kind", "block_event_id")


def register(state: Path, packet_path: Path, db: Path, repo: Path, *, min_free_gib: float = 0.0) -> Path:
    packet_path, db, repo = packet_path.resolve(), db.resolve(strict=True), repo.resolve(strict=True)
    packet = normalize_packet(load_json(packet_path))
    validate_packet(packet)
    if git_head(repo) != packet["source_commit"]:
        raise ValueError("source checkout differs from approval packet")
    if min_free_gib < 0:
        raise ValueError("disk threshold must be nonnegative")
    targets = {}
    with sqlite3.connect(db.as_uri() + "?mode=ro", uri=True) as conn:
        conn.row_factory = sqlite3.Row
        for task_id in packet["allowed_resume_targets"]:
            row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
            if row is None or row["status"] != "blocked" or "block_kind" not in row.keys() or row["block_kind"] != "needs_input":
                raise ValueError("registered targets require a blocked needs_input gate")
            block = conn.execute(
                "SELECT id, kind FROM task_events WHERE task_id = ? AND kind IN ('blocked', 'unblocked') ORDER BY id DESC LIMIT 1",
                (task_id,),
            ).fetchone()
            if block is None or block["kind"] != "blocked":
                raise ValueError("registered targets require a current Hermes blocked event")
            targets[task_id] = {key: row[key] for key in BINDING_KEYS if key != "block_event_id"}
            targets[task_id]["block_event_id"] = block["id"]
    registration = {
        "schema_version": "human-approval-watch.v1", "gate_id": packet["gate_id"],
        "packet": str(packet_path), "packet_sha256": sha256(canonical_json(packet)),
        "db": str(db), "repo": str(repo), "min_free_gib": min_free_gib,
        "expected_targets": targets, "registered_at": utc_now(),
    }
    folder = state / "registrations"
    folder.mkdir(parents=True, exist_ok=True)
    destination = folder / f"{packet['gate_id']}.json"
    # Never silently replace a gate's task/repository binding.
    with destination.open("x", encoding="utf-8") as stream:
        stream.write(canonical_json(registration).decode())
    return destination


def poll_one(registration_path: Path, state: Path, *, status_reader=operator_status, label_sync=None) -> dict[str, Any]:
    registration = load_json(registration_path)
    if registration.get("schema_version") != "human-approval-watch.v1":
        raise ValueError("unknown approval watch schema")
    packet = normalize_packet(load_json(Path(registration["packet"])))
    validate_packet(packet)
    if registration["gate_id"] != packet["gate_id"] or registration["packet_sha256"] != sha256(canonical_json(packet)):
        raise ValueError("registered approval packet changed")
    gate_id = packet["gate_id"]
    result_path = state / "receipts" / f"{gate_id}.json"

    def labels(receipt=None):
        if not registration.get("notification"):
            return {"state": "not_bound"}
        try:
            from scripts.human_approval_labels import sync_notification
            return (label_sync or sync_notification)(registration, packet, state, receipt)
        except Exception as exc:
            # Label outages are retryable display failures, never send/release retries.
            return {"state": "retry_required", "error_type": type(exc).__name__}

    if result_path.exists():
        return {"gate_id": gate_id, "state": "processed", "labels": labels(load_json(result_path))}
    if any(set(binding) != set(BINDING_KEYS) for binding in registration["expected_targets"].values()):
        raise ValueError("pending registration lacks typed human-input binding; re-register after review")
    status = status_reader(gate_id)
    if not status.get("event"):
        return {"gate_id": gate_id, "state": "awaiting_response", "labels": labels()}
    repo = Path(registration["repo"])
    proof = verify(packet, status, shutil.disk_usage(repo).free / 1024**3,
                   float(registration["min_free_gib"]), current_source_commit=git_head(repo))
    # Binding checks and the durable task event commit with the release, so a
    # worker cannot see ready without its verified receipt and context.
    applied = apply_decision(Path(registration["db"]), packet, proof,
                             expected_targets=registration["expected_targets"])
    receipt = {
        "schema_version": "human-approval-resume.v1", "gate_id": gate_id,
        "event_id": proof["event"]["event_id"], "decision": proof["event"]["decision"],
        "verified_at": utc_now(), "checks": proof["checks"],
        "source_commit": packet["source_commit"], "allowed_resume_targets": proof["allowed_resume_targets"],
        "artifact_sha256": proof["artifact_sha256"], "context_packet_sha256": proof["context_packet_sha256"],
        "note": str(proof["event"].get("note") or ""), "apply": applied,
    }
    result_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=result_path.parent, delete=False) as stream:
        stream.write(canonical_json(receipt))
        temp = Path(stream.name)
    temp.replace(result_path)
    return {"gate_id": gate_id, "state": "processed", "event_id": receipt["event_id"], "decision": receipt["decision"], "apply": applied, "labels": labels(receipt)}


@trace_agent("human_approval.poll", metadata={"scope": "explicit_registrations_only"})
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", type=Path, required=True)
    sub = parser.add_subparsers(dest="command", required=True)
    registration = sub.add_parser("register")
    registration.add_argument("--packet", type=Path, required=True)
    registration.add_argument("--db", type=Path, required=True)
    registration.add_argument("--repo", type=Path, required=True)
    registration.add_argument("--min-free-gib", type=float, default=0.0)
    sub.add_parser("poll")
    args = parser.parse_args(argv)
    if args.command == "register":
        path = register(args.state, args.packet, args.db, args.repo, min_free_gib=args.min_free_gib)
        print(json.dumps({"registration": str(path)}))
        return 0
    from scripts.human_approval_enroll import recover_published
    enrollment = recover_published(args.state)
    results = []
    for path in sorted((args.state / "registrations").glob("*.json")):
        try:
            results.append(poll_one(path, args.state))
        except Exception as exc:
            # Do not log server payloads, notes or signed capabilities.
            results.append({"registration": path.name, "state": "held", "error_type": type(exc).__name__})
    print(json.dumps({"results": results, "enrollment": enrollment}))
    return 1 if (any(row["state"] == "held" or row.get("labels", {}).get("state") == "retry_required" for row in results)
                 or any(row["enrollment"] == "held" for row in enrollment)) else 0


if __name__ == "__main__":
    raise SystemExit(main())
