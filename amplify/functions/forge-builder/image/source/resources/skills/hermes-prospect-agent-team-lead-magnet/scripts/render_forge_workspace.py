"""Render the selected Nexus/Studio workspace as a standalone expert-design document."""
from __future__ import annotations

import base64
import datetime as dt
import hashlib
import io
import json
from pathlib import Path
import re

import yaml

from _common import TEMPLATES, esc, render_template

WORKSPACE = TEMPLATES / "forge-workspace"


def script_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False).replace("<", "\\u003c").replace("&", "\\u0026").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def asset_uri(path: Path, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def read_avatar(avatar: dict, asset_root: Path) -> tuple[str, dict]:
    """Require a real raster asset in the profile bundle; never embed arbitrary files."""
    from PIL import Image, UnidentifiedImageError

    root = asset_root.resolve()
    path = (root / avatar['image_path']).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError('Avatar must be an existing image inside the profile directory')
    if path.stat().st_size > 8 * 1024 * 1024:
        raise ValueError('Avatar exceeds the 8 MB image limit')
    raw = path.read_bytes()
    try:
        with Image.open(io.BytesIO(raw)) as img:
            mime = {'PNG': 'image/png', 'JPEG': 'image/jpeg', 'WEBP': 'image/webp'}.get(img.format)
            if not mime or min(img.size) < 128 or img.width * img.height > 16_000_000:
                raise ValueError('Avatar must be PNG, JPEG or WebP, at least 128px per edge and at most 16 megapixels')
            dimensions = list(img.size)
            img.verify()
    except (OSError, UnidentifiedImageError) as error:
        raise ValueError('Avatar is not a valid raster image') from error
    digest = hashlib.sha256(raw).hexdigest()
    receipt = {'sha256': digest, 'dimensions': dimensions, 'origin': avatar['origin'], 'generator_model': avatar.get('generator_model'), 'seed_card': avatar.get('seed_card')}
    return f'data:{mime};base64,' + base64.b64encode(raw).decode('ascii'), receipt


def render_workspace(profile: dict, *, generated_on: str | None = None, asset_root: Path | None = None) -> tuple[str, str, dict]:
    from render_expert_profile import FIELD_HELP, GROUPS, IDENTITY_FIELDS, validate_profile

    validate_profile(profile)
    avatar_uri, avatar_receipt = read_avatar(profile['avatar'], asset_root or Path.cwd())
    from forge_atlas import chart_bundle, read_snapshot
    atlas_snapshot = read_snapshot(profile, asset_root or Path.cwd())
    bokeh_resources, atlas_chart = chart_bundle()
    config = profile["config"]
    yaml_text = yaml.safe_dump(config, allow_unicode=True, sort_keys=False, width=90)
    config_hash = hashlib.sha256(yaml_text.encode("utf-8")).hexdigest()
    from forge_planning import read_snapshot as read_planning, planning_request, scope_for
    from forge_artifacts import load_artifacts, metadata
    planning_snapshot = read_planning(profile, asset_root or Path.cwd())
    artifacts = load_artifacts(profile, asset_root or Path.cwd())
    request = planning_request(profile)
    legacy_document_id = hashlib.sha256((json.dumps({k: v for k, v in profile.items() if k != 'planning'}, sort_keys=True, ensure_ascii=False) + avatar_receipt['sha256']).encode("utf-8")).hexdigest()
    planning_scope = scope_for(profile)
    document_id = hashlib.sha256((legacy_document_id + '|' + planning_scope['tenant_id'] + '|' + planning_scope['board_slug']).encode()).hexdigest() if planning_scope else legacy_document_id
    date = generated_on or dt.date.today().isoformat()

    def links(*fields: str) -> str:
        return '<div class="config-links">' + ''.join(
            f'<button class="field-link" data-field="{esc(f)}">{esc(f)}</button>' for f in fields
        ) + '</div>'

    def explanation(key: str, *fields: str) -> str:
        section = profile["sections"][key]
        return f'<p class="small spaced">{esc(section["summary"])}</p><ul class="design-points">' + ''.join(
            f'<li>{esc(p)}</li>' for p in section["points"]
        ) + '</ul>' + links(*fields)

    def button(title: str, window: str) -> str:
        return f'<button class="panel-button" data-open="{window}">{esc(title)} ↗</button>'

    def activity_table(prefix: str) -> str:
        return (f'<div class="atlas-table-scroll" tabindex="0" role="region" aria-label="Activity records"><table class="atlas-table">'
                '<caption>Select a row or point to highlight it in both views.</caption><thead><tr><th scope="col">Record</th>'
                f'<th scope="col" id="{prefix}-x-heading">X</th><th scope="col" id="{prefix}-y-heading">Y</th>'
                f'<th scope="col">Bubble value</th></tr></thead><tbody id="{prefix}-rows"></tbody></table></div>')

    workflow = '<ol class="expert-workflow">' + ''.join(
        f'<li><span>{n:02}</span><div><h4>{esc(step["title"])}</h4><p>{esc(step["description"])}</p></div></li>'
        for n, step in enumerate(profile["workflow"], 1)
    ) + '</ol>'
    source_note = f'<div class="panel-notice source-note"><strong>About this design</strong><p>{esc(profile["source_note"])}</p></div>'
    references = '<ul class="reference-list">' + ''.join(f'<li><code>{esc(ref)}</code></li>' for ref in config["client_context_refs"]) + '</ul>'
    yaml_lines = []
    for line in yaml_text.splitlines(keepends=True):
        match = re.match(r"^([a-z_]+):", line)
        yaml_lines.append(f'<span class="yaml-line" id="yaml-{match[1]}">{esc(line)}</span>' if match else esc(line))
    yaml_panel = (
        '<div class="document-header">YOUR EXPERT CONFIGURATION</div><h3>Keep the blueprint.</h3>'
        '<p>This export contains the current draft values. Empty settings are setup decisions still to resolve.</p>'
        '<button class="panel-button primary" data-action="export-config">Download expert-config.yaml</button>'
        '<pre id="yaml-preview"><code>' + ''.join(yaml_lines) + '</code></pre>'
        '<p class="tiny">Schema: agent_expert_config.v1. Agent OS needs a bound runtime package before activation.</p>'
    )
    brief = (
        '<div class="document-header">YOUR EXPERT DESIGN</div>'
        f'<h3>{esc(config["display_name"])}</h3><p>{esc(config["purpose"])}</p>'
        f'<div class="doc-stats"><div><strong>01</strong><span>expert</span></div><div><strong>{len(profile["workflow"]):02}</strong><span>workflow steps</span></div><div><strong>Draft</strong><span>activation status</span></div></div>'
        + explanation('purpose', 'purpose') + '<h4 class="spaced">How your expert would work</h4>' + workflow
        + button('Review setup', 'checks') + source_note
    )
    help_text = dict(FIELD_HELP, schema_version='The version of this expert draft contract.', agent_id='The stable identifier for this one expert.', display_name='The name shown in this workspace.')
    fields = ''.join(
        f'<details class="config-field" data-config-field="{esc(field)}"><summary><code>{esc(field)}</code></summary>'
        f'<p>{esc(help_text[field])}</p><pre>{esc(yaml.safe_dump({field: config[field]}, allow_unicode=True, sort_keys=False))}</pre>'
        + links(field) + '</details>' for field in config
    )
    readiness = [
        ('Identity', 'Draft supplied', 'presence'),
        ('Purpose', 'Draft supplied', 'canvas'),
        ('Knowledge references', 'Draft supplied' if config['client_context_refs'] else 'Needs setup', 'knowledge'),
        ('Runtime settings', 'Draft supplied' if config['profile_config'] else 'Needs setup', 'config'),
        ('Skill bindings', 'Draft supplied' if config['skills'] else 'Needs setup', 'skills'),
        ('Command bindings', 'Draft supplied' if config['prime_commands'] and config['preset_commands'] else 'Needs setup', 'commands'),
        ('Credential references', 'Draft supplied' if config['secrets_required'] else 'Needs setup', 'config'),
        ('Validation workflows', 'Draft supplied' if config['validation_workflows'] else 'Needs setup', 'checks'),
        ('Runtime verification', 'Not run', 'console'),
        ('Activation', 'Needs approval', 'changes'),
    ]
    checks = ''.join(f'<button class="check-row {"pending" if status != "Draft supplied" else ""}" data-open="{target}"><span>{esc(label)}</span><span>{status}</span></button>' for label, status, target in readiness)
    proposals = ''.join(
        f'<article class="proposal-card"><div class="proposal-meta"><span>FOR YOUR SETUP CONVERSATION</span></div><h4>{title}</h4><p>{esc(profile["sections"][key]["summary"])}</p>{button("Explore", target)}</article>'
        for title, key, target in [('Choose the runtime', 'runtime', 'config'), ('Connect your tools', 'connections', 'config'), ('Agree the approval boundaries', 'approval', 'changes')]
    )
    initial = esc(config['display_name'][:1].upper())
    portrait = f'<img class="expert-portrait" src="{avatar_uri}" alt="{esc(profile["avatar"]["alt"])}" width="1024" height="1024">'
    provenance = ''
    if profile['avatar'].get('seed_card'):
        seed = profile['avatar']['seed_card']
        provenance = f'<small class="avatar-credit">Avatar reference: {esc(seed["name"])}. Source art by {esc(seed["artist"])}.</small>'
        credit = f'Reference artwork: {seed["name"]}, by {seed["artist"]}. This avatar is an AI-generated reinterpretation.'
        portrait = (f'<div class="portrait-credit" tabindex="0" aria-label="Avatar artwork attribution" aria-describedby="avatar-tooltip">{portrait}'
                    f'<span class="portrait-info" aria-hidden="true">i</span><span id="avatar-tooltip" role="tooltip">{esc(credit)}</span></div>')
    panels = {
        'presence': f'{portrait}<div class="expert-presence"><span class="eyebrow">ONE EXPERT / YOUR DESIGN</span><h3>{esc(config["display_name"])}</h3><p>{esc(profile["tagline"])}</p><span class="chip">Draft for review</span><p class="tiny">For {esc(profile["audience"])}</p>{provenance}{links(*IDENTITY_FIELDS)}</div>',
        'skills': '<span class="eyebrow">PROPOSED CAPABILITIES</span><h3 class="spaced">What your expert can learn.</h3>' + explanation('skills', 'skills') + f'<p class="config-note">{len(config["skills"])} skill bindings supplied in this draft. Proposed capabilities still need version and access review.</p>',
        'commands': '<span class="eyebrow">STARTUP & REPEATABLE ACTIONS</span><h3 class="spaced">A familiar way to start.</h3>' + explanation('commands', 'prime_commands', 'preset_commands') + '<div class="panel-notice">These are proposed actions. This document does not execute recipes.</div>',
        'chat': '<div class="chat-messages" id="chat-messages" role="log" aria-live="polite"><div class="message"><span class="speaker">YOUR ONBOARDING CONVERSATION</span>Capture questions or changes for your meeting. These are local notes; no agent is connected. Export feedback when you are ready to share them.</div><div id="meeting-notes"></div></div><form id="chat-form" class="chat-input"><input id="chat-text" aria-label="Meeting note" placeholder="Add a question for your meeting…" maxlength="800" required><button class="panel-button primary" aria-label="Save meeting note">+</button></form>',
        'canvas': '<div class="canvas-tabs" role="group" aria-label="Working canvas content"><button data-canvas="brief" aria-pressed="true">Brief</button><button data-canvas="sources" aria-pressed="false">Sources</button><button data-canvas="configuration" aria-pressed="false">YAML</button><span>YOUR DESIGN</span></div><div class="canvas-content" id="canvas-content">' + brief + '</div>',
        'proposals': '<section id="forge-approval-panel" aria-label="Proposal, scope and plan approvals"></section><div id="forge-proposal-examples">' + proposals + '</div>',
        'checks': '<span class="eyebrow">FROM DESIGN TO READY</span><h3 class="spaced">What needs to happen next.</h3><p class="small">Draft fields are not evidence of a working connection.</p>' + checks + '<div class="rule"></div><h4>Quality criteria</h4>' + explanation('validation', 'validation_workflows'),
        'config': '<span class="eyebrow">THE SETTINGS BEHIND YOUR EXPERT</span><h3 class="spaced">A configuration you can inspect.</h3>' + explanation('runtime', 'profile_config') + '<h4 class="spaced">Connections</h4>' + explanation('connections', 'secrets_required') + '<h4 class="spaced">Every field in the export</h4>' + fields + '<button class="panel-button primary" data-action="export-config">Download YAML</button>',
        'knowledge': '<span class="eyebrow">YOUR EXPERT\'S CONTEXT</span><h3 class="spaced">Start with what you know.</h3>' + explanation('context', 'client_context_refs') + source_note + '<details class="config-field"><summary>Source references</summary>' + references + '</details>',
        'prds': '<span class="eyebrow">FROM CONFIGURATION TO IMPLEMENTATION</span><h3 class="spaced">The plan behind your expert.</h3><p class="small">Review the requirements, then confirm scope to create an official TAC plan.</p><div class="planning-actions"><button class="panel-button" id="planning-refresh">Refresh</button><button class="panel-button" id="planning-index">Open scoped PRD index</button></div><p id="planning-status" class="tiny" role="status"></p><div id="prd-list"></div><div id="planning-request"></div>',
        'kanban': '<span class="eyebrow">LINKED IMPLEMENTATION WORK</span><h3 class="spaced">From proposed to done.</h3><p class="small">Work linked to this expert\'s PRDs. Board changes are managed in Hermes.</p><p id="kanban-status" class="tiny" role="status"></p><div id="kanban-board" class="kanban-board" tabindex="0" aria-label="Implementation board, scroll horizontally for more columns"></div>',
        'artifacts': '<span class="eyebrow">YOUR DESIGN PACKAGE</span><h3 class="spaced">Keep it. Review it. Build from it.</h3><div class="artifact-tile"><div><strong>Expert brief</strong><small>Purpose, workflow and source context</small></div><button class="panel-button" data-artifact="brief">Open</button></div><div class="artifact-tile"><div><strong>Expert configuration</strong><small>agent_expert_config.v1 / YAML</small></div><button class="panel-button" data-artifact="configuration">Inspect</button></div><button class="panel-button primary full" data-action="export-config">Download expert-config.yaml</button><h4 class="spaced">Actual outputs</h4><div id="actual-artifacts"></div><h4 class="spaced">Example library</h4><p class="tiny">Synthetic examples. Not approved. Not dispatchable.</p><div id="example-artifacts"></div><button class="panel-button full spaced" data-action="export-review">Export feedback and meeting notes</button><p class="tiny spaced">Previews and downloads work offline. Examples never count as completed work.</p>',
        'console': '<span class="eyebrow">DOCUMENT VALIDATION</span><div class="console-content"><div class="console-line">PASS / Single expert input and draft schema</div><div class="console-line">PASS / All 12 config fields explained</div><div class="console-line">PASS / YAML export matches the displayed config</div><div class="console-line">NOT RUN / Runtime, credentials and live workflow</div></div>' + f'<p class="tiny spaced">Rendered {esc(date)}</p><details class="config-field"><summary>Configuration fingerprint</summary><code>{config_hash}</code></details>',
        'changes': '<span class="eyebrow">YOUR APPROVAL BOUNDARIES</span><h3 class="spaced">You decide when it goes live.</h3>' + explanation('approval', 'activation_gate') + '<div class="panel-notice">Local feedback is not an activation approval. Export your notes for the setup conversation.</div>' + button('Leave a meeting note', 'chat'),
        'atlas': '<div class="atlas-shell"><div class="atlas-heading"><h3>Activity overview</h3>'
            + '<div class="atlas-actions"><button id="atlas-clear" class="panel-button" hidden>Clear selection</button><button id="atlas-refresh" class="panel-button" aria-label="Refresh from Supabase">Refresh</button></div></div>'
            + '<p id="atlas-status" role="status">Loading saved snapshot...</p>'
            + '<details id="atlas-filters" class="atlas-fold"><summary><strong>Filters & axes</strong><span id="atlas-filter-summary"></span></summary>'
            + '<div class="atlas-controls"><label>Dataset<select id="atlas-dataset"><option value="traces">Model traces</option><option value="runs">Agent runs</option><option value="sessions">Sessions</option></select></label>'
            + '<label>X axis<select id="atlas-x"></select></label><label>Y axis<select id="atlas-y"></select></label><label>Bubble size<select id="atlas-size"></select></label></div>'
            + f'<p class="tiny atlas-scope">{esc(config["agent_id"])} only. Latest 90 days, up to 200 records per dataset. <span id="atlas-source-note"></span></p></details>'
            + '<p id="atlas-empty" class="small"></p><div id="atlas-plot" aria-label="Agent activity scatterplot"></div>'
            + '<details id="atlas-records" class="atlas-fold"><summary><strong>Records</strong><span id="atlas-summary" aria-live="polite"></span></summary>'
            + activity_table('atlas') + '</details></div>',
        'table': '<div class="atlas-table-shell"><div class="atlas-heading"><h3>Activity records</h3>'
            + '<div class="atlas-actions"><button id="table-clear" class="panel-button" hidden>Clear selection</button><button id="table-refresh" class="panel-button" aria-label="Refresh table from Supabase">Refresh</button></div></div>'
            + '<p id="table-status" role="status">Loading saved snapshot...</p>'
            + '<div class="atlas-table-toolbar"><span id="table-filter-summary" class="tiny"></span><button id="table-filters" class="panel-button" data-open="atlas">Chart & filters</button></div>'
            + '<p id="table-summary" class="tiny" aria-live="polite"></p><p id="table-empty" class="small"></p>'
            + activity_table('table') + '</div>',
    }
    fragments = {**panels, 'canvas-brief': brief, 'canvas-sources': '<div class="document-header">SOURCE CONTEXT</div><h3>The brief behind the design.</h3>' + explanation('context', 'client_context_refs') + source_note + references, 'canvas-configuration': yaml_panel}
    templates = '\n'.join(f'<template id="panel-{key}">{value}</template>' for key, value in fragments.items())
    panels['history'] = '<div class="history-shell"><span class="eyebrow">RUNTIME HISTORY</span><h3 class="spaced">Sessions, messages & traces</h3><p class="small">Review saved user messages and the work linked to them.</p><div class="planning-actions"><button class="panel-button" id="history-home">Sessions</button><button class="panel-button" id="history-refresh">Refresh</button></div><p id="history-status" class="tiny" role="status"></p><nav id="history-breadcrumb" aria-label="History navigation"></nav><div id="history-rows"></div><button class="panel-button" id="history-next" hidden>Next page</button><p class="tiny">Only saved runtime messages and explicitly linked traces appear here. Onboarding notes remain in Conversation.</p></div>'
    templates += '\n<template id="panel-history">' + panels['history'] + '</template>'
    fonts = (WORKSPACE / 'assets/fonts.css').read_text(encoding='utf-8')
    fonts = re.sub(r'url\((font-\d\.ttf)\)', lambda m: 'url(' + asset_uri(WORKSPACE / 'assets' / m[1], 'font/ttf') + ')', fonts)
    styles = fonts + '\n' + '\n'.join((WORKSPACE / name).read_text(encoding='utf-8') for name in ['workshop.css', 'designs.css', 'mode.css', 'document.css', 'approvals.css', 'plan-template.css', 'expert-builder.css'])
    context = {
        'name': esc(config['display_name']), 'initial': initial, 'logo': asset_uri(WORKSPACE / 'assets/gb-signature.png', 'image/png'),
        'styles': styles, 'panels': templates, 'yaml_json': script_json(yaml_text),
        'data_json': script_json({'document_id': document_id, 'legacy_document_id': legacy_document_id, 'agent_id': config['agent_id'], 'yaml_sha256': config_hash, 'schema_version': config['schema_version']}),
        'mode_script': (WORKSPACE / 'mode.js').read_text(encoding='utf-8'),
        'workshop_script': (WORKSPACE / 'workshop.js').read_text(encoding='utf-8'),
        'window_count': str(len(panels)),
        'bokeh_resources': bokeh_resources, 'atlas_chart_json': script_json(atlas_chart),
        'atlas_snapshot_json': script_json(atlas_snapshot), 'atlas_script': (WORKSPACE / 'atlas.js').read_text(encoding='utf-8'),
        'planning_json': script_json({'scope': scope_for(profile), 'snapshot': planning_snapshot, 'request': request, 'artifacts': artifacts, 'config': config}),
        'planning_script': (WORKSPACE / 'expert-builder.js').read_text(encoding='utf-8') + '\n' + (WORKSPACE / 'plan-template.js').read_text(encoding='utf-8') + '\n' + (WORKSPACE / 'planning.js').read_text(encoding='utf-8'),
        'history_script': (WORKSPACE / 'history.js').read_text(encoding='utf-8'),
        'approval_script': (WORKSPACE / 'approvals.js').read_text(encoding='utf-8'),
        'host_bridge_script': (WORKSPACE / 'host-bridge.js').read_text(encoding='utf-8'),
    }
    page = render_template((WORKSPACE / 'index.html.j2').read_text(encoding='utf-8'), context)
    receipt = {
        'mode': 'single-expert-forge-workspace', 'expert_count': 1, 'window_count': len(panels),
        'agent_id': config['agent_id'], 'schema': config['schema_version'], 'document_id': document_id, 'legacy_document_id': legacy_document_id,
        'config_fields_explained': list(IDENTITY_FIELDS) + [f for *_, fields in GROUPS for f in fields],
        'yaml_sha256': config_hash, 'html_sha256': hashlib.sha256(page.encode('utf-8')).hexdigest(),
        'runtime_authorized': False, 'standalone_html': True,
        'history': {'mode': 'private_server_or_authenticated_host', 'embedded_messages': 0, 'runtime_capture_verified': False},
        'avatar': avatar_receipt,
        'planning': {'scope': scope_for(profile), 'request_id': request['request_id'], 'mode': 'snapshot' if planning_snapshot else 'not_connected'},
        'artifacts': metadata(artifacts),
        'atlas': {'mode': 'snapshot' if atlas_snapshot else 'not_connected',
                  'captured_at': atlas_snapshot['captured_at'] if atlas_snapshot else None,
                  'rows': {k: len(v) for k, v in atlas_snapshot['datasets'].items()} if atlas_snapshot else {},
                  'scope': config['agent_id'], 'refresh': 'same-origin local preview only'},
        'validation': 'Schema, config field coverage, escaped content and YAML parity. Runtime not verified.',
        'ui_source': json.loads((WORKSPACE / 'provenance.json').read_text(encoding='utf-8')),
    }
    return page, yaml_text, receipt
