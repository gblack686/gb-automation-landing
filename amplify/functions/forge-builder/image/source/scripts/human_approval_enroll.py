"""Prepare and activate only explicitly bound, newly published Kanban gates."""
from __future__ import annotations

import os
import re
import tempfile
from pathlib import Path
from typing import Any

from scripts.human_approval_gate import canonical_json, load_json, normalize_packet, sha256_bytes


def atomic_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
        stream.write(canonical_json(data))
        temporary = Path(stream.name)
    temporary.replace(path)


def prepare(watch: dict[str, Any], packet_path: Path, receipt_path: Path) -> Path:
    from scripts.human_approval_poll import register
    state = Path(watch["state"])
    # Staging is outside the poller's registrations selection. No API calls or
    # releases occur until the notification receipt is durably recorded.
    staging = state / "publishing"
    packet = normalize_packet(load_json(packet_path))
    destination = staging / "registrations" / f"{packet['gate_id']}.json"
    active = state / "registrations" / destination.name
    if active.exists() or destination.exists():
        raise ValueError("gate already enrolled or publishing; reconcile its receipt")
    path = register(staging, packet_path, Path(watch["db"]), Path(watch["repo"]))
    record = load_json(path)
    record["publish_receipt"] = str(receipt_path.resolve())
    atomic_json(path, record)
    return path


def activate(state: Path, gate_id: str) -> Path:
    if not re.fullmatch(r"[A-Za-z0-9._:-]{1,180}", gate_id):
        raise ValueError("invalid gate id")
    pending = state / "publishing/registrations" / f"{gate_id}.json"
    active = state / "registrations" / pending.name
    record = load_json(pending if pending.exists() else active)
    receipt = load_json(Path(record["publish_receipt"]))
    packet = normalize_packet(load_json(Path(record["packet"])))
    if (receipt.get("gate_id") != gate_id or record["gate_id"] != gate_id
            or receipt.get("artifact_sha256") != record["packet_sha256"]
            or sha256_bytes(canonical_json(packet)) != record["packet_sha256"]
            or receipt.get("source_commit") != packet["source_commit"]
            or receipt.get("approval_recipient") != packet["approval_recipient"]
            or not re.fullmatch(r"[a-zA-Z0-9_-]{1,180}", str(receipt.get("notification_message_id", "")))):
        raise ValueError("publish receipt does not match prepared gate")
    record["notification"] = {"message_id": receipt["notification_message_id"], "recipient": receipt["approval_recipient"]}
    if active.exists():
        if load_json(active) != record:
            raise ValueError("active gate registration differs")
        pending.unlink(missing_ok=True)
        return active
    atomic_json(pending, record)
    active.parent.mkdir(parents=True, exist_ok=True)
    # Hard-link publishes without replacing a competing registration.
    try:
        os.link(pending, active)
    except FileExistsError:
        if load_json(active) != record:
            raise ValueError("active gate registration differs")
    pending.unlink(missing_ok=True)
    return active


def recover_published(state: Path) -> list[dict[str, str]]:
    results = []
    for pending in sorted((state / "publishing/registrations").glob("*.json")):
        try:
            record = load_json(pending)
            if not Path(record.get("publish_receipt", "")).is_file():
                continue
            activate(state, record["gate_id"])
            results.append({"gate_id": record["gate_id"], "enrollment": "activated"})
        except Exception as exc:
            results.append({"registration": pending.name, "enrollment": "held", "error_type": type(exc).__name__})
    return results
