"""Synthetic browser smoke: no live writes, traces, credentials or message bodies."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import threading

from playwright.sync_api import sync_playwright
from serve_forge_workspace import make_server
from forge_history import capture
from forge_atlas import capture as atlas_capture
from forge_planning import capture as planning_capture


def run(html: Path, output: Path) -> dict:
    html=html.resolve();output.mkdir(parents=True,exist_ok=True)
    receipt=json.loads((html.parent/'expert-profile-receipt.json').read_text(encoding='utf-8'))
    scope=receipt['planning']['scope'];state={'empty':True,'error':False,'wrong_scope':False};calls=[]
    def reader(s, **kwargs):
        calls.append(kwargs)
        if state['error']:raise RuntimeError('synthetic failure')
        def query(_):
            if state['empty']:return []
            view=kwargs.get('view','sessions')
            if view=='sessions':
                start=50 if kwargs.get('after') else 0
                return [{'session_key':f'hermes:test:s{i:03}', 'session_id':f's{i:03}','harness':'hermes','last_active_at':'2026-09-22T12:00:00Z','expected_messages':1,'saved_messages':1,'delivery':'complete'} for i in range(start,51)]
            if view=='messages':return [{'message_key':'ash_test','seq':1,'message_text':'Synthetic user request <img src=x onerror=alert(1)>','preview_truncated':False}]
            return [{'trace_id':'trace-test','trace_name':'Synthetic packet draft','observation_count':5,'total_tokens':210,'langfuse_url':'https://us.cloud.langfuse.com/project/test-project/traces/trace-test'}]
        result=capture(s,**kwargs,query=query)
        if state['wrong_scope']:result['tenant_id']='another-tenant'
        return result
    server=make_server(html.parent,receipt['agent_id'],0,planning_scope=scope,
        reader=lambda agent:atlas_capture(agent,query=lambda _:[]),
        planning_reader=lambda s:planning_capture(s,query=lambda _:[]),history_reader=reader)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    checks=[];errors=[]
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=os.environ.get('FORGE_CHROMIUM_EXECUTABLE') or None)
            page=browser.new_page(viewport={'width':1500,'height':1000})
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='domcontentloaded')
            page.wait_for_function('window.ForgeHistory')
            page.locator('.dock-button[data-open="history"]').click()
            page.locator('#window-history .maximize').click()
            def settled():page.wait_for_function('!ForgeHistory.busy()')
            page.locator('#history-refresh').click();settled()
            assert 'No saved runtime sessions' in page.locator('#history-rows').inner_text()
            state['empty']=False
            page.locator('#history-refresh').click();settled()
            assert page.locator('.history-card').count()==50
            page.locator('#history-next').click();settled()
            assert page.locator('.history-card').count()==1 and calls[-1]['after']=='hermes:test:s049'
            checks.append('Empty state is honest; all sessions accessible through bounded pages')
            page.locator('#history-home').click();settled()
            page.get_by_role('button',name='s000',exact=True).click();settled()
            assert '<img src=x' in page.locator('.history-message').inner_text()
            assert page.locator('.history-message img').count()==0
            page.get_by_role('button',name='View message traces',exact=True).click();settled()
            assert calls[-1]['message_key']=='ash_test'
            assert page.get_by_role('link',name='Open trace in Langfuse').get_attribute('href').endswith('/traces/trace-test')
            page.get_by_role('button',name='Session traces',exact=True).click();settled()
            assert 'message_key' not in calls[-1]
            checks.append('Session and message drill-down are separate; content is escaped and trace URLs verified')
            for problem in ['error','wrong_scope']:
                state[problem]=True
                page.locator('#history-refresh').click();settled()
                assert 'last successful view is retained' in page.locator('#history-status').inner_text()
                assert 'Synthetic packet draft' in page.locator('#history-rows').inner_text()
                state[problem]=False
            assert 'Synthetic user request' not in page.evaluate('JSON.stringify(localStorage)')
            checks.append('Failed or wrong-tenant refresh retains last-good view; no history in browser storage')
            page.locator('#history-refresh').click();settled()
            page.screenshot(path=str(output/'history-traces.png'))
            page.set_viewport_size({'width':390,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            page.screenshot(path=str(output/'history-mobile.png'))
            offline=browser.new_page();offline.goto(html.as_uri());offline.wait_for_function('window.ForgeHistory')
            assert offline.locator('#history-refresh').is_disabled()
            assert 'Synthetic user request' not in html.read_text(encoding='utf-8')
            checks.append('Offline package contains no history and cannot request private data; mobile has no page overflow')
            assert not errors,errors
            browser.close()
    finally:
        server.shutdown();server.server_close();thread.join()
    result={'ok':True,'checks':checks,'synthetic_only':True}
    (output/'result.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    return result


def main():
    import sys
    from forge_atlas import ROOT
    sys.path.insert(0,str(ROOT))
    from resources.lib.tracing import trace_agent
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--html',required=True,type=Path);parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    @trace_agent('lead_magnet.forge_history_smoke',metadata={'mode':'synthetic_browser'})
    def check():
        print(json.dumps(run(args.html,args.out),indent=2))
    check()


if __name__=='__main__':
    main()
