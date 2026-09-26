"""Project verified plan/task state onto one bound Gmail message, never send mail."""
from __future__ import annotations

import sqlite3
from email.utils import getaddresses
from pathlib import Path
from typing import Any, Callable

from scripts.human_approval_enroll import atomic_json
from scripts.human_approval_gate import gmail_service, load_json
from scripts.human_approval_notify import label_notification
from scripts.human_approval_resume import utc_now


def display_status(registration: dict[str, Any], receipt: dict[str, Any] | None) -> tuple[str, bool]:
    if receipt is None:
        return "Needs Review", False
    if receipt["decision"] == "reject":
        return "Declined", True
    if receipt["decision"] in {"request_changes", "snooze"}:
        return "Blocked", True
    if receipt["decision"] != "approve":
        raise ValueError("unknown verified decision")
    targets = receipt["allowed_resume_targets"]
    if set(targets) != set(registration["expected_targets"]):
        raise ValueError("receipt targets differ from registration")
    db = Path(registration["db"])
    with sqlite3.connect(db.as_uri() + "?mode=ro", uri=True) as conn:
        states = {row[0]: row[1] for row in conn.execute(
            "SELECT id,status FROM tasks WHERE id IN (%s)" % ",".join("?" for _ in targets), tuple(targets))}
    if set(states) != set(targets):
        raise ValueError("notification target missing")
    values = set(states.values())
    if values <= {"done"}:
        return "Completed", True
    if values & {"blocked", "triage", "failed", "scheduled", "archived", "superseded"}:
        return "Blocked", False
    if values & {"running", "review"}:
        return "In Progress", False
    if values <= {"ready", "todo", "done"}:
        return "Approved", False
    raise ValueError("unknown task status")


def sync_notification(registration: dict[str, Any], packet: dict[str, Any], state: Path,
                      receipt: dict[str, Any] | None, *, service_factory: Callable = gmail_service) -> dict[str, Any]:
    notification = registration.get("notification")
    if not notification:
        return {"state": "not_bound"}
    destination = state / "labels" / f"{packet['gate_id']}.json"
    previous = load_json(destination) if destination.exists() else {}
    identity = {"message_id": notification["message_id"], "recipient": notification["recipient"], "gate_id": packet["gate_id"]}
    if previous and any(previous.get(key) != value for key, value in identity.items()):
        raise ValueError("notification binding changed")
    if previous.get("terminal"):
        return {"state": "unchanged", "status": previous["status"]}
    status, terminal = display_status(registration, receipt)
    if previous.get("status") == status:
        return {"state": "unchanged", "status": status}
    gmail = service_factory()
    mailbox = gmail.users().getProfile(userId="me").execute()["emailAddress"]
    if mailbox.casefold() != notification["recipient"].casefold() or mailbox.casefold() != packet["approval_recipient"].casefold():
        return {"state": "mailbox_unavailable"}
    message = gmail.users().messages().get(userId="me", id=notification["message_id"], format="metadata",
                                            metadataHeaders=["To", "X-GBAuto-Approval-Gate"]).execute()
    headers = {row["name"].lower(): row["value"] for row in message.get("payload", {}).get("headers", [])}
    recipients = {address.casefold() for _, address in getaddresses([headers.get("to", "")])}
    if headers.get("x-gbauto-approval-gate") != packet["gate_id"] or mailbox.casefold() not in recipients:
        raise ValueError("message does not match the approval gate/recipient")
    result = label_notification(gmail, notification["message_id"], packet, status=status)
    if not result["applied"]:
        return {"state": "mailbox_unavailable"}
    atomic_json(destination, {**identity, "status": status, "terminal": terminal, "synced_at": utc_now(),
                              "event_id": receipt.get("event_id") if receipt else None})
    return {"state": "synced", "status": status}
