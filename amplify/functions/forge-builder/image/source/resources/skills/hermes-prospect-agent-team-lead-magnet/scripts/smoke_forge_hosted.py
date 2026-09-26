"""Exercise the real document in the same opaque sandbox used by the website."""
import argparse
import json
import os
from pathlib import Path
import re
import uuid

from playwright.sync_api import sync_playwright, expect


def run(html: Path, out: Path):
    content = html.read_text(encoding='utf-8')
    scope = json.loads(re.search(r'<script id="planning-data" type="application/json">(.*?)</script>', content, re.S).group(1))['scope']
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('FORGE_CHROMIUM_EXECUTABLE') or None)
        page = browser.new_page(viewport={'width':1500,'height':1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content('<iframe id="forge" sandbox="allow-scripts allow-downloads allow-popups" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>')
        page.evaluate(r"""({content,scope,channel}) => {
          const frame=document.querySelector('#forge');
          frame.name='forge-atlas:'+channel;window.calls=[];window.fail=false;
          window.addEventListener('message',event=>{
            const m=event.data;
            if(event.source!==frame.contentWindow||event.origin!=='null'||m.channel!==channel||m.type!=='forge-atlas.request.v1')return;
            calls.push(m);let payload;
            if(m.view==='atlas')payload={schema_version:'forge-atlas-snapshot.v1',source:'supabase',agent_id:scope.agent_id,captured_at:new Date().toISOString(),days:90,limit_per_dataset:200,datasets:{traces:[{row_key:'traces-1',observed_at:new Date().toISOString(),tokens:100,cost:.001,duration:1,events:2}],runs:[],sessions:[]}};
            if(m.view==='planning')payload={schema_version:'forge-planning-snapshot.v1',...scope,captured_at:new Date().toISOString(),source:'supabase',prds:[],cards:[],artifacts:[]};
            if(m.view==='approvalSnapshot')payload={mode:'live_read_only',workflows:[],connection:{tenant:scope.tenant_id,writes_enabled:false,review_host:'web'}};
            if(m.view==='proposals')payload={total:1,offset:0,limit:50,rows:[{proposal_id:'prop_hosted',card_title:'Hosted review proposal',source_type:'youtube_transcript',card_type:'expert-portfolio-proposal',state:'gated'}]};
            if(m.view==='proposal')payload={proposal_id:'prop_hosted',card_title:'Hosted review proposal',source_type:'youtube_transcript',card_type:'expert-portfolio-proposal',state:'gated',summary:'Private review <script> stays text',action_items:['Inspect the source evidence'],updated_at:'2026-09-24T00:00:00Z'};
            if(m.view==='history') {
              const q=m.input;let rows=[];
              if(q.view==='sessions')rows=[{session_key:'hermes:owned:1',session_id:'real-shaped-session',harness:'hermes',expected_messages:1,saved_messages:1,delivery:'complete'}];
              if(q.view==='messages')rows=[{message_key:'message-1',seq:1,message_text:'Private fixture <script> is text',preview_truncated:false}];
              if(q.view==='traces')rows=[{trace_id:'trace-1',trace_name:'Recorded turn',observation_count:2,total_tokens:100,langfuse_url:'https://us.cloud.langfuse.com/project/test/traces/trace-1'}];
              payload={schema_version:'forge-history-page.v1',source:'supabase',tenant_id:scope.tenant_id,agent_id:scope.agent_id,view:q.view,session_key:q.session_key||null,message_key:q.message_key||null,rows,next:null};
            }
            frame.contentWindow.postMessage({type:'forge-atlas.response.v1',channel,id:m.id,ok:!window.fail,payload},'*');
          });
          frame.srcdoc=content.replace('<head>','<head><meta name="forge-host-channel" content="'+channel+'"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' \'unsafe-eval\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; frame-src about: blob:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'">');
        }""", {'content':content,'scope':scope,'channel':str(uuid.uuid4())})
        frame = page.frame_locator('#forge')
        expect(frame.locator('#history-refresh')).to_be_attached()
        assert frame.locator('body').evaluate('() => !!window.ForgeHost'), frame.locator('body').evaluate('() => ({name:window.name,bridge:!!window.ForgeHost,scope:JSON.parse(document.getElementById("planning-data").textContent).scope})')
        expect(frame.locator('#history-refresh')).to_be_enabled()
        frame.locator('.dock-button[data-open="atlas"]').click()
        expect(frame.locator('#atlas-status')).to_contain_text('Supabase', timeout=20000)
        assert frame.locator('body').evaluate('() => ForgeAtlas.mode()') == 'real'
        frame.locator('#layout-select').select_option('dashboard')
        expect(frame.locator('#window-table')).to_be_visible()
        expect(frame.locator('.window:visible')).to_have_count(2)
        expect(frame.locator('#table-rows tr')).to_have_count(1)
        frame.locator('#table-rows button').first.click()
        assert frame.locator('body').evaluate('() => ForgeAtlas.source().selected.indices') == [0]
        expect(frame.locator('#table-status')).to_contain_text('Supabase')
        page.screenshot(path=str(out/'hosted-dashboard.png'))
        frame.locator('.dock-button[data-open="proposals"]').click()
        frame.locator('#window-proposals .maximize').click()
        expect(frame.locator('#forge-native-proposals')).to_contain_text('Hosted review proposal')
        frame.locator('[data-native-open="prop_hosted"]').click()
        expect(frame.locator('#forge-approval-dialog')).to_contain_text('Private review <script> stays text')
        expect(frame.locator('[data-native-accept]')).to_be_disabled()
        assert frame.locator('#forge-approval-dialog script').count() == 0
        frame.get_by_role('button',name='Close approval review',exact=True).click()
        frame.locator('.dock-button[data-open="history"]').click()
        frame.locator('#window-history .maximize').click()
        frame.locator('#history-refresh').click()
        expect(frame.get_by_role('button',name='real-shaped-session',exact=True)).to_be_visible()
        frame.get_by_role('button',name='real-shaped-session',exact=True).click()
        expect(frame.locator('.history-message')).to_contain_text('Private fixture <script> is text')
        frame.get_by_role('button',name='View message traces',exact=True).click()
        expect(frame.get_by_role('link',name='Open trace in Langfuse')).to_have_attribute('href','https://us.cloud.langfuse.com/project/test/traces/trace-1')
        page.evaluate('window.fail=true')
        frame.locator('#history-refresh').click()
        expect(frame.locator('#history-status')).to_contain_text('last successful view is retained')
        assert frame.locator('body').evaluate("() => {try {localStorage.getItem('x');return false;}catch{return true;}}")
        assert page.evaluate("() => !document.body.textContent.includes('Private fixture')")
        page.screenshot(path=str(out/'hosted-history.png'))
        page.set_viewport_size({'width':390,'height':844})
        assert frame.locator('body').evaluate('() => document.documentElement.scrollWidth<=innerWidth+1')
        assert not errors, errors
        browser.close()
    result={'ok':True,'transport':'synthetic authenticated-host substitute','checks':['opaque sandbox renders the actual Forge document','Dashboard chart/table share hosted data and selection','hosted proposal list and escaped detail; acceptance disabled','hosted session/message/trace drill-down','escaped private content','last-good refresh','no iframe storage access','mobile layout']}
    (out/'result.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    return result


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--html',required=True,type=Path)
    parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    print(json.dumps(run(args.html,args.out)))
