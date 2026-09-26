"""Bounded, read-only PRD index and linked Kanban projection for one Forge expert."""
from __future__ import annotations

import datetime as dt
import hashlib
import json
from pathlib import Path
import re

from jsonschema import Draft202012Validator, FormatChecker
import yaml

from forge_atlas import ROOT, agent_key, cli_query

TEMPLATES = Path(__file__).resolve().parent.parent / 'templates'
PRD_LIMIT, CARD_LIMIT = 100, 200
HASH = re.compile(r'[a-f0-9]{64}')


def config_digest(config: dict) -> str:
    return hashlib.sha256(yaml.safe_dump(config, allow_unicode=True, sort_keys=False, width=90).encode('utf-8')).hexdigest()


def scope_for(profile: dict) -> dict | None:
    planning = profile.get('planning')
    if not planning:
        return None
    return {'tenant_id': agent_key(planning['tenant_id']), 'agent_id': agent_key(profile['config']['agent_id']),
            'board_slug': agent_key(planning.get('board_slug', 'gbautomation')),
            'config_sha256': config_digest(profile['config'])}


def validate_snapshot(value: dict, scope: dict) -> None:
    schema = json.loads((TEMPLATES / 'forge-planning-snapshot.schema.json').read_text(encoding='utf-8'))
    if list(Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(value)):
        raise ValueError('Invalid Forge planning snapshot')
    if any(value[k] != scope[k] for k in ('tenant_id', 'agent_id', 'board_slug', 'config_sha256')):
        raise ValueError('Planning snapshot scope or config does not match this expert')
    ids = [p['prd_id'] for p in value['prds']]
    if len(ids) != len(set(ids)) or len({c['task_id'] for c in value['cards']}) != len(value['cards']):
        raise ValueError('Duplicate planning identity')
    if any(not set(c['prd_ids']).issubset(ids) for c in value['cards']):
        raise ValueError('Kanban card has no scoped PRD link')
    if any(a['prd_id'] is not None and a['prd_id'] not in ids for a in value['artifacts']):
        raise ValueError('Artifact has no scoped PRD')
    if any(a['kind'] != 'actual' for a in value['artifacts']):
        raise ValueError('Examples belong in the separate library, never indexed snapshots')
    from forge_artifacts import validate_entries
    validate_entries(value['artifacts'])


def bounded_file(root: Path, name: str, limit: int) -> Path:
    # Resolve on the host OS, but reject Windows and POSIX absolute/traversal syntax everywhere.
    if not isinstance(name, str) or not name or '\\' in name or ':' in name or name.startswith('/') or any(p in ('', '.', '..') for p in name.split('/')):
        raise ValueError('Expected a safe relative artifact path')
    root = root.resolve()
    candidate = root / name
    for part in [candidate, *candidate.parents]:
        if part == root:
            break
        if part.is_symlink():
            raise ValueError('Symlink artifacts are not allowed')
    path = candidate.resolve()
    if not path.is_relative_to(root) or not path.is_file() or path.stat().st_size > limit:
        raise ValueError('Artifact must be a bounded file inside its declared directory')
    return path


def read_snapshot(profile: dict, root: Path) -> dict | None:
    scope = scope_for(profile)
    name = profile.get('planning', {}).get('snapshot_path')
    if not name:
        return None
    value = json.loads(bounded_file(root, name, 1_000_000).read_text(encoding='utf-8'))
    validate_snapshot(value, scope)
    return value


def exact_owner(row: dict, scope: dict) -> None:
    """All supplied ownership claims must agree, including deployed metadata fallback."""
    fm = row.get('frontmatter') or {}
    projection = (row.get('metadata') or {}).get('master_sheet_projection') or {}
    forge = (row.get('source_refs') or {}).get('forge') or {}
    claims = {
        'tenant_id': [row.get('client'), row.get('tenant_id'), fm.get('client'), fm.get('tenant_id'), projection.get('tenant_id'), forge.get('tenant_id')],
        'agent_id': [row.get('owner_expert'), fm.get('owner_expert'), projection.get('owner_expert'), forge.get('agent_id')],
    }
    for key, values in claims.items():
        supplied = [v for v in values if v is not None and v != '']
        if not supplied or any(v != scope[key] for v in supplied):
            raise ValueError('Missing or conflicting PRD ownership')
    fm_forge = (fm.get('source_refs') or {}).get('forge')
    if fm_forge is not None and fm_forge != forge:
        raise ValueError('Conflicting Forge lineage')


