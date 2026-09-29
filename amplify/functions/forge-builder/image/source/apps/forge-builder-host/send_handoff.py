"""Send one verified Forge handoff through the existing Google Workspace CLI.

The default is a dry run. An interrupted send remains ambiguous and is never
retried automatically; the operator must inspect Gmail by Message-ID.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from email.utils import getaddresses
from email.policy import SMTP
from pathlib import Path
import subprocess
import sys
import time

from compose_handoff import compose


def gws(args: list[str]) -> dict:
    runner = os.environ.get("FORGE_GWS_RUNNER")
    credentials = os.environ.get("GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE")
    if not runner or not credentials or not Path(runner).is_file() or not Path(credentials).is_file():
        raise RuntimeError("gws_not_configured")
    command = ["node", runner, "gmail", "users", *args]
    result = subprocess.run(command, capture_output=True, text=True, timeout=30, check=False)
    if result.returncode:
        raise RuntimeError("gws_request_failed")
    try:
        value = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError("gws_response_invalid") from error
    if not isinstance(value, dict) or value.get("error"):
        raise RuntimeError("gws_request_failed")
    return value


def headers(value: dict) -> dict[str, str]:
    rows = value.get("payload", {}).get("headers", [])
    return {str(row.get("name", "")).lower(): str(row.get("value", "")) for row in rows if isinstance(row, dict)}


def send(receipt: dict, acceptance: dict, recipient: str, output: Path, *, apply: bool = False) -> dict:
    message = compose(receipt, recipient, acceptance)
    raw = message.as_bytes(policy=SMTP)
    result = {"schema_version": "forge-handoff-email.v1", "state": "prepared",
              "message_id": message["Message-ID"], "recipient_sha256": hashlib.sha256(recipient.lower().encode()).hexdigest(),
              "mime_sha256": hashlib.sha256(raw).hexdigest(), "repository": receipt["repository"],
              "packet_id": receipt["packet_id"]}
    if not apply:
        return result
    if output.exists():
        raise RuntimeError("existing_send_receipt_review_required")
    profile = gws(["getProfile", "--params", json.dumps({"userId": "me"})])
    if profile.get("emailAddress", "").lower() != "greg@gbautomation.xyz":
        raise RuntimeError("sender_identity_mismatch")
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("x", encoding="utf-8") as file:
        json.dump({**result, "state": "sending"}, file, indent=2)
        file.write("\n")
    encoded = base64.urlsafe_b64encode(raw).decode().rstrip("=")
    sent = gws(["messages", "send", "--params", json.dumps({"userId": "me"}),
                "--json", json.dumps({"raw": encoded})])
    provider_id = sent.get("id")
    if not isinstance(provider_id, str) or not provider_id:
        raise RuntimeError("ambiguous_handoff_send")
    for attempt in range(3):
        observed = gws(["messages", "get", "--params", json.dumps({"userId": "me", "id": provider_id,
                          "format": "metadata", "metadataHeaders": ["From", "To", "Subject", "Message-ID"]})])
        found = headers(observed)
        to_addresses = [address.lower() for _, address in getaddresses([found.get("to", "")])]
        from_addresses = [address.lower() for _, address in getaddresses([found.get("from", "")])]
        if (found.get("message-id") == result["message_id"] and to_addresses == [recipient.lower()]
                and from_addresses == ["greg@gbautomation.xyz"]):
            result.update({"state": "sent_verified", "provider_id": provider_id,
                           "sent_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
            output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
            return result
        if attempt < 2:
            time.sleep(1)
    raise RuntimeError("handoff_sent_readback_unverified")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repository_receipt", type=Path)
    parser.add_argument("--acceptance", type=Path, required=True)
    parser.add_argument("--to", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    receipt = json.loads(args.repository_receipt.read_text(encoding="utf-8"))
    acceptance = json.loads(args.acceptance.read_text(encoding="utf-8"))
    result = send(receipt, acceptance, args.to, args.output, apply=args.apply)
    print(json.dumps({"state": result["state"], "message_id": result["message_id"],
                      "receipt": str(args.output)}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
