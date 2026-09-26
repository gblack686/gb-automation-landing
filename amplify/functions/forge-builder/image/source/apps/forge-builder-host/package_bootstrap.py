"""Prepare private, hash-bound hosted inputs locally. This command never uploads."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'resources/skills/hermes-prospect-agent-team-lead-magnet/scripts'))
from forge_planning import scope_for
from render_expert_profile import validate_profile
from render_forge_workspace import read_avatar

EXPECTED = {'tenant_id': 'gbautomation', 'agent_id': 'artist-packet-expert', 'board_slug': 'gbautomation',
            'config_sha256': 'bf142e4e937a53701b4a27b02d90068ee0c8f73636f123dd97a56a661e3040e5'}
sha = lambda raw: hashlib.sha256(raw).hexdigest()


def package(profile_path, visuals_path, ledger_path, out, voice_enabled):
    profile = json.loads(profile_path.read_text(encoding='utf-8-sig'))
    validate_profile(profile)
    if scope_for(profile) != EXPECTED:
        raise ValueError('bootstrap_binding_mismatch')
    read_avatar(profile['avatar'], profile_path.parent)
    portrait = (profile_path.parent / profile['avatar']['image_path']).read_bytes()
    profile['avatar']['image_path'] = 'assets/portrait.png'
    profile['planning'] = {k: EXPECTED[k] for k in ('tenant_id', 'board_slug')}
    profile.pop('atlas', None)
    profile.pop('artifacts', None)
    ledger = json.loads(ledger_path.read_text())
    if ledger.get('reviewed') is not True or not isinstance(ledger.get('usage'), list) or not ledger.get('source_sha256'):
        raise ValueError('reviewed_voice_ledger_required')
    visuals = json.loads(visuals_path.read_text())
    if any(visuals.get(k) != EXPECTED[k] for k in ('tenant_id', 'agent_id')):
        raise ValueError('visual_owner_mismatch')
    settings = {**EXPECTED, 'voice_enabled': voice_enabled, 'voice_usage_reviewed': True,
                'voice_usage': ledger['usage'], 'voice_ledger_sha256': sha(ledger_path.read_bytes()), 'visuals': {}}
    files = {'assets/portrait.png': portrait, 'operator-preferences.md': (ROOT / 'second-brain/os/USER.md').read_bytes()}
    for role, name in [('card', 'card.png'), ('model', 'model.glb'), ('receipts', 'receipts.json')]:
        if role not in visuals:
            continue
        raw = Path(visuals[role]['path']).read_bytes()
        if len(raw) > 40_000_000 or sha(raw) != visuals[role]['sha256']:
            raise ValueError('visual_hash_mismatch')
        files['assets/' + name] = raw
        settings['visuals'][role] = {'sha256': sha(raw)}
    files['profile.json'] = (json.dumps(profile, ensure_ascii=False, indent=2) + '\n').encode()
    files['settings.json'] = (json.dumps(settings, indent=2) + '\n').encode()
    out = out.resolve()
    if not out.is_relative_to(ROOT / 'artifacts/vault-exhaust') or out.exists():
        raise ValueError('fresh_private_output_required')
    out.mkdir(parents=True)
    manifest = {**EXPECTED, 'files': []}
    for name, raw in files.items():
        p = out / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(raw)
        if p.read_bytes() != raw:
            raise ValueError('bootstrap_readback_failed')
        manifest['files'].append({'path': name, 'sha256': sha(raw), 'bytes': len(raw)})
    (out / 'manifest.local.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return {'files': len(files), 'binding': EXPECTED, 'voice_usage_entries': len(ledger['usage']),
            'manifest_sha256': sha((out / 'manifest.local.json').read_bytes())}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('profile', 'visuals', 'voice-ledger', 'out'):
        p.add_argument('--' + name, type=Path, required=True)
    p.add_argument('--voice-enabled', action='store_true')
    args = p.parse_args()
    print(json.dumps(package(args.profile, args.visuals, args.voice_ledger, args.out, args.voice_enabled)))
