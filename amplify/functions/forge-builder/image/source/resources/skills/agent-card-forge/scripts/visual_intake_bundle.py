"""Shared, offline Character Studio component for the private Forge packager."""
import json
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]
TEMPLATE = SKILL / 'templates/visual-intake'


def private_visual_intake() -> tuple[dict, str]:
    page = (TEMPLATE / 'index.html').read_text(encoding='utf-8')
    body = page.split('<main>', 1)[1].split('<script id="catalog"', 1)[0]
    html = '<div class="intake-root"><p id="save-state" role="status">Session draft. Download to keep a copy.</p><main>' + body + '</div>'
    css = (TEMPLATE / 'style.css').read_text(encoding='utf-8')
    css = css.replace(':root{', ':host{').replace('body{', '.intake-root{')
    # The window width, not the outer browser width, controls card layout.
    css = css.replace('@media(min-width:1300px)', '@container(min-width:1300px)')
    css = css.replace('@media(max-width:1050px)', '@container(max-width:1050px)')
    css = css.replace('@media(max-width:720px)', '@container(max-width:720px)')
    css += '\n:host{display:block;container-type:inline-size}main{padding:18px 0}.intro h1{font-size:28px}#save-state{font-size:12px;color:var(--muted)}.brief-panel{position:static;max-height:none}input[readonly],textarea[readonly]{background:var(--paper)}'
    payload = {
        'html': html, 'css': css,
        'catalog': json.loads((TEMPLATE / 'card-catalog.json').read_text(encoding='utf-8')),
        'briefTemplate': json.loads((SKILL / 'examples/expert-visual-brief.example.json').read_text(encoding='utf-8')),
    }
    return payload, (TEMPLATE / 'app.js').read_text(encoding='utf-8')
