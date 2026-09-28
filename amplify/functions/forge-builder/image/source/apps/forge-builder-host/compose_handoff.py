"""Compose the final Forge customer handoff after a verified repo readback."""
from __future__ import annotations

import argparse
import json
import re
from email.message import EmailMessage
from pathlib import Path

ADDRESS = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
WINDOWS = frozenset({"skills", "commands", "presence", "chat", "canvas", "proposals", "checks",
                     "config", "knowledge", "tasks", "artifacts", "console", "changes"})


def validate_acceptance(receipt: dict, acceptance: dict) -> None:
    if acceptance.get("schema_version") != "forge-hosted-acceptance.v1":
        raise ValueError("hosted_acceptance_receipt_required")
    for field in ("tenant_id", "agent_id", "packet_id", "repository", "commit"):
        if acceptance.get(field) != receipt.get(field):
            raise ValueError("hosted_acceptance_binding_mismatch")
    if acceptance.get("portal_url") != f"https://gbautomation.xyz/atlas/{receipt['agent_id']}":
        raise ValueError("hosted_portal_readback_required")
    if acceptance.get("status") != "verified" or acceptance.get("login") != "verified" or acceptance.get("repo_access") != "verified" or acceptance.get("packet_download") != "verified":
        raise ValueError("hosted_acceptance_incomplete")
    if acceptance.get("registry_source") != "s3" or receipt["agent_id"] not in acceptance.get("registered_agents", []):
        raise ValueError("hosted_registry_readback_required")
    windows = acceptance.get("windows")
    if not isinstance(windows, dict) or set(windows) != WINDOWS or any(state != "live_verified" for state in windows.values()):
        raise ValueError("live_windows_readback_required")
    if acceptance.get("deployed_task") != "verified":
        raise ValueError("deployed_task_readback_required")


def compose(receipt: dict, recipient: str, acceptance: dict) -> EmailMessage:
    if not ADDRESS.fullmatch(recipient):
        raise ValueError("invalid_recipient")
    if receipt.get("schema_version") != "forge-repository-handoff.v1" or receipt.get("state") != "created":
        raise ValueError("verified_repository_required")
    repo = receipt.get("repository")
    agent = receipt.get("agent_id")
    if not isinstance(repo, str) or not repo.startswith("gbauto/") or not re.fullmatch(r"[a-z][a-z0-9-]{2,62}", agent or ""):
        raise ValueError("invalid_repository_binding")
    expected = f"https://github.com/{repo}"
    if receipt.get("url") != expected or not re.fullmatch(r"[a-f0-9]{40}", receipt.get("commit") or ""):
        raise ValueError("repository_readback_required")
    if not re.fullmatch(r"[A-Za-z0-9-]{1,39}", receipt.get("github_user") or "") or receipt.get("customer_access") not in {"invited", "active"}:
        raise ValueError("customer_github_access_required")
    validate_acceptance(receipt, acceptance)
    portal = f"https://gbautomation.xyz/atlas/{agent}"
    message = EmailMessage()
    message["From"] = "greg@gbautomation.xyz"
    message["To"] = recipient
    message["Subject"] = f"Your Agent Forge workspace and source - {agent}"
    message.set_content(f"""Your agent source and private Forge workspace are ready for review.\n\nAgent Forge: {portal}\nPrivate GitHub repository: {expected}\n\nTo download the source:\n1. Accept the GitHub invitation for the account you gave us and sign in.\n2. Open the private repository link above.\n3. Select Code, then Download ZIP. Extract it on your computer.\n\nTo download the generated agent packet and view live status:\n1. Sign in to Agent Forge with your registered email using the workspace link above.\n2. Select {agent} in the Registered agents dropdown.\n3. Open the Artifacts window and download the package.\n\nReply to this email if either link or your login does not work.\n\nRepository commit: {receipt['commit']}\n""")
    return message


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("receipt", type=Path)
    parser.add_argument("--to", required=True)
    parser.add_argument("--acceptance", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    message = compose(json.loads(args.receipt.read_text(encoding="utf-8")), args.to,
                      json.loads(args.acceptance.read_text(encoding="utf-8")))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(message.as_bytes())
    print(json.dumps({"status": "drafted", "recipient": args.to, "path": str(args.output)}))


if __name__ == "__main__":
    main()
