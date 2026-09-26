#!/usr/bin/env python3
"""Validate and persist Agent OS contract documents through gbauto-supabase.

This module is the one write boundary for shared-envelope Agent OS records.
It validates every document against the committed JSON Schema, computes a
canonical payload digest, and invokes the audited ``gbauto-supabase`` CLI.
Native-table contracts are reported but never duplicated into the shared
envelope.

Producer modules call :func:`maybe_persist_document` after durable JSON writes.
That hook is inert unless ``GBAUTO_AGENT_OS_PERSIST_CONTRACTS=1`` is present,
so tests and local fixture generation remain offline while production jobs can
opt into automatic persistence without maintaining a second writer.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import yaml
from jsonschema import validators

if __package__ in (None, ""):  # pragma: no cover - direct script support
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gbauto_agent_os import schemas_dir  # noqa: E402
from gbauto_agent_os._repo import repo_root  # noqa: E402


REPO_ROOT = repo_root()
REGISTRY_PATH = REPO_ROOT / "config" / "agent-os" / "data-contract-registry.yaml"
PERSIST_ENV = "GBAUTO_AGENT_OS_PERSIST_CONTRACTS"
SHARED_MODE = "shared_envelope"
TIMESTAMP_KEYS = (
    "recorded_at",
    "created_at",
    "generated_at",
    "occurred_at",
    "started_at",
    "updated_at",
)
CONTRACT_RE = re.compile(r"^[a-z0-9][a-z0-9.-]*\.v[0-9]+$")
TENANT_RE = re.compile(r"^[a-z][a-z0-9-]{1,63}$")


class ContractRecordError(RuntimeError):
    """Expected validation, registry, or persistence failure."""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def canonical_utc_timestamp(value: Any) -> str | None:
    """Normalize database timestamptz strings to the public schema's UTC form."""
    if value is None:
        return None
    text = str(value)
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return text
    if parsed.tzinfo is None:
        return text
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json(payload: Any) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def payload_sha256(payload: Any) -> str:
    return hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()


def load_registry(path: Path = REGISTRY_PATH) -> dict[str, Any]:
    registry = yaml.safe_load(path.read_text(encoding="utf-8-sig"))
    if not isinstance(registry, dict) or not isinstance(registry.get("entries"), list):
        raise ContractRecordError(f"invalid Agent OS contract registry: {path}")
    return registry


