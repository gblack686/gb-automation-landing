"""Exercise PRDs, linked Kanban, layout migration and offline artifact isolation in Chromium."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import threading

from playwright.sync_api import sync_playwright

from forge_atlas import ROOT, capture as capture_atlas
from forge_planning import capture
from serve_forge_workspace import make_server


def smoke(html: Path, output: Path) -> dict:
    html = html.resolve(); output.mkdir(parents=True, exist_ok=True)
    receipt = json.loads((html.parent / 'expert-profile-receipt.json').read_text(encoding='utf-8'))
    scope = receipt['planning']['scope']
    empty = capture(scope, query=lambda _: [])
    current = {'body': empty, 'status': 200}
    server = make_server(html.parent, receipt['agent_id'], 0, reader=lambda _: capture_atlas(receipt['agent_id'], query=lambda _: []),
                         planning_scope=scope, planning_reader=lambda _: empty)
    worker = threading.Thread(target=server.serve_forever, daemon=True); worker.start()
    checks, errors = [], []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get('FORGE_CHROMIUM_EXECUTABLE') or None)
            context = browser.new_context(viewport={'width':1600,'height':1000}, accept_downloads=True)
            legacy_root='gbauto.forge-lead-magnet.v1.'+receipt['legacy_document_id']
            context.add_init_script('localStorage.setItem('+json.dumps(legacy_root+'.review')+','+json.dumps(json.dumps({'tasks':{'status':'changes','note':'Original design feedback'}}))+');')
            page = context.new_page();page.on('pageerror', lambda e: errors.append(str(e)))
            page.route('**/api/forge/planning', lambda route: route.fulfill(status=current['status'], json=current['body']))
            page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='domcontentloaded')
            page.wait_for_function('window.ForgePlanning && !ForgePlanning.refreshing()')
            assert page.evaluate('ForgePreview.review().prds.note') == 'Original design feedback'
            page.locator('.dock-button[data-open="prds"]').click()
            page.locator('#window-prds .maximize').click()
            assert page.locator('#planning-status').inner_text().endswith('0 PRDs / 0 linked cards')
            assert page.locator('#planning-request .requirement').count() == 8
            with page.expect_download() as event: page.locator('#download-planning-request').click()
            event.value.save_as(output / 'planning-request.json')
            request = json.loads((output / 'planning-request.json').read_text(encoding='utf-8'))
            assert request['config_sha256'] == receipt['yaml_sha256'] and request['status'] == 'scope_pending'
            assert request['runtime_authorized'] is False
            checks.append('Empty scoped index and eight config-derived requirements; download grants no approval')

            # A prior version layout must keep unrelated geometry, notes and theme.
            root = 'gbauto.forge-lead-magnet.v1.' + receipt['document_id']
            saved = page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', root + '.layout')
            saved['states']['tasks'] = {'x':70,'y':80,'w':580,'h':430,'open':True}
            saved['states'].pop('prds',None)
            saved['states']['config'] = {'x':90,'y':50,'w':500,'h':350,'open':True}
            page.add_init_script('localStorage.setItem('+json.dumps(root+'.layout')+','+json.dumps(json.dumps(saved))+');'
                                 'localStorage.setItem('+json.dumps(root+'.review')+','+json.dumps(json.dumps({'tasks':{'status':'changes','note':'Legacy planning note'}}))+');')
            page.evaluate("ForgeMode.apply('dark')")
            page.reload(wait_until='domcontentloaded')
            assert page.evaluate('ForgePreview.states().prds.x') == 70
            assert page.evaluate('ForgePreview.states().config.w') == 500
            assert page.evaluate('ForgePreview.review().prds.note') == 'Legacy planning note'
            assert page.locator('body').get_attribute('data-mode') == 'dark'
            checks.append('Tasks geometry and feedback migrate to PRDs; other geometry and theme survive')

            real = copy.deepcopy(empty)
            real['prds'] = [{'prd_id':'prd_'+'1'*20,'title':'Implement Artist Packet Expert','status':'scope_approved',
                             'path':'second-brain/plans/packet-expert.html','updated_at':'2026-09-21T12:00:00+00:00',
                             'config_sha256':'a'*64,'source':'prd_artifacts','body_sha256':'b'*64}]
            real['cards'] = [{'task_id':'task-1','title':'Validate the packet','status':'new_source_status',
                              'updated_at':'2026-09-21T12:00:00+00:00','prd_ids':[real['prds'][0]['prd_id']]}]
            current['body'] = real
            page.locator('.dock-button[data-open="prds"]').click()
            page.locator('#planning-refresh').click()
            page.wait_for_function('ForgePlanning.snapshot()?.prds.length===1')
            assert 'Previous config' in page.locator('#prd-list').inner_text()
            assert page.locator('#prd-list .example-card').count() == 0
            page.locator('#planning-index').click()
            assert real['prds'][0]['prd_id'] in page.locator('#planning-dialog-body').inner_text()
            page.keyboard.press('Escape')
            page.locator('#prd-list [data-plan-open]').click()
            assert 'not included' in page.locator('#planning-dialog-body').inner_text()
            page.keyboard.press('Escape')
            page.locator('.dock-button[data-open="kanban"]').click()
            page.locator('#window-kanban .maximize').click()
            assert page.locator('#kanban-board').get_attribute('data-mode') == 'records'
            assert page.locator('.kanban-card').count() == 1
            assert 'Other' in page.locator('.kanban-column').last.inner_text()
            page.locator('.kanban-card [data-plan-open]').click()
            assert 'Implement Artist Packet Expert' == page.locator('#planning-dialog-title').inner_text()
            page.keyboard.press('Escape')
            assert 'is-maximized' in page.locator('#window-kanban').get_attribute('class')
            for mode in ['light','dark']:
                page.evaluate('(m)=>ForgeMode.apply(m)', mode)
                page.screenshot(path=str(output / ('kanban-'+mode+'.png')))
            checks.append('Real PRD suppresses example cards; old config is flagged; unknown status stays in Other with working PRD link')

            page.keyboard.press('Escape'); page.locator('.dock-button[data-open="prds"]').click()
            page.locator('#window-prds .maximize').click()
            current['status'] = 503; page.locator('#planning-refresh').click()
            page.wait_for_function('ForgePlanning.error() && !ForgePlanning.refreshing()')
            assert page.evaluate('ForgePlanning.snapshot().prds.length') == 1
            current['status'] = 200; current['body'] = dict(empty, agent_id='wrong-agent')
            page.locator('#planning-refresh').click(); page.wait_for_function('!ForgePlanning.refreshing()')
            assert page.evaluate('ForgePlanning.snapshot().prds.length') == 1
            assert 'Last good snapshot retained' in page.locator('#planning-status').inner_text()
            page.screenshot(path=str(output / 'prds-stale.png'))
            checks.append('Outage and wrong-agent response preserve the last good scoped records')

            # The pre-tenant state is claimed once and must not bleed into another tenant's scope.
            from render_forge_workspace import script_json
            other_raw=html.read_text(encoding='utf-8')
            forge_marker=r'(<script id="forge-data" type="application/json">)(.*?)(</script>)'
            other_source=json.loads(re.search(forge_marker,other_raw,re.S).group(2))
            other_source['document_id']='e'*64
            other_raw=re.sub(forge_marker,lambda m:m[1]+script_json(other_source)+m[3],other_raw,flags=re.S)
            other=context.new_page()
            other.route('**/other-tenant.html',lambda route:route.fulfill(content_type='text/html',body=other_raw))
            other.route('**/api/forge/*',lambda route:route.fulfill(status=503,json={'error':'fixture'}))
            other.goto(f'http://127.0.0.1:{server.server_port}/other-tenant.html',wait_until='domcontentloaded')
            assert other.evaluate('Object.keys(ForgePreview.review()).length') == 0
            other.close()
            checks.append('Exact legacy design feedback migrates once and cannot be inherited by a second tenant scope')

            # Downloads and the sandbox work with no network and no local server.
            offline = browser.new_context(viewport={'width':1440,'height':1000}, accept_downloads=True, offline=True)
            tab = offline.new_page();tab.on('pageerror', lambda e: errors.append(str(e)))
            # Some Chromium versions emit request + requestfailed('csp') even
            # when CSP stops a load before network interception. Observe the
            # outbound boundary, and abort defensively if it is ever reached.
            remote=[]
            def reject_remote(route):
                remote.append(route.request.url)
                route.abort()
            tab.route(re.compile(r'^https?://'),reject_remote)
            tab.goto(html.as_uri(), wait_until='domcontentloaded')
            tab.locator('.dock-button[data-open="artifacts"]').click();tab.locator('#window-artifacts .maximize').click()
            assert tab.locator('#example-artifacts .planning-card').count() == 6
            assert 'No completed outputs' in tab.locator('#actual-artifacts').inner_text()
            for a in receipt['artifacts']:
                with tab.expect_download() as event: tab.locator(f'#example-artifacts [data-download-file="{a["id"]}"]').click()
                dest=output / a['filename'];event.value.save_as(dest)
                assert hashlib.sha256(dest.read_bytes()).hexdigest() == a['sha256']
            tab.locator('#example-artifacts [data-preview-file]').first.click()
            frame=tab.locator('#planning-dialog iframe')
            assert frame.get_attribute('sandbox') == ''
            assert "default-src 'none'" in frame.get_attribute('csp')
            assert 'Example only' in tab.frame_locator('#planning-dialog iframe').locator('body').inner_text()
            tab.screenshot(path=str(output / 'sample-plan-preview.png'))
            tab.keyboard.press('Escape')
            assert not remote, remote
            checks.append('Six offline Blob downloads match manifest hashes; canonical sample plan opens in an empty sandbox')

            raw=html.read_text(encoding='utf-8')
            marker=r'(<script id="planning-data" type="application/json">)(.*?)(</script>)'
            payload=json.loads(re.search(marker,raw,re.S).group(2))
            from forge_artifacts import entry
            from render_forge_workspace import script_json
            actual_payload=copy.deepcopy(payload)
            actual_raw=b'<h1>Indexed implementation plan fixture</h1><p>Local browser fixture only.</p>'
            actual=entry('indexed-plan.html','Indexed implementation plan',actual_raw,kind='actual',prd_id=real['prds'][0]['prd_id'])
            actual_payload['artifacts'].append({**actual,'content':actual_raw.decode()})
            actual_payload['snapshot']=copy.deepcopy(real)
            actual_payload['snapshot']['prds'][0]['body_sha256']=actual['sha256']
            actual_payload['snapshot']['prds'][0]['config_sha256']=receipt['yaml_sha256']
            actual_payload['snapshot']['artifacts']=[actual]
            actual_html=output / 'actual-fixture.html'
            actual_html.write_text(re.sub(marker,lambda m:m[1]+script_json(actual_payload)+m[3],raw,flags=re.S),encoding='utf-8')
            tab.goto(actual_html.resolve().as_uri(),wait_until='domcontentloaded')
            assert tab.locator('#actual-artifacts .planning-card').count() == 1
            assert tab.locator('#example-artifacts .planning-card').count() == 6
            tab.locator('.dock-button[data-open="prds"]').click();tab.locator('#window-prds .maximize').click()
            assert 'Current config' in tab.locator('#prd-list').inner_text()
            tab.locator('#prd-list [data-plan-open]').click()
            assert tab.frame_locator('#planning-dialog iframe').locator('h1').inner_text() == 'Indexed implementation plan fixture'
            with tab.expect_download() as event: tab.locator('#planning-dialog [data-download-file]').click()
            event.value.save_as(output / 'downloaded-indexed-plan.html')
            assert hashlib.sha256((output / 'downloaded-indexed-plan.html').read_bytes()).hexdigest() == actual['sha256']
            tab.keyboard.press('Escape')
            checks.append('Hash-bound indexed plan opens and downloads offline; actual outputs stay separate from all six samples')
            payload['artifacts'][0]['content']='<script>parent.forgeInjected=true;fetch("https://example.invalid/leak")</script><meta http-equiv="refresh" content="0;url=https://example.invalid/refresh"><img src="https://example.invalid/image"><form action="https://example.invalid/form"><input></form><h1>Hostile fixture</h1>'
            from render_forge_workspace import script_json
            hostile=output / 'hostile-fixture.html'
            hostile.write_text(re.sub(marker,lambda m:m[1]+script_json(payload)+m[3],raw,flags=re.S),encoding='utf-8')
            tab.goto(hostile.resolve().as_uri(),wait_until='domcontentloaded')
            tab.locator('.dock-button[data-open="artifacts"]').click()
            tab.locator('#window-artifacts .maximize').click()
            tab.locator('#example-artifacts [data-preview-file]').first.click()
            assert tab.evaluate('window.forgeInjected === undefined')
            assert tab.frame_locator('#planning-dialog iframe').locator('h1').inner_text() == 'Hostile fixture'
            assert not remote, remote
            checks.append('Hostile HTML cannot execute scripts, access the parent or request remote images/forms')
            assert not errors, errors
            offline.close();context.close();browser.close()
    finally:
        server.shutdown();server.server_close();worker.join(timeout=5)
    result={'status':'passed','checks':checks,'live_writes':0}
    (output / 'planning-checks.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    return result


def main():
    sys.path.insert(0,str(ROOT))
    from resources.lib.tracing import trace_agent
    @trace_agent('lead_magnet.forge_planning_smoke', metadata={'mode':'local_browser'})
    def run():
        parser=argparse.ArgumentParser(description=__doc__)
        parser.add_argument('--html',type=Path,required=True);parser.add_argument('--out',type=Path,required=True)
        args=parser.parse_args();print(json.dumps(smoke(args.html,args.out)))
    run()


if __name__ == '__main__':
    main()
