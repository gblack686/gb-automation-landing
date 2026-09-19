"""Capture the selected public style-guide examples without submitting forms."""
import argparse
import asyncio
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--monorepo', required=True, type=Path)
parser.add_argument('--only', nargs='+', help='Recapture selected examples and retain other source receipts')
args = parser.parse_args()
sys.path.insert(0, str(args.monorepo))
from resources.lib.tracing import trace_agent

ROOT = Path(__file__).resolve().parents[2]
ORIGIN = 'https://expert-atlas--gbautoxyz.netlify.app'

async def capture():
    items = json.loads((ROOT / 'src/data/showcaseGallery.json').read_text())
    if args.only:
        items = [item for item in items if item['id'] in args.only]
    output = ROOT / 'public/images/gallery'
    output.mkdir(parents=True, exist_ok=True)
    receipts = []
    if args.only and (ROOT / 'ops/artifact-gallery/sources.json').exists():
        receipts = [item for item in json.loads((ROOT / 'ops/artifact-gallery/sources.json').read_text())['items'] if item['id'] not in args.only]
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1200, 'height': 800}, reduced_motion='no-preference', device_scale_factor=1)
        async def guard(route):
            if route.request.method in ['GET', 'HEAD', 'OPTIONS']:
                await route.continue_()
            else:
                await route.abort()
        await context.route('**/*', guard)
        semaphore = asyncio.Semaphore(2)
        async def one(item):
            async with semaphore:
                page = await context.new_page()
                url = f"{ORIGIN}/style-guide/library/{item['id']}.html"
                response = await page.goto(url, wait_until='load', timeout=60000)
                assert response.status == 200, (url, response.status)
                await page.evaluate('document.fonts.ready')
                # The library's fixed navigation badge is outside the example itself.
                await page.add_style_tag(content='.gbauto-theme-badge { visibility: hidden !important; }')
                await page.wait_for_timeout(7000)
                # Reveal elements whose original demo animates them into view.
                await page.evaluate('scrollTo(0, 1)')
                await page.wait_for_timeout(350)
                await page.evaluate('scrollTo(0, 0)')
                if item['id'] == 'nexora-analytics':
                    await page.locator('#hero-dashboard').scroll_into_view_if_needed()
                    await page.wait_for_timeout(3000)
                    await page.evaluate("scrollTo(0, document.querySelector('#hero-dashboard').getBoundingClientRect().top + scrollY - 16)")
                    await page.wait_for_timeout(5000)
                    # Set the source's cinematic entrance to its documented final state.
                    # Headless WebGL can throttle GSAP enough to leave a blurred frame.
                    await page.evaluate('''() => {
                      const dashboard = document.querySelector('#hero-dashboard');
                      const ui = dashboard.querySelectorAll('aside nav a, [data-aura-edit-target="aet-179"] > div, [data-aura-edit-target="aet-191"] > div, [data-aura-edit-target="aet-272"] > div, [data-aura-edit-target="aet-245"] > div, [data-aura-edit-target="aet-277"] > div, [data-aura-edit-target="aet-283"] > div');
                      const targets = [dashboard, ...ui];
                      window.gsap?.killTweensOf(targets);
                      for (const el of targets) { el.style.opacity = '1'; el.style.filter = 'none'; el.style.transform = 'none'; }
                    }''')
                if item['id'] == 'imaginova-image-gallery':
                    await page.evaluate('scrollTo(0, 430)')
                    await page.wait_for_timeout(1000)
                destination = output / f"{item['id']}.jpg"
                await page.screenshot(path=str(destination), type='jpeg', quality=78, animations='disabled')
                receipts.append({'id': item['id'], 'source': url, 'page_title': await page.title(), 'status': response.status,
                                 'thumbnail': str(destination.relative_to(ROOT)).replace('\\', '/'),
                                 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'bytes': destination.stat().st_size})
                print(item['id'], destination.stat().st_size, flush=True)
                await page.close()
        await asyncio.gather(*(one(item) for item in items))
        await browser.close()
    receipt = {'captured_at': datetime.now(timezone.utc).isoformat(), 'source_gallery': ORIGIN + '/#view=gallery',
               'method': 'Browser screenshots of public design examples; navigation badge hidden; dashboard and image gallery scrolled to content; dashboard entrance set to final visible state', 'width': 1200, 'height': 800,
               'real_submissions': 0, 'items': sorted(receipts, key=lambda item: item['id'])}
    (ROOT / 'ops/artifact-gallery/sources.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')

@trace_agent('website.gallery_source_capture', metadata={'mode': 'public_read_only'})
def main():
    asyncio.run(capture())

if __name__ == '__main__':
    main()
