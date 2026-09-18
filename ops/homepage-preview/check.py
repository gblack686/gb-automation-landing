"""Local homepage acceptance; all contact submissions are intercepted."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--monorepo', required=True, type=Path)
parser.add_argument('--url', default='http://127.0.0.1:4321/')
parser.add_argument('--static-preview', action='store_true')
parser.add_argument('--output', type=Path)
args = parser.parse_args()
sys.path.insert(0, str(args.monorepo))
from resources.lib.tracing import trace_agent

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent
OUT = args.output or SOURCE
OUT.mkdir(parents=True, exist_ok=True)
URL = args.url.rstrip('/') + '/'


@trace_agent('forge.homepage_preview_qa', metadata={'mode': 'local_mocked_contact'})
def main():
    checks, requests, errors, mocked = [], [], [], []

    def check(name, passed):
        checks.append({'check': name, 'pass': bool(passed)})
        assert passed, name

    before = json.loads((SOURCE / 'source-hashes.json').read_text())
    source = BeautifulSoup((ROOT / 'public/zero-touch-engineering.html').read_text(encoding='utf-8'), 'html.parser')
    tiles = json.loads((ROOT / 'src/data/zeroTouchTiles.json').read_text(encoding='utf-8'))
    cards = source.select('#metaphors .mcard')
    check('All nine source tiles and normalized copy retained', len(tiles) == len(cards) == 9 and all(
        t['title'] == c.h3.get_text(strip=True) and t['description'] == c.p.get_text(' ', strip=True).replace(' \u2014 ', ' - ')
        for t, c in zip(tiles, cards)))
    for tile, card in zip(tiles, cards):
        children = [{'tag': c.name, 'attrs': dict(c.attrs)} for c in card.svg.find_all(recursive=False)]
        check('Original icon: ' + tile['title'], children == tile['icon']['children'])

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')

        def guard(route):
            req = route.request
            if 'contact_submissions' in req.url:
                mocked.append(req.post_data_json)
                return route.fulfill(status=204, headers={'Access-Control-Allow-Origin': '*'})
            if req.method not in ['GET', 'HEAD', 'OPTIONS'] and not req.url.startswith(URL + 'api/forge-intake'):
                return route.abort()
            route.continue_()

        context.route('**/*', guard)
        page = context.new_page()
        page.on('request', lambda r: requests.append(r.url))
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL, wait_until='networkidle')
        page.wait_for_timeout(400)
        check('Requested AI developer headline', ' '.join(page.locator('h1').inner_text().split()).lower() == 'build smarter with an ai developer.')
        check('Video slot directly after subtitle, before CTA', page.locator('.hero-intro-video').evaluate('(e)=>e.previousElementSibling.tagName==="P" && e.nextElementSibling.querySelector("#home-discovery")!==null'))
        check('Honest placeholder without player or iframe', 'Intro video coming soon' in page.locator('.hero-intro-video').inner_text() and page.locator('#home-hero-copy iframe, #home-hero-copy video, .hero-intro-video button').count() == 0)
        order = page.locator('.particle-home-content > *').evaluate_all('(xs)=>xs.map(e=>e.id || (e.classList.contains("home-hero")?"hero":e.tagName.toLowerCase()))')
        check('Nine sections in approved order', order == ['hero', 'agent-forge', 'portfolio', 'section', 'features', 'zero-touch', 'process', 'contact', 'footer'])
        check('Nine analogy cards rendered', page.locator('#zero-touch article').count() == 9)
        check('No stale vibe or ElevenLabs copy', not re.search(r'vibe|elevenlabs|ai engineer', page.locator('body').inner_text(), re.I))
        check('Reduced motion uses poster without canvas', page.locator('.particle-canvas canvas').count() == 0)
        check('Reduced motion disables smooth scrolling', page.evaluate('getComputedStyle(document.documentElement).scrollBehavior') == 'auto')
        page.screenshot(path=str(OUT / 'desktop-hero.png'))
        page.locator('#agent-forge').scroll_into_view_if_needed()
        page.locator('#agent-forge img').evaluate('(img)=>img.decode()')
        check('Selected preview decoded at full source size', page.locator('#agent-forge img').evaluate('(img)=>img.naturalWidth===2160 && img.naturalHeight===1410'))
        page.locator('#agent-forge').screenshot(path=str(OUT / 'forge-showcase.png'))
        page.locator('#zero-touch').scroll_into_view_if_needed()
        page.locator('#zero-touch').screenshot(path=str(OUT / 'zero-touch.png'))
        page.locator('#home-discovery').scroll_into_view_if_needed()
        page.locator('#home-discovery').click()
        check('Main CTA reaches contact', abs(page.locator('#contact').bounding_box()['y']) <= 180)
        page.get_by_role('button', name='Send an inquiry').click()
        check('Empty form validates without request', page.get_by_text('Name is required', exact=True).is_visible() and not mocked)
        page.get_by_label('Name *', exact=True).fill('Preview Test')
        page.get_by_label('Email *', exact=True).fill('preview@example.test')
        page.get_by_label('What are you looking to build? *', exact=True).fill('Local preview only. No real inquiry sent.')
        page.get_by_role('button', name='Send an inquiry').click()
        page.get_by_text('Your message has been received.', exact=True).wait_for()
        check('Contact handler preserves payload with mocked success', len(mocked) == 1 and mocked[0]['name'] == 'Preview Test' and mocked[0]['email'] == 'preview@example.test' and 'project_description' in mocked[0])
        page.locator('#portfolio .cursor-pointer').first.click()
        page.locator('[role="dialog"]').wait_for()
        page.keyboard.press('Escape')
        check('Portfolio modal opens and closes', page.locator('[role="dialog"]').count() == 0)
        page.locator('#home-header a').first.focus()
        check('Visible keyboard focus', page.locator('#home-header a').first.evaluate('(e)=>getComputedStyle(e).outlineStyle') != 'none')
        check('Homepage has no provider, widget or Loom requests', not any(re.search(r'elevenlabs|openrouter|resend|loom\.com', url, re.I) for url in requests))

        for width in [390, 320]:
            page.set_viewport_size({'width': width, 'height': 844})
            page.goto(URL, wait_until='networkidle')
            page.wait_for_timeout(200)
            for selector in ['#home-hero-copy', '#agent-forge', '#features', '#zero-touch', '#process', '#contact']:
                page.locator(selector).scroll_into_view_if_needed()
                check(f'{width}px no overflow at {selector}', page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
            page.evaluate('scrollTo({top:0,behavior:"instant"})')
            header = page.locator('#home-header').bounding_box()
            badge = page.locator('#home-status').bounding_box()
            check(f'{width}px header does not cover hero', badge['y'] >= header['height'] + 24)
            page.screenshot(path=str(OUT / f'mobile-{width}-hero.png'))
            page.locator('#agent-forge').scroll_into_view_if_needed()
            page.locator('#agent-forge img').evaluate('(img)=>img.decode()')
            page.locator('#agent-forge').screenshot(path=str(OUT / f'mobile-{width}-forge.png'))

        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.goto(URL, wait_until='networkidle')
        page.locator('#agent-forge a[href="/forge/"]').click()
        page.wait_for_url('**/forge/')
        page.wait_for_timeout(300)
        check('Forge CTA loads page', 'business' in page.locator('body').inner_text().lower() and page.locator('script[src*="app.js"]').count() == 1)
        if args.static_preview:
            check('Public preview disclosed', 'coming soon' in page.locator('#preview-banner').inner_text())
            check('No unavailable intake controls', page.locator('#start, #email-form').count() == 0 and not page.locator('#resume').is_visible())
            check('All 13 window bullets', page.locator('#forge-windows ul li').count() == 13)
            check('No hosted API calls', not any('/api/forge-intake' in url for url in requests))
            page.get_by_role('link', name='Talk about your AI team').click()
            page.locator('#contact').wait_for()
            check('Preview inquiry link reaches contact', page.url.endswith('/#contact'))
            for width in [1440, 390, 320]:
                page.set_viewport_size({'width': width, 'height': 1000})
                page.goto(URL + 'forge/', wait_until='networkidle')
                check(f'{width}px Forge no overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                page.locator('#forge-windows').screenshot(path=str(OUT / f'forge-windows-{width}.png'))
        else:
            response = page.request.post(URL + 'api/forge-intake', data={'action': 'catalog'})
            data = response.json()
            check('Forge API is simulated', response.ok and data.get('local_preview') and not data.get('live_pilot') and len(data.get('questions', [])) == 5)
        page.goto(URL + 'forge/designs/00000000-0000-4000-8000-000000000000', wait_until='networkidle')
        check('Deep design route renders Forge shell', page.locator('script[src*="app.js"]').count() == 1)
        motion = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='no-preference')
        mp = motion.new_page()
        mp.goto(URL, wait_until='networkidle')
        mp.wait_for_timeout(1800)
        check('Single homepage particle renderer', mp.locator('.particle-canvas canvas').count() == 1)
        cta = mp.locator('#home-discovery')
        colors = lambda: cta.evaluate('(e)=>[getComputedStyle(e,"::after").backgroundColor,getComputedStyle(e).color]')
        for appearance, base, hovered in [('dark', ['rgb(17, 17, 17)', 'rgb(255, 255, 255)'], ['rgb(255, 255, 255)', 'rgb(17, 17, 17)']), ('light', ['rgb(255, 255, 255)', 'rgb(17, 17, 17)'], ['rgb(17, 17, 17)', 'rgb(255, 255, 255)'])]:
            cta.evaluate('(e,mode)=>e.dataset.appearance=mode', appearance)
            mp.mouse.move(1, 900)
            mp.wait_for_timeout(500)
            check(f'{appearance} button default', colors() == base)
            cta.hover()
            mp.wait_for_timeout(500)
            check(f'{appearance} button hover', colors() == hovered)
            mp.mouse.move(1, 900)
            mp.wait_for_timeout(500)
            check(f'{appearance} button returns', colors() == base)
        cta.evaluate('(e)=>e.dataset.appearance="dark"')
        mp.wait_for_timeout(500)
        check('Light to dark appearance resets', colors() == ['rgb(17, 17, 17)', 'rgb(255, 255, 255)'])
        mp.emulate_media(reduced_motion='reduce')
        check('Button honors reduced motion', cta.evaluate('(e)=>getComputedStyle(e,"::before").animationName') == 'none')
        mp.emulate_media(reduced_motion='no-preference')
        mp.screenshot(path=str(OUT / 'desktop-motion.png'))
        motion.close()
        check('No browser runtime errors', not errors)
        browser.close()
    check('Source unchanged by validation', all(hashlib.sha256((ROOT / f).read_bytes()).hexdigest() == h for f, h in before.items()))
    result = {'checked_at': datetime.now(timezone.utc).isoformat(), 'url': URL, 'static_preview': args.static_preview, 'checks': checks, 'pass': True, 'browser_errors': errors, 'real_inquiries_sent': 0, 'model_calls': 0, 'email_sends': 0}
    (OUT / 'validation.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': len(checks), 'url': URL, 'browser_errors': errors, 'deployed': False}))


if __name__ == '__main__':
    main()
