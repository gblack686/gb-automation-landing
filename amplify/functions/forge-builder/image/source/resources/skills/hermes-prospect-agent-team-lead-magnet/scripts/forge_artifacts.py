"""Explicitly listed, hash-verified artifact bundles. Never fetch artifact URLs."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from jsonschema import Draft202012Validator

from forge_planning import TEMPLATES, bounded_file, scope_for

MIMES = {'.html': 'text/html', '.yaml': 'application/yaml', '.json': 'application/json',
         '.md': 'text/markdown', '.txt': 'text/plain'}
SAMPLES = {
    'implementation-plan.sample.html': 'Implementation plan',
    'architecture.sample.yaml': 'Target architecture',
    'expert-config.sample.yaml': 'Expert configuration',
    'validation-receipt.sample.json': 'Validation receipt',
    'handoff-manifest.sample.json': 'Handoff manifest',
    'expert-output.sample.html': 'Expert output',
}
RESERVED = {'index.html', 'expert-config.yaml', 'expert-profile-receipt.json', 'artifact-manifest.json'}


def entry(filename: str, title: str, raw: bytes, kind: str = 'example', prd_id: str | None = None) -> dict:
    return {'id': 'artifact-' + hashlib.sha256(filename.encode()).hexdigest()[:16], 'filename': filename,
            'title': title, 'mime': MIMES[Path(filename).suffix], 'bytes': len(raw),
            'sha256': hashlib.sha256(raw).hexdigest(), 'kind': kind, 'prd_id': prd_id}


def validate_entries(entries: list[dict]) -> None:
    schema = json.loads((TEMPLATES / 'forge-artifact-manifest.schema.json').read_text(encoding='utf-8'))['$defs']['artifact']
    if len(entries) > 36 or sum(e.get('bytes', 0) for e in entries) > 8_000_000:
        raise ValueError('Artifact bundle exceeds its limit')
    if len({e['id'] for e in entries}) != len(entries) or len({e['filename'] for e in entries}) != len(entries):
        raise ValueError('Duplicate artifact identity')
    for item in entries:
        if list(Draft202012Validator(schema).iter_errors(item)):
            raise ValueError('Invalid artifact entry')
        if item['filename'] in RESERVED or item['mime'] != MIMES[Path(item['filename']).suffix]:
            raise ValueError('Artifact filename or MIME is not allowed')
        if ('.sample.' in item['filename']) != (item['kind'] == 'example'):
            raise ValueError('Sample artifacts must be explicitly labeled')
        if item['kind'] == 'example' and item['prd_id'] is not None:
            raise ValueError('Examples cannot be linked to real PRDs')


def verify_file(root: Path, item: dict) -> bytes:
    raw = bounded_file(root, item['filename'], 3_000_000).read_bytes()
    if len(raw) != item['bytes'] or hashlib.sha256(raw).hexdigest() != item['sha256']:
        raise ValueError('Artifact content does not match its manifest')
    raw.decode('utf-8')
    return raw


def load_artifacts(profile: dict, asset_root: Path) -> list[dict]:
    """Content is embedded for offline Blob downloads; metadata is safe to serve separately."""
    bundle = []
    for filename, title in SAMPLES.items():
        raw = bounded_file(TEMPLATES / 'forge-workspace/samples', filename, 3_000_000).read_bytes()
        bundle.append({**entry(filename, title, raw), 'content': raw.decode('utf-8')})
    name = profile.get('planning', {}).get('artifacts_manifest_path')
    if name:
        scope = scope_for(profile)
        path = bounded_file(asset_root, name, 100_000)
        manifest = json.loads(path.read_text(encoding='utf-8'))
        schema = json.loads((TEMPLATES / 'forge-artifact-manifest.schema.json').read_text(encoding='utf-8'))
        if list(Draft202012Validator(schema).iter_errors(manifest)) or any(manifest[k] != scope[k] for k in ('tenant_id', 'agent_id', 'config_sha256')):
            raise ValueError('Artifact manifest scope does not match this expert')
        validate_entries(manifest['artifacts'])
        for item in manifest['artifacts']:
            if item['kind'] != 'actual':
                raise ValueError('External manifests may supply actual outputs only')
            bundle.append({**item, 'content': verify_file(path.parent, item).decode('utf-8')})
    validate_entries(metadata(bundle))
    return bundle


def metadata(bundle: list[dict]) -> list[dict]:
    return [{k: v for k, v in item.items() if k != 'content'} for item in bundle]


def preview_html(content: str) -> str:
    """Defense in depth for callers outside the browser module."""
    policy = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'"
    return '<meta http-equiv="Content-Security-Policy" content="' + policy + '">' + content
