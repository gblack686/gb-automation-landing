"""Rebuild the six synthetic Forge examples using the canonical report renderer."""
from __future__ import annotations

import base64
import json
from pathlib import Path
import re
import sys

import yaml

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT))
from resources.lib.gbauto_doc_template import FONT_LINKS, render_document
from resources.lib.tracing import trace_agent

WORKSPACE = Path(__file__).resolve().parent.parent / 'templates/forge-workspace'


def sample_plan() -> str:
    sections = [
        ('Purpose and scope', '<p><strong>Example only. Not approved. Not dispatchable.</strong> Build one synthetic Packet Expert that turns an approved brief into a reviewed HTML packet. Publishing and activation require a separate decision.</p>'),
        ('Configuration to implementation', '<ul><li>purpose: create a reviewed packet.</li><li>client_context_refs: use the approved brief and media inventory.</li><li>skills and commands: select bindings and define create, revise and validate actions.</li><li>profile_config and secrets_required: agree runtime limits and credential reference names.</li><li>validation_workflows: check content, credits, links and responsive layout.</li><li>activation_gate: human approval required.</li></ul>'),
        ('Target architecture', '<p>Approved brief &rarr; Packet Expert &rarr; draft HTML and inventory &rarr; validation &rarr; human review &rarr; approved handoff.</p><p>The architecture sample describes these components. No tools or accounts are connected.</p>'),
        ('Implementation phases', '<ol><li>Confirm the brief and acceptance criteria.</li><li>Bind approved skills, commands and context.</li><li>Implement the packet workflow.</li><li>Validate the HTML and review its credits.</li><li>Prepare an approval-bound handoff.</li></ol>'),
        ('Validation and acceptance', '<p>Example checks: all required sections exist; media has provenance; mobile and desktop layouts fit; no secrets are exported; publication waits for explicit approval. These checks have not run.</p>'),
        ('Approval and handoff', '<p>Scope approval: absent. Implementation approval: absent. Runtime activation: absent. A real plan must use the TAC-plan intake, architecture, adoption and index lifecycle.</p>'),
    ]
    page = render_document('Packet Expert implementation plan',
        [{'label': label, 'html': body, 'open': True} for label, body in sections],
        subtitle='Synthetic example. Not approved. Not dispatchable.', eyebrow='EXAMPLE / TAC PLAN',
        meta={'source_name': 'Forge example library', 'status': 'Example, not approved', 'report_id': 'forge-implementation-plan.sample'},
        taxonomy_pills=[{'kind': 'type', 'label': 'Type', 'value': 'Example'}, {'kind': 'status', 'label': 'Status', 'value': 'Not approved'}],
        theme_lock=True)
    # Retain canonical CSS and use the already bundled fonts for offline examples.
    fonts = (WORKSPACE / 'assets/fonts.css').read_text(encoding='utf-8')
    fonts = re.sub(r'url\((font-\d\.ttf)\)', lambda m: 'url(data:font/ttf;base64,' + base64.b64encode((WORKSPACE / 'assets' / m[1]).read_bytes()).decode() + ')', fonts)
    return page.replace(FONT_LINKS, '<style>' + fonts + '</style>')


@trace_agent('lead_magnet.forge_samples', metadata={'mode': 'synthetic_local'})
def main():
    output = WORKSPACE / 'samples'
    output.mkdir(exist_ok=True)
    label = {'example': True, 'status': 'example_not_approved', 'dispatchable': False, 'runtime_authorized': False}
    config = {'schema_version': 'agent_expert_config.v1', 'agent_id': 'sample-packet-expert', 'display_name': 'Sample Packet Expert',
              'purpose': 'Synthetic example: prepare a reviewed HTML packet from an approved brief.',
              'client_context_refs': ['fixture:approved-brief'], 'profile_config': {}, 'prime_commands': [], 'preset_commands': [],
              'skills': [], 'validation_workflows': [], 'secrets_required': [], 'activation_gate': 'human_approval_required'}
    (output / 'implementation-plan.sample.html').write_text(sample_plan(), encoding='utf-8')
    (output / 'expert-config.sample.yaml').write_text('# EXAMPLE ONLY. Not approved. Not dispatchable. No runtime is connected.\n' + yaml.safe_dump(config, sort_keys=False), encoding='utf-8')
    architecture = {'schema_version': 'forge-architecture-example.v1', **label,
                    'components': ['approved-brief', 'packet-expert', 'html-packet', 'validation', 'human-review'],
                    'connections': [{'from': a, 'to': b} for a, b in [('approved-brief', 'packet-expert'), ('packet-expert', 'html-packet'), ('html-packet', 'validation'), ('validation', 'human-review')]],
                    'config_mapping': {'packet-expert': ['purpose', 'skills', 'profile_config', 'prime_commands', 'preset_commands'],
                                       'approved-brief': ['client_context_refs', 'secrets_required'], 'validation': ['validation_workflows'], 'human-review': ['activation_gate']}}
    (output / 'architecture.sample.yaml').write_text('# EXAMPLE ONLY. Not approved. Not dispatchable.\n' + yaml.safe_dump(architecture, sort_keys=False), encoding='utf-8')
    for name, data in [('validation-receipt', {'schema_version': 'forge-validation-example.v1', **label, 'checks': [{'name': 'HTML, credits and responsive layout', 'result': 'not_run'}]}),
                       ('handoff-manifest', {'schema_version': 'forge-handoff-example.v1', **label, 'expert': 'sample-packet-expert', 'files': ['expert-config.sample.yaml', 'architecture.sample.yaml', 'implementation-plan.sample.html'], 'required_next_step': 'Confirm scope through TAC-plan; obtain separate implementation and activation approvals.'})]:
        (output / (name + '.sample.json')).write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8')
    (output / 'expert-output.sample.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Example artist packet</title><style>body{margin:0;padding:clamp(24px,6vw,80px);background:#F3F1E7;color:#191919;font:16px/1.7 system-ui}main{max-width:800px;margin:auto}h1{font:clamp(34px,7vw,68px)/1.05 Georgia}section{padding:24px 0;border-top:1px solid #d6d4c8}.label{letter-spacing:.12em;font-size:12px}aside{padding:16px;border:1px solid #D97757}</style><main><p class="label">EXAMPLE / EXPERT OUTPUT</p><h1>A story, ready to share.</h1><aside>Synthetic example. Not approved. Not dispatchable. This is a layout example, with no real artist, media or publication.</aside><section><h2>Artist introduction</h2><p>An artist-approved biography would appear here, with reviewed source references.</p></section><section><h2>Music and visual direction</h2><p>Approved tracks, imagery and credits would be gathered into one coherent packet.</p></section><section><h2>Review and handoff</h2><p>Check the content, accessibility and media credits. Obtain approval before publishing.</p></section></main></html>''', encoding='utf-8')
    print(json.dumps({'sample_count': 6, 'live_writes': 0}))


if __name__ == '__main__':
    main()
