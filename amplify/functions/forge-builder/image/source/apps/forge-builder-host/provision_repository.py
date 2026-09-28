"""Provision one private customer-facing GitHub repository from a verified Forge packet.

Dry-run is the default. Apply requires the exact approved packet and repo target.
No raw intake, approval decisions, provider settings, or source manifest are published.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ALLOWED_TOP = {"agent-expert-config.json", "expert-config.yaml"}
SLUG = re.compile(r"^[a-z][a-z0-9-]{2,62}$")
SHA = re.compile(r"^[a-f0-9]{64}$")
OWNER = "gbauto"
GITHUB_USER = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def run(args: list[str], *, cwd: Path | None = None, input_text: str | None = None) -> str:
    p = subprocess.run(args, cwd=cwd, input=input_text, capture_output=True, text=True,
                       encoding="utf-8", timeout=90, check=False)
    if p.returncode:
        raise RuntimeError(f"command failed: {args[0]} {args[1]} (exit {p.returncode})")
    return p.stdout.strip()


def select_files(packet: Path) -> tuple[dict[str, bytes], dict]:
    if packet.is_symlink() or not packet.is_dir():
        raise ValueError("packet_directory_required")
    manifest_path = packet / "packet-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    packet_id = manifest.get("packet_id")
    if not isinstance(packet_id, str) or not SHA.fullmatch(packet_id):
        raise ValueError("packet_id_invalid")
    if manifest.get("runtime_authorized") is not False:
        raise ValueError("unexpected_runtime_authority")
    rows = manifest.get("files")
    if not isinstance(rows, list) or not rows or len(rows) > 100:
        raise ValueError("packet_inventory_invalid")
    actual = {p.relative_to(packet).as_posix() for p in packet.rglob("*") if p.is_file()}
    expected = {"packet-manifest.json"}
    selected: dict[str, bytes] = {}
    agent = manifest.get("binding", {}).get("agent_id")
    if not isinstance(agent, str) or not SLUG.fullmatch(agent):
        raise ValueError("agent_id_invalid")
    for row in rows:
        name = row.get("path") if isinstance(row, dict) else None
        if not isinstance(name, str) or name.startswith("/") or "\\" in name or any(part in {"", ".", ".."} for part in name.split("/")):
            raise ValueError("packet_path_invalid")
        expected.add(name)
        path = packet / name
        if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(packet.resolve()):
            raise ValueError("packet_path_invalid")
        data = path.read_bytes()
        if row.get("bytes") != len(data) or row.get("sha256") != sha(data):
            raise ValueError("packet_hash_mismatch")
        if name in ALLOWED_TOP or name.startswith(f"experts/gbautomation/{agent}/") or name.startswith("assets/"):
            selected[name] = data
    if actual - expected - {"package.zip"} or expected - actual or not any(name.startswith(f"experts/gbautomation/{agent}/") for name in selected):
        raise ValueError("packet_inventory_mismatch")
    return selected, manifest


def repository_name(tenant: str, agent: str) -> str:
    if not SLUG.fullmatch(tenant) or not SLUG.fullmatch(agent):
        raise ValueError("repository_identity_invalid")
    value = f"{tenant}-{agent}"
    if len(value) > 100:
        raise ValueError("repository_name_too_long")
    return value


def prepare(packet: Path, destination: Path) -> dict:
    files, manifest = select_files(packet)
    binding = manifest["binding"]
    repo = repository_name(binding["tenant_id"], binding["agent_id"])
    destination.mkdir(parents=True, exist_ok=False)
    inventory = []
    for name, data in sorted(files.items()):
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        inventory.append({"path": name, "sha256": sha(data), "bytes": len(data)})
    readme = f"""# {binding['agent_id']}\n\nPrivate GBAutomation agent source generated from Forge packet `{manifest['packet_id']}`.\nThis is a reviewed source package. Runtime setup and activation are separate.\n\n## Download\n\n1. Sign in to GitHub with the account invited to this private repository.\n2. Open `https://github.com/{OWNER}/{repo}`.\n3. Choose **Code**, then **Download ZIP**. Extract the ZIP on your computer.\n4. For the exact Forge packet and current deployment status, sign in to Agent Forge using the link in your handoff email.\n\nThe `experts/` directory contains the generated expert files. `agent-expert-config.json` and `expert-config.yaml` describe the configuration. The `assets/` folder contains the selected visuals.\n"""
    (destination / "README.md").write_text(readme, encoding="utf-8")
    record = {"schema_version": "forge-repository-handoff.v1", "tenant_id": binding["tenant_id"],
              "agent_id": binding["agent_id"], "packet_id": manifest["packet_id"],
              "intake_version": manifest.get("intake_version"),
              "approval_evidence": manifest.get("approval_evidence"),
              "repository": f"{OWNER}/{repo}", "visibility": "private", "files": inventory,
              "readme_sha256": sha(readme.encode()), "state": "prepared"}
    (destination / "FORGE-SOURCE-MANIFEST.json").write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return record


