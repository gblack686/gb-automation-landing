"""Local browser acceptance. All writes are intercepted; no live submissions.

Requires Python Playwright and Chromium. Run against a production Vite preview:
python scripts/validate-marketing.py --url http://127.0.0.1:4191
Set GBAUTO_CONTEXT_ROOT to the canonical gbautomation repo for shared tracing.
"""
import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from playwright.async_api import async_playwright, expect

context_root = os.environ.get('GBAUTO_CONTEXT_ROOT')
if context_root:
    sys.path.insert(0, context_root)
    from resources.lib.tracing import trace_agent
else:
    def trace_agent(*_args, **_kwargs):
        return lambda fn: fn

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4191')
parser.add_argument('--browser', default=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE'))
parser.add_argument('--phase', choices=['interactions', 'final'], default='final')
args = parser.parse_args()
assert urlparse(args.url).hostname in ('localhost', '127.0.0.1'), 'Only local previews are allowed.'
out = Path('artifacts/website-redesign')
out.mkdir(parents=True, exist_ok=True)
results = {'url': args.url, 'phase': args.phase, 'checks': [], 'writes_intercepted': 0, 'errors': []}


async def validate():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, **({'executable_path': args.browser} if args.browser else {}))
        context = await browser.new_context(viewport={'width': 1440, 'height': 1000})

        async def guard(route):
            if route.request.method not in ('GET', 'HEAD', 'OPTIONS'):
                results['writes_intercepted'] += 1
                await route.abort()
            else:
                await route.continue_()
        await context.route('**/*', guard)
        page = await context.new_page()
        page.on('pageerror', lambda error: results['errors'].append(str(error)))
        await page.goto(args.url, wait_until='load')
        await expect(page.locator('h1')).to_have_text('AI systems.Built to dothe work.')
        for width, height in [(1440, 1000), (768, 1024), (390, 844), (320, 740)]:
            await page.set_viewport_size({'width': width, 'height': height})
            await page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
            assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'Overflow at {width}'
            box = await page.locator('.hero-actions .studio-button').bounding_box()
            assert box and box['y'] >= 0 and box['y'] + box['height'] <= height, f'CTA outside first viewport at {width}'
        results['checks'].append('Offer and CTA fit 1440, 768, 390, and 320px; no horizontal overflow')
        assert not re.search(r'pricing|investment|\$\s*\d|\bfees?\b', await page.locator('.gb-marketing-home').text_content(), re.I)
        assert await page.locator('[href="#pricing"], #pricing, [itemprop="price"]').count() == 0
        assert not re.search(r'"price"\s*:', ''.join(await page.locator('script[type="application/ld+json"]').all_text_contents()))
        results['checks'].append('Pricing omitted from all homepage content, links, and offer metadata')

        # Mobile disclosure supports keyboard, Escape/focus restoration, and destination focus.
        menu = page.locator('.studio-menu-toggle')
        await menu.focus()
        await page.keyboard.press('Enter')
        await expect(menu).to_have_attribute('aria-expanded', 'true')
        await page.keyboard.press('Escape')
        await expect(menu).to_be_focused()
        await expect(menu).to_have_attribute('aria-expanded', 'false')
        await menu.click()
        await page.get_by_role('navigation', name='Main navigation').get_by_role('link', name='Systems', exact=True).click()
        await expect(menu).to_have_attribute('aria-expanded', 'false')
        await expect(page.locator('#systems')).to_be_focused()
        await page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
        await menu.click()
        await page.set_viewport_size({'width': 1440, 'height': 1000})
        await page.set_viewport_size({'width': 390, 'height': 844})
        await expect(menu).to_have_attribute('aria-expanded', 'false')
        results['checks'].append('Mobile menu: keyboard, Escape, restored focus, anchors, responsive reset')

        manual = page.get_by_role('radio', name='Manual', exact=True)
        automated = page.get_by_role('radio', name='With automation', exact=True)
        await manual.check()
        await expect(page.get_by_text('Reconstruct the context', exact=True)).to_be_visible()
        await manual.focus()
        await page.keyboard.press('ArrowRight')
        await expect(automated).to_be_checked()
        await expect(page.get_by_text('Review and move forward', exact=True)).to_be_visible()
        await page.locator('.studio-faq summary').first.focus()
        await page.keyboard.press('Enter')
        await expect(page.locator('.studio-faq details').first).to_have_attribute('open', '')
        await page.keyboard.press('Enter')
        await expect(page.locator('.studio-faq details').first).not_to_have_attribute('open', '')
        results['checks'].append('Workflow radio keyboard selection and native FAQ disclosure')

        for link in await page.locator('a[href*="calendar.app.google"]').all():
            assert await link.get_attribute('href') == 'https://calendar.app.google/X4SN26PYLgvVYPRp8'
            assert await link.get_attribute('target') == '_blank'
        await expect(page.locator('elevenlabs-convai')).to_be_hidden()
        for href, kind in [('/prds/pr-500-session-exit-summary.html', 'text/html'), ('/theme/', 'text/html'), ('/portfolio/samples/logo-motion/clip.mp4', 'video/mp4')]:
            response = await context.request.get(args.url + href)
            assert response.ok and kind in response.headers.get('content-type', ''), href
        results['checks'].append('Existing discovery URL and three real public artifacts resolve; widget does not obstruct homepage')

        form = page.get_by_role('form', name='Send a project brief')
        send = form.get_by_role('button', name='Send project brief', exact=True)
        await send.click()
        await expect(page.locator('#brief-name')).to_be_focused()
        await expect(page.locator('#brief-name')).to_have_attribute('aria-invalid', 'true')
        assert await page.locator('.brief-field-error').count() == 3
        await page.get_by_label('Your name').fill('Website QA')
        await page.get_by_label('Email address').fill('website-qa@example.invalid')
        await page.get_by_label('What would you like to improve?').fill('Synthetic local acceptance check. Do not deliver.')
        gate = asyncio.Event()
        request_received = asyncio.Event()
        mock = {'status': 500, 'body': '{"message":"local simulated failure"}'}
        payloads = []

        async def submission(route):
            if route.request.method == 'OPTIONS':
                await route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST'})
                return
            assert route.request.method == 'POST'
            results['writes_intercepted'] += 1
            payloads.append(route.request.post_data_json)
            request_received.set()
            await gate.wait()
            await route.fulfill(status=mock['status'], body=mock['body'], headers={'content-type': 'application/json', 'access-control-allow-origin': '*'})
        await context.route('**/rest/v1/contact_submissions', submission)
        await send.click()
        await asyncio.wait_for(request_received.wait(), 10)
        await expect(form.get_by_role('button', name='Sending your brief…')).to_be_disabled()
        await expect(page.locator('.brief-success')).to_have_count(0)
        assert len(payloads) == 1
        gate.set()
        await expect(page.locator('.brief-error')).to_be_visible()
        await expect(page.get_by_label('Your name')).to_have_value('Website QA')
        assert set(payloads[0]) == {'name', 'email', 'company', 'phone', 'project_description'}
        assert payloads[0]['company'] is None and payloads[0]['phone'] is None
        results['checks'].append('Required field focus/errors; exact existing request contract; pending lock; failed request preserves details')

        mock.update(status=204, body='')
        await form.get_by_role('button', name='Try sending again').click()
        await expect(page.locator('.brief-success')).to_be_visible()
        await expect(page.get_by_label('Your name')).to_have_value('')
        assert len(payloads) == 2
        results['checks'].append('Retry succeeds on mocked HTTP 204 and clears fields only after success')

        # PostgREST return=minimal can also return HTTP 201 without a JSON body.
        await page.get_by_label('Your name').fill('Website QA')
        await page.get_by_label('Email address').fill('website-qa@example.invalid')
        await page.get_by_label('What would you like to improve?').fill('Synthetic empty-response success check.')
        mock.update(status=201, body='')
        await form.get_by_role('button', name='Send project brief', exact=True).click()
        await expect(page.locator('.brief-success')).to_be_visible()
        results['checks'].append('HTTP 201 return=minimal success does not become a false failure')

        if args.phase == 'final':
            await page.set_viewport_size({'width': 1440, 'height': 1000})
            await page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
            art = page.locator('.system-artwork')
            await expect(art).to_have_attribute('data-motion', 'playing')
            await page.get_by_role('button', name='Pause artwork motion').click()
            await expect(art).to_have_attribute('data-motion', 'paused')
            await page.get_by_role('button', name='Play artwork motion').click()
            await expect(art).to_have_attribute('data-motion', 'playing')
            await page.locator('#contact').scroll_into_view_if_needed()
            await expect(art).to_have_attribute('data-motion', 'paused')
            await page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
            await expect(art).to_have_attribute('data-motion', 'playing')
            await page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
            await expect(art).to_have_attribute('data-motion', 'paused')
            await page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
            await expect(art).to_have_attribute('data-motion', 'playing')
            await page.emulate_media(reduced_motion='reduce')
            await expect(art).to_have_attribute('data-motion', 'paused')
            assert await page.locator('.sculpture-contours').evaluate('(e)=>getComputedStyle(e).animationName') == 'none'
            await expect(page.locator('h1')).to_be_visible()
            await page.screenshot(path=str(out / 'final-reduced-motion.png'))
            results['checks'].append('Motion pause control, offscreen suspension, hidden-tab event, and reduced-motion static parity')

        # Production preview is necessary: DEV intentionally bypasses auth in the existing repo.
        for path in ['/login', '/clients/gbautomation', '/clients/smoke-client', '/clients/jid5274', '/ops', '/apps', '/artifacts']:
            await page.goto(args.url + path, wait_until='load')
            await expect(page.get_by_role('heading', name='Sign in to continue.')).to_be_visible()
            if path != '/login':
                assert parse_qs(urlparse(page.url).query).get('next') == [path]
            assert await page.locator('.gb-marketing-home').count() == 0
        await page.screenshot(path=str(out / 'final-login.png'))
        results['checks'].append('Production login and six protected route redirects retain next destination; homepage styles stay scoped')
        assert not results['errors'], results['errors']
        await browser.close()


@trace_agent('website-redesign-browser-acceptance', harness='codex', client='gbautomation')
def main():
    try:
        asyncio.run(validate())
        results['passed'] = True
    except Exception as exc:
        results['passed'] = False
        results['failure'] = str(exc)
        raise
    finally:
        (out / f'{args.phase}-acceptance.json').write_text(json.dumps(results, indent=2))
        print(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()