def project_prd(row: dict, scope: dict) -> dict:
    exact_owner(row, scope)
    forge = (row.get('source_refs') or {}).get('forge') or {}
    digest = forge.get('config_sha256')
    if digest is not None and (not isinstance(digest, str) or not HASH.fullmatch(digest)):
        raise ValueError('Invalid PRD config lineage')
    updated = None
    for field in ('updated_at', 'file_mtime', 'indexed_at'):
        try:
            parsed = dt.datetime.fromisoformat(str(row.get(field)).replace('Z', '+00:00'))
            if parsed.tzinfo:
                updated = parsed.isoformat()
                break
        except ValueError:
            pass
    return {'prd_id': row['prd_id'], 'title': row['title'], 'status': row.get('status') or 'unknown',
            'path': row['path'], 'updated_at': updated,
            'config_sha256': digest, 'source': 'prd_artifacts', 'body_sha256': row['body_sha256']}


def prd_sql(scope: dict) -> str:
    tenant, agent = agent_key(scope['tenant_id']), agent_key(scope['agent_id'])
    # to_jsonb also works on deployments without the newer top-level columns.
    return ("select p.prd_id,p.title,p.status,p.path,p.client,p.source_refs,p.frontmatter,p.metadata,p.body_sha256,"
            "p.updated_at,p.file_mtime,p.indexed_at,to_jsonb(p)->>'tenant_id' as tenant_id,"
            "to_jsonb(p)->>'owner_expert' as owner_expert from public.prd_artifacts p "
            f"where p.client = '{tenant}' and (to_jsonb(p)->>'owner_expert' = '{agent}' "
            f"or p.metadata#>>'{{master_sheet_projection,owner_expert}}' = '{agent}' "
            f"or p.frontmatter->>'owner_expert' = '{agent}' or p.source_refs#>>'{{forge,agent_id}}' = '{agent}') "
            f"order by p.updated_at desc nulls last,p.prd_id limit {PRD_LIMIT}")


def cards_sql(scope: dict, ids: list[str]) -> str:
    if not ids or any(not re.fullmatch(r'prd_[a-f0-9]{20}', value) for value in ids):
        raise ValueError('Kanban query needs exact indexed PRD IDs')
    pinned = ','.join("'" + value + "'" for value in ids)
    return ("select t.task_id,t.title,t.status,t.board_slug,t.client_slug,t.updated_at,"
            "array_agg(distinct l.prd_id order by l.prd_id) as prd_ids from public.kanban_tasks t "
            "join public.prd_kanban_dispatch_links l on l.task_id=t.task_id "
            f"where l.prd_id in ({pinned}) and t.client_slug='{agent_key(scope['tenant_id'])}' "
            f"and t.board_slug='{agent_key(scope['board_slug'])}' "
            "group by t.task_id,t.title,t.status,t.board_slug,t.client_slug,t.updated_at "
            f"order by t.updated_at desc nulls last,t.task_id limit {CARD_LIMIT}")


def capture(scope: dict, query=cli_query) -> dict:
    prds = [project_prd(row, scope) for row in query(prd_sql(scope))[:PRD_LIMIT]]
    cards = []
    for raw in query(cards_sql(scope, [p['prd_id'] for p in prds]))[:CARD_LIMIT] if prds else []:
        if raw.get('client_slug') != scope['tenant_id'] or raw.get('board_slug') != scope['board_slug']:
            raise ValueError('Kanban ownership conflict')
        cards.append({k: raw[k] for k in ('task_id', 'title', 'status', 'updated_at', 'prd_ids')})
    result = {'schema_version': 'forge-planning-snapshot.v1', **scope,
              'captured_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'source': 'supabase',
              'prds': prds, 'cards': cards, 'artifacts': []}
    validate_snapshot(result, scope)
    return result


