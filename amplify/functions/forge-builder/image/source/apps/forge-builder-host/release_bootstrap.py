"""Upload the prepared private bootstrap only after canonical source release gates.

Default is a read-only preflight. --write publishes immutable, versioned inputs.
This does not alter billing, protections, credentials, Cognito groups or deploy code.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
PREFIX = 'gbautomation/artist-packet-expert/builder-pilot/bootstrap/'
BUCKET = 'amplify-d1qefy5a1kauhs-ma-forgeatlasdocumentsf019b-ugxuhkdnrej0'
MONO_CHECKS = {'gbauto-config-validate', 'golden-thread-lineage', 'managed-manifest', 'red-fixture-proofs', 'index-drift', 'validate', 'vault-conformance'}
ALLOWED = {'profile.json', 'settings.json', 'operator-preferences.md', 'assets/portrait.png', 'assets/card.png', 'assets/model.glb', 'assets/receipts.json'}


def github(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], text=True))


def check_release(repo, branch, sha, required):
    if not re.fullmatch('[a-f0-9]{40}', sha):
        raise ValueError('exact_source_sha_required')
    if github(f'repos/{repo}/commits/{branch}')['sha'] != sha:
        raise ValueError('source_not_canonical_head')
    pages = json.loads(subprocess.check_output(['gh', 'api', '--paginate', '--slurp', f'repos/{repo}/commits/{sha}/check-runs?per_page=100'], text=True))
    checks = {}
    for page in pages:
        for row in page['check_runs']:
            if row['name'] not in checks or row['id'] > checks[row['name']]['id']:
                checks[row['name']] = row
    if any(checks.get(name, {}).get('conclusion') != 'success' or checks[name]['status'] != 'completed' for name in required):
        raise ValueError('normal_release_checks_not_green')


def local_files(root):
    root = root.resolve()
    manifest = json.loads((root / 'manifest.local.json').read_text())
    if manifest['tenant_id'] != 'gbautomation' or manifest['agent_id'] != 'artist-packet-expert':
        raise ValueError('bootstrap_owner_mismatch')
    seen, files = set(), []
    for row in manifest['files']:
        name = row['path']
        if name not in ALLOWED or name in seen:
            raise ValueError('bootstrap_route_invalid')
        seen.add(name)
        path = root / name
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise ValueError('bootstrap_route_invalid')
        raw = path.read_bytes()
        if len(raw) != row['bytes'] or hashlib.sha256(raw).hexdigest() != row['sha256']:
            raise ValueError('bootstrap_hash_changed')
        files.append((row, raw))
    if not {'profile.json', 'settings.json', 'assets/portrait.png', 'operator-preferences.md'} <= seen:
        raise ValueError('bootstrap_incomplete')
    return manifest, files


def publish(s3, key, raw, mime):
    sha = hashlib.sha256(raw).hexdigest()
    try:
        result = s3.put_object(Bucket=BUCKET, Key=key, Body=raw, ContentType=mime, CacheControl='private, no-store',
                               Metadata={'sha256': sha, 'tenant': 'gbautomation', 'expert': 'artist-packet-expert'}, IfNoneMatch='*')
        version = result.get('VersionId')
    except s3.exceptions.ClientError as e:
        if e.response['ResponseMetadata']['HTTPStatusCode'] not in (409, 412):
            raise
        version = s3.head_object(Bucket=BUCKET, Key=key).get('VersionId')
    if not version or version == 'null':
        raise ValueError('versioned_bootstrap_required')
    result = s3.get_object(Bucket=BUCKET, Key=key, VersionId=version)
    if result['ContentLength'] != len(raw) or result['Metadata'].get('sha256') != sha or result['Body'].read() != raw:
        raise ValueError('immutable_bootstrap_conflict')
    return {'key': key, 'version': version, 'sha256': sha, 'bytes': len(raw), 'mime': mime}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bootstrap', type=Path, required=True)
    parser.add_argument('--monorepo-sha', required=True)
    parser.add_argument('--website-sha', required=True)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    manifest, files = local_files(args.bootstrap)
    check_release('gbauto/gbautomation', 'main', args.monorepo_sha, MONO_CHECKS)
    check_release('gblack686/gb-automation-landing', 'master', args.website_sha, {'forge-atlas'})
    import boto3
    s3 = boto3.client('s3', region_name='us-east-1')
    if s3.get_bucket_versioning(Bucket=BUCKET).get('Status') != 'Enabled' or not all(s3.get_public_access_block(Bucket=BUCKET)['PublicAccessBlockConfiguration'].values()):
        raise ValueError('private_versioned_bucket_required')
    if not args.write:
        print(json.dumps({'ready': True, 'write': False, 'files': len(files)}))
        return
    descriptors = []
    for row, raw in files:
        suffix = Path(row['path']).suffix
        mime = {'.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary', '.md': 'text/markdown'}[suffix]
        descriptors.append({'path': row['path'], **publish(s3, PREFIX + row['path'], raw, mime)})
    document = {**manifest, 'files': descriptors}
    result = publish(s3, PREFIX + 'manifest.json', json.dumps(document, sort_keys=True).encode(), 'application/json')
    print(json.dumps({'published': True, 'manifest': result, 'files': len(files)}))


if __name__ == '__main__':
    from resources.lib.tracing import trace_agent
    trace_agent('forge-hosted-bootstrap-release', tags=['forge', 'release'])(main)()
