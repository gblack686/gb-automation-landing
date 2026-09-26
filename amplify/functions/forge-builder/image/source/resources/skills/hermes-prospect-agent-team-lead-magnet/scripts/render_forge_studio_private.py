"""Package the selected 13-window Studio for the authenticated host.

Reuses the source Studio shell without its fixtures, persistence or simulator.
Private records are delivered through the existing opaque-frame read bridge.
"""
from __future__ import annotations

import argparse
import base64
import io
import hashlib
import json
from pathlib import Path
import re
import sys

import yaml
from PIL import Image, ImageOps

from _common import esc
from forge_artifacts import load_artifacts, metadata
from forge_planning import scope_for, planning_request
from render_expert_profile import validate_profile
from render_forge_workspace import WORKSPACE, asset_uri, read_avatar, script_json

REPO = Path(__file__).resolve().parents[4]
STUDIO = REPO / 'artifacts/forge-connected-windows-2026-09-23'
sys.path.insert(0, str(REPO / 'resources/skills/agent-card-forge/scripts'))
from visual_intake_bundle import private_visual_intake


def replace_once(text: str, before: str, after: str) -> str:
    if text.count(before) != 1:
        raise ValueError('Studio source changed; review private packaging boundary')
    return text.replace(before, after, 1)


def private_shell_script() -> str:
    script = (STUDIO / 'app.js').read_text(encoding='utf-8')
    script = replace_once(script, "let saved={};try{saved=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}", 'const saved={};')
    start, end = script.index('function persist()'), script.index('function url()')
    script = script[:start] + 'function persist(){}\n' + script[end:]
    start, end = script.index('function run('), script.index('function start()')
    script = script[:start] + "function run(){toast('Execution is not connected.');}\nfunction stop(){}\n" + script[end:]
    script = replace_once(script, "for(const r of D.runs)if(r.status==='running'){r.status='cancelled';r.ui.lines.push(['system','Demo ended on page reload.']);}", '')
    script = script.replace('Demo data', 'Private workspace').replace('No linked records in this fixture.', 'No linked records loaded.')
    script = script.replace('All values shown here are fixtures.', 'Records come from the private read API or this packaged configuration.')
    script = script.replace('A demo run or review updates all connected views.', 'State comes from saved records; execution is not connected.')
    script = script.replace("'UI fixture'", "'Private API projection'")
    script = script.replace('Deployment and live FK presence were not queried.', 'These are read API references, not a verified inventory of live database constraints.')
    export_start = script.index("$('export-data').addEventListener")
    export_end = script.index('\n', export_start)
    script = script[:export_start] + script[export_end:]
    script = replace_once(script, 'function render(){const focus=',
                          "function render(){document.dispatchEvent(new Event('forge-before-render'));const focus=")
    script = replace_once(script, 'window.scrollTo(0,scroll);persist();url();',
                          "window.scrollTo(0,scroll);persist();url();document.dispatchEvent(new Event('forge-render')); ")
    return script


