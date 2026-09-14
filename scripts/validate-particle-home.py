"""Browser acceptance for the approved homepage. Contact requests are always mocked.

Requires Python Playwright and Chrome. Run against `npm run preview` or the live
site: python scripts/validate-particle-home.py http://127.0.0.1:4192
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:4192'
OUT = Path('artifacts/particle-background')
OUT.mkdir(parents=True, exist_ok=True)

DRAW_COUNTER = """
window.particleDraws = 0;
for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
  if (!type) continue;
  const draw = type.prototype.drawArrays;
  type.prototype.drawArrays = function(...args) {
    if (this.canvas.closest('.particle-canvas')) window.particleDraws++;
    return draw.apply(this, args);
  };
}
"""


def no_controls(page):
    assert page.locator('#preview-toolbar, #cine-variants, input[type=range], .particle-pause').count() == 0
    assert page.locator('.particle-background button, .particle-background input').count() == 0


def scroll_to(page, selector):
    page.locator(selector).evaluate('(el)=>window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+scrollY-90),behavior:"instant"})')
    page.wait_for_timeout(800)


def snapshot(page, name):
    page.screenshot(path=str(OUT / f'{name}.png'))


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True, args=[
        '--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    context.add_init_script(DRAW_COUNTER)
    page = context.new_page()
    errors = []
    failures = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.on('response', lambda response: failures.append({'url': response.url, 'status': response.status})
            if response.url.startswith(BASE) and response.status >= 400 else None)
    # This test never creates a real lead, even when BASE is production.
    submissions = []

    def contact(route):
        submissions.append(route.request.post_data_json)
        route.fulfill(status=204, body='')

    page.route('**/rest/v1/contact_submissions*', contact)
    page.goto(BASE, wait_until='networkidle')
    page.wait_for_selector('.particle-background[data-ready="true"]', timeout=45000)
    assert 'Build Smarter with' in page.locator('h1').inner_text()
    no_controls(page)
    assert page.locator('.particle-canvas canvas').count() == 1
    snapshot(page, 'desktop-home')
    draws_before = page.evaluate('window.particleDraws')
    scroll_to(page, '#process')
    page.wait_for_timeout(1000)
    assert page.evaluate('window.particleDraws') > draws_before
    bounds = page.locator('.particle-background').bounding_box()
    assert bounds['y'] == 0 and bounds['height'] == 1000, bounds
    snapshot(page, 'desktop-process')
    scroll_to(page, '#features')
    snapshot(page, 'desktop-features')

    # Existing portfolio behavior remains live, including the dark dialog styling.
    scroll_to(page, '#portfolio')
    page.locator('#portfolio .glass-panel').first.click()
    page.wait_for_selector('[role=dialog]')
    page.wait_for_timeout(800)
    assert page.locator('[role=dialog]').bounding_box()['height'] > 100
    snapshot(page, 'desktop-portfolio-dialog')
    page.keyboard.press('Escape')
    page.wait_for_selector('[role=dialog]', state='detached')

    scroll_to(page, '#home-hero-copy')
    page.locator('#home-discovery').click()
    page.wait_for_timeout(1000)
    assert abs(page.locator('#contact').bounding_box()['y']) < 120
    page.get_by_placeholder('Your full name').fill('Particle preview test')
    page.get_by_placeholder('you@company.com').fill('preview@example.com')
    page.get_by_placeholder('Tell us about your project, goals, and challenges...').fill('Browser validation; request intercepted.')
    page.locator('#contact button[type=submit]').click()
    page.get_by_text('Your message has been received.').wait_for()
    assert len(submissions) == 1
    page.wait_for_timeout(700)
    snapshot(page, 'desktop-contact-success')

    # An OS preference change freezes rendering without introducing a viewer UI.
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(300)
    frozen = page.evaluate('window.particleDraws')
    page.wait_for_timeout(700)
    assert page.evaluate('window.particleDraws') == frozen
    page.emulate_media(reduced_motion='no-preference')
    page.wait_for_timeout(500)
    assert page.evaluate('window.particleDraws') > frozen

    for width in (390, 320):
        page.set_viewport_size({'width': width, 'height': 844})
        scroll_to(page, '#features')
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        bounds = page.locator('.particle-background').bounding_box()
        assert bounds['y'] == 0 and bounds['height'] == 844
        no_controls(page)
        snapshot(page, f'mobile-{width}-features')

    # Context loss restores the poster, keeping the page usable.
    page.locator('.particle-canvas canvas').evaluate("el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true}))")
    page.wait_for_selector('.particle-background[data-ready="false"]')
    assert page.locator('.particle-poster').is_visible()

    # Client-side route change removes the canvas and does not theme other routes.
    page.evaluate("history.pushState({}, '', '/login');dispatchEvent(new PopStateEvent('popstate'))")
    page.wait_for_selector('.particle-home', state='detached')
    assert page.locator('.particle-canvas').count() == 0

    reduced = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    still = reduced.new_page()
    requests = []
    still.on('request', lambda request: requests.append(request.url))
    still.goto(BASE, wait_until='networkidle')
    still.wait_for_function("document.querySelector('.particle-poster')?.naturalWidth > 0")
    assert still.locator('.particle-canvas canvas').count() == 0
    assert not any('/gbParticleScene-' in url for url in requests)
    no_controls(still)
    snapshot(still, 'reduced-motion')
    scroll_to(still, '#portfolio')
    still.locator('#portfolio .glass-panel').first.click()
    still.wait_for_selector('[role=dialog]')
    assert still.locator('[role=dialog] .animate-slideUp').first.evaluate('el=>getComputedStyle(el).opacity') == '1'

    result = {'base': BASE, 'errors': errors, 'same_origin_http_failures': failures,
              'fixed_background': True, 'continuous_after_scroll': True,
              'viewer_controls': False, 'mobile_widths': [390, 320],
              'reduced_motion_no_webgl_download': True, 'context_loss_fallback': True,
              'portfolio_dialog': True, 'mocked_contact_success': True, 'other_routes_isolated': True}
    (OUT / 'validation.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))
    assert not errors, errors
    assert not failures, failures
    browser.close()
