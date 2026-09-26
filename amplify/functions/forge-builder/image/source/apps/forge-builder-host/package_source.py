"""Vendor the canonical builder into the website's Lambda image, with provenance.

No credentials, private profile, generated packet or runtime state enters the image.
Only reviewed source roots and their local Python import closure are copied.
"""
from __future__ import annotations
import argparse
import ast
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SKILL = Path('resources/skills/hermes-prospect-agent-team-lead-magnet')
DATA = [
    Path('config/agent-operating-policy.yaml'),
    Path('config/schemas/agent-operating-policy.v1.schema.json'),
    Path('config/justfile-section-registry.yaml'),
    Path('resources/skills/agent-card-forge/examples/expert-visual-brief.example.json'),
    Path('resources/skills/tac-plan/workflows/plan-lifecycle.md'),
    Path('resources/skills/tac-plan/references/html-output-standard.md'),
    SKILL / 'fixtures/single-expert/profile-page.json',
    SKILL / 'templates', Path('resources/skills/agent-card-forge/templates'),
    Path('experts/gbautomation/_template'), Path('artifacts/forge-connected-windows-2026-09-23'),
    Path('resources/skills/get-gbauto-theme/assets'),
    Path('resources/skills/agent-forge/templates/agent-expert-config.schema.json'),
    Path('services/gbauto_agent_os/src/gbauto_agent_os/schemas'),
    Path('artifacts/forge-approval-intake-2026-09-24/implementation-approval.json'),
    Path('supabase/migrations/20260924090000_forge_approval_workflow.sql'),
    Path('supabase/functions/human-approval-action/forge.mjs'),
]
SEARCH = [ROOT, ROOT / 'scripts', ROOT / SKILL / 'scripts',
          ROOT / 'resources/skills/agent-card-forge/scripts',
          ROOT / 'services/gbauto_agent_os/src']
TEXT = {'.py', '.mjs', '.js', '.json', '.md', '.yaml', '.yml', '.css', '.html', '.sql', '.ts', '.txt', '.toml', '.svg'}
def source_bytes(path):
    raw = path.read_bytes()
    return raw.replace(b'\r\n', b'\n') if path.suffix in TEXT or path.name == 'Dockerfile' else raw


def source_files():
    files = set()
    def add(path):
        if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
            raise ValueError('source_route_denied')
        if path.is_file() and '__pycache__' not in path.parts:
            files.add(path)
    for rel in DATA:
        p = ROOT / rel
        if not p.exists():
            raise ValueError(f'missing source: {rel}')
        for f in p.rglob('*') if p.is_dir() else [p]:
            add(f)
    for app in ('forge-approval-pilot', 'forge-builder-host'):
        for p in (ROOT / 'apps' / app).iterdir():
            if p.suffix in ('.mjs', '.py') or p.name in ('package.json', 'package-lock.json', 'requirements.txt'):
                add(p)
    for p in (ROOT / 'apps/forge-builder-host/test').rglob('*'):
        if p.suffix in ('.mjs', '.py'):
            add(p)
    add(ROOT / 'apps/forge-approval-pilot/.local-assets/turntable.js')
    if ROOT / 'apps/forge-approval-pilot/.local-assets/turntable.js' not in files:
        raise ValueError('run npm run build:clients in apps/forge-approval-pilot first')
    for p in (ROOT / SKILL / 'scripts').glob('*.py'):
        add(p)
    for name in ('scaffold_expert_from_config', 'render_expert_justfiles'):
        add(ROOT / 'scripts' / (name + '.py'))
    seen = set()
    while True:
        pending = [p for p in files - seen if p.suffix == '.py']
        if not pending:
            break
        for p in pending:
            seen.add(p)
            for n in ast.walk(ast.parse(p.read_text(encoding='utf-8-sig'))):
                if isinstance(n, ast.ImportFrom) and n.level:
                    base = p.parent
                    for _ in range(n.level - 1):
                        base = base.parent
                    relmodules = [n.module] if n.module else [a.name for a in n.names]
                    for module in relmodules:
                        target = base / module.replace('.', '/')
                        for candidate in [target.with_suffix('.py'), target / '__init__.py']:
                            if candidate.is_file():
                                add(candidate)
                modules = [a.name for a in n.names] if isinstance(n, ast.Import) else [n.module] if isinstance(n, ast.ImportFrom) and n.module else []
                for module in modules:
                    for base in [p.parent, *SEARCH]:
                        target = base / module.replace('.', '/')
                        candidates = [target.with_suffix('.py'), target / '__init__.py']
                        for candidate in candidates:
                            if candidate.is_file():
                                add(candidate)
    return sorted(files)


def package(website: Path):
    website = website.resolve()
    if not (website / 'amplify/backend.ts').is_file():
        raise ValueError('website_checkout_required')
    target = website / 'amplify/functions/forge-builder/image'
    # Delete only the generated image context, after exact target containment.
    if target.exists():
        if target.resolve() != website / 'amplify/functions/forge-builder/image' or target.is_symlink():
            raise ValueError('output_route_denied')
        shutil.rmtree(target)
    source = target / 'source'
    source.mkdir(parents=True)
    rows = []
    for path in source_files():
        rel = path.relative_to(ROOT)
        if path.name.startswith('.env') or 'node_modules' in rel.parts or path.suffix in ('.sqlite', '.sqlite3', '.glb'):
            raise ValueError('private_source_denied')
        raw = source_bytes(path)
        dest = source / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(raw)
        rows.append({'path': rel.as_posix(), 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)})
    (target / 'Dockerfile').write_bytes(source_bytes(ROOT / 'apps/forge-builder-host/Dockerfile'))
    for src, dest in [(ROOT / 'apps/forge-approval-pilot/voice.mjs', website / 'amplify/functions/forge-builder/canonical/voice.mjs'),
                      *[(ROOT / SKILL / 'templates/forge-workspace' / n, website / 'src/lib/forge-builder' / n) for n in ('expert-builder.js', 'expert-builder.css')]]:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(source_bytes(src))
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    recipe_hash = hashlib.sha256((target / 'Dockerfile').read_bytes()).hexdigest()
    manifest = {'schema_version': 'forge-builder-source.v1', 'source_repository': 'gbauto/gbautomation',
                'source_base_commit': sha, 'files': rows, 'dockerfile_sha256': recipe_hash,
                'sha256': hashlib.sha256(json.dumps({'files': rows, 'dockerfile_sha256': recipe_hash}, sort_keys=True).encode()).hexdigest()}
    (target / 'source-manifest.json').write_bytes((json.dumps(manifest, indent=2) + '\n').encode())
    return {'files': len(rows), 'bytes': sum(r['bytes'] for r in rows), 'sha256': manifest['sha256']}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--website', type=Path, required=True)
    args = p.parse_args()
    print(json.dumps(package(args.website)))
