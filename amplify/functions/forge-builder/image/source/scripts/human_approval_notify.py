"""Compact approval notifications and deterministic labels in the sender mailbox."""
from __future__ import annotations

import base64
import json
import sys
from typing import Any

from resources.lib.gmail_send_policy import gate, complete_receipt
from resources.lib.plan_email import build_plan_message, plan_email_fields

SENDER = "greg@gbautomation.xyz"
PROFILE = "expert-gbautomation-google-workspace"
STATUS_LABELS = {"Status/Needs Review", "Status/Approved", "Status/In Progress", "Status/Blocked", "Status/Completed", "Status/Declined"}
CATEGORIES = {"New Capability", "Improvement", "Bug Fix", "Maintenance", "Research"}


def label_notification(gmail: Any, message_id: str, packet: dict[str, Any], *, status: str = "Needs Review") -> dict[str, Any]:
    """Label only this message in its authenticated recipient mailbox."""
    mailbox = gmail.users().getProfile(userId="me").execute()["emailAddress"]
    if mailbox.casefold() != str(packet["approval_recipient"]).casefold():
        return {"applied": False, "reason": "recipient_mailbox_not_authenticated"}
    wanted = ["Plans", f"Status/{status}"]
    if wanted[-1] not in STATUS_LABELS:
        raise ValueError("unknown plan display status")
    fields = plan_email_fields(packet)
    if fields["agent"]:
        wanted.append("Agent/" + fields["agent"])
    if fields["category"] in CATEGORIES:
        wanted.append("Category/" + fields["category"])
    labels = {row["name"]: row["id"] for row in gmail.users().labels().list(userId="me").execute().get("labels", [])}
    for name in wanted:
        if name not in labels:
            labels[name] = gmail.users().labels().create(userId="me", body={"name": name}).execute()["id"]
    remove = [identifier for name, identifier in labels.items() if name in STATUS_LABELS and name not in wanted]
    gmail.users().messages().modify(userId="me", id=message_id, body={"addLabelIds": [labels[name] for name in wanted], "removeLabelIds": remove}).execute()
    actual = gmail.users().messages().get(userId="me", id=message_id, format="minimal").execute()
    actual_ids = set(actual.get("labelIds", []))
    if not set(labels[name] for name in wanted) <= actual_ids or actual_ids.intersection(remove):
        raise RuntimeError("notification label readback failed")
    return {"applied": True, "labels": wanted}


def send_notification(gmail: Any, recipient: str, subject: str, signed_url: str, packet: dict[str, Any]) -> str:
    decision = gate(to=recipient, profile=PROFILE, code_path="human_approval_gate.send_email", subject=subject)
    fields = plan_email_fields({**packet, "summary": packet["recommendation"], "email_status": "Needs Review"})
    message = build_plan_message(to_addr=recipient, from_addr=SENDER, subject=subject, title=packet["title"], live_url=signed_url, **fields)
    message["X-GBAuto-Approval-Gate"] = str(packet["gate_id"])
    try:
        sent = gmail.users().messages().send(userId="me", body={"raw": base64.urlsafe_b64encode(message.as_bytes()).decode()}).execute()
    except Exception as exc:
        # Never include message content or the signed link in error telemetry.
        complete_receipt(decision, error=type(exc).__name__)
        raise
    complete_receipt(decision, message_id=sent["id"], thread_id=sent.get("threadId"))
    # A label failure must not turn a completed send into a retryable send error.
    # The publisher/verification workflow can retry labels by this message ID.
    try:
        label_notification(gmail, sent["id"], packet)
    except Exception as exc:
        print(json.dumps({"notification_message_id": sent["id"], "labels": "retry_required", "error_type": type(exc).__name__}), file=sys.stderr)
    return str(sent["id"])
