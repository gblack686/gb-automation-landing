"""Private, paginated session/message/trace projection for a server-pinned expert.

Uses the existing history tables and Atlas session inspector's verified Langfuse
navigation contract (PR 1187). Never exports transcripts into the HTML bundle.
"""
from __future__ import annotations

import re
from urllib.parse import urlsplit

from forge_atlas import agent_key, cli_query

PAGE_SIZE = 50


def literal(value: str) -> str:
    if not isinstance(value, str) or not 1 <= len(value) <= 512 or any(ord(c) < 32 for c in value):
        raise ValueError('Invalid history identity')
    return "'" + value.replace("'", "''") + "'"


def owner(scope: dict) -> str:
    tenant, expert = agent_key(scope['tenant_id']), agent_key(scope['agent_id'])
    # Explicit producer ownership only. Titles, tags and profile names are not ownership.
    return f"s.client_slug='{tenant}' and s.payload->>'expert_id'='{expert}'"


def trace_predicate(scope: dict) -> str:
    tenant, expert = agent_key(scope['tenant_id']), agent_key(scope['agent_id'])
    return ("t.session_id=s.session_id and t.harness=s.harness "
            "and t.raw_summary #>> '{metadata,session_key}'=s.session_key "
            f"and t.tenant='{tenant}' and t.raw_summary #>> '{{metadata,expert_id}}'='{expert}' "
            "and coalesce(t.raw_summary #>> '{attribution_evidence,session_key}','explicit')='explicit' "
            "and coalesce(t.raw_summary #>> '{attribution_evidence,expert_id}','explicit')='explicit' "
            "and coalesce(t.raw_summary #>> '{attribution_evidence,session_id}','explicit')='explicit' "
            "and coalesce(t.raw_summary #>> '{attribution_evidence,harness}','explicit')='explicit' "
            "and coalesce(t.raw_summary #>> '{attribution_evidence,tenant}','explicit')='explicit'")


def message_predicate() -> str:
    # A message key is strongest. Fall back to an explicit native message ID
    # only when no key was supplied; conflicting keys never get a fallback.
    return ("((t.raw_summary #>> '{metadata,message_key}'=m.message_key "
            "and coalesce(t.raw_summary #>> '{attribution_evidence,message_key}','explicit')='explicit' "
            "and (t.raw_summary #>> '{metadata,source_message_id}' is null "
            "or t.raw_summary #>> '{metadata,source_message_id}'=m.payload->>'message_id')) or "
            "(t.raw_summary #>> '{metadata,message_key}' is null "
            "and t.raw_summary #>> '{metadata,source_message_id}'=m.payload->>'message_id' "
            "and coalesce(t.raw_summary #>> '{attribution_evidence,source_message_id}','explicit')='explicit'))")


def query_sql(scope: dict, view='sessions', session_key=None, message_key=None, after=None) -> str:
    scoped = owner(scope)
    cursor = literal(after) if after is not None else None
    if view == 'sessions':
        if session_key or message_key:
            raise ValueError('Unexpected session parameters')
        return ("select s.session_key,s.session_id,s.harness,s.started_at,s.last_active_at,"
                "s.user_message_count as expected_messages,s.payload->>'history_delivery' as delivery,"
                "(select count(*) from public.agent_session_messages m where m.session_key=s.session_key "
                "and m.message_kind='user_message') as saved_messages "
                f"from public.agent_sessions s where {scoped} "
                + (f"and s.session_key>{cursor} " if cursor else '')
                + f"order by s.session_key limit {PAGE_SIZE + 1}")
    if not session_key:
        raise ValueError('A session is required')
    scoped += f' and s.session_key={literal(session_key)}'
    if view == 'messages':
        if message_key:
            raise ValueError('Unexpected message parameter')
        # Stable native order with key as a tie-breaker; cursor belongs to this session.
        seek = ("and (m.seq,m.message_key)>(select c.seq,c.message_key from public.agent_session_messages c "
                f"where c.session_key=s.session_key and c.message_key={cursor}) ") if cursor else ''
        return ("select m.message_key,m.seq,m.ts,left(m.message_text,12000) as message_text,"
                "length(m.message_text)>12000 as preview_truncated,m.turn_id,"
                "m.payload->>'message_id' as source_message_id "
                "from public.agent_session_messages m join public.agent_sessions s on s.session_key=m.session_key "
                f"where {scoped} and m.message_kind='user_message' {seek}"
                f"order by m.seq,m.message_key limit {PAGE_SIZE + 1}")
    if view != 'traces':
        raise ValueError('Unknown history view')
    join = ("join public.agent_session_messages m on m.session_key=s.session_key "
            f"and m.message_key={literal(message_key)} and m.message_kind='user_message' ") if message_key else ''
    return ("select t.trace_id,t.trace_name,t.trace_timestamp,t.total_tokens,t.total_cost,t.observation_count,t.langfuse_url "
            "from public.langfuse_traces t join public.agent_sessions s on " + trace_predicate(scope) + ' '
            + join + f'where {scoped} ' + (f'and {message_predicate()} ' if message_key else '')
            + (f'and t.trace_id>{cursor} ' if cursor else '') + f'order by t.trace_id limit {PAGE_SIZE + 1}')


def verified_trace_url(url, trace_id):
    """Atlas's project-qualified navigation rule, also enforced in the browser."""
    if not isinstance(url, str) or not isinstance(trace_id, str):
        return None
    try:
        p = urlsplit(url)
        if (p.scheme == 'https' and p.netloc in {'us.cloud.langfuse.com', 'cloud.langfuse.com', 'eu.cloud.langfuse.com'}
                and not p.query and not p.fragment and not any(ord(c) < 33 for c in url)
                and re.fullmatch(r'/project/[A-Za-z0-9_-]+/traces/[A-Za-z0-9_-]+', p.path)
                and p.path.rsplit('/', 1)[-1] == trace_id):
            return url
    except ValueError:
        pass
    return None


def capture(scope: dict, *, view='sessions', session_key=None, message_key=None, after=None, query=cli_query) -> dict:
    rows = query(query_sql(scope, view, session_key, message_key, after))
    if not isinstance(rows, list) or len(rows) > PAGE_SIZE + 1:
        raise ValueError('Unbounded history response')
    fields = {
        'sessions': ('session_key', 'session_id', 'harness', 'started_at', 'last_active_at', 'expected_messages', 'delivery', 'saved_messages'),
        'messages': ('message_key', 'seq', 'ts', 'message_text', 'preview_truncated', 'turn_id', 'source_message_id'),
        'traces': ('trace_id', 'trace_name', 'trace_timestamp', 'total_tokens', 'total_cost', 'observation_count', 'langfuse_url'),
    }[view]
    key = {'sessions': 'session_key', 'messages': 'message_key', 'traces': 'trace_id'}[view]
    projected = [{field: row.get(field) for field in fields} for row in rows[:PAGE_SIZE]]
    if any(not isinstance(row[key], str) or not row[key] for row in projected):
        raise ValueError('Missing history identity')
    for row in projected:
        if view == 'traces':
            row['langfuse_url'] = verified_trace_url(row['langfuse_url'], row['trace_id'])
    return {'schema_version': 'forge-history-page.v1', 'source': 'supabase',
            'tenant_id': scope['tenant_id'], 'agent_id': scope['agent_id'],
            'view': view, 'session_key': session_key, 'message_key': message_key,
            'rows': projected, 'next': projected[-1][key] if len(rows) > PAGE_SIZE else None}
