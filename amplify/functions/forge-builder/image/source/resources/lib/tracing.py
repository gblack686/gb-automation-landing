"""
resources/lib/tracing.py — canonical Langfuse v4 tracing helper for any
gbautomation Python script (repo cron, CI, ad-hoc).

USAGE
-----
    from resources.lib.tracing import trace_agent

    @trace_agent("linear-cron")
    def main():
        ...

The trace name in Langfuse becomes ``<name>:<env>`` where ``<env>`` is one of
``github-actions`` / ``local`` (auto-detected via GITHUB_ACTIONS env var).
That makes it easy to filter "all runs of the linear cron in CI vs Mac Mini".

DESIGN
------
- Auto-loads creds from AWS SM ``gbautomation/infrastructure/langfuse`` (cron
  on the Mini), or from env vars (CI). Local dev: also tries ``~/.langfuse/.env``.
- Graceful no-op fallback: if creds / SDK / network missing, decorator becomes
  a no-op so production scripts never crash on telemetry.
- Idempotent module init — safe to import multiple times.
- Never raises.

ENV-VAR SOURCES (priority order)
--------------------------------
1. Explicit env vars: LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST.
   Set these in GH Actions workflows.
2. ~/.langfuse/.env (loaded via python-dotenv if available).
3. AWS SM secret 'gbautomation/infrastructure/langfuse' (boto3 if available
   AND AWS creds present in env / IAM).
"""
from __future__ import annotations
import logging
import os
import random
import json
import re
import shlex
import subprocess
import base64
import hashlib
import platform as platform_module
import socket
import urllib.error
import urllib.request
from contextlib import nullcontext
from functools import wraps
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

EAGLE_GRAPH_SCHEMA_VERSION = "eagle-graph.v1"
EAGLE_ROOT_TYPE = "agent"
EAGLE_GENERATION_TYPE = "generation"
EAGLE_CHAIN_TYPE = "chain"
EAGLE_TOOL_TYPE = "tool"
LANGFUSE_SCORE_NAMES = {"greg_human", "judge_llm", "drift", "manager_outcome", "cost_usd"}


