"""Exercise all private Studio windows in the production opaque sandbox shape."""
import argparse
import json
import os
from pathlib import Path
import re
import uuid

from playwright.sync_api import sync_playwright, expect


def run(html: Path, out: Path):
    content = html.read_text(encoding='utf-8')
    scope = json.loads(re.search(r'<script id="private-studio-data" type="application/json">(.*?)</script>', content, re.S)[1])['scope']
    out.mkdir(parents=True, exist_ok=True)
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('FORGE_CHROMIUM_EXECUTABLE') or None)
        page = browser.new_page(viewport={'width':1500,'height':1000})
        page.set_default_timeout(15000)
        print('Browser ready', flush=True)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content('<iframe id="forge" sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>')
        page.evaluate(r"""({content,scope,channel}) => {
          const frame=document.querySelector('#forge');window.calls=[];window.fail=false;window.wrongScope=false;
          addEventListener('message',event=>{
            const m=event.data;if(event.source!==frame.contentWindow||event.origin!=='null'||m.channel!==channel||m.type!=='forge-atlas.request.v1')return;
            calls.push(m);let payload;const now=new Date().toISOString();
            if(m.view==='visualActive')payload=window.activeVisual||null;
            const metric={observed_at:now,tokens:100,cost:.001,duration:1,events:2};
            if(m.view==='atlas')payload={schema_version:'forge-atlas-snapshot.v1',source:'supabase',agent_id:scope.agent_id,captured_at:now,datasets:{traces:[{...metric,row_key:'traces-1'}],runs:[{...metric,row_key:'runs-1'}],sessions:[]}};
            if(m.view==='planning')payload={schema_version:'forge-planning-snapshot.v1',...scope,captured_at:now,source:'supabase',prds:[{prd_id:'prd_12345678901234567890',title:'Connected plan',status:'approved',path:'second-brain/inbox/plan.md',updated_at:now,config_sha256:scope.config_sha256,source:'prd_artifacts',body_sha256:'a'.repeat(64)}],cards:[{task_id:'task_one',title:'Linked implementation task',status:'ready',prd_ids:['prd_12345678901234567890']}],artifacts:[]};
            if(m.view==='proposals')payload={...scope,total:51,offset:m.input.offset||0,limit:50,rows:[{...scope,proposal_id:m.input.offset?'prop_second':'prop_hosted',assigned_expert:window.assignee||null,card_title:m.input.search?'Search result':'Hosted review proposal',source_type:'youtube_transcript',state:'gated',task_id:'task_one',source_event_id:'event_one',producer_run_id:'producer_one'}]};
            if(m.view==='proposal')payload={...scope,proposal_id:m.input.proposal_id,summary:'Private review <script> stays text',action_items:['Inspect the source evidence']};
            if(['proposals','proposal'].includes(m.view)){
              if(window.emptyProposals&&m.view==='proposals')payload={...scope,total:0,offset:0,limit:50,rows:[]};
              if(window.wrongProposalScope)payload.agent_id='another-expert';
              if(window.wrongProposalRow&&m.view==='proposals')payload.rows[0]={...payload.rows[0],agent_id:'another-expert',card_title:'Foreign proposal'};
            }
            if(m.view==='history'){
              const q=m.input;let rows=[];
              if(q.view==='sessions')rows=[{session_key:q.after?'session-2':'session-1',session_id:q.after?'Second session':'Saved session',harness:'hermes',expected_messages:1,saved_messages:1,delivery:'complete'}];
              if(q.view==='messages')rows=[{message_key:'message-1',seq:1,message_text:'Private fixture <script> is text',preview_truncated:false}];
              if(q.view==='traces')rows=[{trace_id:'trace-1',trace_name:'Recorded turn',observation_count:2,total_tokens:100,langfuse_url:'https://us.cloud.langfuse.com/project/test/traces/trace-1'}];
              payload={schema_version:'forge-history-page.v1',source:'supabase',tenant_id:window.wrongScope?'foreign':scope.tenant_id,agent_id:scope.agent_id,view:q.view,session_key:q.session_key||null,message_key:q.message_key||null,rows,next:q.view==='sessions'&&!q.after?'session-1':null};
            }
            frame.contentWindow.postMessage({type:'forge-atlas.response.v1',channel,id:m.id,ok:!window.fail,payload},'*');
          });
          frame.srcdoc=content.replace('<head>','<head><meta name="forge-host-channel" content="'+channel+'"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; frame-src about: blob:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'; object-src \'none\'">');
        }""", {'content':content,'scope':scope,'channel':str(uuid.uuid4())})
        frame = page.frame_locator('#forge')
        print('Private document injected', flush=True)
        expect(frame.locator('.gallery .window')).to_have_count(13)
        expect(frame.locator('[data-status="proposals"]')).to_contain_text('Supabase')
        for window in ['skills','commands','presence','chat','canvas','proposals','checks','config','knowledge','tasks','artifacts','console','changes']:
            print('Checking window: '+window, flush=True)
            frame.locator(f'.nav-window[data-nav="{window}"]').click()
            expect(frame.locator('.window.full')).to_have_attribute('data-window',window)
            frame.locator('[data-expand-mode="full"]').click()
            expect(frame.locator('.window.preview')).to_have_attribute('data-window',window)
        checks.append('All 13 windows open in full-screen and preview modes')
        frame.locator('.nav-window[data-nav="presence"]').click()
        intake=frame.locator('#avatar-intake')
        expect(intake.locator('.card-option')).to_have_count(6)
        expect(intake.locator('#expert-name')).to_have_value('Artist Packet Expert')
        assert intake.locator('#expert-name').get_attribute('readonly') is not None
        assert intake.locator('#expert-purpose').get_attribute('readonly') is not None
        expect(intake.locator('#search-scope option')).to_have_count(1)
        for card_image in intake.locator('.card-art').all():
            card_image.scroll_into_view_if_needed()
            expect(card_image).to_have_js_property('complete', True)
            assert card_image.evaluate('(image)=>image.naturalWidth>0')
        intake.locator('#role').select_option('research')
        expect(intake.locator('.card-option')).to_have_count(4)
        intake.locator('#clear-filters').click()
        intake.locator('.enlarge').first.click()
        expect(intake.locator('#card-dialog')).to_be_visible()
        intake.locator('#card-dialog').press('Escape')
        expect(frame.locator('.window.full')).to_have_attribute('data-window','presence')
        intake.locator('.card-option').first.click()
        intake.locator('#direction').fill('Preserve the indigo palette and full action pose')
        intake.locator('#pose').select_option('casting')
        frame.locator('[data-expand-mode="full"]').click()
        expect(frame.locator('.private-card-choice')).to_contain_text('Azami')
        frame.locator('[data-expand-mode="preview"]').click()
        expect(intake.locator('#direction')).to_have_value('Preserve the indigo palette and full action pose')
        frame.locator('.nav-window[data-nav="config"]').click()
        frame.locator('.nav-window[data-nav="presence"]').click()
        expect(intake.locator('#pose')).to_have_value('casting')
        with page.expect_download() as download_info:
            intake.locator('#export').evaluate('(button) => button.click()')
        brief=json.loads(Path(download_info.value.path()).read_text(encoding='utf-8'))
        assert brief['expert']['tenant_id']==scope['tenant_id']
        assert brief['expert']['expert_id']==scope['agent_id']
        assert brief['intake']['config_sha256']==scope['config_sha256']
        assert brief['card']['name']=='Azami, Lady of Scrolls'
        assert brief['direction']['coverage']=='full_character'
        assert brief['generation']['approved_credit_cap'] is None
        assert brief['generation']['task_ids']==[]
        assert brief['delivery']['release_status']=='not_requested'
        intake.locator('#generate').click()
        expect(intake.locator('#form-status')).to_contain_text('Generation studio opened')
        assert page.evaluate("sha=>calls.some(m=>m.view==='visualOpen'&&m.input.brief.card.name==='Azami, Lady of Scrolls'&&m.input.brief.intake.config_sha256===sha)",scope['config_sha256'])
        checks.append('Generation handoff sends the selected printing and exact configuration; no provider call in the frame')
        portrait=frame.locator('body').evaluate("()=>JSON.parse(document.getElementById('private-studio-data').textContent).avatar")
        page.evaluate("portrait=>window.activeVisual={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',tenant_id:'gbautomation',expert_id:'artist-packet-expert',portrait,avatar_icon:portrait,avatar_icon_sha256:'c'.repeat(64),sha256:'a'.repeat(64),agent_card:portrait,agent_card_sha256:'b'.repeat(64),credit:{name:'New approved printing',artist:'Fixture artist'}}",portrait)
        frame.locator('body').evaluate("()=>window.dispatchEvent(new Event('forge-visual-updated'))")
        expect(frame.locator('.window.full')).to_contain_text('New approved printing · Fixture artist')
        checks.append('An adopted portrait displays its own source printing and artist')
        expect(frame.get_by_alt_text('Approved full agent card',exact=True)).to_be_visible()
        frame.get_by_role('button',name='Review & download packet',exact=True).click()
        assert page.evaluate("calls.some(m=>m.view==='visualOpen')")
        checks.append('Approved full agent card appears in Presence with a packet review action')
        for width in [768,390]:
            page.set_viewport_size({'width':width,'height':900})
            assert frame.locator('body').evaluate('() => document.documentElement.scrollWidth<=innerWidth+1')
        page.screenshot(path=str(out/'avatar-mobile.png'),full_page=True)
        page.set_viewport_size({'width':1500,'height':1000})
        page.screenshot(path=str(out/'avatar-desktop.png'),full_page=True)
        intake.locator('#reset').click()
        intake.locator('#reset').click()
        expect(intake.locator('.card-option[aria-pressed="true"]')).to_have_count(0)
        expect(intake.locator('#expert-name')).to_have_value('Artist Packet Expert')
        checks.append('Avatar exact printing, scoped export, preview/full-screen draft retention, reset and mobile fit')
        assert frame.locator('body').evaluate('''() => {
          const p=JSON.parse(document.getElementById('private-studio-data').textContent), bundle=p.visual_intake;
          const host=document.createElement('div'); document.body.append(host);
          const root=host.attachShadow({mode:'open'});root.innerHTML=bundle.html;
          const expert={tenant_id:'test-tenant',expert_id:'test-expert',display_name:'Other expert',purpose:'Other purpose'};
          const component=ForgeVisualIntake.mount(root,{...bundle,expert,scopeKey:'new-scope',allowSearch:false,
            load:()=>({version:1,scopeKey:'wrong-scope',values:{'expert-name':'Foreign draft'},selected:bundle.catalog.cards[0]}),save:()=>{}});
          const isolated=root.querySelector('#expert-name').value==='Other expert'&&!root.querySelector('.card-option[aria-pressed="true"]');
          component.dispose();host.remove();return isolated;
        }''')
        checks.append('Another expert/config scope cannot restore the avatar draft')
        frame.locator('.nav-window[data-nav="proposals"]').click()
        expect(frame.get_by_role('columnheader',name='Assigned to',exact=True)).to_be_visible()
        expect(frame.locator('.private-proposal-table td').last).to_contain_text('Unassigned')
        assert frame.locator('.private-proposal-table td').last.locator('img').count() == 0
        expect(frame.locator('.private-proposal-table img')).to_have_count(1)
        page.evaluate("window.assignee='another-expert'")
        frame.locator('#proposal-search button').click()
        frame.locator('[data-action="proposal-open"]').first.click()
        expect(frame.locator('#proposal-detail')).to_contain_text('Private review <script> stays text')
        expect(frame.get_by_role('button',name='Accept proposal',exact=True)).to_be_disabled()
        expect(frame.locator('.private-proposal-table td').last).to_contain_text('another-expert')
        assert frame.locator('.private-proposal-table td').last.locator('img').count() == 0
        page.evaluate("window.assignee='artist-packet-expert'")
        frame.locator('#proposal-search button').click()
        frame.locator('[data-action="proposal-open"]').first.click()
        expect(frame.locator('.private-proposal-table td').last.locator('img')).to_have_count(1)
        checks.append('Assignee avatars match expert identity; missing and foreign assignees never borrow the selected expert image')
        assert frame.locator('#proposal-detail script').count() == 0
        frame.locator('[data-action="proposal-next"]').click()
        expect(frame.locator('[data-key="prop_second"]').first).to_be_visible()
        frame.get_by_label('Search proposals',exact=True).fill('brief')
        frame.get_by_label('Proposal state',exact=True).select_option('gated')
        frame.locator('#proposal-search button').click()
        expect(frame.locator('.cards')).to_contain_text('Search result')
        assert page.evaluate("calls.some(m=>m.view==='proposals'&&m.input.search==='brief'&&m.input.state==='gated'&&m.input.offset===0)")
        checks.append('Proposal paging, native state/search, escaped detail and disabled acceptance')
        for flag in ['wrongProposalScope','wrongProposalRow']:
            page.evaluate(f'window.{flag}=true')
            frame.locator('#proposal-search button').click()
            expect(frame.locator('[data-status="proposals"]')).to_contain_text('Last successful records retained')
            expect(frame.locator('.cards')).not_to_contain_text('Foreign proposal')
            page.evaluate(f'window.{flag}=false')
        page.evaluate('window.wrongProposalScope=true')
        frame.locator('[data-action="proposal-open"]').first.click()
        expect(frame.locator('[data-status="proposal"]')).to_contain_text('Last successful records retained')
        page.evaluate('window.wrongProposalScope=false;window.emptyProposals=true')
        frame.locator('#proposal-search button').click()
        expect(frame.locator('.cards')).to_contain_text('No proposals for this expert')
        expect(frame.locator('[data-action="proposal-next"]')).to_be_disabled()
        expect(frame.locator('#proposal-detail')).to_have_count(0)
        checks.append('Foreign-expert page, row and detail rejected; empty expert inventory clears cards and pagination')
        frame.locator('.nav-window[data-nav="chat"]').click()
        frame.locator('[data-action="history-next"]').click()
        expect(frame.locator('.primary-area')).to_contain_text('Second session')
        frame.locator('[data-action="history-messages"]').click()
        expect(frame.locator('.private-message')).to_contain_text('Private fixture <script> is text')
        frame.locator('[data-action="message-traces"]').click()
        expect(frame.get_by_role('link',name='Open trace in Langfuse')).to_have_attribute('href','https://us.cloud.langfuse.com/project/test/traces/trace-1')
        page.evaluate('window.wrongScope=true')
        frame.locator('[data-action="refresh"][data-key="history"]').click()
        expect(frame.locator('[data-status="history"]')).to_contain_text('Last successful records retained')
        expect(frame.get_by_role('link',name='Open trace in Langfuse')).to_be_visible()
        page.evaluate('window.wrongScope=false')
        checks.append('Session pagination, message-to-trace navigation and rejected foreign-scope response')
        frame.locator('.nav-window[data-nav="tasks"]').click()
        frame.get_by_text('Indexed plans & linked work', exact=True).click()
        expect(frame.locator('.board')).to_contain_text('Linked implementation task')
        frame.locator('[data-action="plan-open"]').first.click()
        expect(frame.locator('#inspect-dialog')).to_contain_text('Connected plan')
        frame.locator('[data-close="inspect-dialog"]').click()
        checks.append('Planning cards retain PRD and configuration lineage')
        frame.locator('.nav-window[data-nav="console"]').click()
        frame.locator('circle[data-metric="traces-1"]').click()
        expect(frame.locator('.private-table tr.selected')).to_have_count(1)
        frame.locator('#activity-dataset').select_option('runs')
        expect(frame.locator('.private-table')).to_contain_text('runs-1')
        page.evaluate('window.fail=true')
        frame.locator('[data-action="refresh"][data-key="atlas"]').click()
        expect(frame.locator('[data-status="atlas"]')).to_contain_text('Last successful records retained')
        expect(frame.locator('.private-table')).to_contain_text('runs-1')
        checks.append('Activity chart and table share selection, dataset filters and retained last-good reads')
        assert frame.locator('body').evaluate("() => {try{localStorage.setItem('private','x');return false;}catch{return true;}}")
        assert frame.locator('body').evaluate("() => {try{return !parent.document;}catch{return true;}}")
        assert page.evaluate("calls.every(m=>['atlas','planning','proposals','proposal','history','visualActive','visualOpen'].includes(m.view))")
        checks.append('Opaque frame denies parent/storage access and issues read-only operations')
        frame.locator('[data-view="gallery"]').click()
        expect(frame.locator('.gallery .window')).to_have_count(13)
        page.screenshot(path=str(out/'studio-desktop.png'),full_page=True)
        for width in [768,390]:
            page.set_viewport_size({'width':width,'height':900})
            assert frame.locator('body').evaluate('() => document.documentElement.scrollWidth<=innerWidth+1')
        page.screenshot(path=str(out/'studio-mobile.png'))
        checks.append('Desktop, tablet and mobile fit without page overflow')
        assert not errors, errors
        result={'ok':True,'checks':checks,'transport':'Synthetic private host; no production reads'}
        (out/'result.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(result),flush=True)
        browser.close()
    return result


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--html',type=Path)
    parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    if args.html is None:
        from render_forge_studio_private import render_private_studio
        fixture=Path(__file__).resolve().parents[1]/'fixtures/single-expert'
        profile=json.loads((fixture/'profile-page.json').read_text(encoding='utf-8'))
        profile['planning']={'tenant_id':'gbautomation','board_slug':'gbautomation'}
        content,_,_=render_private_studio(profile,asset_root=fixture)
        args.out.mkdir(parents=True,exist_ok=True)
        args.html=args.out/'index.html'
        args.html.write_text(content,encoding='utf-8')
    run(args.html,args.out)
