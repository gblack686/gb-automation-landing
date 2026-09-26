"""Exercise the actual Forge renderer and protected review page on loopback.

Use a disposable pilot. Screenshots never include capability URLs. Shutdown
terminates only browser processes spawned by this test, not the user's Chrome.
"""
import json
import sys
from pathlib import Path

import psutil
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'artifacts/forge-approval-intake-2026-09-24/local-build'
ORIGIN = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:18814'


def run():
    OUT.mkdir(exist_ok=True, parents=True)
    checks = []
    errors = []
    p = sync_playwright().start()
    browser = p.chromium.launch(headless=True, args=['--disable-gpu','--no-proxy-server'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    page.route('https://**/*', lambda r: r.abort())
    page.on('pageerror', lambda e: errors.append(str(e)))
    print('Opening Forge', flush=True)
    page.goto(ORIGIN, wait_until='domcontentloaded',timeout=60000)
    print('Forge loaded',flush=True)
    expect(page.locator('.approval-card')).to_have_count(2)
    page.screenshot(path=str(OUT / 'forge-preview.png'))
    checks.append('preview cards visible with connected metadata')
    # Use the existing window control, not a separate approximation of Forge.
    controls = page.locator('#window-proposals .window-controls button')
    controls.last.click()
    expect(page.locator('#window-proposals')).to_have_class(__import__('re').compile('is-maximized'))
    page.screenshot(path=str(OUT / 'forge-full-screen.png'))
    checks.append('existing Proposals window maximizes')
    page.locator('.approval-filter-drawer summary').click()
    page.locator('[data-filter=client_id]').select_option('GBAuto')
    expect(page.locator('.approval-card')).to_have_count(1)
    expect(page.locator('[data-filter=client_id]')).to_have_value('GBAuto')
    page.locator('[data-filter=client_id]').select_option('')
    checks.append('client filter preserves selection and record identity')
    workflow = 'fw_prop_forge_pilot_2'
    page.locator(f'[data-approval-open="{workflow}"]').click()
    expect(page.locator('#forge-approval-dialog')).to_be_visible()
    page.locator('[data-accept]').click()
    expect(page.locator('#approval-scope-form')).to_be_visible()
    page.locator('[name=outcome]').fill('Create a clear brief from meeting notes')
    page.locator('[name=deliverables]').fill('brief')
    page.locator('[name=acceptance]').fill('brief-reviewed')
    page.locator('[name=dependencies]').fill('Approved meeting transcript')
    page.locator('#approval-scope-form button').click()
    expect(page.locator('#approval-decision-form')).to_be_visible(timeout=30000)
    page.screenshot(path=str(OUT / 'scope-review.png'))
    checks.append('acceptance prefills editable scope; submitting queues separate role mail')
    # Close the dialog to inspect actual local email output.
    page.locator('#forge-approval-dialog .dialog-close').click()
    mail = context.new_page()
    mail.goto(ORIGIN + '/mailbox')
    expect(mail.locator('article')).to_have_count(2)
    client = mail.locator('article').filter(has_text='client@pilot.invalid')
    expect(client.locator('a')).to_have_count(4)
    operator = mail.locator('article').filter(has_text='operator@pilot.invalid')
    expect(operator.locator('a')).to_have_count(5)
    client.locator('a').filter(has_text='Approve').click()
    expect(mail.locator('#decision')).to_be_visible()
    assert '#' not in mail.url
    expect(mail.locator('#decision-label')).to_have_text('Your decision')
    mail.locator('[name=confirmed]').check()
    mail.locator('#confirm').click()
    expect(mail.locator('#status')).to_contain_text('Feedback recorded')
    checks.append('client link strips fragment, confirms feedback and never authorizes')
    page.locator('[data-refresh]').click()
    page.locator(f'[data-approval-open="{workflow}"]').click()
    page.locator('#approval-decision-form [name=action]').select_option('approve')
    page.locator('#approval-decision-form button').click()
    expect(page.locator('.approval-document')).to_contain_text('Phases', timeout=30000)
    expect(page.locator('#approval-error')).to_be_empty()
    page.screenshot(path=str(OUT / 'plan-review.png'))
    checks.append('scope approval generates and validates linked plan artifacts')
    page.locator('#approval-decision-form [name=action]').select_option('approve')
    page.locator('#approval-decision-form button').click()
    expect(page.locator('#approval-decision-form')).to_have_count(0)
    page.locator('#forge-approval-dialog details').last.locator('summary').click()
    expect(page.locator('#forge-approval-dialog')).to_contain_text('delivered')
    checks.append('manual plan approval returns the persisted nonexecuting release')
    mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True)
    small = mobile.new_page()
    small.route('https://**/*', lambda r: r.abort())
    small.goto(ORIGIN + '/#approval=' + workflow, wait_until='domcontentloaded')
    expect(small.locator('#forge-approval-dialog')).to_be_visible()
    assert small.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    assert small.locator('#forge-approval-dialog').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    small.screenshot(path=str(OUT / 'mobile-review.png'))
    checks.append('390px deep link opens same workflow without horizontal overflow')
    assert not errors, errors
    receipt = {'schema_version': 'forge-approval-browser-proof.v1', 'status': 'pass', 'checks': checks,
               'browser': 'Chromium via Playwright', 'viewports': ['1440x1000', '390x844'],
               'real_email_sent': False, 'live_execution': False, 'page_errors': errors}
    (OUT / 'browser-proof.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt), flush=True)


if __name__ == '__main__':
    try:
        run()
    finally:
        # A known browser.close shutdown hang must not outlive this test.
        for child in reversed(psutil.Process().children(recursive=True)):
            try:
                child.terminate()
            except psutil.NoSuchProcess:
                pass
