"""Local browser proof for the shared Forge planning template. No provider calls."""
from __future__ import annotations

import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import sys
import threading

from playwright.sync_api import sync_playwright, expect


def smoke(html: Path, output: Path) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(SimpleHTTPRequestHandler, directory=str(html.resolve().parent)))
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    checks, errors, remote = [], [], []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get('FORGE_CHROMIUM_EXECUTABLE') or None)
            context = browser.new_context(viewport={'width': 1500, 'height': 1100}, accept_downloads=True)
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            def guard(route):
                if route.request.url.startswith(f'http://127.0.0.1:{server.server_port}/'):
                    route.continue_()
                else:
                    remote.append(route.request.url)
                    route.abort()
            page.route('**/*', guard)
            url = f'http://127.0.0.1:{server.server_port}/{html.name}?window=tasks&view=full'
            page.goto(url, wait_until='domcontentloaded')
            expect(page.locator('.plan-nav button')).to_have_count(7)
            expect(page.locator('[data-plan-action="approve"]')).to_be_disabled()
            expect(page.locator('.plan-content h3')).to_have_text('Outcome')
            request = page.evaluate("JSON.parse(document.getElementById('private-studio-data').textContent).planning_request")
            assert request['agent_id'] == 'artist-packet-expert'
            assert request['runtime_authorized'] is False and request['status'] == 'scope_pending'
            page.screenshot(path=str(output / 'desktop-outcome.png'), full_page=True)
            for index, title in enumerate(['Outcome', 'Setup', 'Build notes', 'Steps', 'Outputs', 'Completion checklist', 'Quality review']):
                expect(page.locator('.plan-content h3')).to_have_text(title)
                if index in (5, 6):
                    assert all(t == ('Not run' if index == 5 else 'Not assessed') for t in page.locator('.plan-content .plan-tag').all_text_contents())
                page.locator('[data-plan-action="review"]').click()
            expect(page.locator('[data-plan-action="approve"]')).to_be_enabled()
            page.locator('#plan-review-note').fill('Keep source detail. <script>window.injected=true</script>')
            page.locator('[data-plan-action="approve"]').click()
            expect(page.locator('[data-plan-status]')).to_contain_text('Template approved locally')
            page.reload(wait_until='domcontentloaded')
            expect(page.locator('[data-plan-status]')).to_contain_text('Template approved locally')
            expect(page.locator('#plan-review-note')).to_have_value('Keep source detail. <script>window.injected=true</script>')
            assert page.evaluate('window.injected === undefined')
            checks.append('Seven sections, review gating, escaped notes and exact-version local approval survive reload')
            page.locator('#plan-review-note').fill('Revise the deliverable details.')
            expect(page.locator('[data-plan-status]')).not_to_contain_text('Template approved locally')
            page.locator('[data-plan-action="changes"]').click()
            with page.expect_download() as event:
                page.locator('[data-plan-action="export"]').click()
            event.value.save_as(output / 'review.json')
            review = json.loads((output / 'review.json').read_text())
            assert review['status'] == 'changes_requested' and review['note'] == 'Revise the deliverable details.'
            assert review['template_sha256'] == request['template']['sha256']
            assert review['authority'] == 'local_design_feedback'
            assert not any(review[k] for k in ['scope_approved', 'implementation_approved', 'runtime_authorized'])
            with page.expect_download() as event:
                page.locator('[data-plan-action="handoff"]').click()
            event.value.save_as(output / 'handoff.md')
            handoff = (output / 'handoff.md').read_text(encoding='utf-8')
            assert json.loads(handoff.split('```json\n')[1].split('\n```')[0]) == request
            checks.append('Editing invalidates local approval; exports retain notes, seven sections, canonical TAC route and no workflow authority')
            for changed in ['agent_id', 'tenant_id', 'config_sha256', 'template']:
                result = page.evaluate("""field => {
                    const r=JSON.parse(document.getElementById('private-studio-data').textContent).planning_request;
                    if(field==='template')r.template.sha256='f'.repeat(64);else r[field]+='changed';
                    return ForgePlanTemplate.create(r).review();
                }""", changed)
                assert result['status'] == 'draft' and not result['reviewed_sections'] and not result['note']
            checks.append('Another expert, tenant, configuration or template never inherits this review')
            page.locator('[data-plan-section="4"]').click()
            page.locator('.plan-content details').first.locator('summary').click()
            page.screenshot(path=str(output / 'desktop-outputs.png'), full_page=True)
            page.locator('[data-expand-mode="full"]').click()
            expect(page.locator('.plan-mini-grid span')).to_have_count(7)
            page.screenshot(path=str(output / 'preview.png'), full_page=True)
            page.get_by_role('button', name='Review config blueprint', exact=True).click()
            expect(page.locator('.plan-content h3')).to_have_text('Outputs')
            page.set_viewport_size({'width': 390, 'height': 844})
            page.locator('[data-plan-section="0"]').click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            assert page.locator('.plan-template').evaluate('(e)=>e.scrollWidth <= e.clientWidth + 1')
            page.screenshot(path=str(output / 'mobile.png'), full_page=True)
            checks.append('Studio preview/full navigation and 390px mobile layout work without horizontal overflow')
            assert not errors, errors
            assert not remote, remote
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=5)
    result = {'status': 'passed', 'checks': checks, 'live_writes': 0, 'emails_sent': 0, 'remote_requests': remote}
    (output / 'checks.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    return result


def main():
    sys.path.insert(0, str(Path(__file__).resolve().parents[4]))
    from resources.lib.tracing import trace_agent
    @trace_agent('forge-planning-template-smoke', metadata={'mode': 'local_browser'})
    def run():
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument('--html', type=Path, required=True)
        parser.add_argument('--out', type=Path, required=True)
        args = parser.parse_args()
        print(json.dumps(smoke(args.html, args.out)))
    run()


if __name__ == '__main__':
    main()