def render_private_studio(profile: dict, *, asset_root: Path) -> tuple[str, str, dict]:
    validate_profile(profile)
    scope = scope_for(profile)
    if not scope or scope['tenant_id'] != 'gbautomation' or scope['agent_id'] != 'artist-packet-expert':
        raise ValueError('Private host is bound to the existing GBAutomation Artist Packet workspace')
    avatar, avatar_receipt = read_avatar(profile['avatar'], asset_root)
    with Image.open(io.BytesIO(base64.b64decode(avatar.split(',', 1)[1]))) as image:
        icon = ImageOps.fit(image.convert('RGBA'), (64, 64), method=Image.Resampling.LANCZOS)
        stream = io.BytesIO()
        icon.save(stream, format='PNG', optimize=True)
    avatar_icon = 'data:image/png;base64,' + base64.b64encode(stream.getvalue()).decode('ascii')
    artifacts = [a for a in load_artifacts(profile, asset_root) if a['kind'] == 'actual']
    config = profile['config']
    yaml_text = yaml.safe_dump(config, allow_unicode=True, sort_keys=False, width=90)
    visual_intake, visual_script = private_visual_intake()
    payload = {'scope': scope, 'config': config, 'yaml': yaml_text, 'avatar': avatar, 'avatar_icon': avatar_icon,
               'avatar_credit': profile['avatar'].get('seed_card'), 'tagline': profile['tagline'],
               'workflow': profile['workflow'], 'artifacts': artifacts, 'visual_intake': visual_intake,
               'planning_request': planning_request(profile)}
    fonts = (WORKSPACE / 'assets/fonts.css').read_text(encoding='utf-8')
    fonts = re.sub(r'url\((font-\d\.ttf)\)', lambda m: 'url(' + asset_uri(WORKSPACE / 'assets' / m[1], 'font/ttf') + ')', fonts)
    page = (STUDIO / 'index.html').read_text(encoding='utf-8')
    page = page.replace('<title>Forge / Connected windows</title>', '<title>Agent Forge / Private Studio</title>')
    page = page.replace('<link rel="stylesheet" href="../nexus-forge-window-preview-2026-09-18/assets/fonts.css">', '<style>' + fonts + '</style>')
    styles = (STUDIO / 'suite.css').read_text(encoding='utf-8') + '\n' + (WORKSPACE / 'private-studio.css').read_text(encoding='utf-8')
    styles += '\n' + (WORKSPACE / 'plan-template.css').read_text(encoding='utf-8')
    styles += '\n' + (WORKSPACE / 'expert-builder.css').read_text(encoding='utf-8')
    page = page.replace('<link rel="stylesheet" href="suite.css">', '<style>' + styles + '</style>')
    page = page.replace('href="../forge-file-commands-2026-09-23/index.html" title="Open the approved File Commands study"', 'href="#main" title="Agent Forge"')
    page = page.replace('../nexus-forge-window-preview-2026-09-18/assets/gb-signature.png', asset_uri(WORKSPACE / 'assets/gb-signature.png', 'image/png'))
    page = page.replace('YouTube Intelligence<small>One connected workspace</small>', esc(config['display_name']) + '<small>Private Studio</small>')
    page = page.replace('Local design preview<small>Linked sample records.<br>Actions stay in this browser.</small>', 'Private workspace<small>Saved records and configuration.<br>Avatar generation in secure host.</small>')
    page = re.sub(r'<select id="scope">.*?</select>', '<select id="scope"><option value="all">All workstreams</option></select>', page)
    page = page.replace('13 windows · Connected design fixtures · No live execution', '13 windows · Private data · Avatar studio')
    page = page.replace('<button id="export-data"', '<button hidden id="export-data"')
    page = page.replace('Export demo state', 'Export disabled')
    page = page[:page.index('<script src=')] + '</body></html>'
    scripts = '\n'.join([
        '<script id="private-studio-data" type="application/json">' + script_json(payload) + '</script>',
        '<script>' + (WORKSPACE / 'host-bridge.js').read_text(encoding='utf-8') + '</script>',
        '<script>' + visual_script + '</script>',
        '<script>' + (WORKSPACE / 'plan-template.js').read_text(encoding='utf-8') + '</script>',
        '<script>' + (WORKSPACE / 'expert-builder.js').read_text(encoding='utf-8') + '</script>',
        '<script>' + (WORKSPACE / 'private-studio.js').read_text(encoding='utf-8') + '</script>',
        '<script>' + private_shell_script() + '</script>',
        '<script>ForgePrivate.start();</script>',
    ])
    page = page.replace('</body>', scripts + '</body>')
    receipt = {'schema_version': 'forge-private-studio-release.v1', 'scope': scope,
               'sha256': hashlib.sha256(page.encode()).hexdigest(), 'bytes': len(page.encode()),
               'windows': 13, 'source_shell': str(STUDIO.relative_to(REPO)),
               'private_storage': 'memory_only', 'writes_enabled': False,
               'email_enabled': False, 'execution_enabled': False,
               'configuration_builder': {'transport': 'same_origin_loopback_operator_session',
                                         'hosted_writes_enabled': False, 'runtime_activation': False,
                                         'package_generation': 'canonical_scaffolder_after_local_pilot_gates'},
               'planning_template': {'sha256': payload['planning_request']['template']['sha256'],
                                     'sections': 7, 'authority': 'local_design_feedback',
                                     'review_storage': 'browser-local on loopback/file; memory-only in authenticated host'},
               'visual_intake': {'cards': len(visual_intake['catalog']['cards']), 'draft_storage': 'memory_only',
                                 'scope': scope, 'paid_generation': False, 'generation_handoff': 'authenticated_host', 'public_search': False},
               'avatar': avatar_receipt, 'artifacts': metadata(artifacts)}
    return page, yaml_text, receipt


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    sys.path.insert(0, str(REPO))
    from resources.lib.tracing import trace_agent
    @trace_agent('forge-private-studio-render', tags=['forge', 'private-studio'])
    def render():
        page, _, receipt = render_private_studio(json.loads(args.profile.read_text(encoding='utf-8-sig')), asset_root=args.profile.parent)
        args.output.mkdir(parents=True, exist_ok=True)
        (args.output / 'index.html').write_text(page, encoding='utf-8', newline='\n')
        (args.output / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'sha256': receipt['sha256'], 'bytes': receipt['bytes'], 'windows': 13}))
    render()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