def from_index(index: dict, scope: dict) -> dict:
    """Project the canonical local index without exposing unrelated rows or adopting plans."""
    if index.get('schema_version') != 'gbauto-prd-index.v1' or not isinstance(index.get('rows'), list):
        raise ValueError('Expected the canonical PRD index')
    selected = []
    for row in index['rows']:
        fm, md, refs = row.get('frontmatter') or {}, row.get('metadata') or {}, row.get('source_refs') or {}
        owners = [row.get('owner_expert'), fm.get('owner_expert'), (md.get('master_sheet_projection') or {}).get('owner_expert'), (refs.get('forge') or {}).get('agent_id')]
        if row.get('client') == scope['tenant_id'] and scope['agent_id'] in owners:
            if not row.get('schema_contract_ok') or '.sample.' in row.get('path', ''):
                raise ValueError('Only conformant indexed plans can be packaged; examples are excluded')
            selected.append(project_prd(row, scope))
    selected.sort(key=lambda p: (p['updated_at'] or '', p['prd_id']), reverse=True)
    result = {'schema_version': 'forge-planning-snapshot.v1', **scope,
              'captured_at': index['generated_at'], 'source': 'prd-index',
              'prds': selected[:PRD_LIMIT], 'cards': [], 'artifacts': []}
    validate_snapshot(result, scope)
    return result


