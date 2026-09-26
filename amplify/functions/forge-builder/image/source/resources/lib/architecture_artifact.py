"""Validation and lineage helpers for TAC planning architecture artifacts."""
from __future__ import annotations

import copy
import hashlib
import json
import re
import uuid
from pathlib import Path
from typing import Any

import yaml


SCHEMA_VERSION = "architecture-artifact.v1"
LINK_SCHEMA_VERSION = "architecture-link.v1"
REQUIREMENT_SCHEMA_VERSION = "architecture-requirement.v1"
ALLOWED_STATUSES = {"proposed", "approved", "implemented", "superseded"}
ALLOWED_SCOPES = {"system", "service", "workflow", "component", "infrastructure", "agent-team"}
DISPATCH_STATUSES = {"approved", "implemented"}
REQUIREMENT_STATES = {"pending", "linked"}
TASK_LINK_RELATIONSHIPS = {"primary", "inherited", "implemented", "superseded"}
SHA_RE = re.compile(r"^[0-9a-f]{64}$")
MERMAID_HEADER_RE = re.compile(r"^\s*(?:flowchart|graph)\s+(?:TB|TD|BT|RL|LR)\b", re.IGNORECASE)
MERMAID_EDGE_RE = re.compile(r"-->|---|-.->|==>")
SECRET_RE = re.compile(
    r"(?:sk-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}"
    r"|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})"
)


class ArchitectureArtifactError(RuntimeError):
    """Raised when an architecture artifact cannot be loaded or validated."""