def require_hosted_approval(record: dict, packet_id: str | None, intake_version: int | None) -> None:
    if not packet_id or not SHA.fullmatch(packet_id) or intake_version is None or intake_version < 1:
        raise ValueError("exact_packet_and_intake_required")
    if record["packet_id"] != packet_id or record["intake_version"] != intake_version:
        raise ValueError("approved_packet_binding_mismatch")
    if record["approval_evidence"] != "hosted_verified":
        raise ValueError("hosted_approval_evidence_required")


def apply(destination: Path, record: dict, github_user: str) -> dict:
    repo = record["repository"]
    if not GITHUB_USER.fullmatch(github_user):
        raise ValueError("github_customer_required")
    # Exact target only. A pre-existing repository is never overwritten by this command.
    probe = subprocess.run(["gh", "api", f"repos/{repo}", "--jq", ".full_name"],
                           capture_output=True, text=True, encoding="utf-8", timeout=30)
    if probe.returncode == 0:
        raise RuntimeError("repository_already_exists_review_required")
    payload = json.dumps({"name": repo.split("/", 1)[1], "private": True, "auto_init": False,
                          "description": f"Forge source for {record['agent_id']}"})
    created = json.loads(run(["gh", "api", "-X", "POST", f"orgs/{OWNER}/repos", "--input", "-"], input_text=payload))
    if created.get("full_name") != repo or created.get("private") is not True:
        raise RuntimeError("repository_create_readback_failed")
    run(["git", "init", "-b", "main"], cwd=destination)
    run(["git", "add", "--all"], cwd=destination)
    run(["git", "-c", "user.name=GBAutomation Forge", "-c", "user.email=greg@gbautomation.xyz",
         "commit", "-m", f"forge: deliver {record['agent_id']} packet {record['packet_id'][:12]}"], cwd=destination)
    run(["git", "remote", "add", "origin", created["clone_url"]], cwd=destination)
    run(["git", "push", "-u", "origin", "main"], cwd=destination)
    head = run(["git", "rev-parse", "HEAD"], cwd=destination)
    remote = json.loads(run(["gh", "api", f"repos/{repo}/commits/main"]))
    if remote.get("sha") != head:
        raise RuntimeError("repository_commit_readback_failed")
    invitation = run(["gh", "api", "-X", "PUT", f"repos/{repo}/collaborators/{github_user}",
                      "-f", "permission=pull"])
    if invitation:
        invite = json.loads(invitation)
        if invite.get("invitee", {}).get("login", "").lower() != github_user.lower() or invite.get("permissions") not in {"read", "pull"}:
            raise RuntimeError("customer_invitation_readback_failed")
        access = "invited"
    else:
        permission = json.loads(run(["gh", "api", f"repos/{repo}/collaborators/{github_user}/permission"]))
        if permission.get("permission") not in {"read", "write", "admin"}:
            raise RuntimeError("customer_access_readback_failed")
        access = "active"
    record.update({"state": "created", "commit": head, "url": created["html_url"],
                   "github_user": github_user, "customer_access": access})
    return record


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("packet", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--expected-packet-id")
    parser.add_argument("--expected-intake-version", type=int)
    parser.add_argument("--github-user")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="forge-repo-") as tmp:
        staged = Path(tmp) / "source"
        record = prepare(args.packet.resolve(), staged)
        if args.apply:
            require_hosted_approval(record, args.expected_packet_id, args.expected_intake_version)
            record = apply(staged, record, args.github_user or "")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps({"state": record["state"], "repository": record["repository"], "packet_id": record["packet_id"], "files": len(record["files"]), "receipt": str(args.output)}))


if __name__ == "__main__":
    main()