def emit_otlp_payload(payload: bytes, *, timeout: float = 30) -> dict[str, Any]:
    """Send a bounded, pre-sanitized native trace batch using v4 ingestion."""
    if not payload or len(payload) > 8 * 1024 * 1024:
        return {"ok": False, "error": "payload_limit"}
    try:
        from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import ExportTraceServiceResponse
        _load_dotenv()
        _hydrate_from_aws_sm()
        public_key, secret_key = os.getenv("LANGFUSE_PUBLIC_KEY"), os.getenv("LANGFUSE_SECRET_KEY")
        if not public_key or not secret_key:
            return {"ok": False, "error": "credentials_unavailable"}
        host = (os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL") or "https://us.cloud.langfuse.com").rstrip("/")
        request = urllib.request.Request(host + "/api/public/otel/v1/traces", method="POST", data=payload,
            headers={"Content-Type": "application/x-protobuf", "x-langfuse-ingestion-version": "4",
                     "Authorization": _langfuse_auth_header(public_key, secret_key)})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read(1024 * 1024)
        if raw.lstrip().startswith(b"{"):
            receipt = json.loads(raw)
            partial = receipt.get("partialSuccess") or receipt.get("partial_success") or {}
            if partial.get("rejectedSpans") not in (None, 0, "0") or partial.get("rejected_spans") not in (None, 0, "0") or partial.get("errorMessage") or partial.get("error_message"):
                return {"ok": False, "error": "otel_partial_success"}
            if receipt.get("errors") or receipt.get("error") or receipt.get("success") is False:
                return {"ok": False, "error": "otel_rejected"}
            # Never return/log queue-job receipts: they can contain auth metadata.
        else:
            receipt = ExportTraceServiceResponse.FromString(raw)
            if receipt.partial_success.rejected_spans or receipt.partial_success.error_message:
                return {"ok": False, "error": "otel_partial_success"}
        return {"ok": True}
    except urllib.error.HTTPError as exc:
        return {"ok": False, "error": "http_error", "status": exc.code}
    except Exception as exc:
        return {"ok": False, "error": type(exc).__name__}


def emit_ingestion_batch(events: Sequence[Mapping[str, Any]], *, timeout: float = 30) -> dict[str, Any]:
    """Deliver bounded native-session events with stable object/event identities.

    The caller owns the metadata allowlist. The batch is acknowledged only when
    every event ID succeeds; callers retain their checkpoint on partial failure.
    Content-hashed event IDs permit revised streaming usage on the same object.
    """
    from datetime import datetime, timezone
    import uuid

    if not events or len(events) > 100:
        return {"ok": False, "error": "batch_size_must_be_1_to_100"}
    try:
        allowed = {"trace-create", "generation-create", "observation-create"}
        batch = []
        typed = []
        now = datetime.now(timezone.utc).isoformat()
        for event in events:
            if event.get("type") not in allowed or not event.get("body", {}).get("id"):
                return {"ok": False, "error": "invalid_event"}
            if event["type"] == "observation-create":
                # The public ingestion API still rejects AGENT/TOOL despite its
                # OpenAPI enum. Use Langfuse's supported OTLP path for typed spans.
                typed.append(event["body"])
                continue
            encoded = json.dumps(event, sort_keys=True, allow_nan=False)
            event_id = str(uuid.UUID(hashlib.sha256(encoded.encode()).hexdigest()[:32]))
            batch.append({**event, "id": event_id, "timestamp": now})
        _load_dotenv()
        _hydrate_from_aws_sm()
        public_key, secret_key = os.getenv("LANGFUSE_PUBLIC_KEY"), os.getenv("LANGFUSE_SECRET_KEY")
        if not public_key or not secret_key:
            return {"ok": False, "error": "credentials_unavailable"}
        host = (os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL") or "https://us.cloud.langfuse.com").rstrip("/")
        auth = _langfuse_auth_header(public_key, secret_key)
        if batch:
            request = urllib.request.Request(host + "/api/public/ingestion", method="POST",
                data=json.dumps({"batch": batch}, allow_nan=False).encode(),
                headers={"Content-Type": "application/json", "Authorization": auth})
            with urllib.request.urlopen(request, timeout=timeout) as response:
                result = json.loads(response.read(1024 * 1024))
            acknowledged = {x.get("id") for x in result.get("successes", [])}
            if result.get("errors") or acknowledged != {x["id"] for x in batch}:
                return {"ok": False, "error": "ingestion_not_acknowledged", "acknowledged": len(acknowledged)}
        if typed:
            from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import ExportTraceServiceResponse
            request = urllib.request.Request(host + "/api/public/otel/v1/traces", method="POST",
                data=_native_otlp_payload(typed),
                headers={"Content-Type": "application/x-protobuf", "Authorization": auth})
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = response.read(1024 * 1024)
            if raw.lstrip().startswith(b"{"):
                # Langfuse Cloud returns a JSON queue-job receipt even for a
                # protobuf request. Never log it: its payload contains auth IDs.
                receipt = json.loads(raw)
                partial = receipt.get("partialSuccess") or receipt.get("partial_success") or {}
                if partial.get("rejectedSpans") or partial.get("rejected_spans") or partial.get("errorMessage") or partial.get("error_message"):
                    return {"ok": False, "error": "otel_partial_success"}
                if receipt and receipt.get("name") != "otel-ingestion-job" and "partialSuccess" not in receipt:
                    return {"ok": False, "error": "otel_not_acknowledged"}
            else:
                result = ExportTraceServiceResponse.FromString(raw)
                if result.partial_success.rejected_spans or result.partial_success.error_message:
                    return {"ok": False, "error": "otel_partial_success"}
        return {"ok": True, "acknowledged": len(events)}
    except urllib.error.HTTPError as exc:
        return {"ok": False, "error": "http_error", "status": exc.code}
    except Exception as exc:
        return {"ok": False, "error": type(exc).__name__}


def _native_otlp_payload(observations: Sequence[Mapping[str, Any]]) -> bytes:
    """Encode source span IDs, timing and typed attributes using installed OTel."""
    from datetime import datetime
    from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import ExportTraceServiceRequest
    from resources.lib.native_session_observability import digest

    request = ExportTraceServiceRequest()
    resource = request.resource_spans.add()
    service = resource.resource.attributes.add(key="service.name")
    service.value.string_value = "native-session-exporter"
    scope = resource.scope_spans.add()
    scope.scope.name = "gbautomation.native-sessions"
    for body in observations:
        meta = body.get("metadata") or {}
        span = scope.spans.add(name=str(body.get("name") or "Observation"))
        span.trace_id = bytes.fromhex(body["traceId"])
        span.span_id = bytes.fromhex(body["id"])
        if body.get("parentObservationId"):
            span.parent_span_id = bytes.fromhex(body["parentObservationId"])
        def nano(value):
            return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1_000_000_000)
        span.start_time_unix_nano = nano(body["startTime"])
        span.end_time_unix_nano = nano(body.get("endTime") or body["startTime"])
        span.kind = 1  # INTERNAL
        attrs = {"langfuse.observation.type": str(body["type"]).lower(),
                 "langfuse.observation.level": body.get("level", "DEFAULT"),
                 "langfuse.environment": body.get("environment", "native-sessions"),
                 "session.id": meta.get("session_id"), "langfuse.trace.public": False,
                 "langfuse.trace.name": meta.get('trace_name') or "native-session:" + str(meta.get("harness")) + ":" + digest(meta.get("session_id"), size=10)}
        if body.get('statusMessage'):
            attrs['langfuse.observation.status_message'] = body['statusMessage']
        attrs.update({"langfuse.observation.metadata." + k: v for k, v in meta.items() if v is not None})
        if body["type"] == "AGENT":
            attrs.update({"langfuse.trace.metadata." + k: v for k, v in meta.items() if v is not None})
        for key, value in attrs.items():
            if value is None:
                continue
            item = span.attributes.add(key=key)
            if isinstance(value, bool):
                item.value.bool_value = value
            elif isinstance(value, int):
                item.value.int_value = value
            else:
                item.value.string_value = str(value)
        if body.get("level") == "ERROR":
            span.status.code = 2
    return request.SerializeToString()


def emit_action_fact(event: Mapping[str, Any], *, timeout: float = 10) -> dict[str, Any]:
    """Export an allowlisted action with stable IDs and producer timing.

    An ingestion acknowledgement permits queue delivery; source readback is a
    separate coverage gate. Retrying the same event updates the same objects.
    No input, output, command body, or exception message is exported.
    """
    from datetime import datetime, timedelta
    from resources.lib.pr_analytics import digest, normalize_event

    try:
        fact = normalize_event(event, event, received_at=event.get("received_at"))
        trace_id = digest(["action-trace.v1", fact["run_id"], fact["event_id"]])[:32]
        observation_id = digest(["action-observation.v1", fact["event_id"]])[:16]
        at = fact["source_event_at"] or fact["received_at"]
        body = {"id": observation_id, "traceId": trace_id,
                "name": fact["tool_name"] or fact["event_type"], "startTime": at,
                "metadata": fact, "level": "ERROR" if fact["outcome"] == "failure" else "DEFAULT"}
        if fact["duration_ms"] is not None and fact["source_event_at"]:
            body["endTime"] = (datetime.fromisoformat(at) + timedelta(milliseconds=fact["duration_ms"])).isoformat()
        kind = "generation-create" if fact["event_type"] == "generation" else "span-create"
        if kind == "generation-create":
            if fact["model"]:
                body["model"] = fact["model"]
            if fact["usage_basis"] == "observed":
                body["usageDetails"] = {k: v for k, v in fact["usage_details"].items() if k in {"input", "output", "total"}}
            if fact["cost_basis"] == "observed":
                body["costDetails"] = {"total": fact["cost"]}
        trace = {"id": trace_id, "name": "pr-action." + fact["event_type"],
                 "timestamp": at, "metadata": fact, "tags": ["pr-analytics.v1", "phase:" + fact["phase"]],
                 "public": False}
        if fact["session_id"]:
            trace["sessionId"] = fact["session_id"]
        batch = [{"id": digest([trace_id, "trace"])[:32], "timestamp": at, "type": "trace-create", "body": trace},
                 {"id": digest([observation_id, "observation"])[:32], "timestamp": at, "type": kind, "body": body}]
        _load_dotenv()
        _hydrate_from_aws_sm()
        public_key, secret_key = os.getenv("LANGFUSE_PUBLIC_KEY"), os.getenv("LANGFUSE_SECRET_KEY")
        if not (public_key and secret_key):
            return {"ok": False, "error": "credentials_unavailable"}
        host = (os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL") or "https://us.cloud.langfuse.com").rstrip("/")
        request = urllib.request.Request(host + "/api/public/ingestion", method="POST",
            data=json.dumps({"batch": batch}, allow_nan=False).encode(),
            headers={"Content-Type": "application/json", "Authorization": _langfuse_auth_header(public_key, secret_key)})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            result = json.loads(response.read(1024 * 1024))
        acknowledged = {item.get("id") for item in result.get("successes", [])}
        if result.get("errors") or acknowledged != {item["id"] for item in batch}:
            return {"ok": False, "error": "ingestion_not_acknowledged"}
        return {"ok": True, "trace_id": trace_id, "observation_id": observation_id}
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            from email.utils import parsedate_to_datetime
            from datetime import timezone
            value = exc.headers.get('Retry-After', '60') if exc.headers else '60'
            try:
                delay = float(value)
            except ValueError:
                try:
                    delay = (parsedate_to_datetime(value) - datetime.now(timezone.utc)).total_seconds()
                except (ValueError, TypeError):
                    delay = 60
            return {'ok': False, 'error': 'rate_limited', 'retry_after': max(1, delay)}
        return {'ok': False, 'error': 'HTTPError'}
    except Exception as exc:
        return {"ok": False, "error": type(exc).__name__}

TRACING_ENABLED = False
_langfuse_client = None
_RUNTIME_ENV = "github-actions" if os.getenv("GITHUB_ACTIONS") == "true" else "local"


def _noop_observe(*args, **kwargs):
    if args and callable(args[0]) and not kwargs:
        return args[0]
    def decorator(func):
        return func
    return decorator


observe = _noop_observe
_propagate_attributes = None


def _load_dotenv() -> None:
    try:
        from dotenv import load_dotenv  # type: ignore
        from pathlib import Path
        env = Path.home() / ".langfuse" / ".env"
        if env.exists():
            load_dotenv(env)
    except ImportError:
        pass


def _hydrate_from_aws_sm() -> None:
    """If keys still missing, try AWS SM. Silently no-op on any failure."""
    if os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
        return
    try:
        import json as _json
        import boto3  # type: ignore
        client = boto3.client("secretsmanager", region_name="us-east-1")
        raw = client.get_secret_value(SecretId="gbautomation/infrastructure/langfuse")["SecretString"]
        d = _json.loads(raw)
        os.environ.setdefault("LANGFUSE_PUBLIC_KEY", d.get("public_key", ""))
        os.environ.setdefault("LANGFUSE_SECRET_KEY", d.get("secret_key", ""))
        os.environ.setdefault("LANGFUSE_HOST", d.get("base_url", "https://us.cloud.langfuse.com"))
    except Exception:
        pass



def _client_environment() -> str:
    """Host-named Langfuse environment for SDK-emitted traces (Hermes, GHA, scripts).

    An explicit ``LANGFUSE_TRACING_ENVIRONMENT`` still wins (it is the SDK's own
    knob); otherwise use the shared host name so SDK traces group with the hook
    lanes' OTel ``deployment.environment`` (``mac-mini`` / ``gregs-acer`` /
    ``github-actions``).
    """
    explicit = (os.getenv("LANGFUSE_TRACING_ENVIRONMENT") or "").strip()
    if explicit:
        return explicit
    from resources.lib.host_env import deployment_environment

    return deployment_environment()


def _init() -> None:
    """Module-level init; safe to call any number of times."""
    global TRACING_ENABLED, _langfuse_client, observe, _propagate_attributes
    if TRACING_ENABLED:
        return  # already initialized

    _load_dotenv()
    _hydrate_from_aws_sm()

    # v4 reads LANGFUSE_HOST; mirror from LANGFUSE_BASE_URL if needed.
    if os.getenv("LANGFUSE_BASE_URL") and not os.getenv("LANGFUSE_HOST"):
        os.environ["LANGFUSE_HOST"] = os.environ["LANGFUSE_BASE_URL"]

    pk = os.getenv("LANGFUSE_PUBLIC_KEY")
    sk = os.getenv("LANGFUSE_SECRET_KEY")
    host = os.getenv("LANGFUSE_HOST") or "https://us.cloud.langfuse.com"
    if not (pk and sk):
        logging.warning("Langfuse keys missing — tracing disabled (env=%s)", _RUNTIME_ENV)
        return

    try:
        from langfuse import (  # type: ignore
            Langfuse,
            observe as _real_observe,
            propagate_attributes as _real_propagate_attributes,
        )
    except ImportError as exc:
        logging.warning("Langfuse SDK not importable: %s", exc)
        return

    try:
        client = Langfuse(public_key=pk, secret_key=sk, host=host, environment=_client_environment())
    except Exception as exc:
        logging.warning("Langfuse init failed: %s", exc)
        return

    try:
        if not bool(client.auth_check()):
            logging.warning("Langfuse auth_check returned False")
            return
    except Exception as exc:
        logging.warning("Langfuse auth_check raised: %s", exc)
        return

    _langfuse_client = client
    observe = _real_observe
    _propagate_attributes = _real_propagate_attributes
    TRACING_ENABLED = True


_init()


def _worktree_metadata() -> dict[str, str]:
    registry = Path(os.getenv("GBAUTO_SESSION_WORKTREE_REGISTRY", "~/.gbauto/var/session-worktrees.json")).expanduser()
    try:
        data = json.loads(registry.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(data, dict):
        return {}
    wanted_branch = os.getenv("GBAUTO_WORKTREE_BRANCH")
    cwd = str(Path.cwd())
    for key, entry in data.items():
        if not isinstance(entry, dict):
            continue
        branch = str(entry.get("branch") or "")
        entry_cwd = str(entry.get("cwd") or "")
        if (wanted_branch and branch == wanted_branch) or (entry_cwd and Path(entry_cwd) == Path(cwd)):
            out = {
                "worktree.id": str(key),
                "worktree.branch": branch,
                "worktree.cwd": entry_cwd,
            }
            return {k: v for k, v in out.items() if v}
    return {}


def _git_value(args: list[str], cwd: Path | None = None) -> str:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=str(cwd or Path.cwd()),
            text=True,
            capture_output=True,
            timeout=3,
            check=False,
        )
    except Exception:
        return ""
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def _git_metadata() -> dict[str, str]:
    cwd = Path.cwd()
    top = _git_value(["rev-parse", "--show-toplevel"], cwd)
    repo_root = Path(top).resolve() if top else None
    repo_cwd = repo_root or cwd
    branch = _git_value(["branch", "--show-current"], repo_cwd)
    if not branch:
        branch = _git_value(["rev-parse", "--abbrev-ref", "HEAD"], repo_cwd)
    commit = _git_value(["rev-parse", "--short=12", "HEAD"], repo_cwd)
    dirty = _git_value(["status", "--porcelain"], repo_cwd)
    remote = _git_value(['remote', 'get-url', 'origin'], repo_cwd)
    remote_match = re.search(r'github\.com[:/]([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?$', remote)
    common_dir = _git_value(['rev-parse', '--git-common-dir'], repo_cwd) if not remote_match else ''
    common_path = (repo_cwd / common_dir).resolve() if common_dir else None
    local_repo = common_path.parent.name if common_path and common_path.name == '.git' else ''
    out = {
        "cwd": str(cwd),
        "repo.root": str(repo_root) if repo_root else "",
        "repo": remote_match.group(2) if remote_match else local_repo,
        "repo.full_name": '/'.join(remote_match.groups()) if remote_match else '',
        "branch": branch if branch != "HEAD" else "",
        "commit": commit,
        "git.dirty": "true" if dirty else "false",
    }
    return {key: value for key, value in out.items() if value}


_UNKNOWN = "<unknown>"
_ATTRIBUTION_FIELDS = (
    "stable_host_id",
    "hostname",
    "os",
    "cwd",
    "repo",
    "branch",
    "commit",
    "harness",
    "runtime",
    "agent",
    "profile",
    "platform",
    "trigger",
    "session_id",
    "parent_session_id",
    "trace_id",
    "parent_trace_id",
    "kanban_task_id",
    "kanban_root_task_id",
    "prd_id",
    "linear_issue",
    "client",
    "tenant",
)
_EVIDENCE_CLASSES = {"explicit", "joined", "inferred", "unknown"}

# Langfuse's propagation layer drops any propagated attribute value longer than
# 200 characters (langfuse/_client/propagation.py::_validate_string_value). The
# JSON form of the evidence map serialises to ~554 chars, so it was dropped on
# every trace. The positional code below is exactly one character per field plus
# a short version prefix, which cannot breach the limit at any realistic field
# count. The per-field ``evidence.<field>`` keys remain the primary readable
# surface; this key is a compact roll-up of the same classes.
_PROPAGATED_VALUE_MAX_CHARS = 200
_EVIDENCE_CODEC_VERSION = "ev1"
_EVIDENCE_CLASS_TO_CODE = {
    "explicit": "e",
    "joined": "j",
    "inferred": "i",
    "unknown": "u",
}
_EVIDENCE_CODE_TO_CLASS = {code: name for name, code in _EVIDENCE_CLASS_TO_CODE.items()}


def _clip_propagated_value(value: Any) -> Any:
    """Clip an attribution value to the propagation limit, losslessly flagged.

    Non-string scalars pass through untouched. An over-long string keeps its
    readable head and gains a digest suffix, so two different long values never
    collapse to the same truncated string. Truncating beats the SDK's default of
    dropping: a clipped ``cwd`` still says where the run happened.
    """
    if not isinstance(value, str) or len(value) <= _PROPAGATED_VALUE_MAX_CHARS:
        return value
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:10]
    keep = _PROPAGATED_VALUE_MAX_CHARS - len(digest) - 1
    return f"{value[:keep]}~{digest}"


def encode_attribution_evidence(evidence: Mapping[str, str]) -> str:
    """Encode a field -> evidence-class map as a compact positional code.

    Fields are encoded in ``_ATTRIBUTION_FIELDS`` order, one character each, so
    the result stays far below the propagation limit. Unrecognised or missing
    classes encode as ``unknown``.
    """
    codes = "".join(
        _EVIDENCE_CLASS_TO_CODE.get(str(evidence.get(field) or ""), "u")
        for field in _ATTRIBUTION_FIELDS
    )
    return f"{_EVIDENCE_CODEC_VERSION}:{codes}"


def decode_attribution_evidence(value: Any) -> dict[str, str]:
    """Inverse of :func:`encode_attribution_evidence`.

    Returns an empty dict for anything that is not a well-formed code of the
    current version, so a consumer reading an older or truncated trace degrades
    to "no roll-up" rather than to wrong classes.
    """
    version, sep, codes = str(value or "").partition(":")
    if not sep or version != _EVIDENCE_CODEC_VERSION or len(codes) != len(_ATTRIBUTION_FIELDS):
        return {}
    return {
        field: _EVIDENCE_CODE_TO_CLASS.get(code, "unknown")
        for field, code in zip(_ATTRIBUTION_FIELDS, codes)
    }


def _first_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return ""


def _evidence_label(value: Any, evidence: str = "explicit") -> str:
    if not value or value == _UNKNOWN:
        return "unknown"
    return evidence if evidence in _EVIDENCE_CLASSES else "explicit"


def _normalize_os_name(value: str) -> str:
    text = (value or "").lower()
    if text == "darwin":
        return "macos"
    if text.startswith("win"):
        return "windows"
    if text.startswith("linux"):
        return "linux"
    return text or _UNKNOWN


def _stable_host_id(hostname: str) -> str:
    if not hostname or hostname == _UNKNOWN:
        return _UNKNOWN
    salt = os.getenv("GBAUTO_STABLE_HOST_ID_SALT", "gbautomation-observability-v1")
    digest = hashlib.sha256(f"{salt}:{hostname}".encode("utf-8")).hexdigest()[:24]
    return f"sha256:{digest}"


def _host_metadata() -> dict[str, str]:
    hostname = socket.gethostname() or platform_module.node() or ""
    os_name = _normalize_os_name(platform_module.system())
    return {
        "hostname": hostname or _UNKNOWN,
        "stable_host_id": _stable_host_id(hostname),
        "os": os_name,
    }


def attribution_metadata(
    *,
    agent: str | None = None,
    harness: str | None = None,
    platform: str | None = None,
    trigger: str | None = None,
    profile: str | None = None,
    client: str | None = None,
    metadata: Mapping[str, Any] | None = None,
    include_unknown: bool = True,
) -> dict[str, str | int | float | bool]:
    """Return sanitized Phase 1 attribution metadata plus evidence labels.

    Values are producer-side only: explicit runtime, env, git, and caller metadata.
    Missing values remain visible as ``<unknown>`` with evidence class ``unknown``.
    """
    source = dict(metadata or {})
    git = _git_metadata()
    host = _host_metadata()

    values: dict[str, Any] = {
        "stable_host_id": source.get("stable_host_id") or host.get("stable_host_id"),
        "hostname": source.get("hostname") or host.get("hostname"),
        "os": source.get("os") or host.get("os"),
        "cwd": source.get("cwd") or git.get("cwd"),
        "repo": source.get("repo") or git.get("repo"),
        "branch": source.get("branch") or git.get("branch"),
        "commit": source.get("commit") or git.get("commit"),
        "harness": harness or source.get("harness") or _first_env("GBAUTO_TRACE_HARNESS"),
        "runtime": source.get("runtime") or _RUNTIME_ENV,
        "agent": agent or source.get("agent") or source.get("agent.name"),
        "profile": profile or source.get("profile") or source.get("agent_profile") or _first_env("HERMES_PROFILE", "HERMES_PROFILE_NAME", "GBAUTO_TRACE_PROFILE"),
        "platform": platform or source.get("platform") or _first_env("GBAUTO_TRACE_PLATFORM"),
        "trigger": trigger or source.get("trigger") or _first_env("GBAUTO_TRACE_TRIGGER"),
        "session_id": source.get("session_id") or _first_env("HERMES_SESSION_ID", "CODEX_SESSION_ID", "CLAUDE_SESSION_ID"),
        "parent_session_id": source.get("parent_session_id") or _first_env("HERMES_PARENT_SESSION_ID", "GBAUTO_PARENT_SESSION_ID"),
        "trace_id": source.get("trace_id") or _first_env("LANGFUSE_TRACE_ID", "GBAUTO_TRACE_ID"),
        "parent_trace_id": source.get("parent_trace_id") or _first_env("GBAUTO_PARENT_TRACE_ID", "LANGFUSE_PARENT_TRACE_ID"),
        "kanban_task_id": source.get("kanban_task_id") or source.get("task_id") or _first_env("HERMES_KANBAN_TASK", "KANBAN_TASK_ID"),
        "kanban_root_task_id": source.get("kanban_root_task_id") or _first_env("HERMES_KANBAN_ROOT_TASK", "KANBAN_ROOT_TASK_ID"),
        "prd_id": source.get("prd_id") or _first_env("GBAUTO_PRD_ID", "PRD_ID"),
        "linear_issue": source.get("linear_issue") or source.get("linear.issue") or source.get("linear.issue_id") or _first_env("LINEAR_ISSUE_IDENTIFIER", "LINEAR_ISSUE_ID"),
        "client": client or source.get("client") or _first_env("GBAUTO_CLIENT", "CLIENT"),
        "tenant": source.get("tenant") or _first_env("HERMES_TENANT", "GBAUTO_TENANT", "TENANT"),
    }

    evidence: dict[str, str] = {}
    out: dict[str, Any] = {}
    for field in _ATTRIBUTION_FIELDS:
        value = values.get(field)
        label = _evidence_label(value)
        evidence[field] = label
        if value or include_unknown:
            out[field] = _clip_propagated_value(value) if value else _UNKNOWN
            out[f"evidence.{field}"] = label
    out["attribution.evidence"] = encode_attribution_evidence(evidence)
    out["attribution.schema"] = "gbautomation.attribution.v1"
    return _coerce_metadata(out)


def _env_metadata() -> dict[str, str]:
    keys = {
        "GITHUB_RUN_ID": "github.run_id",
        "GITHUB_RUN_ATTEMPT": "github.run_attempt",
        "GITHUB_WORKFLOW": "github.workflow",
        "GITHUB_JOB": "github.job",
        "GITHUB_ACTOR": "github.actor",
        "LINEAR_ISSUE_ID": "linear.issue_id",
        "LINEAR_ISSUE_IDENTIFIER": "linear.issue",
        "LINEAR_ISSUE_LABELS": "linear.labels",
        "GBAUTO_TRACE_TRIGGER": "trigger",
        "GBAUTO_TRACE_PLATFORM": "platform",
        "GBAUTO_TRACE_HARNESS": "harness",
        "GBAUTO_TRACE_PROFILE": "agent_profile",
        "GBAUTO_TRACE_TOOL": "tool.name",
        "GBAUTO_TRACE_COMMAND": "command.raw",
    }
    out: dict[str, str] = {}
    for env_key, meta_key in keys.items():
        value = os.getenv(env_key)
        if value:
            out[meta_key] = value
    return out


def _normalize_tag(value: Any) -> str:
    text = str(value or "").strip()
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"[^A-Za-z0-9._:/@+-]+", "-", text).strip("-")
    return text[:120]


