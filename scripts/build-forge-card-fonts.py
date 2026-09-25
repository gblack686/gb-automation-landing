"""Rebuild portable card lettering (pip install fonttools). No runtime font service."""
import hashlib
import io
import json
from pathlib import Path
from urllib.request import urlopen
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1] / 'amplify/functions/forge-visual'
BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/crimsontext/'

def fetch(name):
    with urlopen(BASE + name, timeout=30) as response:
        return response.read()

result = {}
for style in ['Regular', 'Bold', 'Italic']:
    filename = f'CrimsonText-{style}.ttf'
    raw = fetch(filename)
    font = TTFont(io.BytesIO(raw))
    glyphs = font.getGlyphSet()
    mapping = {}
    for code, name in font.getBestCmap().items():
        if code < 32:
            continue
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        mapping[chr(code)] = [font['hmtx'][name][0], pen.getCommands()]
    result[style.lower()] = dict(units=font['head'].unitsPerEm, glyphs=mapping,
                               source=BASE+filename, sha256=hashlib.sha256(raw).hexdigest())
ROOT.joinpath('card-fonts.json').write_text(json.dumps(result, ensure_ascii=True, separators=(',', ':')), encoding='utf8')
ROOT.joinpath('card-fonts.LICENSE.txt').write_bytes(fetch('OFL.txt'))
print(json.dumps({k: {'glyphs': len(v['glyphs']), 'sha256': v['sha256']} for k, v in result.items()}))