def package_indexed_plans(snapshot: dict, repo_root: Path, output: Path) -> dict:
    """Copy hash-bound HTMLs from explicit indexed paths, never from arbitrary URLs."""
    from forge_artifacts import entry, validate_entries
    payloads = []
    for prd in snapshot['prds']:
        if Path(prd['path']).suffix.lower() != '.html':
            continue
        raw = bounded_file(repo_root, prd['path'], 3_000_000).read_text(encoding='utf-8').encode('utf-8')
        if hashlib.sha256(raw).hexdigest() != prd['body_sha256']:
            raise ValueError('Indexed plan changed; re-index before packaging')
        payloads.append((entry(prd['prd_id'] + '.html', prd['title'], raw, kind='actual', prd_id=prd['prd_id']), raw))
    entries = [item for item, _ in payloads]
    validate_entries(entries)
    if len(entries) > 30:
        raise ValueError('Package at most 30 plan artifacts at once')
    allowed = {a['filename'] for a in entries} | {'artifact-manifest.json'}
    if output.is_symlink() or (output.exists() and any(p.name not in allowed or p.is_symlink() or not p.is_file() for p in output.iterdir())):
        raise ValueError('Use a dedicated indexed-plan bundle directory')
    output.mkdir(parents=True, exist_ok=True)
    manifest = {'schema_version': 'forge-artifact-manifest.v1', **{k: snapshot[k] for k in ('tenant_id', 'agent_id', 'config_sha256')}, 'artifacts': entries}
    for item, raw in payloads:
        (output / item['filename']).write_bytes(raw)
    (output / 'artifact-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    return manifest


def planning_request(profile: dict) -> dict:
    """Deterministic draft. A request never grants scope, build or activation approval."""
    from forge_plan_template import build_template
    config = profile['config']
    scope = scope_for(profile)
    tenant = scope['tenant_id'] if scope else None
    digest = config_digest(config)
    request_id = 'forge-plan_' + hashlib.sha256(json.dumps([tenant, config['agent_id'], digest]).encode()).hexdigest()[:24]
    mappings = [
        ('purpose', 'Purpose', ['purpose']), ('skills', 'Capabilities', ['skills']),
        ('context', 'Approved context', ['client_context_refs']),
        ('commands', 'Startup and repeatable actions', ['prime_commands', 'preset_commands']),
        ('runtime', 'Runtime setup', ['profile_config']), ('connections', 'Credential reference names', ['secrets_required']),
        ('validation', 'Acceptance checks', ['validation_workflows']), ('approval', 'Activation boundary', ['activation_gate']),
    ]
    requirements = [{'id': f'R{n:02}', 'title': title, 'config_fields': fields,
                     'values': {k: config[k] for k in fields}, 'summary': profile['sections'][section]['summary'],
                     'criteria': profile['sections'][section]['points'],
                     'needs_setup': any(not config[k] for k in fields)}
                    for n, (section, title, fields) in enumerate(mappings, 1)]
    return {'schema_version': 'forge-planning-request.v1', 'request_id': request_id, 'tenant_id': tenant,
            'agent_id': config['agent_id'], 'config_sha256': digest, 'title': 'Implement ' + config['display_name'],
            'status': 'scope_pending', 'runtime_authorized': False,
            'source_refs': {'forge': {'tenant_id': tenant, 'agent_id': config['agent_id'], 'config_sha256': digest,
                                     'request_id': request_id, 'input_ref': 'expert-config.yaml',
                                     'receipt_ref': 'expert-profile-receipt.json'}},
            'requirements': requirements,
            'template': build_template(profile, scope, digest),
            'route': {'skill': 'resources/skills/tac-plan/SKILL.md',
                      'lifecycle': 'resources/skills/tac-plan/workflows/plan-lifecycle.md',
                      'indexer': 'resources/skills/prd-index/scripts/index_prds.py',
                      'instructions': 'Use /plan with this draft. Confirm tenant and retrieve confirmed intake answers first. '
                      'Restate reusable answers and resolve changed or missing scope; present diagrams and obtain scope approval. '
                      'Then render the official HTML shell and architecture sidecar, preserve source_refs.forge and '
                      'set client, tenant_id and owner_expert explicitly. Adopt and index through the canonical PRD indexer. '
                      'Use template.sections as the presentation structure inside the canonical TAC plan: '
                      'Outcome, Setup, Build notes, Steps, Outputs, Completion checklist and Quality review. '
                      'Resolve technical destinations from trusted workspace settings, never review notes. '
                      'Completion and quality checks require evidence; local section review is not passing a check. '
                      'Request separately bound implementation approval. Never infer approval from this export or UI feedback.'}}


def main() -> int:
    import argparse
    import sys
    sys.path.insert(0, str(ROOT))
    from resources.lib.tracing import trace_agent
    from render_expert_profile import validate_profile

    @trace_agent('lead_magnet.forge_planning', metadata={'mode': 'read_only'})
    def run():
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument('--profile', type=Path, required=True)
        parser.add_argument('--out', type=Path, required=True)
        parser.add_argument('--capture', action='store_true', help='Read scoped PRDs and linked cards from Supabase')
        parser.add_argument('--index', type=Path, help='Project an existing canonical local PRD index instead of querying Supabase')
        parser.add_argument('--bundle-dir', type=Path, help='With --index, package hash-verified HTML plans from this repository')
        args = parser.parse_args()
        profile = json.loads(args.profile.read_text(encoding='utf-8'))
        validate_profile(profile)
        scope = scope_for(profile)
        if (args.capture or args.index) and not scope:
            raise ValueError('Set planning.tenant_id before reading the PRD index')
        if args.capture and args.index or args.bundle_dir and not args.index:
            raise ValueError('Choose one source; --bundle-dir requires --index')
        if args.index:
            if args.index.stat().st_size > 20_000_000:
                raise ValueError('Local index exceeds the input bound')
            value = from_index(json.loads(args.index.read_text(encoding='utf-8')), scope)
            if args.bundle_dir:
                value['artifacts'] = package_indexed_plans(value, ROOT, args.bundle_dir)['artifacts']
                validate_snapshot(value, scope)
        else:
            value = capture(scope) if args.capture else planning_request(profile)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'schema_version': value['schema_version'], 'agent_id': value['agent_id']}))
        return 0
    return run()


if __name__ == '__main__':
    raise SystemExit(main())