def _command_name(command: Any) -> str:
    if isinstance(command, (list, tuple)) and command:
        return str(command[0])
    raw = str(command or "").strip()
    if not raw:
        return ""
    try:
        parts = shlex.split(raw, posix=os.name != "nt")
    except ValueError:
        parts = raw.split()
    if not parts:
        return ""
    first = parts[0]
    if first in {"bash", "sh", "zsh", "pwsh", "powershell", "python", "python3"} and len(parts) > 1:
        # `bash -lc "git status"` and similar wrappers should still group as git.
        joined = " ".join(parts[1:])
        match = re.search(r"\b(git|gh|python|pytest|npm|bun|node|aws|curl|ssh|scp|rsync)\b", joined)
        if match:
            return match.group(1)
    return Path(first).name


def _tool_command_metadata(tool: str | None, command: Any) -> dict[str, str]:
    out: dict[str, str] = {}
    if tool:
        out["tool.name"] = str(tool)
    if command:
        out["command.raw"] = " ".join(str(part) for part in command) if isinstance(command, (list, tuple)) else str(command)
        name = _command_name(command)
        if name:
            out["command.name"] = name
            if name == "git":
                out["command.family"] = "git"
    return out


def _metadata_tags(metadata: Mapping[str, Any]) -> list[str]:
    tags: list[str] = []
    tag_fields = {
        "harness": "harness",
        "platform": "platform",
        "trigger": "trigger",
        "profile": "profile",
        "agent_profile": "profile",
        "repo": "repo",
        "branch": "branch",
        "kanban_task_id": "kanban_task",
        "kanban_root_task_id": "kanban_root_task",
        "prd_id": "prd",
        "client": "client",
        "tenant": "tenant",
        "tool.name": "tool",
        "command.name": "command",
        "command.family": "command_family",
        "worktree.id": "worktree",
    }
    for key, prefix in tag_fields.items():
        value = metadata.get(key)
        if value and value != _UNKNOWN:
            tags.append(f"{prefix}:{_normalize_tag(value)}")
    return tags


