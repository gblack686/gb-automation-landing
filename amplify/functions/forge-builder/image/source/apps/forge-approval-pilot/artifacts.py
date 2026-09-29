"""Local fixture adapter for the canonical renderers and artifact contracts.

Output root is a disposable mirror, never the repository's live Second Brain.
This module deliberately does not invoke publisher, persistence or dispatch hooks.
"""
from __future__ import annotations

import hashlib
import html
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from scripts.plan_intake import decide, validate_or_raise  # noqa: E402
from resources.lib.architecture_artifact import stamp_artifact, validate_artifact  # noqa: E402
from resources.lib.gbauto_doc_template import render_document  # noqa: E402


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build(request: dict) -> dict:
    output = Path(request['root']).resolve()
    # Only caller-created pilot roots bearing this marker can receive fixtures.
    if not (output / '.forge-pilot').is_file() or output == ROOT:
        raise ValueError('isolated_pilot_root_required')
    scope = request['scope']
    workflow = request['workflow']
    body = scope['body']
    key = digest((workflow['workflow_id'] + ':' + str(scope['version']) + ':' + str(request['plan_version'])).encode())[:20]
    name = 'forge-pilot-' + key
    plan_path = f'second-brain/plans/{name}.html'
    arch_path = f'second-brain/plans/{name}.architecture.yaml'
    intake_path = f'second-brain/intelligence/planning-intakes/{name}.json'
    plan_id, arch_id, intake_id = 'prd_' + key, 'arch_' + key, 'plan-intake-' + name
    diagrams = {
        'transition': {'title': 'Pilot workflow transition', 'mermaid': 'flowchart TB\n subgraph before[Before]\n M[Manual report]\n end\n subgraph after[After]\n P[Fixture plan] --> V[Local validation]\n end\n M --> P\n'},
        'target_architecture': {'title': 'Isolated pilot architecture', 'mermaid': 'flowchart TB\n S[Approved scope] --> P[Fixture plan]\n P --> V[Independent validation]\n V --> R[Disposable task receipt]\n'},
    }
    architecture = stamp_artifact({
        'schema_version': 'architecture-artifact.v1', 'architecture_id': arch_id,
        'plan_id': plan_id, 'version': request['plan_version'], 'status': 'proposed', 'scope': 'workflow',
        'diagrams': diagrams, 'components': [{'id': 'fixture', 'responsibility': 'Prove the local approval path without live execution.'}],
        'integrations': [], 'data_stores': [], 'external_systems': [], 'source_ref': arch_path, 'supersedes': None,
    })
    errors = validate_artifact(architecture)
    if errors:
        raise ValueError('; '.join(errors))
    # Bind an approved-status candidate before the implementation decision.
    # This is a candidate hash, not an assertion that approval already happened.
    approved_candidate = stamp_artifact({**architecture, 'status': 'approved'})
    timestamp = scope['created_at']
    intake = {
        'schema_version': 'gbauto-plan-intake.v1', 'intake_id': intake_id, 'version': 1,
        'created_at': timestamp, 'updated_at': timestamp, 'status': 'draft',
        'request': {'source': 'forge_local_fixture', 'privacy': 'repository_internal',
                    'summary': body['outcome'], 'repository': 'gbautomation',
                    'base_commit': request['engineering']['base_commit'], 'branch': 'local-fixture'},
        'primed_sources': [{'kind': 'proposal', 'path': f"agent_os_proposals/{workflow['proposal_id']}"}],
        'questions': [{'id': field, 'question': question, 'answer': json.dumps(body[field])}
                      for field, question in [('outcome', 'What outcome?'), ('deliverables', 'What deliverables?'), ('acceptance', 'How is success checked?'), ('exclusions', 'What is excluded?')]],
        'assumptions': ['Synthetic pilot. No email, public publication or live execution.'],
        'provisional_diagrams': {'canonical': False, **diagrams},
        'operator_decision': {'decision': 'pending', 'decided_at': None, 'source': None, 'note': '',
                              'scope_approval': False, 'planning_authorized': False, 'implementation_authorized': False,
                              'runtime_activation_authorized': False, 'implementation_decision': {}},
        'result': {'plan_path': plan_path, 'architecture_path': arch_path, 'implementation_gate': 'pending'},
    }
    intake = decide(intake, gate='scope', decision='approved', source='forge_local_fixture',
                    note='Read back committed scope decision ' + request['scope_event'], decided_at=timestamp)
    validate_or_raise(intake)
    items = lambda values: '<ul>' + ''.join('<li>' + html.escape(str(v.get('title', v.get('id')) if isinstance(v, dict) else v)) + '</li>' for v in values) + '</ul>'
    sections = [
        {'label': 'Purpose', 'html': '<p>' + html.escape(body['outcome']) + '</p><p>Local synthetic plan. Review the workflow; this document does not dispatch work.</p>'},
        {'label': 'Deliverables', 'html': items(body['deliverables'])},
        {'label': 'Acceptance', 'html': items(body['acceptance'])},
        {'label': 'Exclusions', 'html': items(body['exclusions'])},
        {'label': 'Phase 0 — Reuse', 'html': '<p>Reuse the canonical intake, house document renderer, architecture validator and resume adapter. No external service call is needed for this fixture.</p>'},
        {'label': 'Phase 1 — Local proof', 'html': '<p>Validate the scope and artifact links. Release only the named disposable task after a bound implementation decision.</p>'},
        {'label': 'Architecture', 'html': ''.join('<h3>' + html.escape(d['title']) + '</h3><pre class="mermaid">' + html.escape(d['mermaid']) + '</pre>' for d in diagrams.values())},
    ]
    page = render_document(title=body['outcome'], sections=sections, subtitle='Local approval pilot · synthetic plan',
                           meta={'created': timestamp, 'modified': timestamp, 'agent_name': 'forge-pilot-builder',
                                 'session_id': workflow['workflow_id'], 'commits': request['engineering']['base_commit'],
                                 'back_refs': workflow['proposal_id'], 'forward_refs': arch_path}, theme_lock=True)
    content = {'intake': json.dumps(intake, sort_keys=True, indent=2) + '\n', 'plan': page,
               'architecture': yaml.safe_dump(architecture, allow_unicode=True, sort_keys=False)}
    paths = {'intake': intake_path, 'plan': plan_path, 'architecture': arch_path}
    ids = {'intake': request['intake_record_id'], 'plan': plan_id, 'architecture': arch_id + ':v' + str(request['plan_version'])}
    artifacts = []
    for kind, value in content.items():
        path = output / paths[kind]
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = value.encode('utf-8')
        if path.exists() and path.read_bytes() != raw:
            raise ValueError('immutable_artifact_changed')
        path.write_bytes(raw)
        artifacts.append({'kind': kind, 'path': paths[kind], 'sha256': architecture['sha256'] if kind == 'architecture' else digest(raw),
                          'file_sha256': digest(raw), 'artifact_id': ids[kind], 'tenant': workflow['tenant'],
                          'workflow_id': workflow['workflow_id'], 'scope_sha256': scope['sha256']})
    return {'artifacts': artifacts, 'intake_id': intake_id, 'architecture_approved_candidate_sha256': approved_candidate['sha256']}


if __name__ == '__main__':
    print(json.dumps(build(json.load(sys.stdin))))