def registry_entries(registry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    entries: dict[str, dict[str, Any]] = {}
    for item in registry["entries"]:
        if not isinstance(item, dict):
            raise ContractRecordError("contract registry entries must be objects")
        contract_id = str(item.get("contract_id") or "")
        if not CONTRACT_RE.fullmatch(contract_id):
            raise ContractRecordError(f"invalid registry contract_id: {contract_id!r}")
        if contract_id in entries:
            raise ContractRecordError(f"duplicate registry contract_id: {contract_id}")
        entries[contract_id] = item
    return entries


def load_document(path: Path) -> Any:
    text = path.read_text(encoding="utf-8-sig")
    if path.suffix.lower() == ".json":
        return json.loads(text)
    return yaml.safe_load(text)


def iter_contract_documents(value: Any) -> Iterable[dict[str, Any]]:
    """Yield every nested object carrying a registered-looking schema_version."""
    if isinstance(value, dict):
        schema_version = value.get("schema_version")
        if isinstance(schema_version, str) and CONTRACT_RE.fullmatch(schema_version):
            yield value
        for child in value.values():
            yield from iter_contract_documents(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_contract_documents(child)


def schema_errors(contract_id: str, payload: dict[str, Any]) -> list[str]:
    schema_path = schemas_dir() / f"{contract_id}.schema.json"
    if not schema_path.is_file():
        return [f"schema missing: {schema_path}"]
    schema = json.loads(schema_path.read_text(encoding="utf-8-sig"))
    validator_class = validators.validator_for(schema)
    validator_class.check_schema(schema)
    validator = validator_class(schema)
    return [
        f"{'.'.join(str(part) for part in error.absolute_path) or '$'}: {error.message}"
        for error in sorted(
            validator.iter_errors(payload), key=lambda item: list(item.absolute_path)
        )
    ]


def _source_ref(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(REPO_ROOT.resolve()).as_posix()
    except ValueError:
        return resolved.as_posix()


def _recorded_at(payload: dict[str, Any], fallback: str | None = None) -> str:
    for key in TIMESTAMP_KEYS:
        value = payload.get(key)
        if isinstance(value, str) and value:
            return value
    return fallback or utc_now()


def _tenant(payload: dict[str, Any], fallback: str) -> str:
    candidate = payload.get("tenant") or payload.get("tenant_id") or fallback
    candidate = str(candidate)
    return candidate if TENANT_RE.fullmatch(candidate) else fallback


def build_record(
    payload: dict[str, Any],
    *,
    source_ref: str,
    contract_id: str | None = None,
    tenant: str = "gbautomation",
    synthetic: bool = False,
    recorded_at: str | None = None,
) -> dict[str, Any]:
    resolved_contract_id = contract_id or str(payload.get("schema_version") or "")
    if not CONTRACT_RE.fullmatch(resolved_contract_id):
        raise ContractRecordError(
            f"invalid contract_id for persistence: {resolved_contract_id!r}"
        )
    digest = payload_sha256(payload)
    trace_id = payload.get("trace_id")
    return {
        "contract_id": resolved_contract_id,
        "tenant": _tenant(payload, tenant),
        "trace_id": str(trace_id) if trace_id else None,
        "source_ref": source_ref,
        "payload": payload,
        "payload_sha256": digest,
        "synthetic": bool(payload.get("synthetic", synthetic)),
        "recorded_at": _recorded_at(payload, recorded_at),
    }


def find_cli(explicit: str | None = None) -> str:
    if explicit:
        return explicit
    found = shutil.which("gbauto-supabase") or shutil.which("gbauto-supabase.exe")
    if found:
        return found
    for candidate in (
        Path.home() / ".local" / "bin" / "gbauto-supabase",
        Path.home() / ".local" / "bin" / "gbauto-supabase.exe",
    ):
        if candidate.is_file():
            return str(candidate)
    raise ContractRecordError(
        "gbauto-supabase CLI not found; install with `uv tool install ./services/gbauto_supabase`"
    )


def persist_record(
    record: dict[str, Any],
    *,
    cli: str | None = None,
    project: str = "gbauto",
) -> None:
    executable = find_cli(cli)
    with tempfile.TemporaryDirectory(prefix="agent-os-contract-record-") as tmp:
        row_path = Path(tmp) / "row.json"
        row_path.write_text(
            json.dumps(record, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        proc = subprocess.run(
            [
                executable,
                "--project",
                project,
                "insert",
                "agent_os_contract_records",
                str(row_path),
                "--on-conflict",
                "record_key",
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=90,
            check=False,
        )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "unknown error").strip()[:1000]
        raise ContractRecordError(f"gbauto-supabase insert failed: {detail}")


def _run_cli_json(arguments: list[str], *, cli: str | None = None) -> Any:
    proc = subprocess.run(
        [find_cli(cli), *arguments],
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=90,
        check=False,
    )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "unknown error").strip()[:1000]
        raise ContractRecordError(f"gbauto-supabase command failed: {detail}")
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise ContractRecordError("gbauto-supabase returned non-JSON output") from exc


def export_coverage(
    output: Path,
    *,
    cli: str | None = None,
    project: str = "gbauto",
    generated_at: str | None = None,
    persist: bool = False,
) -> dict[str, Any]:
    columns = (
        "contract_id, mapping_mode, supabase_schema, supabase_relation, relation_kind, "
        "sample_count, has_samples, shared_record_count, persistence_record_count, "
        "coverage_state, latest_recorded_at, registry_version"
    )
    rows = _run_cli_json(
        [
            "--project",
            project,
            "--json",
            "query",
            f"select {columns} from public.v_agent_os_data_contract_coverage order by contract_id",
            "--mode",
            "pooler-session",
        ],
        cli=cli,
    )
    identity = _run_cli_json(["--project", project, "--json", "whoami"], cli=cli)
    if not isinstance(rows, list) or not isinstance(identity, dict):
        raise ContractRecordError("unexpected coverage or identity response shape")

    normalized: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            raise ContractRecordError("coverage rows must be objects")
        normalized.append(
            {
                "contract_id": str(row["contract_id"]),
                "mapping_mode": str(row["mapping_mode"]),
                "supabase_schema": str(row["supabase_schema"]),
                "supabase_relation": str(row["supabase_relation"]),
                "relation_kind": str(row["relation_kind"]),
                "sample_count": int(row["sample_count"]),
                "has_samples": bool(row["has_samples"]),
                "shared_record_count": int(row["shared_record_count"]),
                "persistence_record_count": int(row["persistence_record_count"]),
                "coverage_state": str(row["coverage_state"]),
                "latest_recorded_at": canonical_utc_timestamp(
                    row.get("latest_recorded_at")
                ),
                "registry_version": int(row["registry_version"]),
            }
        )

    with_records = sum(1 for row in normalized if row["persistence_record_count"] > 0)
    payload = {
        "schema_version": "agent-os-contract-coverage.v1",
        "snapshot_source": "live_supabase",
        "generated_at": generated_at or utc_now(),
        "project_ref": str(identity.get("project_ref") or ""),
        "coverage_view": "public.v_agent_os_data_contract_coverage",
        "summary": {
            "contract_count": len(normalized),
            "native_mapping_count": sum(
                1 for row in normalized if row["mapping_mode"] == "native_table"
            ),
            "shared_mapping_count": sum(
                1 for row in normalized if row["mapping_mode"] == SHARED_MODE
            ),
            "contracts_with_records": with_records,
            "contracts_without_records": len(normalized) - with_records,
            "persistence_record_count": sum(
                row["persistence_record_count"] for row in normalized
            ),
        },
        "contracts": normalized,
    }
    errors = schema_errors("agent-os-contract-coverage.v1", payload)
    if errors:
        raise ContractRecordError("coverage export failed schema validation: " + "; ".join(errors))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    if persist:
        persist_record(
            build_record(payload, source_ref=_source_ref(output)),
            cli=cli,
            project=project,
        )
    return payload


def records_from_path(
    path: Path,
    *,
    registry: dict[str, Any] | None = None,
    contract_id: str | None = None,
    tenant: str = "gbautomation",
    synthetic: bool = False,
    recorded_at: str | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    registry = registry or load_registry()
    entries = registry_entries(registry)
    records: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for payload in iter_contract_documents(load_document(path)):
        found_id = str(payload["schema_version"])
        if contract_id and found_id != contract_id:
            continue
        entry = entries.get(found_id)
        if entry is None:
            skipped.append({"contract_id": found_id, "reason": "unregistered"})
            continue
        if entry.get("mapping_mode") != SHARED_MODE:
            skipped.append({"contract_id": found_id, "reason": "native_table"})
            continue
        errors = schema_errors(found_id, payload)
        if errors:
            raise ContractRecordError(
                f"{_source_ref(path)}::{found_id} failed schema validation: " + "; ".join(errors)
            )
        records.append(
            build_record(
                payload,
                source_ref=_source_ref(path),
                tenant=tenant,
                synthetic=synthetic,
                recorded_at=recorded_at,
            )
        )
    if contract_id and not any(record["contract_id"] == contract_id for record in records):
        raise ContractRecordError(f"{path} contains no valid {contract_id} document")
    return records, skipped


def sync_sample_records(
    *,
    apply: bool,
    cli: str | None = None,
    project: str = "gbauto",
    recorded_at: str | None = None,
) -> dict[str, Any]:
    registry = load_registry()
    entries = registry_entries(registry)
    unique: dict[tuple[str, str], dict[str, Any]] = {}
    sources: set[str] = set()
    skipped: list[dict[str, Any]] = []
    for contract_id, entry in sorted(entries.items()):
        if entry.get("mapping_mode") != SHARED_MODE:
            continue
        for sample in entry.get("sample_paths") or []:
            path = REPO_ROOT / str(sample)
            records, path_skipped = records_from_path(
                path,
                registry=registry,
                contract_id=contract_id,
                synthetic=True,
                recorded_at=recorded_at,
            )
            skipped.extend(path_skipped)
            for record in records:
                unique[(record["contract_id"], record["payload_sha256"])] = record
                sources.add(record["source_ref"])
    records = [unique[key] for key in sorted(unique)]
    if apply:
        for record in records:
            persist_record(record, cli=cli, project=project)
    return {
        "ok": True,
        "mode": "apply" if apply else "dry_run",
        "record_count": len(records),
        "contract_count": len({record["contract_id"] for record in records}),
        "contracts": sorted({record["contract_id"] for record in records}),
        "source_count": len(sources),
        "payload_sha256": sorted(record["payload_sha256"] for record in records),
        "skipped": skipped,
    }


def validate_registry() -> dict[str, Any]:
    registry = load_registry()
    entries = registry_entries(registry)
    errors: list[str] = []
    registry_schema = json.loads(
        (schemas_dir() / "agent-os-data-contract-registry.v1.schema.json").read_text(
            encoding="utf-8-sig"
        )
    )
    registry_validator_class = validators.validator_for(registry_schema)
    registry_validator_class.check_schema(registry_schema)
    errors.extend(
        f"registry.{'.'.join(str(part) for part in error.absolute_path) or '$'}: {error.message}"
        for error in registry_validator_class(registry_schema).iter_errors(registry)
    )
    on_disk = {
        path.name.removesuffix(".schema.json")
        for path in schemas_dir().glob("*.v1.schema.json")
    }
    registered = set(entries)
    for contract_id in sorted(on_disk - registered):
        errors.append(f"unregistered_schema: {contract_id}")
    for contract_id in sorted(registered - on_disk):
        errors.append(f"missing_schema: {contract_id}")

    relations: dict[str, dict[str, Any]] = {}
    for item in registry.get("relations") or []:
        if not isinstance(item, dict):
            errors.append("invalid_relation_declaration")
            continue
        relation_name = str(item.get("relation") or "")
        if not relation_name or relation_name in relations:
            errors.append(f"duplicate_or_invalid_relation: {relation_name!r}")
            continue
        relations[relation_name] = item
        migration_path = REPO_ROOT / str(item.get("migration_path") or "")
        if not migration_path.is_file():
            errors.append(f"missing_relation_migration: {relation_name}: {migration_path}")
            continue
        migration_sql = migration_path.read_text(encoding="utf-8-sig").lower()
        if not re.search(
            rf"\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?"
            rf"public\.{re.escape(relation_name)}\b",
            migration_sql,
        ):
            errors.append(
                f"relation_not_created_by_migration: {relation_name}: {migration_path}"
            )

    shared_relation = str(registry.get("shared_record_relation") or "")
    for contract_id, entry in sorted(entries.items()):
        expected = (
            "services/gbauto_agent_os/src/gbauto_agent_os/schemas/"
            f"{contract_id}.schema.json"
        )
        if entry.get("schema_path") != expected:
            errors.append(
                f"schema_path_mismatch: {contract_id}: {entry.get('schema_path')!r} != {expected!r}"
            )
        relation = str(entry.get("supabase_relation") or "")
        if relation not in relations:
            errors.append(f"unknown_supabase_relation: {contract_id}: {relation}")
        if entry.get("mapping_mode") == SHARED_MODE and relation != shared_relation:
            errors.append(
                f"shared_relation_mismatch: {contract_id}: {relation!r} != {shared_relation!r}"
            )
    try:
        sample_receipt = sync_sample_records(apply=False)
    except ContractRecordError as exc:
        errors.append(f"sample_validation: {exc}")
        sample_receipt = {"record_count": 0, "contract_count": 0}
    return {
        "ok": not errors,
        "errors": sorted(errors),
        "schema_count": len(on_disk),
        "registry_count": len(registered),
        "mapped_count": sum(1 for item in entries.values() if item.get("supabase_relation")),
        "valid_sample_record_count": sample_receipt["record_count"],
        "contracts_with_valid_samples": sample_receipt["contract_count"],
    }


def maybe_persist_document(
    payload: Any,
    *,
    source_ref: str,
    contract_id: str | None = None,
    cli: str | None = None,
    project: str = "gbauto",
) -> list[str]:
    """Persist valid shared-envelope documents when the production flag is on.

    ``contract_id`` is an explicit registry-ID override for producers whose
    public discriminator intentionally differs from the registry filename
    (for example ``artifact.index.v1`` or a numeric ``schema_version``). The
    payload is validated unchanged against that registry contract and the
    envelope is keyed by the registry ID. Without an override, nested
    ``schema_version`` discovery retains its existing behavior.
    """
    if os.getenv(PERSIST_ENV, "").strip().lower() not in {"1", "true", "yes", "on"}:
        return []
    registry = load_registry()
    entries = registry_entries(registry)
    persisted: list[str] = []

    if contract_id is not None:
        if not CONTRACT_RE.fullmatch(contract_id):
            raise ContractRecordError(f"invalid contract_id override: {contract_id!r}")
        if not isinstance(payload, dict):
            raise ContractRecordError("contract_id override requires an object payload")
        if contract_id not in entries:
            raise ContractRecordError(f"unregistered contract_id override: {contract_id}")
        documents = ((contract_id, payload),)
    else:
        documents = (
            (str(document["schema_version"]), document)
            for document in iter_contract_documents(payload)
        )

    for resolved_contract_id, document in documents:
        entry = entries.get(resolved_contract_id)
        if entry is None:
            continue
        if entry.get("mapping_mode") != SHARED_MODE:
            continue
        errors = schema_errors(resolved_contract_id, document)
        if errors:
            raise ContractRecordError(
                f"producer emitted invalid {resolved_contract_id}: " + "; ".join(errors)
            )
        record = build_record(
            document,
            source_ref=source_ref,
            contract_id=resolved_contract_id,
        )
        persist_record(record, cli=cli, project=project)
        persisted.append(f"{resolved_contract_id}:{record['payload_sha256']}")
    return persisted


def _emit(payload: dict[str, Any]) -> int:
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if payload.get("ok") else 2


def cmd_sync_samples(args: argparse.Namespace) -> int:
    return _emit(
        sync_sample_records(
            apply=args.apply,
            cli=args.cli,
            project=args.project,
            recorded_at=args.recorded_at,
        )
    )


def cmd_validate_registry(_args: argparse.Namespace) -> int:
    return _emit(validate_registry())


def cmd_persist(args: argparse.Namespace) -> int:
    records, skipped = records_from_path(
        args.input,
        contract_id=args.contract_id,
        tenant=args.tenant,
        synthetic=args.synthetic,
        recorded_at=args.recorded_at,
    )
    if args.apply:
        for record in records:
            persist_record(record, cli=args.cli, project=args.project)
    return _emit(
        {
            "ok": True,
            "mode": "apply" if args.apply else "dry_run",
            "record_count": len(records),
            "contracts": sorted({record["contract_id"] for record in records}),
            "payload_sha256": [record["payload_sha256"] for record in records],
            "skipped": skipped,
        }
    )


def cmd_export_coverage(args: argparse.Namespace) -> int:
    payload = export_coverage(
        args.output,
        cli=args.cli,
        project=args.project,
        generated_at=args.generated_at,
        persist=args.persist,
    )
    return _emit(
        {
            "ok": True,
            "output": str(args.output),
            "persisted": args.persist,
            "summary": payload["summary"],
        }
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", default="gbauto")
    parser.add_argument("--cli", help="gbauto-supabase executable override")
    commands = parser.add_subparsers(dest="command", required=True)

    samples = commands.add_parser("sync-samples", help="validate and seed registered samples")
    samples.add_argument("--apply", action="store_true")
    samples.add_argument("--recorded-at")
    samples.set_defaults(func=cmd_sync_samples)

    validate = commands.add_parser(
        "validate-registry",
        help="fail when a JSON Schema lacks an exact registry and Supabase mapping",
    )
    validate.set_defaults(func=cmd_validate_registry)

    persist = commands.add_parser("persist", help="validate and persist documents from one file")
    persist.add_argument("input", type=Path)
    persist.add_argument("--contract-id")
    persist.add_argument("--tenant", default="gbautomation")
    persist.add_argument("--synthetic", action="store_true")
    persist.add_argument("--recorded-at")
    persist.add_argument("--apply", action="store_true")
    persist.set_defaults(func=cmd_persist)

    coverage = commands.add_parser(
        "export-coverage", help="write the sanitized live Supabase coverage snapshot"
    )
    coverage.add_argument("--output", type=Path, required=True)
    coverage.add_argument("--generated-at")
    coverage.add_argument("--persist", action="store_true")
    coverage.set_defaults(func=cmd_export_coverage)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return int(args.func(args))
    except (
        OSError,
        json.JSONDecodeError,
        yaml.YAMLError,
        ContractRecordError,
        subprocess.SubprocessError,
    ) as exc:
        return _emit({"ok": False, "errors": [str(exc)]})


if __name__ == "__main__":
    raise SystemExit(main())