def eagle_trace_metadata(
    *,
    harness: str,
    platform: str,
    trigger: str,
    metadata: Mapping[str, Any] | None = None,
) -> dict[str, str | int | float | bool]:
    """Return standard Eagle graph trace metadata for all agent harnesses.

    The graph shape is:

    AGENT root -> optional GENERATION -> CHAIN -> TOOL children.

    Keep this pure so tests and non-Python harness adapters can reuse the same
    contract without needing Langfuse credentials.
    """
    merged: dict[str, Any] = {
        "trace.format": EAGLE_GRAPH_SCHEMA_VERSION,
        "trace.root_type": EAGLE_ROOT_TYPE,
        "trace.sequence": "AGENT>GENERATION>CHAIN>TOOL",
        "harness": harness,
        "platform": platform,
        "trigger": trigger,
    }
    merged.update(metadata or {})
    merged.update(
        attribution_metadata(
            agent=str(merged.get("agent") or "eagle-trace"),
            harness=str(merged.get("harness") or harness),
            platform=str(merged.get("platform") or platform),
            trigger=str(merged.get("trigger") or trigger),
            metadata=merged,
        )
    )
    return _coerce_metadata(merged)


def eagle_trace_tags(
    *,
    harness: str,
    platform: str,
    trigger: str,
    tags: Iterable[str] | None = None,
) -> list[str]:
    base = [
        f"trace_format:{EAGLE_GRAPH_SCHEMA_VERSION}",
        f"harness:{_normalize_tag(harness)}",
        f"platform:{_normalize_tag(platform)}",
        f"trigger:{_normalize_tag(trigger)}",
    ]
    if tags:
        base.extend(str(tag) for tag in tags if tag)
    return list(dict.fromkeys(base))


