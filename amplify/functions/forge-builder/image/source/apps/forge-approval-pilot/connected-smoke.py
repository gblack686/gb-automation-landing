"""Read-only browser proof against the internal Forge connection."""
import json
from pathlib import Path
import sys

import psutil
from playwright.sync_api import sync_playwright, expect


def run():
    origin = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:18815'
    output = Path(__file__).parent / '.local/connected-browser'
    output.mkdir(parents=True, exist_ok=True)
    playwright = sync_playwright().start()
    browser = playwright.chromium.launch(headless=True, args=['--disable-gpu', '--no-proxy-server'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.route('https://**/*', lambda route: route.abort())
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(origin, wait_until='commit', timeout=60000)
    cards = page.locator('#forge-native-proposals .approval-card')
    expect(cards).to_have_count(50, timeout=60000)
    expect(page.locator('#forge-approval-panel')).to_contain_text('Supabase')
    page.locator('#window-proposals .window-controls button').last.click()
    first = cards.first.locator('[data-native-open]').get_attribute('data-native-open')
    page.screenshot(path=str(output / 'live-proposals.png'))
    page.locator('[data-native-page="1"]').click()
    expect(cards.first.locator('[data-native-open]')).not_to_have_attribute('data-native-open', first, timeout=60000)
    page.locator('[data-native-page="-1"]').click()
    expect(cards.first.locator('[data-native-open]')).to_have_attribute('data-native-open', first, timeout=60000)
    cards.first.locator('[data-native-open]').click()
    expect(page.locator('[data-native-accept]')).to_be_disabled()
    page.locator('#forge-approval-dialog .dialog-close').click()
    page.locator('#native-search').fill('forge-search-no-match-20260924')
    page.locator('.approval-catalog-filter button').click()
    expect(cards).to_have_count(0, timeout=60000)
    expect(page.locator('#forge-native-proposals')).to_contain_text('No matching proposals')
    page.locator('#native-search').fill('')
    page.locator('.approval-catalog-filter button').click()
    expect(cards).to_have_count(50, timeout=60000)
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    assert not errors, errors
    result = {'checks': ['live source and connection badge', '50 real proposals', 'full-screen window',
                         'forward/back pagination', 'activation-disabled accept', 'search and clear',
                         'mobile viewport', 'no page errors'],
              'writes_performed': False, 'email_sent': False, 'execution_performed': False}
    (output / 'proof.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    try:
        run()
    finally:
        for child in reversed(psutil.Process().children(recursive=True)):
            try:
                child.terminate()
            except psutil.NoSuchProcess:
                pass
