"""Shared role/operation declarations. No credentials, SQL, network or execution.

This module describes target permissions. A policy match is NOT runtime
authorization: host identity, database grants/RLS and operation adapters must
enforce these boundaries before production operations can be enabled.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path
from urllib.parse import urlsplit

import yaml

ROOT = Path(__file__).resolve().parents[2]
POLICY_PATH = ROOT / "config/agent-operating-policy.yaml"
POLICY_REF = "config/agent-operating-policy.yaml"
EXPERT_PROFILE = re.compile(r"expert-gbautomation-[a-z][a-z0-9]*(?:-[a-z0-9]+)*\Z")


class PolicyError(ValueError):
    pass


def validate_policy(policy: dict) -> None:
    """Validate the closed non-secret contract before projecting it."""
    from jsonschema import Draft202012Validator

    import json
    schema = json.loads((ROOT / "config/schemas/agent-operating-policy.v1.schema.json").read_text("utf-8"))
    errors = sorted(Draft202012Validator(schema).iter_errors(policy), key=lambda e: str(e.path))
    if errors:
        raise PolicyError("; ".join(e.message for e in errors))
    operations = policy["operations"]
    exclusive = {"code.write": "engineer", "development_db.use": "engineer",
                 "validation.run": "validator", "verification.append": "validator",
                 "release.deploy": "ops", "database.administer": "database_admin",
                 "plan.write": "planner"}
    for role, data in policy["roles"].items():
        if set(data["operations"]) - operations.keys():
            raise PolicyError(f"unknown operation in role {role}")
        if set(data["handoffs"].values()) - policy["profiles"].keys():
            raise PolicyError(f"unresolved handoff in role {role}")
        if any(op in exclusive and exclusive[op] != role for op in data["operations"]):
            raise PolicyError(f"role crosses approved responsibility boundary: {role}")
        if any(operations[op]["scope"] == "domain" for op in data["operations"]):
            raise PolicyError("domain operations require an exact profile binding")
    for profile, data in policy["profiles"].items():
        if data["role"] not in policy["roles"]:
            raise PolicyError(f"unknown role for {profile}")
        if set(data["extra_operations"]) - operations.keys():
            raise PolicyError(f"unknown operation for {profile}")
        # Specialist extensions are domain operations, never a route to admin.
        if data["extra_operations"] and (data["role"] != "specialist" or any(operations[op]["scope"] != "domain" for op in data["extra_operations"])):
            raise PolicyError(f"specialist extension escalates authority: {profile}")
    url = urlsplit(policy["planning"]["public_reports_url"])
    if url.scheme != "https" or not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in ("", "/"):
        raise PolicyError("public report destination must be a credential-free HTTPS origin")
    for key in ("lifecycle", "preferences", "renderer", "html_standard"):
        source = policy["planning"][key]
        path = (ROOT / source).resolve()
        if not path.is_relative_to(ROOT) or not path.is_file():
            raise PolicyError(f"invalid canonical source: {key}")


def load_policy(path: Path = POLICY_PATH) -> dict:
    policy = yaml.safe_load(path.read_text("utf-8"))
    validate_policy(policy)
    return policy


def policy_hash(path: Path = POLICY_PATH) -> str:
    return hashlib.sha256(path.read_text("utf-8").replace("\r\n", "\n").encode()).hexdigest()


def projection(profile: str, *, policy: dict | None = None) -> dict:
    """Resolve an exact profile, or the restricted GBAutomation expert default."""
    policy = load_policy() if policy is None else policy
    validate_policy(policy)
    binding = policy["profiles"].get(profile)
    if binding is None and EXPERT_PROFILE.fullmatch(profile):
        binding = {"role": "specialist", "extra_operations": []}
    role_id = binding["role"] if binding else "unregistered"
    role = policy["roles"].get(role_id, {})
    names = sorted(set(role.get("operations", []) + (binding or {}).get("extra_operations", [])))
    return {
        "schema_version": "agent-operating-context.v1",
        "policy_ref": POLICY_REF,
        "profile": profile,
        "tenant": policy["tenant"] if binding else None,
        "role": role_id,
        "display_name": (binding or {}).get("display_name", profile),
        "owns": role.get("owns", "Unregistered: no operational permissions"),
        "operations": {name: policy["operations"][name] for name in names},
        "handoffs": dict(role.get("handoffs", {})),
        "planning": dict(policy["planning"]),
        "execution_enabled": False,
        "enforcement_status": "declaration_only_runtime_enforcement_unverified",
    }


def describe_operation(profile: str, operation: str, *, policy: dict | None = None) -> dict:
    context = projection(profile, policy=policy)
    declared = context["operations"].get(operation)
    return {
        "profile": profile,
        "operation": operation,
        "declared": declared is not None,
        "contract": declared,
        "execution_authorized": False,
        "reason": "requires_runtime_enforcement" if declared else "not_declared_for_profile",
    }


def prompt_context(profile: str, *, policy: dict | None = None) -> str:
    context = projection(profile, policy=policy)
    p = context["planning"]
    lines = [
        "Shared planning and responsibility contract:",
        f"- Read {POLICY_REF} and {p['preferences']}.",
        f"- Role: {context['display_name']} / {context['role']}. Owns: {context['owns']}.",
        f"- Durable planning delegates exactly once to {p['lifecycle']}; reuse confirmed intake and the shared HTML template.",
        f"- Renderer: {p['renderer']}; standard: {p['html_standard']}.",
        f"- Public reports: {p['public_reports_url']}; actual artifact URLs come from verified publication receipts.",
        "- Sharing this URL grants no publishing authority. This contract contains no deployment or database credentials.",
        "- Target operations: " + (", ".join(context["operations"]) or "none"),
    ]
    lines.extend(f"- {kind}: hand off to {owner}." for kind, owner in context["handoffs"].items())
    lines.append("- These are declarations, not granted production access. Follow the scoped runtime adapter; never infer raw SQL, migration, secret access or approval authority from a role or tool name.")
    return "\n".join(lines) + "\n"


def apply_context(config: dict) -> dict:
    """Project current source policy into a generated profile without secrets."""
    profile = str(config.get("name") or "")
    policy = load_policy()
    if profile not in policy["profiles"] and not EXPERT_PROFILE.fullmatch(profile):
        return config  # Other tenants and unrelated profiles need their own policy.
    config["x_gbautomation_operating_context"] = projection(profile, policy=policy)
    config["x_gbautomation_operating_context"]["policy_sha256"] = policy_hash()
    begin, end = "<gbauto-operating-context>", "</gbauto-operating-context>"
    previous = str(config.get("system_prompt_addendum") or "")
    previous = re.sub(re.escape(begin) + r".*?" + re.escape(end), "", previous, flags=re.S).rstrip()
    config["system_prompt_addendum"] = previous + "\n\n" + begin + "\n" + prompt_context(profile, policy=policy) + end + "\n"
    return config