def _coerce_metadata(values: Mapping[str, Any] | None) -> dict[str, str | int | float | bool]:
    out: dict[str, str | int | float | bool] = {}
    for key, value in (values or {}).items():
        if value is None or value == "":
            continue
        if isinstance(value, (str, int, float, bool)):
            out[str(key)] = value
        else:
            out[str(key)] = json.dumps(value, default=str, ensure_ascii=False)
    return out


def _coerce_usage_details(values: Mapping[str, Any] | None) -> dict[str, int | float]:
    out: dict[str, int | float] = {}
    aliases = {
        "input": "input",
        "input_tokens": "input",
        "prompt_tokens": "input",
        "output": "output",
        "output_tokens": "output",
        "completion_tokens": "output",
        "cache_read": "cache_read",
        "cache_read_input_tokens": "cache_read",
        "reasoning": "reasoning",
        "reasoning_tokens": "reasoning",
        "total": "total",
        "total_tokens": "total",
    }
    for key, value in (values or {}).items():
        if not isinstance(value, (int, float)):
            continue
        canonical = aliases.get(str(key))
        if canonical:
            out[canonical] = value
    if "total" not in out:
        total = sum(float(out.get(key, 0) or 0) for key in ("input", "output", "cache_read", "reasoning"))
        if total:
            out["total"] = int(total) if total.is_integer() else total
    return out


