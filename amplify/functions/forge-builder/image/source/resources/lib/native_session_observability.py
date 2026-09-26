"""Read native session usage/tools without exporting conversation content.

Provider response IDs are the accounting boundary. Streaming snapshots, copied
transcripts, cumulative counters, and hook traces must not become extra spend.
"""
from __future__ import annotations

from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
import math
from pathlib import Path
from typing import Any, Iterable

SCHEMA = "native-session-observability.v1"


@contextmanager
def export_lock(path: Path):
    """One exporter per checkpoint, releasing the lock even after an error."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as handle:
        if handle.tell() == 0:
            handle.write(b"0")
            handle.flush()
        handle.seek(0)
        if os.name == "nt":
            import msvcrt
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            yield
        finally:
            handle.seek(0)
            if os.name == "nt":
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle, fcntl.LOCK_UN)


def digest(*parts: Any, size: int = 32) -> str:
    return hashlib.sha256(json.dumps(parts, sort_keys=True).encode()).hexdigest()[:size]


def timestamp(value: Any) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


def numeric_usage(value: Any) -> dict[str, int]:
    if not isinstance(value, dict):
        return {}
    return {k: int(v) for k, v in value.items()
            if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v >= 0 and int(v) == v}


def usage_details(harness: str, usage: dict) -> dict[str, int]:
    """Disjoint buckets: cached input/reasoning are not counted twice."""
    u = numeric_usage(usage)
    if harness == "codex":
        cached = min(u.get("cached_input_tokens", 0), u.get("input_tokens", 0))
        return {"input": u.get("input_tokens", 0) - cached,
                "input_cached": cached, "output": u.get("output_tokens", 0),
                "total": u.get("total_tokens", u.get("input_tokens", 0) + u.get("output_tokens", 0))}
    return {"input": u.get("input_tokens", 0),
            "input_cache_read": u.get("cache_read_input_tokens", 0),
            "input_cache_creation": u.get("cache_creation_input_tokens", 0),
            "output": u.get("output_tokens", 0),
            "total": sum(u.get(k, 0) for k in ("input_tokens", "cache_read_input_tokens",
                                               "cache_creation_input_tokens", "output_tokens"))}


def read_rows(path: Path) -> Iterable[dict]:
    # A concurrently appended final line may be incomplete; the next scan retries.
    with path.open(encoding="utf-8-sig") as handle:
        for line in handle:
            try:
                row = json.loads(line)
            except (ValueError, UnicodeError):
                continue
            if isinstance(row, dict):
                yield row


def read_codex(path: Path, *, diagnostics: dict | None = None, source_bounds: dict | None = None) -> tuple[list[dict], list[dict]]:
    rows = list(read_rows(path))
    diagnostics = diagnostics if diagnostics is not None else {}
    source_bounds = source_bounds if source_bounds is not None else {}
    def gap(reason):
        diagnostics[reason] = diagnostics.get(reason, 0) + 1

    modern = any(r.get("type") == "token_usage_record" for r in rows)
    legacy_total, legacy_epoch = None, 0
    seen_usage, rejected = {}, set()
    session = None
    model = None
    cwd = None
    turn = None
    pending: list[dict] = []
    calls: dict[str, dict] = {}
    generations = []
    first_response_at = None
    for row in rows:
        p = row.get("payload") or {}
        if not isinstance(p, dict):
            continue
        at = row.get("timestamp")
        source_at = timestamp(at)
        if source_at:
            source_bounds['last'] = max(source_bounds.get('last', source_at), source_at)
        kind = row.get("type")
        if kind == "session_meta":
            session = p.get("session_id") or p.get("id")
            cwd = p.get("cwd")
        elif kind == "turn_context":
            model = p.get("model")
            cwd = p.get("cwd") or cwd
            turn = p.get("turn_id")
            pending = []
            first_response_at = None
        elif kind == "response_item":
            typ = p.get("type")
            if typ in {"message", "reasoning", "function_call", "custom_tool_call"}:
                first_response_at = first_response_at or at
            if typ in {"function_call", "custom_tool_call"} and p.get("call_id"):
                tool = {"harness": "codex", "session_id": session, "call_id": p["call_id"],
                        "name": p.get("name") or "unknown", "start": at,
                        "end": None, "cwd": cwd, "turn_id": turn,
                        "generation_key": None, "generation_link_evidence": "unknown",
                        "outcome": "unknown"}
                calls[p["call_id"]] = tool
                pending.append(tool)
            elif typ in {"function_call_output", "custom_tool_call_output"}:
                if p.get("call_id") in calls:
                    calls[p["call_id"]]["end"] = at
        elif kind == "token_usage_record" or (kind == "event_msg" and p.get("type") == "token_count"):
            if modern and kind != 'token_usage_record':
                gap('legacy_ignored_with_modern')
                continue
            info = p.get("info") or {}
            usage = p.get("usage") if modern else info.get("last_token_usage")
            if not isinstance(usage, dict) or not numeric_usage(usage):
                continue
            sid = p.get("session_id") or session
            # Legacy rows have no response ID; an unchanged cumulative checkpoint
            # is one response even when rate-limit notifications repeat it.
            if modern:
                response = p.get('response_id')
            else:
                cumulative = numeric_usage(info.get('total_token_usage'))
                total = cumulative.get('total_tokens')
                if total is None:
                    gap('missing_cumulative_identity')
                    continue
                if legacy_total is not None and total < legacy_total:
                    legacy_epoch += 1
                    gap('cumulative_reset')
                legacy_total = total
                response = (digest('legacy', info.get('total_token_usage')) if not legacy_epoch else
                            digest('legacy-reset', legacy_epoch, cumulative))
            if not sid or not response:
                continue
            key = digest("codex", sid, response)
            # Codex records are final usage, unlike Claude's streaming snapshots.
            signature = (numeric_usage(usage), model)
            if key in seen_usage and seen_usage[key] != signature:
                gap('conflicting_usage_replay')
                rejected.add(key)
            seen_usage[key] = signature
            generations.append({"key": key, "harness": "codex", "session_id": sid,
                                "response_id": response, "turn_id": p.get("turn_id") or turn,
                                "model": model, "cwd": cwd, "recorded_at": at,
                                "start": first_response_at or at,
                                "usage": numeric_usage(usage), "source_kind": "token_usage_record" if modern else "token_count"})
            for tool in pending:
                tool["generation_key"] = key
                # Tool rows do not carry response_id. Do not call sequence-based
                # grouping explicit attribution or imply measured per-tool tokens.
                tool["generation_link_evidence"] = "inferred"
            pending = []
            first_response_at = None
    unique = {}
    for g in generations:
        if g['key'] not in rejected:
            unique.setdefault(g['key'], g)
    return list(unique.values()), list(calls.values())


def codex_usage_summary(path: Path, *, since: datetime | None = None, until: datetime | None = None) -> dict:
    """Bounded session totals with provenance; they carry no PR ownership claim."""
    diagnostics = {}
    source_bounds = {}
    generations, _ = read_codex(path, diagnostics=diagnostics, source_bounds=source_bounds)
    unique = {}
    for g in generations:
        at = timestamp(g.get('recorded_at'))
        if at is None or (since and at < since) or (until and at >= until):
            continue
        unique.setdefault(g['key'], g)  # Replayed checkpoints cannot move into a later window.
    rows = list(unique.values())
    from resources.lib.usage_pricing import estimate, aggregate
    def price(g):
        u = g['usage']
        return estimate(g.get('model'), {'input':u.get('input_tokens'), 'cached_input':u.get('cached_input_tokens'), 'output':u.get('output_tokens'), 'total':u.get('total_tokens')})
    models = defaultdict(list)
    for g in rows:
        models[g.get('model')].append(g)
    by_model = []
    for model, values in sorted(models.items(), key=lambda item: item[0] or ''):
        by_model.append({'model': model, 'model_basis': 'turn_context' if model else 'unknown',
                         'observations': len(values),
                         'tokens': sum(usage_details('codex', g['usage'])['total'] for g in values),
                         'cost': None, 'cost_basis': 'unknown',
                         'cost_estimate': aggregate([price(g) for g in values], len(values))})
    return {'schema_version': 'native-session-usage.v1', 'scope': 'session',
            'state': 'partial' if diagnostics else 'observed' if rows else 'unavailable',
            'observations': len(rows), 'models': by_model,
            'tokens': sum(row['tokens'] for row in by_model) if rows else None,
            'cost': None, 'cost_basis': 'unknown', 'allocation_state': 'unknown',
            'cost_estimate': aggregate([price(g) for g in rows], len(rows)),
            'source_through': source_bounds['last'].isoformat() if source_bounds.get('last') else None,
            'first_observed_at': min((g['recorded_at'] for g in rows), default=None),
            'last_observed_at': max((g['recorded_at'] for g in rows), default=None),
            'window_start': since.isoformat() if since else None, 'window_end': until.isoformat() if until else None,
            'diagnostics': diagnostics, 'source_kinds': sorted({g['source_kind'] for g in rows}),
            'evidence_sha256': digest([(g['key'], g['usage'], g.get('model')) for g in sorted(rows, key=lambda g:g['key'])], size=64),
            'boundary': 'Observed native session usage; source loss and PR ownership are unknown. Session totals are not additive PR costs.'}


def read_claude(path: Path) -> tuple[list[dict], list[dict]]:
    generations = []
    calls: dict[tuple, dict] = {}
    results = {}
    for row in read_rows(path):
        message = row.get("message") or {}
        if not isinstance(message, dict):
            continue
        sid = row.get("sessionId") or row.get("session_id")
        at = row.get("timestamp")
        mid = message.get("id")
        request = row.get("requestId") or ""
        key = digest("claude-code", sid, request, mid) if sid and mid else None
        if row.get("type") == "assistant" and key and message.get("model") != "<synthetic>":
            usage = numeric_usage(message.get("usage"))
            if usage:
                generations.append({"key": key, "harness": "claude-code", "session_id": sid,
                                    "response_id": mid, "turn_id": request or None,
                                    "model": message.get("model"), "cwd": row.get("cwd"),
                                    "recorded_at": at, "start": at, "usage": usage,
                                    "source_kind": "assistant.message.usage"})
        content = message.get("content")
        for block in content if isinstance(content, list) else []:
            if not isinstance(block, dict) or not sid:
                continue
            if block.get("type") == "tool_use" and block.get("id"):
                call_key = (sid, block["id"])
                calls[call_key] = {"harness": "claude-code", "session_id": sid,
                                   "call_id": block["id"], "name": block.get("name") or "unknown",
                                   "start": at, "end": None, "cwd": row.get("cwd"),
                                   "turn_id": request or None, "generation_key": key,
                                   "generation_link_evidence": "explicit" if key else "unknown",
                                   "outcome": "unknown"}
            elif block.get("type") == "tool_result" and block.get("tool_use_id"):
                results[(sid, block["tool_use_id"])] = (at, "error" if block.get("is_error") else "success")
    for key, tool in calls.items():
        if key in results:
            tool["end"], tool["outcome"] = results[key]
    return generations, list(calls.values())


def collect(paths: Iterable[tuple[str, Path]], since: datetime, until: datetime) -> tuple[list[dict], list[dict]]:
    generations: dict[str, dict] = {}
    conflicts = set()
    tools: dict[tuple, dict] = {}
    for harness, path in paths:
        gs, ts = read_codex(path) if harness == "codex" else read_claude(path)
        for g in gs:
            if g['key'] in conflicts:
                continue
            at = timestamp(g["recorded_at"])
            if not at or not since <= at < until:
                continue
            previous = generations.get(g["key"])
            if previous:
                if harness == 'codex':
                    if any(previous.get(k) != g.get(k) for k in ('usage', 'model')):
                        conflicts.add(g['key'])
                        del generations[g['key']]
                    continue
                g["start"] = min(previous["start"], g["start"])
                # Claude streaming blocks repeat the same input, then revise
                # output. Keep the latest snapshot, never sum snapshots.
                if timestamp(previous["recorded_at"]) > at:
                    previous["start"] = g["start"]
                    continue
            generations[g["key"]] = g
        for tool in ts:
            at = timestamp(tool["start"])
            if not at or not since <= at < until:
                continue
            key = (harness, tool["session_id"], tool["call_id"])
            previous = tools.get(key)
            if previous:
                tool["start"] = min(previous["start"], tool["start"])
                if previous.get("end") and (not tool.get("end") or previous["end"] > tool["end"]):
                    tool["end"], tool["outcome"] = previous["end"], previous["outcome"]
            tools[key] = tool
    return list(generations.values()), list(tools.values())


def discover(home: Path, since: datetime) -> list[tuple[str, Path]]:
    paths = []
    for harness, folders in [("codex", [home / ".codex/sessions", home / ".codex/archived_sessions"]),
                             ("claude-code", [home / ".claude/projects"])]:
        for folder in folders:
            if folder.exists():
                paths.extend((harness, p) for p in folder.rglob("*.jsonl") if p.stat().st_mtime >= since.timestamp())
    return paths


def build_events(generations: list[dict], tools: list[dict], *, environment: str = "native-sessions") -> list[dict]:
    sessions = defaultdict(lambda: {"generations": [], "tools": []})
    gs = {g["key"]: g for g in generations}
    for g in generations:
        sessions[(g["harness"], g["session_id"])]["generations"].append(g)
    for tool in tools:
        sessions[(tool["harness"], tool["session_id"])]["tools"].append(tool)
    events = []
    for (harness, sid), group in sorted(sessions.items()):
        models, children = group["generations"], group["tools"]
        source = (models or children)[0]
        tid = digest(SCHEMA, "trace", harness, sid)
        root = digest(SCHEMA, "root", harness, sid, size=16)
        start = min(x["start"] for x in models + children)
        ends = [g["recorded_at"] for g in models]
        ends += [t["end"] or t["start"] for t in children]
        end = max(ends)
        meta = {"source": SCHEMA, "harness": harness, "evidence.harness": "explicit",
                "session_id": sid, "evidence.session_id": "explicit", "cwd": source.get("cwd"),
                "evidence.cwd": "explicit" if source.get("cwd") else "unknown",
                "turn_id": source.get("turn_id"), "content_exported": False,
                "coverage_scope": "native_session_tool_calls", "trace.format": "eagle-graph.v1",
                "trace.root_type": "agent", "trigger": "native_session_sync",
                "host_attribution": "source_execution_host_not_established_by_local_file"}
        name = f"native-session:{harness}:{digest(sid, size=10)}"
        events.append({"type": "trace-create", "body": {"id": tid, "name": name,
                       "timestamp": start, "sessionId": sid,
                       "metadata": meta, "environment": environment, "public": False,
                       "tags": [SCHEMA, "harness:" + harness, "source:native-session", "privacy:metadata-only"]}})
        events.append({"type": "observation-create", "body": {"id": root, "traceId": tid,
                       "type": "AGENT", "name": name, "startTime": start, "endTime": end,
                       "metadata": meta, "environment": environment}})
        for g in sorted(models, key=lambda x: (x["recorded_at"], x["key"])):
            gid = digest(SCHEMA, "generation", g["key"], size=16)
            md = {**meta, "response_id": g["response_id"], "usage_source": g["source_kind"],
                  "usage_basis": "observed", "usage_recorded_at": g["recorded_at"],
                  "timing_basis": "native_response_records", "cost_basis": "not_provider_billing",
                  "cwd": g.get("cwd"), "turn_id": g.get("turn_id")}
            if harness == 'codex':
                u = g['usage']
                md['usage_accounting_valid'] = (all(type(u.get(k)) is int and u[k] >= 0 for k in
                    ('input_tokens','cached_input_tokens','output_tokens','total_tokens')) and
                    u['cached_input_tokens'] <= u['input_tokens'] and
                    u['total_tokens'] == u['input_tokens'] + u['output_tokens'])
            if "reasoning_output_tokens" in g["usage"]:
                md["reasoning_output_tokens_included_in_output"] = g["usage"]["reasoning_output_tokens"]
            body = {"id": gid, "traceId": tid, "parentObservationId": root,
                    "name": "Model response: " + (g.get("model") or "unknown"),
                    "startTime": g["start"], "endTime": g["recorded_at"],
                    "model": g.get("model"), "usageDetails": usage_details(harness, g["usage"]),
                    "metadata": md, "environment": environment}
            events.append({"type": "generation-create", "body": body})
        for tool in sorted(children, key=lambda x: (x["start"], x["call_id"])):
            key = tool.get("generation_key")
            gid = digest(SCHEMA, "generation", key, size=16) if key in gs else root
            md = {**meta, "call_id": tool["call_id"], "result_observed": bool(tool["end"]),
                  "outcome": tool["outcome"], "generation_link_evidence": tool["generation_link_evidence"] if key in gs else "unknown",
                  "cwd": tool.get("cwd"), "turn_id": tool.get("turn_id"),
                  "token_attribution": "tokens_belong_to_model_response_not_individual_tool"}
            body = {"id": digest(SCHEMA, "tool", harness, sid, tool["call_id"], size=16),
                    "traceId": tid, "parentObservationId": gid,
                    "type": "TOOL", "name": "Tool: " + tool["name"], "startTime": tool["start"],
                    "metadata": md, "environment": environment,
                    "level": "ERROR" if tool["outcome"] == "error" else "DEFAULT"}
            if tool["end"]:
                body["endTime"] = tool["end"]
            events.append({"type": "observation-create", "body": body})
    return events
