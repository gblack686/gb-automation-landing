#!/usr/bin/env python3
"""Create, decide, and validate ``gbauto-plan-intake.v1`` receipts.

Receipts store a bounded request summary and hashes, never raw prompt bodies or
secret material. JSON serialization is stable so reviews can bind exact bytes.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# The Agent OS contract data — the 38 v1 JSON Schemas and the 192 conformance
# fixtures — is package data of services/gbauto_agent_os, not a repository
# directory. That package is not installed in a monorepo checkout, so put its
# src/ on the path and then resolve every contract path through the package's
# own accessors. A path built from the repository layout works in a source tree
# and fails the moment a consumer installs the wheel, which is exactly the
# failure the extraction exists to catch.
_AGENT_OS_PKG_SRC = REPO_ROOT / "services" / "gbauto_agent_os" / "src"
if str(_AGENT_OS_PKG_SRC) not in sys.path:
    sys.path.insert(0, str(_AGENT_OS_PKG_SRC))

from gbauto_agent_os import schemas_dir  # noqa: E402
from scripts.agent_os_contract_persistence import persist_validated_document  # noqa: E402

SCHEMA_PATH = schemas_dir() / "gbauto-plan-intake.v1.schema.json"
SCHEMA_VERSION = "gbauto-plan-intake.v1"
MERMAID_START = re.compile(
    # Mermaid permits leading single-line comments and theme directives. Keep
    # their exact text in the receipt while checking the actual diagram header.
    r"^\s*(?:%%[^\r\n]*(?:\r?\n|\r)\s*)*"
    r"(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram"
    r"|erDiagram|journey|gantt|pie|mindmap|timeline)\b",
    re.IGNORECASE,
)
PROHIBITED_KEY = re.compile(
    r"(?:secret|password|credential|api[_-]?key|access[_-]?token"
    r"|refresh[_-]?token|raw[_-]?prompt|prompt[_-]?body)",
    re.IGNORECASE,
)
SECRET_VALUE = re.compile(
    r"(?:sk-[A-Za-z0-9_-]{16,}|gh[opusr]_[A-Za-z0-9]{20,}"
    r"|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)"
)


class PlanIntakeError(RuntimeError):
    """Expected validation or operator-facing command failure."""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def stable_json(value: dict[str, Any]) -> str:
    return json.dumps(value, indent=2, sort_keys=True, ensure_ascii=True) + "\n"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(value, dict):
        raise PlanIntakeError("receipt must be a JSON object")
    return value


def schema() -> dict[str, Any]:
    return load_json(SCHEMA_PATH)


def _walk_sensitive(value: Any, path: str = "$") -> list[str]:
    errors: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            child = f"{path}.{key}"
            if PROHIBITED_KEY.search(str(key)):
                errors.append(f"{child}: prohibited secret-like or raw-prompt field")
            errors.extend(_walk_sensitive(item, child))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            errors.extend(_walk_sensitive(item, f"{path}[{index}]"))
    elif isinstance(value, str) and SECRET_VALUE.search(value):
        errors.append(f"{path}: secret-shaped value is forbidden")
    return errors


def validate_receipt(receipt: dict[str, Any]) -> list[str]:
    validator = Draft7Validator(schema())
    errors = [
        f"{'.'.join(str(part) for part in error.absolute_path) or '$'}: {error.message}"
        for error in sorted(validator.iter_errors(receipt), key=lambda item: list(item.absolute_path))
    ]
    errors.extend(_walk_sensitive(receipt))

    questions = receipt.get("questions")
    if isinstance(questions, list):
        ids = [item.get("id") for item in questions if isinstance(item, dict)]
        duplicates = sorted({item for item in ids if ids.count(item) > 1})
        if duplicates:
            errors.append("questions: duplicate ids: " + ", ".join(str(item) for item in duplicates))

    diagrams = receipt.get("provisional_diagrams")
    if isinstance(diagrams, dict):
        for key in ("transition", "target_architecture"):
            item = diagrams.get(key)
            source = item.get("mermaid") if isinstance(item, dict) else None
            if isinstance(source, str) and not MERMAID_START.search(source):
                errors.append(f"provisional_diagrams.{key}.mermaid: unsupported Mermaid source")

    decision = receipt.get("operator_decision")
    result = receipt.get("result")
    status = receipt.get("status")
    if isinstance(decision, dict):
        scope_approved = decision.get("scope_approval") is True
        planning_authorized = decision.get("planning_authorized") is True
        implementation_authorized = decision.get("implementation_authorized") is True
        implementation = decision.get("implementation_decision")
        implementation_state = (
            implementation.get("decision") if isinstance(implementation, dict) else None
        )
        result_gate = result.get("implementation_gate") if isinstance(result, dict) else None

        if scope_approved != planning_authorized:
            errors.append("operator_decision: scope_approval and planning_authorized must agree")
        if implementation_authorized != (implementation_state == "approved"):
            errors.append(
                "operator_decision: implementation_authorized must be true only for an approved implementation_decision"
            )
        if implementation_authorized != (result_gate == "approved"):
            errors.append(
                "result.implementation_gate must remain distinct and agree with implementation_authorized"
            )
        if implementation_authorized and not scope_approved:
            errors.append("operator_decision: implementation cannot be authorized before scope")
        if status == "implementation_approved" and not implementation_authorized:
            errors.append("status: implementation_approved requires bound implementation approval")
        if implementation_authorized and isinstance(implementation, dict):
            if not implementation.get("authorized_phases"):
                errors.append("implementation_decision.authorized_phases: at least one phase is required")
            for field in ("plan_sha256", "architecture_sha256", "base_commit"):
                if not implementation.get(field):
                    errors.append(f"implementation_decision.{field}: approval must bind this value")
    return sorted(set(errors))


def validate_or_raise(receipt: dict[str, Any]) -> None:
    errors = validate_receipt(receipt)
    if errors:
        raise PlanIntakeError("\n".join(errors))


def write_receipt(path: Path, receipt: dict[str, Any]) -> None:
    validate_or_raise(receipt)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(stable_json(receipt), encoding="utf-8")
    try:
        source_ref = path.resolve().relative_to(REPO_ROOT.resolve()).as_posix()
    except ValueError:
        source_ref = f"external/{path.name}"
    persist_validated_document(receipt, source_ref=source_ref)


def _repo_path(raw: str) -> Path:
    path = (REPO_ROOT / raw).resolve()
    try:
        path.relative_to(REPO_ROOT.resolve())
    except ValueError as exc:
        raise PlanIntakeError(f"path leaves repository: {raw}") from exc
    if not path.is_file():
        raise PlanIntakeError(f"bound artifact does not exist: {raw}")
    return path


def decide(
    receipt: dict[str, Any],
    *,
    gate: str,
    decision: str,
    source: str,
    note: str,
    authorized_phases: list[int] | None = None,
    excluded_actions: list[str] | None = None,
    base_commit: str | None = None,
    decided_at: str | None = None,
) -> dict[str, Any]:
    updated = copy.deepcopy(receipt)
    now = decided_at or utc_now()
    updated["version"] = int(updated.get("version") or 0) + 1
    updated["updated_at"] = now
    operator = updated["operator_decision"]
    result = updated["result"]

    if gate == "scope":
        operator["decision"] = decision
        operator["decided_at"] = now
        operator["source"] = source
        operator["note"] = note
        approved = decision == "approved"
        operator["scope_approval"] = approved
        operator["planning_authorized"] = approved
        operator["implementation_authorized"] = False
        operator["implementation_decision"] = {
            "decision": "pending",
            "decided_at": None,
            "source": None,
            "note": "",
            "authorized_phases": [],
            "excluded_actions": [],
            "plan_sha256": None,
            "architecture_sha256": None,
            "base_commit": None,
        }
        result["implementation_gate"] = "pending"
        updated["status"] = (
            "scope_approved"
            if approved
            else "scope_changes_requested"
            if decision == "changes_requested"
            else "rejected"
        )
    elif gate == "implementation":
        if operator.get("scope_approval") is not True:
            raise PlanIntakeError("scope must be approved before implementation decision")
        approved = decision == "approved"
        plan_path = _repo_path(str(result["plan_path"]))
        architecture_path = _repo_path(str(result["architecture_path"]))
        operator["implementation_authorized"] = approved
        operator["implementation_decision"] = {
            "decision": decision,
            "decided_at": now,
            "source": source,
            "note": note,
            "authorized_phases": sorted(set(authorized_phases or [])) if approved else [],
            "excluded_actions": sorted(set(excluded_actions or [])),
            "plan_sha256": sha256_file(plan_path) if approved else None,
            "architecture_sha256": sha256_file(architecture_path) if approved else None,
            "base_commit": base_commit if approved else None,
        }
        result["implementation_gate"] = decision
        updated["status"] = (
            "implementation_approved"
            if approved
            else "implementation_changes_requested"
            if decision == "changes_requested"
            else "rejected"
        )
    else:
        raise PlanIntakeError(f"unknown gate: {gate}")

    validate_or_raise(updated)
    return updated


def cmd_create(args: argparse.Namespace) -> int:
    receipt = load_json(args.input)
    validate_or_raise(receipt)
    write_receipt(args.output, receipt)
    print(json.dumps({"ok": True, "receipt": str(args.output), "sha256": sha256_file(args.output)}))
    return 0


def cmd_decide(args: argparse.Namespace) -> int:
    receipt = load_json(args.receipt)
    updated = decide(
        receipt,
        gate=args.gate,
        decision=args.decision,
        source=args.source,
        note=args.note,
        authorized_phases=args.phase,
        excluded_actions=args.exclude,
        base_commit=args.base_commit,
    )
    if args.write:
        write_receipt(args.receipt, updated)
        output = str(args.receipt)
    else:
        output = None
        sys.stdout.write(stable_json(updated))
    if args.write:
        print(
            json.dumps(
                {
                    "ok": True,
                    "receipt": output,
                    "version": updated["version"],
                    "status": updated["status"],
                    "sha256": sha256_file(args.receipt),
                }
            )
        )
    return 0


def cmd_validate(args: argparse.Namespace) -> int:
    receipt = load_json(args.receipt)
    errors = validate_receipt(receipt)
    print(
        json.dumps(
            {
                "ok": not errors,
                "receipt": str(args.receipt),
                "schema_version": receipt.get("schema_version"),
                "errors": errors,
            },
            indent=2,
        )
    )
    return 0 if not errors else 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)

    create = commands.add_parser("create", help="validate and deterministically materialize a draft receipt")
    create.add_argument("--input", type=Path, required=True)
    create.add_argument("--output", type=Path, required=True)
    create.set_defaults(func=cmd_create)

    decision = commands.add_parser("decide", help="record a scope or implementation gate decision")
    decision.add_argument("receipt", type=Path)
    decision.add_argument("--gate", choices=["scope", "implementation"], required=True)
    decision.add_argument(
        "--decision",
        choices=["approved", "changes_requested", "rejected"],
        required=True,
    )
    decision.add_argument("--source", default="operator_chat")
    decision.add_argument("--note", default="")
    decision.add_argument("--phase", action="append", type=int, default=[])
    decision.add_argument("--exclude", action="append", default=[])
    decision.add_argument("--base-commit")
    decision.add_argument("--write", action="store_true")
    decision.set_defaults(func=cmd_decide)

    validate = commands.add_parser("validate", help="validate a receipt")
    validate.add_argument("receipt", type=Path)
    validate.set_defaults(func=cmd_validate)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return int(args.func(args))
    except (OSError, json.JSONDecodeError, PlanIntakeError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