def _langfuse_auth_header(public_key: str, secret_key: str) -> str:
    token = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    return f"Basic {token}"


def post_langfuse_score(
    *,
    trace_id: str,
    name: str,
    value: int | float,
    comment: str = "",
    host: str | None = None,
) -> dict[str, Any]:
    """Post one Langfuse score by trace id. Best-effort and never raises."""
    if not trace_id:
        return {"ok": False, "skipped": "missing trace_id"}
    if name not in LANGFUSE_SCORE_NAMES:
        return {"ok": False, "skipped": f"unsupported score name: {name}"}

    _load_dotenv()
    _hydrate_from_aws_sm()
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY", "")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY", "")
    if not (public_key and secret_key):
        return {"ok": False, "skipped": "missing Langfuse credentials"}

    langfuse_host = (host or os.getenv("LANGFUSE_HOST") or os.getenv("LANGFUSE_BASE_URL") or "https://us.cloud.langfuse.com").rstrip("/")
    payload = {
        "name": name,
        "value": value,
        "traceId": trace_id,
        "comment": comment,
    }
    request = urllib.request.Request(
        f"{langfuse_host}/api/public/scores",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": _langfuse_auth_header(public_key, secret_key),
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return {"ok": response.status in (200, 201), "status": response.status}
    except urllib.error.HTTPError as exc:
        return {"ok": False, "status": exc.code, "error": exc.reason}
    except Exception as exc:
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}


