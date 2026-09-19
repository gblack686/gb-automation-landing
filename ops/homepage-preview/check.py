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
parser.add_argument('--browser-channel', default='chrome', help='Installed browser with H.264/AAC support')
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
        browser = p.chromium.launch(channel=args.browser_channel)
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
        video = page.locator('.hero-intro-video video')
        check('Introduction replaces placeholder with local player', video.count() == 1 and page.locator('#home-hero-copy iframe').count() == 0 and 'Intro video coming soon' not in page.locator('.hero-intro-video').inner_text())
        check('Video waits for user playback with sound', video.evaluate('(v)=>!v.autoplay && !v.loop && !v.muted && v.paused && v.preload==="none" && v.playsInline'))
        check('No video download before play', not any('/media/greg-intro-v2.mp4' in url for url in requests))
        check('Video poster loads', video.evaluate('async (v)=>{const img=new Image();img.src=v.poster;await img.decode();return img.naturalWidth===540 && img.naturalHeight===960}'))
        order = page.locator('.particle-home-content > *').evaluate_all('(xs)=>xs.map(e=>e.id || (e.classList.contains("home-hero")?"hero":e.tagName.toLowerCase()))')
        check('Ten sections with gallery beneath Zero Touch', order == ['hero', 'agent-forge', 'portfolio', 'section', 'features', 'zero-touch', 'gallery', 'process', 'contact', 'footer'])
        check('Nine analogy cards rendered', page.locator('#zero-touch article').count() == 9)
        check('No stale vibe or ElevenLabs copy', not re.search(r'vibe|elevenlabs|ai engineer', page.locator('body').inner_text(), re.I))
        check('Reduced motion uses poster without canvas', page.locator('.particle-canvas canvas').count() == 0)
        check('Reduced motion disables smooth scrolling', page.evaluate('getComputedStyle(document.documentElement).scrollBehavior') == 'auto')
        page.screenshot(path=str(OUT / 'desktop-hero.png'))
        page.locator('.hero-intro-video').screenshot(path=str(OUT / 'intro-poster.png'))
        play_button = page.get_by_role('button', name="Play Greg's introduction, 1 minute 47 seconds", exact=True)
        play_button.focus()
        page.keyboard.press('Space')
        page.wait_for_function('document.querySelector(".hero-intro-video video").currentTime > 0.3')
        check('Keyboard play starts the complete portrait video', video.evaluate('(v)=>!v.paused && v.controls && v.videoWidth===720 && v.videoHeight===1280 && Math.abs(v.duration-107.12)<0.2'))
        check('Play overlay clears for native player controls', play_button.count() == 0)
        video.evaluate('(v)=>v.pause()')
        check('Native pause works', video.evaluate('(v)=>v.paused'))
        video.evaluate('(v)=>v.currentTime=100')
        page.wait_for_function('(()=>{const v=document.querySelector(".hero-intro-video video");return !v.seeking && v.readyState>=2 && v.currentTime>=99})()')
        check('Video seeks near the end without errors', video.evaluate('(v)=>v.error===null && v.currentTime>=99'))
        page.locator('.hero-intro-video').screenshot(path=str(OUT / 'intro-playing.png'))
        page.locator('#agent-forge').scroll_into_view_if_needed()
        page.locator('#agent-forge img').evaluate('(img)=>img.decode()')
        check('Selected preview decoded at full source size', page.locator('#agent-forge img').evaluate('(img)=>img.naturalWidth===2160 && img.naturalHeight===1410'))
        page.locator('#agent-forge').screenshot(path=str(OUT / 'forge-showcase.png'))
        page.locator('#zero-touch').scroll_into_view_if_needed()
        page.locator('#zero-touch').screenshot(path=str(OUT / 'zero-touch.png'))
        page.locator('#gallery').scroll_into_view_if_needed()
        check('Grid starts with six varied examples and no WebGL', page.locator('.gallery-card').count() == 6 and page.locator('#gallery canvas').count() == 0 and len(set(page.locator('.gallery-card .gallery-category').all_text_contents())) == 6)
        check('Globe code is loaded only on request', not any('/GalleryGlobe-' in url or '/artifactGlobe-' in url for url in requests))
        page.get_by_role('button', name='Show all 12 examples', exact=True).click()
        for img in page.locator('.gallery-card img').all():
            img.scroll_into_view_if_needed()
            img.evaluate('(img)=>img.decode()')
        check('All 12 local previews load', page.locator('.gallery-card img').evaluate_all('(xs)=>xs.length===12 && xs.every(e=>e.naturalWidth===1200 && e.naturalHeight===800)'))
        page.locator('#gallery').screenshot(path=str(OUT / 'gallery-expanded.png'))
        for category in ['Websites', 'Dashboards', 'Workspaces', 'Product UI', 'Visual stories', 'Creative tools']:
            page.get_by_role('button', name=category, exact=True).click()
            check('Gallery filter: ' + category, set(page.locator('.gallery-card .gallery-category').all_text_contents()) == {category})
        page.get_by_role('button', name='All', exact=True).click()
        check('All resets to six examples', page.locator('.gallery-card').count() == 6)
        page.locator('#gallery').screenshot(path=str(OUT / 'gallery-grid.png'))
        first_card = page.locator('.gallery-card').first
        first_card.focus()
        page.keyboard.press('Tab')
        page.keyboard.press('Shift+Tab')
        check('Gallery cards have visible keyboard focus', first_card.evaluate('(e)=>getComputedStyle(e).outlineStyle') != 'none')
        with page.expect_popup() as popup_info:
            first_card.press('Enter')
        popup = popup_info.value
        popup.wait_for_load_state('domcontentloaded')
        check('Example opens public source in a separate tab', popup.evaluate('location.href') == 'https://expert-atlas--gbautoxyz.netlify.app/style-guide/library/axisform-studio-landing.html')
        popup.close()
        page.get_by_role('button', name='Globe', exact=True).click()
        page.get_by_role('button', name='Rotate globe right').wait_for()
        page.wait_for_function('document.querySelector(".gallery-globe-controls button")?.disabled === false')
        page.wait_for_timeout(800)
        check('Globe renders one canvas on demand', page.locator('#gallery canvas').count() == 1)
        page.get_by_role('button', name='Next example', exact=True).click()
        check('Next example updates selection and source link', page.get_by_label('Choose an example').input_value() == '1' and 'nexora-analytics.html' in page.locator('.gallery-globe-detail a').get_attribute('href'))
        page.get_by_label('Choose an example').select_option('3')
        check('Accessible selector updates preview', page.locator('.gallery-globe-detail h3').inner_text() == 'Product Collection')
        page.get_by_role('button', name='Previous example', exact=True).click()
        check('Previous example updates preview', page.locator('.gallery-globe-detail h3').inner_text() == 'AI Workflow Studio')
        page.get_by_role('button', name='Rotate globe right').click()
        canvas = page.locator('#gallery canvas')
        rotated = canvas.screenshot()
        page.get_by_role('button', name='Reset globe view').click()
        check('Rotate and reset change the globe view', canvas.screenshot() != rotated)
        settled = canvas.screenshot()
        page.wait_for_timeout(250)
        check('Globe stays still without interaction', canvas.screenshot() == settled)
        page.locator('#gallery').screenshot(path=str(OUT / 'gallery-globe.png'))
        for width in [390, 320]:
            page.set_viewport_size({'width': width, 'height': 844})
            check(f'{width}px globe no overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.get_by_role('button', name='Product UI', exact=True).click()
        page.wait_for_function('document.querySelector(".gallery-globe-controls button")?.disabled === false')
        check('Globe filters reset to matching examples', page.get_by_label('Choose an example').locator('option').count() == 2 and page.locator('.gallery-globe-detail .gallery-category').text_content() == 'Product UI')
        page.get_by_role('button', name='Grid', exact=True).click()
        check('Grid switch removes the WebGL canvas', page.locator('#gallery canvas').count() == 0 and page.locator('.gallery-card').count() == 2)
        page.get_by_role('button', name='All', exact=True).click()
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
            for selector in ['#home-hero-copy', '#agent-forge', '#features', '#zero-touch', '#gallery', '#process', '#contact']:
                page.locator(selector).scroll_into_view_if_needed()
                check(f'{width}px no overflow at {selector}', page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'))
            page.evaluate('scrollTo({top:0,behavior:"instant"})')
            header = page.locator('#home-header').bounding_box()
            badge = page.locator('#home-status').bounding_box()
            check(f'{width}px header does not cover hero', badge['y'] >= header['height'] + 24)
            page.screenshot(path=str(OUT / f'mobile-{width}-hero.png'))
            intro = page.locator('.hero-intro-video')
            check(f'{width}px portrait video keeps its aspect ratio', intro.locator('video').evaluate('(v)=>{const r=v.getBoundingClientRect();return Math.abs(r.width/r.height-9/16)<.01}'))
            intro.screenshot(path=str(OUT / f'mobile-{width}-intro.png'))
            page.get_by_role('button', name="Play Greg's introduction, 1 minute 47 seconds", exact=True).click()
            page.wait_for_function('document.querySelector(".hero-intro-video video").currentTime > 0.3')
            check(f'{width}px video plays inline with controls', intro.locator('video').evaluate('(v)=>!v.paused && v.playsInline && v.controls && !v.error'))
            intro.locator('video').evaluate('(v)=>v.pause()')
            page.locator('#agent-forge').scroll_into_view_if_needed()
            page.locator('#agent-forge img').evaluate('(img)=>img.decode()')
            page.locator('#agent-forge').screenshot(path=str(OUT / f'mobile-{width}-forge.png'))
            page.locator('#gallery').screenshot(path=str(OUT / f'mobile-{width}-gallery.png'))

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
            steps = page.locator('.forge-steps li')
            check('Six Forge steps beneath introduction and CTA', steps.count() == 6 and page.locator('.forge-steps').evaluate('(e)=>e.previousElementSibling.classList.contains("hero")'))
            check('Step five schedules a review meeting', 'Schedule time with Greg' in steps.nth(4).inner_text())
            check('Step six describes launch after setup and approval', 'Deploy with one click' in steps.nth(5).inner_text() and 'Once setup, testing, and approval are complete' in steps.nth(5).inner_text())
            check('Future workflow remains clearly labeled', page.locator('#forge-steps-heading').inner_text() == 'How it will work')
            check('Expert template folder tree retained', 'expert-agent/' in page.locator('.template-tree').inner_text())
            check('No hosted API calls', not any('/api/forge-intake' in url for url in requests))
            page.get_by_role('link', name='Talk about your AI team').click()
            page.locator('#contact').wait_for()
            check('Preview inquiry link reaches contact', page.url.endswith('/#contact'))
            for width in [1440, 390, 320]:
                page.set_viewport_size({'width': width, 'height': 1000})
                page.goto(URL + 'forge/', wait_until='networkidle')
                check(f'{width}px Forge no overflow', page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                page.locator('#forge-windows').screenshot(path=str(OUT / f'forge-windows-{width}.png'))
                page.locator('.forge-steps').screenshot(path=str(OUT / f'forge-steps-{width}.png'))
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
        fallback = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        fallback.route('**/*', guard)
        fallback.add_init_script('''const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function(type, ...args) {
            return /webgl/i.test(type) ? null : original.call(this, type, ...args);
          };''')
        fp = fallback.new_page()
        fp.goto(URL, wait_until='networkidle')
        fp.get_by_role('button', name='Globe', exact=True).click()
        fp.get_by_text('Globe view is unavailable in this browser. Explore the examples in the grid.', exact=True).wait_for()
        check('Unavailable WebGL returns to working grid', fp.locator('.gallery-card').count() == 6 and fp.get_by_role('button', name='Grid', exact=True).get_attribute('aria-pressed') == 'true')
        fallback.close()
        check('No browser runtime errors', not errors)
        browser.close()
    check('Source unchanged by validation', all(hashlib.sha256((ROOT / f).read_bytes()).hexdigest() == h for f, h in before.items()))
    result = {'checked_at': datetime.now(timezone.utc).isoformat(), 'url': URL, 'browser_channel': args.browser_channel, 'static_preview': args.static_preview, 'checks': checks, 'pass': True, 'browser_errors': errors, 'real_inquiries_sent': 0, 'model_calls': 0, 'email_sends': 0}
    (OUT / 'validation.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'passed': len(checks), 'url': URL, 'browser_errors': errors}))


if __name__ == '__main__':
    main()
