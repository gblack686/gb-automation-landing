"""Validate the connected design fixtures and browser journeys, not live services."""
import json
import sys
import traceback
from pathlib import Path
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parents[1]))
from resources.lib.tracing import trace_agent
checks=[];errors=[];requests=[];failure=None
def check(name,passed,detail=None):
    checks.append({'name':name,'passed':bool(passed),'detail':detail})
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
    assert passed,(name,detail)

@trace_agent('forge-connected-windows-validation',tags=['forge','design','data-contract','browser'],harness='codex')
def main():
    with sync_playwright() as p:
        browser=p.chromium.launch()
        context=browser.new_context(viewport={'width':1600,'height':1100},reduced_motion='reduce',accept_downloads=True)
        page=context.new_page();page.set_default_timeout(10000)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('requestfailed',lambda r:errors.append(r.url+': '+str(r.failure)))
        page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http:','https:')) else None)
        page.goto(ROOT.joinpath('index.html').as_uri(),wait_until='domcontentloaded')
        page.evaluate('document.fonts.ready')
        check('All 13 previews render in the collection',page.locator('.gallery .window').count()==13)
        check('Studio and canonical cream default',page.evaluate("Forge.S.design==='studio' && getComputedStyle(document.body).backgroundColor==='rgb(243, 241, 231)'"))
        check('Local fonts are loaded',page.evaluate("document.fonts.check('400 14px Inter') && document.fonts.check('400 24px Newsreader')"))
        check_data(page,'Initial normalized fixtures')
        page.screenshot(path=str(ROOT/'validation/gallery.png'),full_page=True)
        names=page.evaluate('Forge.defs.map(d=>d.id)')
        for name in names:
            page.locator(f'#window-nav [data-nav="{name}"]').click(no_wait_after=True)
            expect(page.locator(f'.window.full[data-window="{name}"]')).to_be_visible()
            check(name+' expanded view and data inspector',page.locator('.window.full .window-head [data-inspect-kind]').count()==1)
            page.screenshot(path=str(ROOT/f'validation/{name}-full.png'),full_page=True)
            page.get_by_role('button',name='Preview',exact=True).click(no_wait_after=True)
            expect(page.locator(f'.preview-wrap [data-window="{name}"]')).to_be_visible()
            page.screenshot(path=str(ROOT/f'validation/{name}-preview.png'),full_page=True)
        # Same content under every treatment, independently from light/dark mode.
        page.locator('#window-nav [data-nav="skills"]').click(no_wait_after=True)
        for design in ['studio','editorial','precision','glass','contrast']:
            page.select_option('#theme-select',design)
            page.screenshot(path=str(ROOT/f'validation/design-{design}.png'),full_page=True)
            page.locator('#mode-toggle').click(no_wait_after=True)
            check(design+' dark palette',page.evaluate("getComputedStyle(document.body).backgroundColor==='rgb(3, 4, 5)'"))
            page.screenshot(path=str(ROOT/f'validation/design-{design}-dark.png'),full_page=True)
            page.locator('#mode-toggle').click(no_wait_after=True)
        page.select_option('#theme-select','studio')
        # Every full view has an actual functioning search/filter control.
        for name in names:
            page.locator(f'#window-nav [data-nav="{name}"]').click(no_wait_after=True)
            searches=page.locator('.primary-area [data-search]')
            if searches.count():
                searches.first.fill('zz_no_such_record_zz')
                check(name+' empty search result',page.locator('.primary-area .empty').count()>0)
                page.locator('.primary-area [data-clear-filters]').first.click(no_wait_after=True)
        page.locator('#window-nav [data-nav="skills"]').click(no_wait_after=True)
        page.select_option('[data-filter="category"]','Quality')
        check('Skill category filter limits visible records',page.locator('.primary-area .cards .card').count()==1)
        page.locator('[data-clear-filters="skills"]').click(no_wait_after=True)
        # Follow a real skill -> run -> artifact chain and use Back.
        page.locator('[data-select="youtube-wiki-report"]').click(no_wait_after=True)
        page.locator('.relations [data-open-kind="runs"]').first.click(no_wait_after=True)
        check('Linked skill opens exact run',page.evaluate("Forge.S.window==='console' && Forge.chosen().skill_name==='youtube-wiki-report'"))
        page.locator('.primary-area [data-open-kind="artifacts"]').first.click(no_wait_after=True)
        check('Run opens producing artifact',page.evaluate("Forge.S.window==='artifacts' && Forge.chosen().artifact_id==='art_brief_v2'"))
        page.locator('[data-action="back"]').click(no_wait_after=True)
        check('Back restores exact run selection',page.evaluate("Forge.S.window==='console' && Forge.chosen().skill_name==='youtube-wiki-report'"))
        # Cross-workstream navigation updates scope without losing the target.
        page.select_option('#scope','prd_demo_weekly')
        page.evaluate("Forge.open('runs','10000000-0000-4000-8000-000000000004')")
        check('Linked navigation adjusts incompatible workstream',page.evaluate("Forge.S.scope==='prd_demo_health' && Forge.chosen().status==='error'"))
        page.select_option('#scope','all')
        # Context and literal input survive window/theme/size changes.
        page.locator('#window-nav [data-nav="knowledge"]').click(no_wait_after=True)
        page.locator('[data-select="src_transcript"]').click(no_wait_after=True)
        page.locator('[data-action="attach"]').click(no_wait_after=True)
        check('Second Brain attaches exact source to conversation',page.evaluate("Forge.S.window==='chat' && Forge.S.context.some(c=>c.id==='src_transcript')"))
        text='Inspect <script>literal</script> & "quotes"'
        page.locator('.composer textarea').fill(text)
        page.get_by_role('button',name='Preview',exact=True).click(no_wait_after=True)
        page.select_option('#theme-select','precision')
        page.get_by_role('button',name='Full screen',exact=True).click(no_wait_after=True)
        expect(page.locator('.composer textarea')).to_have_value(text)
        page.locator('[data-action="send"]').click(no_wait_after=True)
        check('Demo chat safely escapes input and creates linked response',page.locator('.messages script').count()==0 and text in page.locator('.messages').inner_text())
        page.select_option('#theme-select','studio')
        # Canvas family versions and per-version notes.
        page.evaluate("Forge.open('artifacts','art_brief_v2','canvas')")
        page.locator('[data-tab="compare"]').click(no_wait_after=True)
        check('Canvas compares actual versions from the same family',page.locator('.compare-docs .document').count()==2)
        page.locator('[data-input="note:art_brief_v2"]').fill('Keep the citation links.')
        page.locator('#window-nav [data-nav="artifacts"]').click(no_wait_after=True)
        page.evaluate("Forge.open('artifacts','art_brief_v2','canvas')")
        expect(page.locator('[data-input="note:art_brief_v2"]')).to_have_value('Keep the citation links.')
        # Draft -> proposal -> exact diff -> local decision.
        page.locator('#window-nav [data-nav="config"]').click(no_wait_after=True)
        page.locator('[data-config-field="video_cap"]').fill('8')
        page.locator('[data-config-field="scan_days"]').fill('10')
        page.locator('[data-action="save"]').click(no_wait_after=True)
        check('Saving config creates an exact two-field review',page.evaluate("Forge.S.window==='changes' && Forge.D.proposals.at(-1).ui.diff.length===2 && Forge.D.configs[0].ui.video_cap===5"))
        page.locator('[data-action="approve"]').click(no_wait_after=True)
        check('Demo approval updates proposal while source config stays unchanged',page.evaluate("Forge.chosen().state==='APPROVED' && Forge.D.proposals.at(-1).state==='approved' && Forge.D.configs[0].ui.video_cap===5"))
        check('No fake authorization event is minted',page.evaluate("Forge.D.approvals.every(e=>!['approved','ticket_redeemed'].includes(e.event_type))"))
        page.evaluate("Forge.open('intents','intent_brief')")
        page.locator('[data-action="approve"]').click(no_wait_after=True)
        check('Artifact review updates exact version and unlocks task',page.evaluate("Forge.find('artifacts','art_brief_v2').approval==='gb_approved' && Forge.find('tasks','task_review').status==='ready'"))
        page.evaluate("Forge.open('tasks','task_review')")
        page.locator('[data-action="complete"]').click(no_wait_after=True)
        check('Demo task completes after dependencies and review',page.evaluate("Forge.find('tasks','task_review').status==='done'"))
        # Run lineage and all three completion states.
        page.locator('#window-nav [data-nav="console"]').click(no_wait_after=True)
        previous=page.evaluate('Forge.D.artifacts.length')
        page.locator('[data-action="rerun"]').click(no_wait_after=True)
        page.get_by_role('button',name='Preview',exact=True).click(no_wait_after=True)
        page.locator('#window-nav [data-nav="artifacts"]').click(no_wait_after=True)
        page.wait_for_function('Forge.S.job===null')
        check('Job survives window changes and creates linked artifact',page.evaluate('Forge.D.artifacts.length')==previous+1)
        check_data(page,'Integrity after demo run and config review')
        page.locator('#window-nav [data-nav="console"]').click(no_wait_after=True)
        page.select_option('[data-setting="outcome"]','error')
        page.locator('[data-action="rerun"]').click(no_wait_after=True)
        page.wait_for_function('Forge.S.job===null')
        check('Error run has stderr and exit 1',page.evaluate("Forge.D.runs[0].status==='error' && Forge.D.runs[0].ui.exit===1"))
        page.locator('[data-tab="stderr"]').click(no_wait_after=True)
        check('stderr filter isolates error output','stdout' not in page.locator('.primary-area .terminal').inner_text())
        page.select_option('[data-setting="outcome"]','ok')
        page.locator('[data-action="rerun"]').click(no_wait_after=True)
        page.locator('[data-action="stop"]').click(no_wait_after=True)
        check('Stop preserves partial log without success',page.evaluate("Forge.D.runs[0].status==='cancelled' && Forge.D.runs[0].ui.lines.length>1"))
        # Readiness inspection preserves separate activation state.
        page.locator('#window-nav [data-nav="checks"]').click(no_wait_after=True)
        page.locator('[data-action="run"]').click(no_wait_after=True)
        page.wait_for_function('Forge.S.job===null')
        check('Check evidence updates without claiming live activation',page.evaluate("Forge.D.checks.filter(c=>c.state==='passed').length===7 && Forge.D.checks.at(-1).state==='pending'"))
        # Honest join classifications and local export.
        page.locator('.window-head [data-inspect-kind]').click(no_wait_after=True)
        expect(page.locator('#inspect-dialog')).to_be_visible()
        check('Inspector shows source names and join types','demo' in page.locator('#inspect-content').inner_text())
        page.keyboard.press('Escape')
        page.locator('#map-open').click(no_wait_after=True)
        check('Data map is rendered and has contract evidence',page.locator('#map-content .spine-svg').count()==1 and 'Conditional FK' in page.locator('#map-content').inner_text())
        page.screenshot(path=str(ROOT/'validation/data-map.png'),full_page=True)
        page.keyboard.press('Escape')
        with page.expect_download() as download:
            page.locator('#export-data').click(no_wait_after=True)
        payload=json.loads(Path(download.value.path()).read_text())
        check('Export is versioned and explicitly local',payload['schema_version']=='forge-window-projection.v1' and payload['demo'] and payload['runtime_authorized'] is False)
        # Every compact and expanded window fits mobile and desktop.
        for width in [1280,768,390,320]:
            page.set_viewport_size({'width':width,'height':1000})
            for name in names:
                page.evaluate(f"Forge.S.scope='all';Forge.S.filters={{}};Forge.navigate('{name}',null,false)")
                for mode in ['full','preview']:
                    page.evaluate('(mode)=>{Forge.S.view=mode;Forge.render()}',mode)
                    extent=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
                    check(f'{name} {mode} fits {width}px',extent['scroll']<=width,extent)
                    if width==390 and mode=='full':page.screenshot(path=str(ROOT/f'validation/{name}-390.png'),full_page=True)
            page.get_by_role('button',name='All windows',exact=True).click(no_wait_after=True)
            check(f'Collection fits {width}px',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        # Persisted state still points at real records after reload.
        page.reload(wait_until='domcontentloaded')
        check_data(page,'Integrity after reload')
        check('Draft retained after reload',page.evaluate("Forge.S.drafts.config.video_cap==='8'"))
        check('No browser or asset errors',not errors,errors)
        check('No remote page requests',not requests,requests)
        browser.close()

def check_data(page,label):
    result=page.evaluate("""()=>{const issues=[];for(const [kind,key] of Object.entries(Forge.C.keys)){const rows=Forge.D[kind];const seen=new Set();for(const r of rows){if(!r[key]||seen.has(r[key]))issues.push(kind+': duplicate/missing key');seen.add(r[key]);}}for(const [from,field,to] of Forge.C.relations){for(const r of Forge.D[from]){const v=Forge.get(r,field);if(v&&!Forge.find(to,v))issues.push(from+'.'+field+' -> '+v);}}for(const t of Forge.D.tasks){for(const dep of t.ui.depends_on)if(!Forge.find('tasks',dep))issues.push('Missing dependency '+dep);}return issues;}""")
    check(label,not result,result)

if __name__=='__main__':
    try:main()
    except Exception as e:
        failure=str(e)
        (ROOT/'validation/failure.txt').write_text(traceback.format_exc(),encoding='utf-8')
        raise
    finally:
        (ROOT/'validation/browser-checks.json').write_text(json.dumps({'schema_version':'forge-window-validation.v1','at':datetime.now(timezone.utc).isoformat(),'passed':failure is None and all(c['passed'] for c in checks),'checks':checks,'failure':failure,'errors':errors,'remote_requests':requests},indent=2),encoding='utf-8')
