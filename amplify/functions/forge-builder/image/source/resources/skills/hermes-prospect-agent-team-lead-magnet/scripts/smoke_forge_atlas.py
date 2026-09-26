"""Browser proof of the Forge sample-to-Supabase transition, without database writes."""
from __future__ import annotations
import argparse
import copy
import json
import os
from pathlib import Path
import threading

from playwright.sync_api import sync_playwright
from forge_atlas import capture
from serve_forge_workspace import make_server


def smoke(html: Path, output: Path) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    receipt = json.loads((html.parent / 'expert-profile-receipt.json').read_text(encoding='utf-8'))
    empty = capture(receipt['agent_id'], query=lambda _: [])
    current = {'body': empty, 'status': 200}
    server = make_server(html.parent, receipt['agent_id'], 0, reader=lambda _: empty)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    errors, checks = [], []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get('FORGE_CHROMIUM_EXECUTABLE') or None)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.route('**/api/forge/atlas', lambda route: route.fulfill(status=current['status'],
                       content_type='application/json', body=json.dumps(current['body'])))
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            page.wait_for_function('window.ForgeAtlas?.ready')
            page.wait_for_function("!document.getElementById('atlas-refresh').disabled")
            page.locator('.dock-button[data-open="atlas"]').click()
            page.locator('#window-atlas .maximize').click()
            assert page.evaluate("ForgeAtlas.mode()") == 'sample'
            assert page.locator('#atlas-rows tr').count() == 150
            assert page.evaluate('ForgeAtlas.source().data.x.length') == 150
            assert page.evaluate('new Set(ForgeAtlas.source().data.color_value).size') > 1
            assert page.evaluate('new Set(ForgeAtlas.source().data.alpha_value).size') > 1
            assert page.evaluate('ForgeAtlas.source().data.alpha_value.every(a => a > 0 && a <= 1)')
            checks.append('150 sample circles with varied colors and opacity')
            assert 'EXAMPLE DATA' in page.locator('#atlas-status').inner_text()
            assert not page.locator('#atlas-filters').evaluate('(el)=>el.open')
            assert not page.locator('#atlas-records').evaluate('(el)=>el.open')
            assert page.locator('#atlas-dataset').is_hidden()
            assert page.locator('#atlas-rows button').first.is_hidden()
            for width, height in [(1280, 800), (1920, 1080), (1440, 1000)]:
                page.set_viewport_size({'width': width, 'height': height})
                page.wait_for_timeout(400)
                plot = page.locator('#atlas-plot .bk-Figure').bounding_box()
                available = page.locator('#atlas-plot').bounding_box()
                body = page.locator('#window-atlas .window-body').bounding_box()
                records = page.locator('#atlas-records summary').bounding_box()
                assert plot and plot['width'] <= available['width'] + 1
                assert abs(plot['width'] / plot['height'] - 1.6) < .05, plot
                expected_height = min(available['height'], available['width'] / 1.6)
                assert abs(plot['height'] - expected_height) < 3, (plot, available)
                if height == 1080:
                    assert plot['width'] > 800, plot
                assert records['y'] + records['height'] <= body['y'] + body['height'], (width, height)
            checks.append('Collapsed defaults; chart fills available height at 16:10 and grows past 800px on taller screens')
            page.locator('#atlas-filters summary').click()
            page.locator('#atlas-size').select_option('tokens')
            assert page.evaluate('new Set(ForgeAtlas.source().data.marker_size).size') > 1
            page.locator('#atlas-x').select_option('cost')
            page.locator('#atlas-y').select_option('duration')
            assert page.evaluate("Bokeh.documents[0].get_model_by_name('forge-atlas-number-axis').visible")
            page.locator('#atlas-records summary').click()
            page.locator('#atlas-rows button').first.click()
            assert page.evaluate('ForgeAtlas.source().selected.indices') == [0]
            page.evaluate('ForgeAtlas.source().selected.indices = [2]')
            assert page.locator('#atlas-rows tr').nth(2).get_attribute('class') == 'is-selected'
            page.locator('#atlas-clear').click()
            assert page.evaluate('ForgeAtlas.source().selected.indices') == []
            checks.append('Sample points, axes, bubble sizes and linked selection work')

            page.locator('#atlas-x').select_option('observed_at')
            page.locator('#atlas-y').select_option('tokens')
            page.locator('#atlas-filters summary').click()
            page.locator('#atlas-records summary').click()
            for mode in ['light', 'dark']:
                page.evaluate('(mode)=>ForgeMode.apply(mode)', mode)
                page.locator('#window-atlas .window-body').evaluate('(el)=>el.scrollTop=0')
                page.wait_for_timeout(300)
                page.screenshot(path=str(output / f'atlas-{mode}.png'))
                expected = '#151719' if mode == 'dark' else '#F3F1E7'
                assert page.evaluate("Bokeh.documents[0].get_model_by_name('forge-atlas-plot').background_fill_color").lower() == expected.lower()
            checks.append('Bokeh responds to light/dark mode')

            page.locator('#layout-select').select_option('dashboard')
            page.wait_for_function("ForgePreview.states().table.open && ForgePreview.states().atlas.open")
            assert page.locator('.window:visible').count() == 2
            assert page.locator('#table-rows tr').count() == 150
            assert 'EXAMPLE DATA' in page.locator('#table-status').inner_text()
            page.locator('#table-rows button').first.click()
            assert page.evaluate('ForgeAtlas.source().selected.indices') == [0]
            page.evaluate('ForgeAtlas.source().selected.indices = [2]')
            assert page.locator('#table-rows tr').nth(2).get_attribute('class') == 'is-selected'
            assert page.locator('#atlas-rows tr').nth(2).get_attribute('class') == 'is-selected'
            page.locator('#table-clear').click()
            assert page.evaluate('ForgeAtlas.source().selected.indices') == []
            page.locator('#table-filters').click()
            assert page.locator('#atlas-filters').evaluate('(el)=>el.open')
            page.locator('#atlas-y').select_option('cost')
            assert page.locator('#table-y-heading').inner_text() == 'Cost (USD)'
            page.locator('#atlas-y').select_option('tokens')
            page.locator('#atlas-filters summary').click()
            page.reload()
            page.wait_for_function('window.ForgeAtlas?.ready')
            page.wait_for_function("!document.getElementById('atlas-refresh').disabled")
            assert page.locator('#layout-select').input_value() == 'dashboard'
            assert page.locator('.window:visible').count() == 2
            for width in [1440, 1024, 768, 390, 320]:
                page.set_viewport_size({'width':width, 'height':1000})
                page.wait_for_timeout(400)
                assert page.locator('#layout-select').is_visible()
                assert page.locator('.window:visible').count() == 2
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                if width >= 900:
                    chart_box = page.locator('#window-atlas').bounding_box()
                    table_box = page.locator('#window-table').bounding_box()
                    assert chart_box['x'] + chart_box['width'] <= table_box['x']
                    assert page.locator('#window-table .atlas-table-scroll').bounding_box()['height'] > 240
                for mode in ['light','dark']:
                    page.evaluate('(mode)=>ForgeMode.apply(mode)', mode)
                    page.wait_for_timeout(100)
                    page.screenshot(path=str(output / f'dashboard-{width}-{mode}.png'), full_page=width<900)
            page.set_viewport_size({'width':1440,'height':1000})
            page.wait_for_timeout(400)
            checks.append('Dashboard restores two linked windows, full-height table, shared filters/selection and responsive themes')

            # One genuine-shaped response removes every sample, including in empty datasets.
            real = copy.deepcopy(empty)
            real['datasets']['traces'] = [
                {'row_key':'traces-1', 'observed_at':'2026-09-21T12:00:00+00:00',
                 'tokens':321, 'cost':0.012, 'duration':8, 'events':None},
                {'row_key':'traces-2', 'observed_at':'2026-09-21T13:00:00+00:00',
                 'tokens':None, 'cost':None, 'duration':None, 'events':None}]
            current['body'] = real
            page.locator('#atlas-refresh').click()
            page.wait_for_function("ForgeAtlas.mode() === 'real'")
            assert page.locator('#atlas-rows tr').count() == 1
            assert page.locator('#table-rows tr').count() == 1
            assert 'EXAMPLE DATA' not in page.locator('#table-status').inner_text()
            assert 'lack a selected measurement' in page.locator('#atlas-empty').inner_text()
            assert page.evaluate('ForgeAtlas.source().data.row_key') == ['traces-1']
            assert 'EXAMPLE DATA' not in page.locator('#atlas-status').inner_text()
            page.locator('#atlas-filters summary').click()
            page.locator('#atlas-dataset').select_option('runs')
            assert page.locator('#atlas-rows tr').count() == 0
            assert page.locator('#table-rows tr').count() == 0
            assert page.evaluate("ForgeAtlas.mode()") == 'real'
            page.locator('#atlas-dataset').select_option('traces')
            page.locator('#atlas-filters summary').click()
            checks.append('First real record replaces all examples; unknown measurements stay absent')

            # Failed refresh and wrong-agent response cannot replace the last good data.
            current['status'] = 503
            page.locator('#table-refresh').click()
            page.wait_for_function("document.getElementById('atlas-status').textContent.includes('Refresh unavailable')")
            assert page.evaluate("ForgeAtlas.mode()") == 'real'
            assert 'Refresh unavailable' in page.locator('#table-status').inner_text()
            current['status'] = 200
            current['body'] = dict(empty, agent_id='other-agent')
            page.locator('#atlas-refresh').click()
            page.wait_for_function("!document.getElementById('atlas-refresh').disabled")
            assert page.evaluate('ForgeAtlas.source().data.row_key') == ['traces-1']
            checks.append('Outage and wrong-agent responses retain the last good view')

            # Check tooltip on the actual image and via keyboard; no credit for generated authorship.
            page.keyboard.press('Escape')
            page.locator('.dock-button[data-open="presence"]').click()
            portrait = page.locator('.portrait-credit')
            if portrait.count():
                portrait.focus()
                assert page.locator('#avatar-tooltip').is_visible()
                assert 'Reference artwork:' in page.locator('#avatar-tooltip').inner_text()
                assert 'AI-generated reinterpretation' in page.locator('#avatar-tooltip').inner_text()
                portrait.press('Escape')
                assert not page.locator('#avatar-tooltip').is_visible()
                portrait.blur()
                portrait.hover()
                assert page.locator('#avatar-tooltip').is_visible()
                checks.append('Reference artist credit appears on hover/focus and dismisses with Escape')

            page.set_viewport_size({'width':390, 'height':900})
            page.locator('#gallery-view').click()
            page.locator('#window-atlas').scroll_into_view_if_needed()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            page.screenshot(path=str(output / 'atlas-mobile.png'))
            assert not errors, errors
            checks.append('Mobile gallery fits; no browser exceptions')
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        worker.join()
    result = {'status':'passed', 'checks':checks, 'database_writes':False, 'responses':'controlled browser fixtures'}
    (output / 'atlas-browser-checks.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    return result


def main():
    import sys
    from forge_atlas import ROOT
    sys.path.insert(0, str(ROOT))
    from resources.lib.tracing import trace_agent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--html', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    run = trace_agent('lead_magnet.forge_atlas_smoke', metadata={'mode': 'local_browser'})(smoke)
    print(json.dumps(run(args.html.resolve(), args.out.resolve())))


if __name__ == '__main__':
    main()
