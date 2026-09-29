"""Browser-check a generated offline Forge document without a model or live backend."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[4]


def smoke(html: Path, output: Path) -> dict:
    html = html.resolve()
    output.mkdir(parents=True, exist_ok=True)
    exported = (html.parent / 'expert-config.yaml').read_bytes()
    errors, remote_requests, checks = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('FORGE_CHROMIUM_EXECUTABLE') or None)
        context = browser.new_context(viewport={'width': 1600, 'height': 1000}, accept_downloads=True)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: remote_requests.append(request.url) if request.url.startswith(('http:', 'https:')) else None)
        page.goto(html.as_uri())
        page.wait_for_function('window.ForgePreview?.windows.length === 17')
        page.wait_for_function('window.ForgeAtlas?.ready')
        assert page.locator('.window').count() == 17
        assert page.locator('iframe').count() == 0
        page.screenshot(path=str(output / 'desktop-light.png'))
        checks.append('All 17 Forge windows render; artifact previews are opened on demand')

        # A real file download, not merely a link-presence assertion.
        with page.expect_download() as event:
            page.locator('.download-config').click()
        download = event.value
        assert download.suggested_filename == 'expert-config.yaml'
        download.save_as(output / 'downloaded-config.yaml')
        assert (output / 'downloaded-config.yaml').read_bytes() == exported
        checks.append('Downloaded YAML matches the exported file byte for byte')

        # Field navigation must reveal the same config, including empty bindings.
        page.locator('.dock-button[data-open="config"]').click()
        page.locator('#window-config [data-field="profile_config"]').first.click()
        assert page.locator('#yaml-preview').inner_text() == exported.decode('utf-8')
        # Field navigation schedules highlighting on the next animation frame.
        expect(page.locator('#yaml-profile_config')).to_have_class(re.compile(r'\bhighlight\b'))
        page.locator('#window-canvas .maximize').click()
        assert 'is-maximized' in page.locator('#window-canvas').get_attribute('class')
        page.keyboard.press('Escape')
        page.locator('.dock-button[data-open="config"]').click()
        page.locator('#window-config [data-window-action="minimize"]').click()
        assert page.locator('#window-config').is_hidden()
        page.locator('.dock-button[data-open="config"]').click()
        assert page.locator('#window-config').is_visible()
        checks.append('Field navigation, maximize, Escape, minimize and dock restore work')

        # Keyboard geometry controls and layout persistence reuse the original manager.
        title = page.locator('#window-config .window-titlebar')
        title.focus()
        before = page.evaluate('ForgePreview.states().config.w')
        title.press('Shift+ArrowLeft')
        assert page.evaluate('ForgePreview.states().config.w') < before
        position = page.evaluate('ForgePreview.states().config')
        page.reload()
        assert page.evaluate('ForgePreview.states().config') == position
        checks.append('Keyboard resize and layout persistence work')

        page.locator('#reset-layout').click()
        page.locator('#mode-toggle').click()
        assert page.locator('body').get_attribute('data-mode') == 'dark'
        page.reload()
        assert page.locator('body').get_attribute('data-mode') == 'dark'
        page.screenshot(path=str(output / 'desktop-dark.png'))
        page.locator('#mode-toggle').click()
        assert page.locator('body').get_attribute('data-mode') == 'light'
        checks.append('Light/dark toggle and persistence work')

        page.locator('#gallery-view').click()
        assert page.locator('.window:visible').count() == 17
        visible_text = page.locator('body').inner_text()
        for stale in ['YouTube Intelligence', 'video cap', 'Accept demo', 'Demo run', 'IndyDevDan']:
            assert stale not in visible_text
        assert page.locator('[data-config-field]').count() == 12
        page.locator('#window-skills [data-review="changes"]').click()
        page.locator('#window-skills [data-review-note]').fill('Review the proposed skill bindings.')
        page.locator('#chat-text').fill('<img src=x onerror="window.noteInjected=true">')
        page.locator('[aria-label="Save meeting note"]').click()
        assert page.locator('#meeting-notes img').count() == 0
        assert page.evaluate('window.noteInjected === undefined')
        page.reload()
        page.locator('#gallery-view').click()
        assert '<img src=x' in page.locator('#meeting-notes').inner_text()
        assert page.locator('#window-skills [data-review-note]').input_value() == 'Review the proposed skill bindings.'
        with page.expect_download() as event:
            page.locator('#export-review').click()
        event.value.save_as(output / 'feedback.json')
        feedback = json.loads((output / 'feedback.json').read_text(encoding='utf-8'))
        assert len(feedback['elements']) == 17
        assert feedback['meeting_notes'][0].startswith('<img')
        assert feedback['runtime_authorized'] is False
        assert feedback['yaml_sha256'] == hashlib.sha256(exported).hexdigest()
        checks.append('All-window review and meeting notes persist, escape HTML and export separately from activation')

        for width in [1440, 1024, 768, 390, 320]:
            for mode in ['light', 'dark']:
                narrow_context = browser.new_context(viewport={'width': width, 'height': 900})
                narrow = narrow_context.new_page()
                narrow.on('pageerror', lambda error: errors.append(str(error)))
                narrow.goto(html.as_uri() + '?mode=' + mode)
                narrow.wait_for_function('window.ForgePreview?.windows.length === 17')
                assert narrow.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'Overflow: {width} {mode}'
                narrow.locator('#gallery-view').click()
                assert narrow.locator('.window:visible').count() == 17
                assert narrow.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), f'Gallery overflow: {width} {mode}'
                if width == 390:
                    narrow.locator('#workspace-view').click()
                    narrow.screenshot(path=str(output / f'mobile-{mode}.png'))
                narrow_context.close()
        checks.append('Workspace and all-window views fit 1440, 1024, 768, 390 and 320 pixels in both modes')
        assert not errors, errors
        assert not remote_requests, remote_requests
        checks.append('No JavaScript errors or remote requests')
        browser.close()
    receipt = {'status': 'passed', 'checks': checks, 'yaml_sha256': hashlib.sha256(exported).hexdigest(), 'runtime_tested': False}
    (output / 'browser-checks.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    return receipt


def main() -> int:
    sys.path.insert(0, str(ROOT))
    from resources.lib.tracing import trace_agent

    @trace_agent('lead_magnet.forge_workspace_smoke', metadata={'mode': 'local_browser'})
    def run():
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument('--html', required=True, type=Path)
        parser.add_argument('--out', required=True, type=Path)
        args = parser.parse_args()
        print(json.dumps(smoke(args.html, args.out)))
        return 0
    return run()


if __name__ == '__main__':
    raise SystemExit(main())