def load_artifact(path: Path) -> dict[str, Any]:
    try:
        value = yaml.safe_load(path.read_text(encoding="utf-8-sig"))
    except (OSError, yaml.YAMLError) as exc:
        raise ArchitectureArtifactError(f"could not load architecture artifact {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ArchitectureArtifactError("architecture artifact must be a YAML object")
    return value


def canonical_artifact_bytes(artifact: dict[str, Any]) -> bytes:
    payload = copy.deepcopy(artifact)
    payload.pop("sha256", None)
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")


def compute_artifact_sha256(artifact: dict[str, Any]) -> str:
    return hashlib.sha256(canonical_artifact_bytes(artifact)).hexdigest()


def diagram_sources(artifact: dict[str, Any]) -> tuple[str, str]:
    diagrams = artifact.get("diagrams")
    if not isinstance(diagrams, dict):
        return "", ""
    transition = diagrams.get("transition")
    target = diagrams.get("target_architecture")
    transition_source = transition.get("mermaid") if isinstance(transition, dict) else ""
    target_source = target.get("mermaid") if isinstance(target, dict) else ""
    return str(transition_source or "").strip(), str(target_source or "").strip()


def compute_diagram_bundle_sha256(transition_mermaid: str, end_build_mermaid: str) -> str:
    payload = {
        "end_build_mermaid": end_build_mermaid.strip(),
        "transition_mermaid": transition_mermaid.strip(),
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def validate_mermaid(source: str, *, transition: bool) -> list[str]:
    errors: list[str] = []
    if not source:
        return ["Mermaid source is required"]
    if "```" in source:
        errors.append("Mermaid source must not include Markdown fences")
    if not MERMAID_HEADER_RE.search(source):
        errors.append("Mermaid source must start with flowchart/graph and a direction")
    if not MERMAID_EDGE_RE.search(source):
        errors.append("Mermaid source must contain at least one relationship edge")
    if transition:
        if not re.search(r"\bsubgraph\s+before\b", source, re.IGNORECASE):
            errors.append("transition diagram must contain a before subgraph")
        if not re.search(r"\bsubgraph\s+after\b", source, re.IGNORECASE):
            errors.append("transition diagram must contain an after subgraph")
    return errors


def validate_artifact(artifact: dict[str, Any], *, phase: str = "plan") -> list[str]:
    errors: list[str] = []
    if artifact.get("schema_version") != SCHEMA_VERSION:
        errors.append(f"schema_version must be {SCHEMA_VERSION}")
    for key in ("architecture_id", "plan_id", "source_ref"):
        if not str(artifact.get(key) or "").strip():
            errors.append(f"{key} is required")
    try:
        version = int(artifact.get("version"))
        if version < 1:
            errors.append("version must be at least 1")
    except (TypeError, ValueError):
        errors.append("version must be an integer")
    status = str(artifact.get("status") or "")
    if status not in ALLOWED_STATUSES:
        errors.append(f"status must be one of {', '.join(sorted(ALLOWED_STATUSES))}")
    if phase == "dispatch" and status not in DISPATCH_STATUSES:
        errors.append("dispatch requires architecture status approved or implemented")
    scope = str(artifact.get("scope") or "")
    if scope not in ALLOWED_SCOPES:
        errors.append(f"scope must be one of {', '.join(sorted(ALLOWED_SCOPES))}")
    components = artifact.get("components")
    if not isinstance(components, list) or not components:
        errors.append("components must contain at least one target architecture component")
    for key in ("integrations", "data_stores", "external_systems"):
        if not isinstance(artifact.get(key), list):
            errors.append(f"{key} must be a list")
    if SECRET_RE.search(json.dumps(artifact, ensure_ascii=True)):
        errors.append("architecture artifact contains a secret-like value")

    transition_mermaid, end_build_mermaid = diagram_sources(artifact)
    errors.extend(f"diagrams.transition: {item}" for item in validate_mermaid(transition_mermaid, transition=True))
    errors.extend(
        f"diagrams.target_architecture: {item}"
        for item in validate_mermaid(end_build_mermaid, transition=False)
    )

    digest = str(artifact.get("sha256") or "")
    if not SHA_RE.fullmatch(digest):
        errors.append("sha256 must be a lowercase 64-character digest")
    elif digest != compute_artifact_sha256(artifact):
        errors.append("sha256 does not match canonical artifact content")
    return errors


def stamp_artifact(artifact: dict[str, Any]) -> dict[str, Any]:
    stamped = copy.deepcopy(artifact)
    stamped["sha256"] = compute_artifact_sha256(stamped)
    return stamped


def build_requirement_payload(*, plan_id: str = "", state: str = "pending") -> dict[str, Any]:
    return {
        "schema_version": REQUIREMENT_SCHEMA_VERSION,
        "requirement": "planning_architecture",
        "state": state,
        "plan_id": plan_id,
        "forward_only": True,
    }


def validate_requirement_payload(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if payload.get("schema_version") != REQUIREMENT_SCHEMA_VERSION:
        errors.append(f"schema_version must be {REQUIREMENT_SCHEMA_VERSION}")
    if payload.get("requirement") != "planning_architecture":
        errors.append("requirement must be planning_architecture")
    if payload.get("forward_only") is not True:
        errors.append("forward_only must be true")
    state = str(payload.get("state") or "")
    if state not in REQUIREMENT_STATES:
        errors.append(f"state must be one of {', '.join(sorted(REQUIREMENT_STATES))}")
    if state == "linked" and not str(payload.get("plan_id") or "").strip():
        errors.append("linked requirement must include plan_id")
    return errors


def build_link_payload(artifact: dict[str, Any]) -> dict[str, Any]:
    errors = validate_artifact(artifact, phase="dispatch")
    if errors:
        raise ArchitectureArtifactError("; ".join(errors))
    transition_mermaid, end_build_mermaid = diagram_sources(artifact)
    return {
        "schema_version": LINK_SCHEMA_VERSION,
        "architecture_id": str(artifact["architecture_id"]),
        "plan_id": str(artifact["plan_id"]),
        "version": int(artifact["version"]),
        "status": str(artifact["status"]),
        "scope": str(artifact["scope"]),
        "source_ref": str(artifact["source_ref"]),
        "artifact_sha256": str(artifact["sha256"]),
        "diagram_bundle_sha256": compute_diagram_bundle_sha256(transition_mermaid, end_build_mermaid),
        "transition_mermaid": transition_mermaid,
        "end_build_mermaid": end_build_mermaid,
        "components": copy.deepcopy(artifact.get("components") or []),
    }


def validate_link_payload(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if payload.get("schema_version") != LINK_SCHEMA_VERSION:
        errors.append(f"schema_version must be {LINK_SCHEMA_VERSION}")
    for key in ("architecture_id", "plan_id", "source_ref"):
        if not str(payload.get(key) or "").strip():
            errors.append(f"{key} is required")
    try:
        if int(payload.get("version")) < 1:
            errors.append("version must be at least 1")
    except (TypeError, ValueError):
        errors.append("version must be an integer")
    if str(payload.get("scope") or "") not in ALLOWED_SCOPES:
        errors.append(f"scope must be one of {', '.join(sorted(ALLOWED_SCOPES))}")
    if str(payload.get("status") or "") not in DISPATCH_STATUSES:
        errors.append("linked architecture status must be approved or implemented")
    artifact_sha = str(payload.get("artifact_sha256") or "")
    if not SHA_RE.fullmatch(artifact_sha):
        errors.append("artifact_sha256 must be a lowercase 64-character digest")
    transition = str(payload.get("transition_mermaid") or "").strip()
    end_build = str(payload.get("end_build_mermaid") or "").strip()
    errors.extend(f"transition_mermaid: {item}" for item in validate_mermaid(transition, transition=True))
    errors.extend(f"end_build_mermaid: {item}" for item in validate_mermaid(end_build, transition=False))
    expected = compute_diagram_bundle_sha256(transition, end_build)
    if str(payload.get("diagram_bundle_sha256") or "") != expected:
        errors.append("diagram_bundle_sha256 does not match linked Mermaid sources")
    if SECRET_RE.search(json.dumps(payload, ensure_ascii=True)):
        errors.append("architecture link contains a secret-like value")
    return errors


def supabase_artifact_row(artifact: dict[str, Any]) -> dict[str, Any]:
    errors = validate_artifact(artifact, phase="plan")
    if errors:
        raise ArchitectureArtifactError("; ".join(errors))
    transition_mermaid, end_build_mermaid = diagram_sources(artifact)
    version = int(artifact["version"])
    return {
        "architecture_version_id": f"{artifact['architecture_id']}:v{version}",
        "architecture_id": artifact["architecture_id"],
        "version": version,
        "plan_id": artifact["plan_id"],
        "status": artifact["status"],
        "scope": artifact["scope"],
        "source_ref": artifact["source_ref"],
        "artifact_sha256": artifact["sha256"],
        "diagram_bundle_sha256": compute_diagram_bundle_sha256(transition_mermaid, end_build_mermaid),
        "transition_mermaid": transition_mermaid,
        "target_architecture_mermaid": end_build_mermaid,
        "components": artifact.get("components") or [],
        "integrations": artifact.get("integrations") or [],
        "data_stores": artifact.get("data_stores") or [],
        "external_systems": artifact.get("external_systems") or [],
        "metadata": {"schema_version": SCHEMA_VERSION, "supersedes": artifact.get("supersedes")},
    }


def supabase_task_link_row(
    artifact: dict[str, Any],
    *,
    board_slug: str,
    task_id: str,
    relationship: str,
    evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    artifact_row = supabase_artifact_row(artifact)
    clean_board = board_slug.strip()
    clean_task = task_id.strip()
    if not clean_board:
        raise ArchitectureArtifactError("board_slug is required")
    if not clean_task:
        raise ArchitectureArtifactError("task_id is required")
    if relationship not in TASK_LINK_RELATIONSHIPS:
        raise ArchitectureArtifactError(
            f"relationship must be one of {', '.join(sorted(TASK_LINK_RELATIONSHIPS))}"
        )
    architecture_version_id = str(artifact_row["architecture_version_id"])
    stable_key = f"{architecture_version_id}:{clean_board}:{clean_task}:{relationship}"
    return {
        "link_id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"gbauto:architecture-task-link:{stable_key}")),
        "architecture_version_id": architecture_version_id,
        "board_slug": clean_board,
        "task_id": clean_task,
        "relationship": relationship,
        "evidence": {
            "schema_version": LINK_SCHEMA_VERSION,
            "artifact_sha256": artifact_row["artifact_sha256"],
            "diagram_bundle_sha256": artifact_row["diagram_bundle_sha256"],
            **(evidence or {}),
        },
    }