def _trace_context(
    name: str,
    tags: Iterable[str] | None,
    client: str | None,
    metadata: Mapping[str, Any] | None,
    harness: str | None,
    platform: str | None,
    profile: str | None,
    trigger: str | None,
    tool: str | None,
    command: Any,
) -> tuple[str, list[str], dict[str, str | int | float | bool]]:
    full_name = f"{name}:{_RUNTIME_ENV}"
    merged: dict[str, Any] = {}
    merged.update(_git_metadata())
    merged.update(_worktree_metadata())
    merged.update(_env_metadata())
    merged.update(_tool_command_metadata(tool or os.getenv("GBAUTO_TRACE_TOOL"), command or os.getenv("GBAUTO_TRACE_COMMAND")))
    if client:
        merged["client"] = client
    if harness:
        merged["harness"] = harness
    elif "harness" not in merged:
        merged["harness"] = "gha" if _RUNTIME_ENV == "github-actions" else "python"
    if platform:
        merged["platform"] = platform
    elif "platform" not in merged:
        merged["platform"] = "github-actions" if _RUNTIME_ENV == "github-actions" else "local"
    if profile:
        merged["agent_profile"] = profile
    if trigger:
        merged["trigger"] = trigger
    merged.update(metadata or {})
    attribution = attribution_metadata(
        agent=name,
        harness=str(merged.get("harness") or ""),
        platform=str(merged.get("platform") or ""),
        trigger=str(merged.get("trigger") or ""),
        profile=profile,
        client=client,
        metadata=merged,
    )
    merged.update(attribution)

    base_tags = [f"agent:{_normalize_tag(name)}", f"runtime:{_normalize_tag(_RUNTIME_ENV)}"]
    if client:
        base_tags.append(f"client:{_normalize_tag(client)}")
    base_tags.extend(_metadata_tags(merged))
    if tags:
        base_tags.extend(str(tag) for tag in tags if tag)

    deduped_tags = list(dict.fromkeys(base_tags))
    return full_name, deduped_tags, _coerce_metadata(merged)


def _set_span_metadata(span: Any, full_name: str, tags: list[str], metadata: Mapping[str, Any]) -> None:
    span.set_attribute("langfuse.trace.name", full_name)
    span.set_attribute("langfuse.trace.tags", json.dumps(tags))
    span.set_attribute("langfuse.trace.metadata", json.dumps(metadata, default=str))
    session_id = metadata.get("session_id") or metadata.get("worktree.session_id")
    if session_id:
        span.set_attribute("langfuse.session.id", str(session_id))
    for key, value in metadata.items():
        try:
            span.set_attribute(str(key), value)
        except Exception:
            span.set_attribute(str(key), str(value))
    try:
        from langfuse import get_client  # type: ignore
        get_client().update_current_trace(
            name=full_name,
            tags=tags,
            metadata=dict(metadata),
            session_id=str(session_id) if session_id else None,
        )
    except Exception:
        pass


def trace_agent(name: str, sample_rate: float = 1.0, tags: list[str] | None = None,
                client: str | None = None, metadata: dict[str, Any] | None = None,
                harness: str | None = None, platform: str | None = None,
                profile: str | None = None, trigger: str | None = None,
                tool: str | None = None, command: Any = None):
    """Decorator factory — emits a Langfuse trace named ``<name>:<env>``.

    ``env`` is auto-detected as ``github-actions`` if GITHUB_ACTIONS=true,
    else ``local``. Override by setting trace name explicitly.

    Tags applied to the trace for filtering in the Langfuse UI:
      - agent:<name>            (the decorated agent)
      - runtime:<env>           (github-actions | local)
      - <extra tags from caller>

    ``client`` adds an extra ``client:<slug>`` tag for client-scoped agents.
    """
    full_name, base_tags, base_metadata = _trace_context(
        name=name,
        tags=tags,
        client=client,
        metadata=metadata,
        harness=harness,
        platform=platform,
        profile=profile,
        trigger=trigger,
        tool=tool,
        command=command,
    )

    def decorator(func):
        if not TRACING_ENABLED:
            return func

        # Inner wrapper runs INSIDE the @observe span context — that's where
        # the current OTel span is active. We set the Langfuse magic
        # attributes directly via OTel set_attribute (portable across
        # langfuse v3 and v4 — v4 dropped update_current_trace).
        @wraps(func)
        def _with_trace_metadata(*args, **kwargs):
            try:
                from opentelemetry import trace as _otel_trace
                span = _otel_trace.get_current_span()
                if span is not None:
                    _set_span_metadata(span, full_name, base_tags, base_metadata)
            except Exception:
                pass
            return func(*args, **kwargs)

        observe_kwargs = {
            "name": full_name,
            "capture_input": False,
            "capture_output": False,
        }
        # Langfuse v4 supports as_type. Older SDKs do not, so keep the helper
        # backward-compatible and fall back to the historical span behavior.
        try:
            observed = observe(**observe_kwargs, as_type=EAGLE_ROOT_TYPE)(_with_trace_metadata)
        except TypeError:
            observed = observe(**observe_kwargs)(_with_trace_metadata)

        @wraps(func)
        def outer(*args, **kwargs):
            if random.random() > sample_rate:
                return func(*args, **kwargs)
            try:
                return observed(*args, **kwargs)
            finally:
                if _langfuse_client is not None:
                    try:
                        _langfuse_client.flush()
                    except Exception:
                        pass
        return outer
    return decorator


def annotate_current_observation(metadata: dict[str, Any] | None = None,
                                 tool: str | None = None,
                                 command: Any = None) -> None:
    """Attach standardized metadata to the active observation/span."""
    if not TRACING_ENABLED:
        return
    try:
        from opentelemetry import trace as _otel_trace
        span = _otel_trace.get_current_span()
        if span is None:
            return
        merged: dict[str, Any] = {}
        merged.update(_tool_command_metadata(tool, command))
        merged.update(metadata or {})
        coerced = _coerce_metadata(merged)
        for key, value in coerced.items():
            try:
                span.set_attribute(str(key), value)
            except Exception:
                span.set_attribute(str(key), str(value))
        try:
            from langfuse import get_client  # type: ignore
            get_client().update_current_span(metadata=coerced)
        except Exception:
            pass
    except Exception:
        pass


