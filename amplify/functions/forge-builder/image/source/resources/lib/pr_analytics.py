"""Metadata-only work-run identity and PR analytics contracts.

This module never reads transcripts or persists command/output bodies. Network
writers live at the existing tracing and gbauto-supabase boundaries.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path
import re
import sqlite3
import subprocess
from datetime import datetime, timedelta, timezone
from typing import Any, Mapping, Sequence
import uuid

PHASES = frozenset({'build', 'validation', 'post_merge', 'synthetic', 'telemetry'})
OUTCOMES = frozenset({'success', 'failure', 'cancelled', 'denied', 'unknown'})
EVIDENCE = frozenset({'explicit', 'joined', 'inferred', 'unknown'})
UNKNOWN = frozenset({'', '<unknown>', '<unmapped>', 'unknown', 'null', 'none', 'n/a'})
SECRET = re.compile(r'(?:sk-[A-Za-z0-9_-]{16,}|gh[opusr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|Bearer\s|PRIVATE KEY)', re.I)
LABEL = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.:@/+\-]{0,199}$')
REPO = re.compile(r'^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')
SHA = re.compile(r'^[0-9a-f]{40}$')


class ContractError(ValueError):
    """An actionable contract category without source payload content."""


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='microseconds')


def stamp(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return parsed.astimezone(timezone.utc).isoformat(timespec='microseconds') if parsed.tzinfo else None
    except ValueError:
        return None


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False)


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def label(value: object) -> str | None:
    if not isinstance(value, str) or value.strip().lower() in UNKNOWN:
        return None
    value = value.strip()
    return value if LABEL.fullmatch(value) and not SECRET.search(value) else None


def number(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        return None
    return float(value) if math.isfinite(value) and value >= 0 else None


def repository(value: object) -> str:
    safe = label(value)
    if not safe or not REPO.fullmatch(safe):
        raise ContractError('invalid_repository')
    return safe.lower()


def git_context(cwd: Path) -> dict[str, Any]:
    """Read the actual action cwd; no shell payload parsing or cwd publication."""
    def git(*args: str) -> str:
        result = subprocess.run(['git', '-C', str(cwd), *args], capture_output=True,
                                text=True, encoding='utf-8', timeout=10)
        return result.stdout.strip() if result.returncode == 0 else ''
    remote = git('remote', 'get-url', 'origin')
    match = re.search(r'github\.com[:/]([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+?)(?:\.git)?$', remote)
    sha = git('rev-parse', 'HEAD').lower()
    directory = git('rev-parse', '--absolute-git-dir')
    return {'repository': repository(match.group(1)) if match else None,
            'branch': label(git('branch', '--show-current')),
            'commit_sha': sha if SHA.fullmatch(sha) else None,
            'worktree_id': 'wt_' + digest(os.path.normcase(directory))[:24] if directory else None}


def normalize_event(raw: Mapping[str, Any], run: Mapping[str, Any], *, received_at: str | None = None) -> dict[str, Any]:
    """Strict allowlist at the first durable boundary. Unknown is not success."""
    event_type = label(raw.get('event_type'))
    if event_type not in {'tool', 'generation', 'request', 'lifecycle'}:
        raise ContractError('invalid_event_type')
    if raw.get('run_id') and raw['run_id'] != run['run_id']:
        raise ContractError('run_identity_mismatch')
    phase = raw.get('phase', run.get('phase', 'build'))
    if phase not in PHASES:
        raise ContractError('invalid_phase')
    outcome = raw.get('outcome', 'unknown')
    if outcome not in OUTCOMES:
        outcome = 'unknown'
    duration = number(raw.get('duration_ms'))
    timing = raw.get('duration_source') if raw.get('duration_source') in {'producer', 'monotonic_wrapper', 'paired_events'} else 'unknown'
    if timing == 'unknown':
        duration = None
    source_id = label(raw.get('source_event_id'))
    event_id = label(raw.get('event_id')) or ('evt_' + digest([run['run_id'], raw.get('source'), source_id])[:32] if source_id else 'evt_' + uuid.uuid4().hex)
    action_repo = raw.get('repository')
    context_valid = bool(action_repo and action_repo == run.get('repository') and raw.get('worktree_id') == run.get('worktree_id'))
    event = {
        'schema_version': 'action-fact.v1', 'event_id': event_id, 'run_id': run['run_id'],
        'segment_id': label(raw.get('segment_id')) or run.get('segment_id'),
        'event_type': event_type, 'source': label(raw.get('source')) or 'unknown',
        'source_event_id': source_id, 'source_event_at': stamp(raw.get('source_event_at')),
        'received_at': stamp(received_at) or now(), 'phase': phase,
        'repository': action_repo if context_valid else None,
        'worktree_id': label(raw.get('worktree_id')) if context_valid else None,
        'commit_sha': raw.get('commit_sha') if context_valid and SHA.fullmatch(str(raw.get('commit_sha', ''))) else None,
        'branch': label(raw.get('branch')) if context_valid else None,
        'context_evidence': 'explicit' if context_valid else 'unknown',
        'tool_name': label(raw.get('tool_name')), 'tool_call_id': label(raw.get('tool_call_id')),
        'request_id': label(raw.get('request_id')), 'model': label(raw.get('model')),
        'session_id': label(raw.get('session_id')),
        'outcome': outcome, 'duration_ms': duration, 'duration_source': timing,
        'exit_code': raw.get('exit_code') if type(raw.get('exit_code')) is int else None,
        'attempt': raw.get('attempt') if type(raw.get('attempt')) is int and 1 <= raw['attempt'] <= 1000 else None,
        'retry_of': label(raw.get('retry_of')), 'error_category': label(raw.get('error_category')),
        'exception_type': label(raw.get('exception_type')),
        'tool_version': label(raw.get('tool_version')), 'harness_version': label(raw.get('harness_version')),
        'skill_id': label(raw.get('skill_id')), 'skill_version': label(raw.get('skill_version')),
        'prompt_id': label(raw.get('prompt_id')), 'prompt_version': label(raw.get('prompt_version')),
        'usage_details': {}, 'usage_basis': 'unmeasured', 'cost': None, 'cost_basis': 'unknown',
    }
    if event_type == 'generation':
        usage = raw.get('usage_details') or {}
        if isinstance(usage, dict):
            event['usage_details'] = {key: number(usage[key]) for key in ('input', 'output', 'total', 'cached_input', 'reasoning_output') if number(usage.get(key)) is not None}
        if event['usage_details'] and raw.get('usage_basis') == 'observed':
            event['usage_basis'] = 'observed'
        else:
            event['usage_details'] = {}
        if number(raw.get('cost')) is not None and raw.get('cost_basis') == 'observed':
            event['cost'], event['cost_basis'] = number(raw['cost']), 'observed'
    event['error_fingerprint'] = digest({key: event[key] for key in ('tool_name', 'tool_version', 'error_category', 'exception_type', 'exit_code')})[:24] if outcome == 'failure' else None
    return event


class Ledger:
    """Per-user SQLite metadata ledger; transactionally bounded and replay-safe."""
    def __init__(self, path: Path | None = None, *, max_bytes: int = 100 * 1024 * 1024):
        self.path = path or Path(os.getenv('GBAUTO_ANALYTICS_DB', str(Path.home() / '.gbauto/state/pr-analytics/ledger.db')))
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.max_bytes = max_bytes
        self.db = sqlite3.connect(self.path, timeout=15)
        self.db.row_factory = sqlite3.Row
        self.db.execute('pragma journal_mode=WAL')
        self.db.execute('pragma wal_autocheckpoint=64')
        self.db.execute('pragma journal_size_limit=1048576')
        page_size = self.db.execute('pragma page_size').fetchone()[0]
        self.db.execute(f'pragma max_page_count={max(64, max_bytes // page_size)}')
        self.db.executescript('''
          create table if not exists runs(run_id text primary key, body text not null);
          create table if not exists links(run_id text not null, segment_id text not null, repository text not null,
            pr_number integer not null, first_event_at text, last_event_at text,
            primary key(run_id,segment_id,repository,pr_number));
          create table if not exists events(event_id text primary key,run_id text not null,body text not null,
            size integer not null,created_at text not null,delivered_at text,attempts integer not null default 0,
            trace_id text,observation_id text,last_error text);
          create table if not exists counters(name text primary key,value integer not null);
          create table if not exists usage_claims(run_id text primary key, session_id text not null,
            first_event_at text not null, last_event_at text);
        ''')
        columns = {row[1] for row in self.db.execute('pragma table_info(events)')}
        if 'next_attempt_at' not in columns:
            self.db.execute('alter table events add column next_attempt_at text')
            self.db.commit()

    def close(self):
        self.db.close()

    def start(self, cwd: Path, *, session_id: str | None = None, phase: str = 'build') -> dict[str, Any]:
        if phase not in PHASES:
            raise ContractError('invalid_phase')
        context = git_context(cwd)
        if not context['repository'] or not context['worktree_id']:
            raise ContractError('unidentified_repository_worktree')
        row = {'schema_version': 'work-run.v1', 'run_id': 'run_' + uuid.uuid4().hex,
               'segment_id': 'seg_' + uuid.uuid4().hex, 'session_id': label(session_id),
               'started_at': now(), 'ended_at': None, 'phase': phase, **context}
        with self.db:
            self.db.execute('insert into runs values(?,?)', (row['run_id'], canonical(row)))
        return row

    def run(self, run_id: str) -> dict[str, Any]:
        row = self.db.execute('select body from runs where run_id=?', (run_id,)).fetchone()
        if not row:
            raise ContractError('run_not_found')
        return json.loads(row['body'])

    def change(self, run_id: str, *, phase: str | None = None, finish: bool = False) -> dict[str, Any]:
        row = self.run(run_id)
        if row['ended_at']:
            raise ContractError('run_finished')
        if phase is not None:
            if phase not in PHASES:
                raise ContractError('invalid_phase')
            row['phase'] = phase
        if finish:
            row['ended_at'] = now()
        with self.db:
            self.db.execute('update runs set body=? where run_id=?', (canonical(row), run_id))
            if finish:
                self.db.execute('update usage_claims set last_event_at=? where run_id=? and last_event_at is null', (row['ended_at'], run_id))
        return row

    def claim_usage(self, run_id: str) -> dict[str, Any]:
        """Opt in from this instant. Claims cannot backdate or overlap a session."""
        with self.db:
            self.db.execute('begin immediate')
            run = self.run(run_id)
            if run['ended_at'] or not run.get('session_id'):
                raise ContractError('active_session_run_required')
            if not run.get('usage_claim_phase'):
                run['usage_claim_phase'] = run['phase']
                self.db.execute('update runs set body=? where run_id=?', (canonical(run), run_id))
            old = self.db.execute('select * from usage_claims where run_id=?', (run_id,)).fetchone()
            if old:
                return dict(old)
            if self.db.execute('select 1 from usage_claims where session_id=? and last_event_at is null', (run['session_id'],)).fetchone():
                raise ContractError('session_usage_already_claimed')
            row = {'run_id':run_id, 'session_id':run['session_id'], 'first_event_at':now(), 'last_event_at':None}
            self.db.execute('insert into usage_claims values(?,?,?,?)', tuple(row.values()))
            return row

    def usage_run(self, session_id: str, first_at: str, last_at: str):
        first, last = stamp(first_at), stamp(last_at)
        if not first or not last or first > last:
            return None
        claims = self.db.execute('select * from usage_claims where session_id=? and first_event_at<=? '
            'and (last_event_at is null or last_event_at>?)', (session_id, first, last)).fetchall()
        if len(claims) != 1:
            return None
        run = self.run(claims[0]['run_id'])
        if run.get('usage_claim_phase') not in PHASES:
            return None
        return {**run, 'phase':run['usage_claim_phase']}

    def bind(self, run_id: str, repo: str, pr: int, *, segment_id: str | None = None,
             first_event_at: str | None = None, last_event_at: str | None = None) -> dict[str, Any]:
        row = self.run(run_id)
        repo = repository(repo)
        if repo != row['repository'] or type(pr) is not int or pr <= 0:
            raise ContractError('invalid_pr_link')
        start, end = stamp(first_event_at), stamp(last_event_at)
        if bool(first_event_at) != bool(start) or bool(last_event_at) != bool(end) or (start and end and start >= end):
            raise ContractError('invalid_segment_window')
        link = {'run_id': run_id, 'segment_id': label(segment_id) or row['segment_id'],
                'repository': repo, 'pr_number': pr, 'first_event_at': start, 'last_event_at': end}
        with self.db:
            existing = self.db.execute('select * from links where run_id=? and segment_id=? and repository=? and pr_number=?', (run_id, link['segment_id'], repo, pr)).fetchone()
            if existing and dict(existing) != link:
                raise ContractError('immutable_link_conflict')
            self.db.execute('insert or ignore into links values(?,?,?,?,?,?)', tuple(link.values()))
        return link

    def links(self, run_id: str | None = None) -> list[dict[str, Any]]:
        rows = self.db.execute('select * from links' + (' where run_id=?' if run_id else ''), (run_id,) if run_id else ())
        return [dict(row) for row in rows]

    def append(self, raw: Mapping[str, Any], run_id: str, *, allow_finished: bool = False,
               acknowledged_native: tuple[str, str] | None = None) -> dict[str, Any]:
        run = self.run(run_id)
        event = normalize_event(raw, run, received_at=raw.get('received_at'))
        if acknowledged_native:
            trace_id, observation_id = acknowledged_native
            if (event['source'] != 'codex_session_claim' or event['event_type'] != 'generation' or
                    not re.fullmatch('[0-9a-f]{32}', trace_id) or not re.fullmatch('[0-9a-f]{16}', observation_id)):
                raise ContractError('invalid_native_acknowledgement')
        encoded = canonical(event)
        with self.db:
            self.db.execute('begin immediate')
            existing = self.db.execute('select body from events where event_id=?', (event['event_id'],)).fetchone()
            if existing:
                previous = json.loads(existing['body'])
                if {k: v for k, v in previous.items() if k != 'received_at'} != {k: v for k, v in event.items() if k != 'received_at'}:
                    raise ContractError('immutable_event_conflict')
                return previous
            if run['ended_at'] and not allow_finished:
                raise ContractError('run_finished')
            # Leave half the file budget for indexes, run/link records and SQLite pages.
            if self.db.execute('select coalesce(sum(size),0) from events').fetchone()[0] + len(encoded) > self.max_bytes // 2:
                self.db.execute("insert into counters values('dropped_capacity',1) on conflict(name) do update set value=value+1")
                self.db.commit()
                raise ContractError('ledger_capacity_exceeded')
            # Native usage has already been delivered. Adopt its original IDs
            # atomically so a crash cannot leave a duplicate-export candidate.
            self.db.execute('insert into events(event_id,run_id,body,size,created_at,trace_id,observation_id,delivered_at) values(?,?,?,?,?,?,?,?)',
                            (event['event_id'], run_id, encoded, len(encoded), event['received_at'],
                             acknowledged_native[0] if acknowledged_native else None,
                             acknowledged_native[1] if acknowledged_native else None,
                             now() if acknowledged_native else None))
        return event

    def events(self, run_id: str, *, pending: bool = False, limit: int = 10000) -> list[dict[str, Any]]:
        if not 1 <= limit <= 10000:
            raise ContractError('invalid_event_limit')
        rows = self.db.execute('select body,trace_id,observation_id,delivered_at,attempts from events where run_id=?' +
                               (' and delivered_at is null and (next_attempt_at is null or next_attempt_at<=?)' if pending else '') +
                               ' order by created_at,event_id limit ?', (run_id, now(), limit) if pending else (run_id, limit))
        return [{**json.loads(r['body']), 'trace_id': r['trace_id'], 'observation_id': r['observation_id'],
                 'delivered_at': r['delivered_at'], 'delivery_attempts': r['attempts']} for r in rows]

    def delivered(self, event_id: str, *, trace_id: str | None = None, observation_id: str | None = None, error: str | None = None, retry_after: float | None = None):
        valid = bool(re.fullmatch('[0-9a-f]{32}', trace_id or '') and re.fullmatch('[0-9a-f]{16}', observation_id or ''))
        next_attempt = (datetime.now(timezone.utc) + timedelta(seconds=retry_after)).isoformat() if number(retry_after) is not None else None
        with self.db:
            self.db.execute('update events set attempts=attempts+1,trace_id=?,observation_id=?,delivered_at=?,last_error=?,next_attempt_at=? where event_id=? and delivered_at is null',
                            (trace_id if valid else None, observation_id if valid else None, now() if valid and not error else None,
                             label(error) or (None if valid else 'export_unverified'), next_attempt, event_id))

    def prune(self) -> int:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        with self.db:
            result = self.db.execute('delete from events where delivered_at is not null and delivered_at<?', (cutoff,))
        self.db.execute('pragma wal_checkpoint(truncate)')
        return result.rowcount

    def status(self, run_id: str) -> dict[str, Any]:
        run = self.run(run_id)
        counts = self.db.execute('select count(*) total,sum(delivered_at is not null) delivered from events where run_id=?', (run_id,)).fetchone()
        return {'run': run, 'links': self.links(run_id), 'events': counts['total'], 'delivered': counts['delivered'] or 0,
                'loss_counters': dict(self.db.execute('select name,value from counters')),
                'coverage_boundary': 'events received locally; loss before receipt is unknown'}


def allocate(event: Mapping[str, Any], links: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    matches = []
    for link in links:
        if event.get('run_id') != link.get('run_id') or event.get('repository') != link.get('repository'):
            continue
        if event.get('segment_id') != link.get('segment_id') or event.get('context_evidence') not in {'explicit', 'joined'}:
            continue
        timestamp = stamp(event.get('source_event_at'))
        start, end = stamp(link.get('first_event_at')), stamp(link.get('last_event_at'))
        if (start or end) and (not timestamp or (start and timestamp < start) or (end and timestamp >= end)):
            continue
        matches.append((link['repository'], link['pr_number']))
    owners = sorted(set(matches))
    return {'state': 'owned' if len(owners) == 1 else 'shared' if owners else 'unknown',
            'owner': {'repository': owners[0][0], 'pr_number': owners[0][1]} if len(owners) == 1 else None,
            'evidence_class': 'explicit' if len(owners) == 1 else 'unknown'}


def unique_commit_prefix(value: object, commits: Sequence[str]) -> str | None:
    if not isinstance(value, str) or not re.fullmatch('[0-9a-f]{7,40}', value.lower()):
        return None
    found = {sha.lower() for sha in commits if SHA.fullmatch(sha.lower()) and sha.lower().startswith(value.lower())}
    return next(iter(found)) if len(found) == 1 else None
