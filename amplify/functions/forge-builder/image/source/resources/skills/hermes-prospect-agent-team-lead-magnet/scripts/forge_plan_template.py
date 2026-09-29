"""Presentation for the existing Forge-to-TAC request, never an approved plan."""
from __future__ import annotations

import hashlib
import json


def build_template(profile: dict, scope: dict | None, config_sha256: str) -> dict:
    config = profile['config']
    sections = []

    def card(title, body, state='draft', **details):
        return {'title': title, 'body': body, 'state': state, 'details': details}

    def section(key, title, subtitle, icon, cards):
        sections.append({'id': key, 'title': title, 'subtitle': subtitle, 'icon': icon, 'cards': cards})

    section('outcome', 'Outcome', 'What we are building, and for whom.', 'target', [
        card('Result', config['purpose']),
        card('People', profile['audience']),
        card('Scope', profile['sections']['purpose']['summary'], included=profile['sections']['purpose']['points']),
        card('To confirm', 'Agree exclusions and measurable success during scope review.', 'needs_input'),
    ])
    section('setup', 'Setup', 'Bound to this expert. Technical locations come from workspace configuration.', 'settings', [
        card('Expert', config['display_name'], agent_id=config['agent_id']),
        card('Workspace', scope['tenant_id'] if scope else 'Confirm the tenant',
             'supplied' if scope else 'needs_input', board=scope['board_slug'] if scope else 'Unassigned'),
        card('Configuration', 'Packaged draft', 'supplied', sha256=config_sha256),
        card('Assets & context', profile['sections']['context']['summary'], references=config['client_context_refs']),
        card('Technical destinations', 'Resolve from trusted TAC workspace settings before implementation.', 'needs_binding',
             repository='Existing expert home by default; dedicated repository only when required.',
             plan_directory='second-brain/plans/', work_directory='Assigned by the worktree manager',
             artifact_directory='Assigned artifact root with destination validation'),
    ])
    section('build-notes', 'Build notes', 'Reuse first. Keep missing bindings visible.', 'layers', [
        card('Capabilities to reuse', profile['sections']['skills']['summary'],
             'supplied' if config['skills'] else 'needs_binding', bindings=config['skills'], notes=profile['sections']['skills']['points']),
        card('Dependencies', profile['sections']['connections']['summary'],
             'supplied' if config['secrets_required'] else 'needs_binding', credential_pointers=config['secrets_required']),
        card('Constraints & unknowns', profile['sections']['runtime']['summary'], notes=profile['sections']['runtime']['points']),
        card('Approval boundary', profile['sections']['approval']['summary'], notes=profile['sections']['approval']['points']),
    ])
    steps = [
        ('Confirm scope', 'Owner', 'Accepted proposal + shared intake', 'Approved scope', 'Proposal accepted'),
        ('Author TAC plan', 'TAC planner', 'Approved scope + reuse evidence', 'Official plan + architecture', 'Scope approved'),
        ('Build configuration & code', 'Assigned builder', 'Version-bound plan', 'Expert configuration + code', 'Plan approved for implementation'),
        ('Validate', 'Validator', 'Implementation + acceptance criteria', 'Test results + artifact receipts', 'Build available'),
        ('Prepare handoff', 'Owner', 'Validated outputs', 'Review index + repository links', 'Evidence reviewed; activation separately authorized'),
    ]
    section('steps', 'Steps', 'Dependencies stay visible at every handoff.', 'route', [
        card(title, output, owner=owner, inputs=inputs, outputs=output,
             depends_on='Previous step' if n else 'Selected expert and proposal', gate=gate)
        for n, (title, owner, inputs, output, gate) in enumerate(steps)
    ])
    section('outputs', 'Outputs', 'Planned files, destinations and acceptance checks.', 'package', [
        card('Expert configuration', 'expert-config.yaml', 'planned', destination='Approved expert artifact root',
             acceptance='Schema-valid and bound to this expert and configuration version.'),
        card('TAC plan + architecture', 'Official HTML plan and architecture sidecar', 'planned', destination='second-brain/plans/',
             acceptance='Preserve tenant, owner expert, source_refs.forge and separate implementation approval.'),
        card('Expert code', 'Scaffold and implementation', 'planned', destination='Approved experts/<tree>/<slug>/ or assigned repository',
             acceptance='Real implementation with validation evidence; echo-only scaffold commands are not execution proof.'),
        card('Review package', 'Index, identity assets and generation / build receipts', 'planned', destination='Assigned artifact root',
             acceptance='Working asset and commit links; destination routing verified before publication.'),
    ])
    section('completion', 'Completion checklist', 'Binary checks. Every result still needs evidence.', 'check', [
        card('Scope & lineage', 'All deliverables match the approved scope, tenant, expert and configuration.', 'not_run'),
        card('Bindings & code', 'Required skills, credentials pointers and executable commands are resolved.', 'not_run'),
        card('Artifact routing', 'Every output lands in its assigned location and has a readback receipt.', 'not_run'),
        card('Validation', 'Required checks pass with linked results; unresolved checks stay visible.', 'not_run'),
        card('Approval boundary', 'Implementation and activation obey their recorded approvals.', 'not_run'),
    ])
    section('quality', 'Quality review', 'Acceptance criteria supported by examples and receipts.', 'spark', [
        card('Domain fit', profile['sections']['validation']['summary'], 'not_assessed', criteria=profile['sections']['validation']['points']),
        card('Useful result', 'Compare the output with the agreed success criteria and representative examples.', 'not_assessed'),
        card('Source fidelity', 'Preserve approved assets, credits and facts. Identify unsupported claims.', 'not_assessed'),
        card('Usability', 'Walk through the deliverable on desktop and mobile; record findings.', 'not_assessed'),
    ])
    template = {'version': 1, 'authority': 'draft_presentation', 'sections': sections,
                'gates': ['Proposal', 'Scope', 'Plan'], 'runtime_authorized': False}
    template['sha256'] = hashlib.sha256(json.dumps(template, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return template
