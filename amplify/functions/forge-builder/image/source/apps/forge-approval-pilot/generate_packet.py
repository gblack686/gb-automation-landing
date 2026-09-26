"""Materialize a local, review-only expert package from a gate-bound intake.

Called by the loopback pilot with server-owned paths. No publisher, installer,
repository creation, model request, or messaging hooks are invoked.
"""
from __future__ import annotations

import copy
import hashlib
import io
import json
from pathlib import Path
import struct
import sys
import tempfile
import zipfile

import jsonschema
from PIL import Image, ImageOps
import yaml

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / 'resources/skills/hermes-prospect-agent-team-lead-magnet/scripts'
sys.path[:0] = [str(ROOT), str(SCRIPTS)]
from forge_planning import config_digest, planning_request  # noqa: E402
from render_forge_studio_private import render_private_studio  # noqa: E402
from render_forge_workspace import read_avatar, script_json  # noqa: E402
from scripts.scaffold_expert_from_config import scaffold, SCHEMA_PATH  # noqa: E402


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def canonical(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def verify_packet(root: Path, manifest: dict) -> None:
    """Read back every exact destination and reject tampering, extras and links."""
    actual = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    expected = {r['path'] for r in manifest['files']} | {'packet-manifest.json'}
    if actual != expected:
        raise ValueError('packet_inventory_mismatch')
    for row in manifest['files']:
        path = root / row['path']
        if (path.is_symlink() or not path.resolve().is_relative_to(root.resolve()) or
                any(p.is_symlink() for p in path.parents if p != root.parent)):
            raise ValueError('packet_route_escape')
        raw = path.read_bytes()
        if len(raw) != row['bytes'] or digest(raw) != row['sha256']:
            raise ValueError('packet_readback_mismatch')


def archive_packet(output: Path, archive: Path, manifest: dict, expected_hash=None) -> str:
    """Recover interrupted archive creation and verify each archived file."""
    if not archive.exists():
        temporary = archive.with_suffix('.zip.tmp')
        with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as z:
            for path in sorted(output.rglob('*')):
                if path.is_file():
                    entry = zipfile.ZipInfo(path.relative_to(output).as_posix(), (1980, 1, 1, 0, 0, 0))
                    entry.compress_type = zipfile.ZIP_DEFLATED
                    z.writestr(entry, path.read_bytes())
        temporary.replace(archive)
    actual_hash = digest(archive.read_bytes())
    if expected_hash and actual_hash != expected_hash:
        raise ValueError('archive_readback_failed')
    with zipfile.ZipFile(archive) as z:
        expected = {r['path']: r['sha256'] for r in manifest['files']}
        expected['packet-manifest.json'] = digest((output / 'packet-manifest.json').read_bytes())
        if sorted(z.namelist()) != sorted(expected) or any(digest(z.read(name)) != sha for name, sha in expected.items()):
            raise ValueError('archive_readback_failed')
    return actual_hash


def generate(request: dict) -> dict:
    root = Path(request['root']).resolve()
    if not (root / '.forge-builder').is_file() or root == ROOT:
        raise ValueError('isolated_builder_root_required')
    profile_path = Path(request['profile']).resolve()
    profile = json.loads(profile_path.read_text(encoding='utf-8-sig'))
    draft, release = request['draft'], request['release']
    binding = draft['binding']
    if (binding['agent_id'] != profile['config']['agent_id'] or
            binding['tenant_id'] != profile.get('planning', {}).get('tenant_id') or
            binding['config_sha256'] != config_digest(profile['config'])):
        raise ValueError('profile_binding_changed')
    if (release.get('schema_version') != 'forge-approval-release.v1' or
            release.get('workflow_id') != draft.get('workflow_id') or
            not release.get('decision_event') or release.get('execution_performed') is not False):
        raise ValueError('bound_plan_release_required')
    answers = draft['answers']
    if any(answers[k]['status'] != 'captured' or not answers[k]['value'].strip()
           for k in ('problem', 'audience', 'data_access', 'output', 'success')):
        raise ValueError('complete_reviewed_intake_required')
    config = copy.deepcopy(profile['config'])
    config['purpose'] = answers['problem']['value'] + '\nDesired output: ' + answers['output']['value']
    config['client_context_refs'] = list(dict.fromkeys(config['client_context_refs'] +
        [f"forge-intake:{draft['id']}:v{draft['version']}:{key}" for key in answers]))
    jsonschema.Draft202012Validator(json.loads(SCHEMA_PATH.read_text())).validate(config)

    # Inputs and trusted file bytes, not caller filenames, identify the package.
    asset_inputs = {'portrait': profile_path.parent / profile['avatar']['image_path']}
    read_avatar(profile['avatar'], profile_path.parent)
    visuals = request.get('visuals') or {}
    if visuals:
        if visuals.get('tenant_id') != binding['tenant_id'] or visuals.get('agent_id') != binding['agent_id']:
            raise ValueError('visual_owner_mismatch')
        for name in ('card', 'model', 'receipts'):
            if visuals.get(name):
                path = Path(visuals[name]['path']).resolve()
                if not path.is_file() or path.stat().st_size > 40_000_000:
                    raise ValueError('invalid_visual_asset')
                if digest(path.read_bytes()) != visuals[name]['sha256']:
                    raise ValueError('visual_hash_mismatch')
                asset_inputs[name] = path
    asset_hashes = {k: digest(p.read_bytes()) for k, p in asset_inputs.items()}
    # Source/template changes invalidate the idempotency key as well as inputs.
    source_paths = [Path(__file__), ROOT / 'scripts/scaffold_expert_from_config.py',
                    ROOT / 'scripts/render_expert_justfiles.py', Path(__file__).parent / 'turntable.mjs']
    source_paths += sorted((ROOT / 'experts/gbautomation/_template').rglob('*'))
    source_paths += sorted(SCRIPTS.glob('*.py'))
    source_paths += sorted((SCRIPTS.parent / 'templates/forge-workspace').rglob('*'))
    source_paths += sorted((ROOT / 'artifacts/forge-connected-windows-2026-09-23').glob('*'))
    source_paths += sorted((ROOT / 'resources/skills/agent-card-forge/templates').rglob('*'))
    if 'model' in asset_inputs:
        source_paths += [Path(__file__).parent / '.local-assets/turntable.js']
    sources = {p.relative_to(ROOT).as_posix(): digest(p.read_bytes())
               for p in source_paths if p.is_file()}
    key = digest(canonical({'draft': draft, 'release': release, 'assets': asset_hashes,
                            'config': config, 'sources': sources}))
    output = root / 'packets' / key
    archive = root / 'packets' / (key + '.zip')
    if output.exists():
        manifest = json.loads((output / 'packet-manifest.json').read_text())
        verify_packet(output, manifest)
        archive_hash = archive_packet(output, archive, manifest, request.get('prior_archive_sha256'))
        return {'packet_id': key, 'manifest': manifest, 'archive_sha256': archive_hash, 'reused': True}
    output.parent.mkdir(exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='.staging-', dir=output.parent))
    try:
        def write(name, value):
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(value if isinstance(value, bytes) else value.encode())

        write('agent-expert-config.json', canonical(config))
        write('expert-config.yaml', yaml.safe_dump(config, allow_unicode=True, sort_keys=False, width=90))
        write('intake.json', canonical(draft))
        write('approval-release.json', canonical(release))
        write('source-manifest.json', canonical(sources))
        # The existing canonical scaffolder generates review files in this packet.
        result = scaffold(config_path=stage / 'agent-expert-config.json', tree='gbautomation',
                          repo_root=stage, template_dir=ROOT / 'experts/gbautomation/_template')
        result.pop('dir', None)
        result['source_config'] = 'agent-expert-config.json'
        write('scaffold-receipt.json', canonical(result))
        names = {'portrait': 'assets/portrait.png', 'card': 'assets/card.png',
                 'model': 'assets/model.glb', 'receipts': 'assets/visual-receipts.json'}
        for name, path in asset_inputs.items():
            if name in ('portrait', 'card'):
                with Image.open(path) as img:
                    img.verify()
                # Preserve originals byte for byte, including frame details.
            if name == 'model':
                raw = path.read_bytes()
                if raw[:4] != b'glTF' or struct.unpack_from('<I', raw, 4)[0] != 2:
                    raise ValueError('invalid_model')
                length = struct.unpack_from('<I', raw, 12)[0]
                model = json.loads(raw[20:20+length])
                if any('uri' in item for name in ('buffers', 'images') for item in model.get(name, [])):
                    raise ValueError('self_contained_model_required')
            write(names[name], path.read_bytes())
        if 'model' in asset_inputs:
            write('assets/turntable.js', (Path(__file__).parent / '.local-assets/turntable.js').read_bytes())
        with Image.open(asset_inputs['portrait']) as img:
            for size in (32, 64, 128):
                stream = io.BytesIO()
                ImageOps.fit(img.convert('RGBA'), (size, size)).save(stream, format='PNG')
                write(f'assets/avatar-{size}.png', stream.getvalue())
        profile['config'] = config
        profile['audience'] = answers['audience']['value']
        profile['avatar']['image_path'] = 'assets/portrait.png'
        # Snapshot files from a previous profile cannot masquerade as current data.
        profile['planning'] = {'tenant_id': binding['tenant_id'], 'board_slug': binding['board_slug']}
        profile.pop('artifacts', None)
        profile.pop('atlas', None)
        profile['source_note'] = 'Operator-reviewed intake assertions. Local pilot package; runtime inactive.'
        write('profile.json', canonical(profile))
        plan = planning_request(profile)
        plan['source_refs']['intake'] = {'id': draft['id'], 'version': draft['version'], 'path': 'intake.json'}
        write('forge-planning-request.json', canonical(plan))
        write('forge-tac-handoff.md', '/plan ' + plan['title'] + '\n\n' + plan['route']['instructions'] + '\n\n```json\n' + canonical(plan).decode() + '```\n')
        packet = {'schema_version': 'forge-expert-packet.v1', 'packet_id': key,
                  'binding': binding, 'generated_config_sha256': config_digest(config),
                  'intake_version': draft['version'], 'workflow_id': draft['workflow_id'],
                  'approval_evidence': 'local_pilot_only', 'runtime_authorized': False,
                  'provider_calls': 0, 'generation_kind': 'deterministic_existing_scaffolder',
                  'repository': {'strategy': 'existing_repository', 'url': 'https://github.com/gbauto/gbautomation',
                                 'created': False, 'commit': None},
                  'visual': {k: {'path': names[k], 'sha256': v} for k, v in asset_hashes.items()},
                  'limitations': ['Scaffold commands remain echo-only until implemented and reviewed.',
                                 'Runtime/model, skill bindings and credentials retain supplied values or unresolved setup.',
                                 'Local pilot gates are not production implementation approval.']}
        page, _, _ = render_private_studio(profile, asset_root=stage)
        page = page.replace('<script id="private-studio-data"', '<script id="forge-generated-packet" type="application/json">' + script_json(packet) + '</script><script id="private-studio-data"')
        write('index.html', page)
        write('generation-receipt.json', canonical(packet))
        manifest = {**packet, 'files': [{'path': p.relative_to(stage).as_posix(),
                    'bytes': p.stat().st_size, 'sha256': digest(p.read_bytes())}
                    for p in sorted(stage.rglob('*')) if p.is_file()]}
        write('packet-manifest.json', canonical(manifest))
        verify_packet(stage, manifest)
        stage.rename(output)
        archive_hash = archive_packet(output, archive, manifest)
        return {'packet_id': key, 'manifest': manifest, 'archive_sha256': archive_hash, 'reused': False}
    except Exception:
        # Preserve failed staging as evidence; it is never served as a package.
        raise


if __name__ == '__main__':
    from resources.lib.tracing import trace_agent
    @trace_agent('forge-expert-packet', tags=['forge', 'local-pilot', 'configuration'])
    def main():
        print(json.dumps(generate(json.load(sys.stdin))))
    main()