def _build_propagation(**kwargs):
    """Version-tolerant propagate_attributes wrapper.

    Older langfuse SDKs (e.g. 3.9.x) reject the ``trace_name`` kwarg with a
    TypeError, which would violate this module's never-raises contract and
    silently kill every emission on hosts pinned to that SDK. Retry without
    the newer kwarg before giving up.
    """
    if _propagate_attributes is None:
        return nullcontext()
    try:
        return _propagate_attributes(**kwargs)
    except TypeError:
        kwargs.pop("trace_name", None)
        try:
            return _propagate_attributes(**kwargs)
        except Exception:
            return nullcontext()


def emit_eagle_graph_trace(
    *,
    name: str,
    harness: str,
    platform: str,
    trigger: str,
    input_data: Mapping[str, Any] | None = None,
    output_data: Mapping[str, Any] | str | None = None,
    generation: Mapping[str, Any] | None = None,
    chain: Mapping[str, Any] | None = None,
    tools: Sequence[Mapping[str, Any]] | None = None,
    tags: Iterable[str] | None = None,
    metadata: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Emit the approved Eagle graph trace shape through Langfuse.

    Returns a small result dict and never raises. All harness adapters should
    prefer this over hand-rolled Langfuse calls when they need graph-shaped
    traces.
    """
    result: dict[str, Any] = {"enabled": bool(TRACING_ENABLED), "trace_id": "", "trace_url": ""}
    if not TRACING_ENABLED or _langfuse_client is None:
        return result

    trace_metadata = eagle_trace_metadata(
        harness=harness,
        platform=platform,
        trigger=trigger,
        metadata=metadata,
    )
    trace_tags = eagle_trace_tags(
        harness=harness,
        platform=platform,
        trigger=trigger,
        tags=tags,
    )
    session_id = str(trace_metadata.get("session_id")) if trace_metadata.get("session_id") else None
    propagation = _build_propagation(
        session_id=session_id,
        metadata=dict(trace_metadata),
        tags=trace_tags,
        trace_name=name,
    )
    try:
        propagation.__enter__()
        with _langfuse_client.start_as_current_observation(
            name=name,
            as_type=EAGLE_ROOT_TYPE,
            input=dict(input_data or {}),
        ) as agent:
            trace_id = getattr(agent, "trace_id", "") or ""
            result["trace_id"] = trace_id
            try:
                update_trace = getattr(_langfuse_client, "update_current_trace", None)
                if callable(update_trace):
                    update_trace(
                        name=name,
                        tags=trace_tags,
                        metadata=dict(trace_metadata),
                        session_id=session_id,
                    )
            except Exception:
                pass

            if generation:
                generation_metadata = _coerce_metadata(
                    generation.get("metadata") if isinstance(generation.get("metadata"), Mapping) else {}
                )
                usage_details = _coerce_usage_details(
                    generation.get("usageDetails") if isinstance(generation.get("usageDetails"), Mapping)
                    else generation.get("usage_details") if isinstance(generation.get("usage_details"), Mapping)
                    else generation.get("usage") if isinstance(generation.get("usage"), Mapping)
                    else {}
                )
                if usage_details:
                    generation_metadata.setdefault("usageDetails", json.dumps(usage_details, ensure_ascii=False))
                with _langfuse_client.start_as_current_observation(
                    name=str(generation.get("name") or f"{name} generation"),
                    as_type=EAGLE_GENERATION_TYPE,
                    input=generation.get("input"),
                ) as generation_obs:
                    update = {
                        "model": generation.get("model"),
                        "output": generation.get("output"),
                        "metadata": generation_metadata,
                    }
                    if usage_details:
                        update["usage_details"] = usage_details
                    try:
                        generation_obs.update(**update)
                    except TypeError:
                        update.pop("usage_details", None)
                        generation_obs.update(**update)

            chain_spec = dict(chain or {})
            with _langfuse_client.start_as_current_observation(
                name=str(chain_spec.get("name") or f"{name} processing"),
                as_type=EAGLE_CHAIN_TYPE,
                input=chain_spec.get("input") or {},
            ) as chain_obs:
                for tool_spec in tools or []:
                    tool_name = str(tool_spec.get("name") or tool_spec.get("tool") or "tool")
                    with _langfuse_client.start_as_current_observation(
                        name=tool_name if tool_name.startswith("Tool:") else f"Tool: {tool_name}",
                        as_type=EAGLE_TOOL_TYPE,
                        input=tool_spec.get("input") or {},
                    ) as tool_obs:
                        tool_obs.update(
                            output=tool_spec.get("output"),
                            metadata=_coerce_metadata(tool_spec.get("metadata") if isinstance(tool_spec.get("metadata"), Mapping) else {}),
                        )
                chain_obs.update(output=chain_spec.get("output") or {"status": "ok"})

            if output_data is not None:
                agent.update(output=output_data)

        flush()
        if result["trace_id"]:
            try:
                result["trace_url"] = _langfuse_client.get_trace_url(trace_id=str(result["trace_id"]))
            except Exception:
                result["trace_url"] = ""
    except Exception as exc:
        result["error"] = type(exc).__name__
    finally:
        try:
            propagation.__exit__(None, None, None)
        except Exception:
            pass
    return result


def flush() -> None:
    """Call before process exit to force-deliver any pending traces."""
    if _langfuse_client is not None:
        try:
            _langfuse_client.flush()
        except Exception:
            pass


__all__ = [
    "observe",
    "trace_agent",
    "annotate_current_observation",
    "emit_eagle_graph_trace",
    "eagle_trace_metadata",
    "eagle_trace_tags",
    "post_langfuse_score",
    "attribution_metadata",
    "flush",
    "TRACING_ENABLED",
    "EAGLE_GRAPH_SCHEMA_VERSION",
    "LANGFUSE_SCORE_NAMES",
    "_trace_context",
    "_command_name",
]
