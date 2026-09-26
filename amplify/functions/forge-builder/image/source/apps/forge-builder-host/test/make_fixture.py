"""Create explicitly synthetic CI inputs, with no private operator or visual data."""
import hashlib
import json
from pathlib import Path
import struct
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SKILL = ROOT / 'resources/skills/hermes-prospect-agent-team-lead-magnet'
sys.path.insert(0, str(SKILL / 'scripts'))
from forge_planning import scope_for

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=False)
(out / 'assets').mkdir()
profile = json.loads((SKILL / 'fixtures/single-expert/profile-page.json').read_text())
profile['planning'] = {'tenant_id': 'gbautomation', 'board_slug': 'gbautomation'}
profile['avatar']['image_path'] = 'assets/portrait.png'
(out / 'profile.json').write_text(json.dumps(profile))
(out / 'operator-preferences.md').write_text('Synthetic CI operator. No real operator context. No dispatch or email.\n')
for name in ('portrait', 'card'):
    Image.new('RGB', (256, 384), '#b65e42').save(out / 'assets' / (name + '.png'))
data = struct.pack('<9f', -1, 0, 0, 1, 0, 0, 0, 2, 0)
gltf = {'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 0}}]}], 'buffers': [{'byteLength': len(data)}],
        'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': len(data)}],
        'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': 3, 'type': 'VEC3', 'min': [-1, 0, 0], 'max': [1, 2, 0]}]}
js = json.dumps(gltf).encode()
js += b' ' * (-len(js) % 4)
raw = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(data)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(data), b'BIN\0') + data
(out / 'assets/model.glb').write_bytes(raw)
settings = {**scope_for(profile), 'voice_enabled': True, 'voice_usage_reviewed': True, 'voice_usage': [],
            'visuals': {role: {'sha256': hashlib.sha256((out / 'assets' / name).read_bytes()).hexdigest()}
                        for role, name in [('card', 'card.png'), ('model', 'model.glb')]}}
(out / 'settings.json').write_text(json.dumps(settings))
print(json.dumps({'synthetic': True, 'private_data': False, 'files': 6}))
