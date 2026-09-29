"""Browser proof against a disposable local builder. Never uses real voice or email."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright


def run(url: str, output: Path):
    output.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, permissions=['microphone'])
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        def api(route):
            body = route.request.post_data_json
            if body.get('action') == 'voice':
                route.fulfill(json={'ok': True, 'result': {'signed_url': 'wss://api.elevenlabs.io/fixture', 'prompt': 'Synthetic browser voice contract', 'max_seconds': 900}})
                return
            route.continue_()

        page.route('**/api/forge/builder', api)
        page.route('**/forge-voice-client.js', lambda route: route.fulfill(content_type='text/javascript', body='''
export const Conversation={startSession:async options=>{
 window.voiceFixture=options;
 return {endSession:async()=>{window.voiceStopped=true;options.onDisconnect();}};
}};
'''))
        page.goto(url + '/?window=tasks&view=full', wait_until='domcontentloaded')
        page.wait_for_selector('#builder-answer', timeout=60000)
        print('builder-smoke: intake loaded', flush=True)
        page.get_by_role('link', name='Book a call with Greg').wait_for()
        assert page.get_by_role('link', name='Book a call with Greg').get_attribute('href') == 'https://calendar.app.google/X4SN26PYLgvVYPRp8'
        page.locator('[data-builder="voice-mode"]').click()
        page.locator('[data-builder-consent]').check()
        # Only the mocked provider button is enabled; all other HTTP uses the
        # real browser transport, cookie and origin checks without interception.
        page.locator('[data-builder="voice-start"]').evaluate('(button)=>button.disabled=false')
        page.locator('[data-builder="voice-start"]').click()
        page.wait_for_function('!!window.voiceFixture', timeout=60000)
        response = page.evaluate('''async()=>{
 const utterance='Use approved Drive media to produce an artist packet. Check credits and responsive layout.';
 window.voiceFixture.onMessage({source:'user',message:utterance});
 return window.voiceFixture.clientTools.capture_intake({answers:[
 {field:'data_access',value:'Artist-approved Drive media',status:'captured',evidence:'approved Drive media'},
 {field:'output',value:'A branded artist packet',status:'captured',evidence:'an artist packet'},
 {field:'success',value:'Credits complete and responsive layout verified',status:'captured',evidence:'Check credits and responsive layout'}]});
}''')
        assert json.loads(response)['covered'] == 5
        print('builder-smoke: shared voice answers captured', flush=True)
        rejected = page.evaluate('''()=>window.voiceFixture.clientTools.capture_intake({answers:[{field:'success',value:'Invented revenue claim',status:'captured',evidence:'absent from transcript'}]})''')
        assert rejected.startswith('No changes')
        page.locator('[data-builder="written"]').click()
        page.wait_for_function('window.voiceStopped===true')
        page.reload(wait_until='domcontentloaded')
        page.wait_for_selector('#builder-answer')
        assert '5 of 5 areas covered' in page.locator('.expert-builder').inner_text()
        page.locator('[data-builder-field="success"]').click()
        page.locator('[data-builder="skip"]').click()
        page.wait_for_function("document.querySelector('[data-builder-field=success] small')?.textContent==='Skipped' && document.querySelector('[data-builder=propose]')?.disabled===true")
        assert page.locator('[data-builder="propose"]').is_disabled()
        page.locator('#builder-status').select_option('captured')
        page.locator('[data-builder="save"]').click()
        page.wait_for_function("!document.querySelector('[data-builder=propose]')?.disabled")
        page.screenshot(path=str(output / 'desktop-intake.png'), full_page=True)
        page.locator('[data-builder-reviewed]').check()
        page.locator('[data-builder="propose"]').click()
        page.locator('[data-builder="accept"]').wait_for(timeout=60000)
        assert page.locator('[data-builder="generate"]').is_disabled()
        page.locator('[data-builder="accept"]').click()
        page.locator('[data-builder-gate-confirm]').wait_for(timeout=60000)
        page.locator('[data-builder-gate-confirm]').check()
        page.locator('[data-builder="approve"]').click()
        page.wait_for_function("document.querySelector('.builder-review')?.textContent.includes('TAC plan review')", timeout=120000)
        page.locator('[data-builder-gate-confirm]').check()
        page.locator('[data-builder="approve"]').click()
        page.wait_for_function("document.querySelector('[data-builder=generate]')?.disabled===false", timeout=60000)
        print('builder-smoke: three gates approved locally', flush=True)
        page.locator('[data-builder="generate"]').click()
        page.wait_for_function("[...document.querySelectorAll('.builder-package a')].some(a=>a.textContent==='Open generated Studio') || document.querySelector('.builder-message')?.textContent.includes('did not finish')", timeout=120000)
        assert 'did not finish' not in page.locator('.builder-message').inner_text(), page.locator('.builder-message').inner_text()
        link = page.get_by_role('link', name='Open generated Studio')
        link.wait_for(timeout=120000)
        packet_url = link.get_attribute('href')
        print('builder-smoke: package generated', flush=True)
        page.screenshot(path=str(output / 'desktop-package.png'), full_page=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(output / 'mobile.png'), full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.goto(url + packet_url + '?window=tasks&view=full', wait_until='domcontentloaded')
        page.get_by_text('Configuration & scaffold ready for review', exact=True).wait_for(timeout=30000)
        assert page.locator('forge-turntable').count() == 1
        page.wait_for_function("document.querySelector('forge-turntable')?.shadowRoot?.querySelector('[role=status]')?.textContent.includes('Drag to rotate')", timeout=60000)
        page.screenshot(path=str(output / 'generated-studio.png'), full_page=True)
        manifest = context.request.get(url + packet_url.replace('index.html', 'packet-manifest.json')).json()
        assert manifest['provider_calls'] == 0
        assert not manifest['runtime_authorized']
        assert manifest['visual']['card']['sha256']
        assert not errors, errors
        (output / 'browser-receipt.json').write_text(json.dumps({'status': 'pass', 'tests': [
            'one utterance fills three areas', 'unsupported voice fact rejected', 'voice to writing preserves draft',
            'reload resumes same draft', 'skip is not coverage', 'three explicit gates', 'real generated packet',
            'turntable loads', '390px no overflow', 'persistent free booking', 'zero page errors'],
            'voice_provider': 'mocked SDK transport; no live provider call', 'packet_id': manifest['packet_id'],
            'files': len(manifest['files']), 'errors': errors}, indent=2) + '\n')
        browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    run(args.url.rstrip('/'), args.output)
