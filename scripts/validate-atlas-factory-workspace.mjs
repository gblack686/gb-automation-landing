// Real canonical document + host + resource verifier. All data is synthetic;
// no credentials, real Cognito, production API or Mini connection are used.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeResourceService} from '../amplify/functions/forge-atlas/resources.mjs';
import {makeFactoryService} from '../amplify/functions/forge-atlas/factory.mjs';
import {runSearch} from '../amplify/functions/forge-atlas/search.mjs';
const root=process.env.FORGE_WORKSPACE_FIXTURES;
if(!root)throw Error('Set FORGE_WORKSPACE_FIXTURES to the canonical renderer fixture directory');
const base=process.env.FORGE_WORKSPACE_BASE||'http://127.0.0.1:5201';
const output='artifacts/atlas-factory-workspace-validation/'+new Date().toISOString().replace(/[:.]/g,'-');await mkdir(output,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const agents=['youtube-intel','news-agent'];const docs={},receipts={};
const outputOnly=process.env.FORGE_WORKSPACE_JOURNEY_OUTPUTS==='1';
const outputFixture=outputOnly?JSON.parse(await readFile(`${root}/journey-output-fixture.json`)):null;
let archivedUnavailable=false;
for(const id of agents){docs[id]=await readFile(`${root}/${id}.html`,'utf8');receipts[id]=JSON.parse(await readFile(`${root}/${id}.json`));}
const object=Buffer.from('<!doctype html><html><head></head><body><h1>Reviewed UI fixture</h1><button id="play" onclick="this.textContent=\'Playing\'">Play</button><script>try{parent.localStorage.getItem("x");document.body.dataset.parent="allowed"}catch{document.body.dataset.parent="denied"}</script></body></html>');
const asset={sha256:hash(object),key:`gbautomation/resources/artifacts/${hash(object)}.html`,bytes:object.length,media_type:'text/html',version_id:'fixture-v1'};
const artifactURL=`https://fixture.s3.us-east-1.amazonaws.com/${asset.key}?versionId=fixture-v1&X-Amz-Expires=60`;
const observed=new Date(Date.now()-3600_000).toISOString(),expires=new Date(Date.now()-60_000).toISOString();
const rows=agents.map(id=>({id:`ui.${id}.review`,title:`${id} reviewed UI`,kind:'ui',owner_expert:id,delivery_mode:'artifact',source_commit:'a'.repeat(40),content_sha256:asset.sha256,observed_at:observed,expires_at:expires,artifact:asset}));
rows.push({...rows[0],id:'ui.youtube-intel.unavailable',title:'Waiting for a published UI',delivery_mode:'unavailable',artifact:undefined,content_sha256:undefined});
const raw=Buffer.from(JSON.stringify({schema_version:'hosted-resource-delivery.v1',tenant_id:'gbautomation',source_commit:'a'.repeat(40),captured_at:observed,resources:rows}));
const resourceRead=makeResourceService({enabled:true,loadManifest:async pin=>{
 if(!outputOnly)return {bytes:raw,sha256:hash(raw)};
 const entry=outputFixture[pin?'archived':'current'],publication=entry.publication;
 if(pin&&(archivedUnavailable||pin.manifest_sha256!==publication.manifest_sha256||pin.manifest_version_id!==publication.manifest_version_id))throw Error('Archived manifest unavailable');
 return {bytes:Buffer.from(entry.manifest_bytes),sha256:publication.manifest_sha256,version_id:publication.manifest_version_id};
},describeArtifact:async artifact=>({url:outputOnly?`https://fixture.s3.us-east-1.amazonaws.com/${artifact.key}?versionId=${artifact.version_id}&X-Amz-Expires=60`:artifactURL})});
const factoryRead=makeFactoryService({enabled:true,load:async id=>{const bytes=await readFile(`${root}/${id}-factory.json`);return {bytes,sha256:hash(bytes)};}});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1500,height:1000}});page.setDefaultTimeout(20000);
const errors=[],checks=[],requests=[];let fail=false,tamper=false,holdArtifact=false,releaseArtifact=null,failFactory=false,foreignFactory=false;
let omitJourneys=false,foreignJourneys=false;
let records=false,holdHistory=false,releaseHistory=null,holdProposal=false,releaseProposal=null;
const planID='prd_'+'c'.repeat(20),sessionKey='fixture-host:'+ 's'.repeat(280);
// Total-suite bound grows with scenarios; individual actions still time out at 20s.
const watchdog=setTimeout(async()=>{await writeFile(output+'/timeout.json',JSON.stringify({ok:false,checks,errors,requests},null,2));console.error('Browser validation exceeded 210 seconds: '+output);process.exit(1);},210_000);
checks.push=(...items)=>{console.log(items.join('\n'));return Array.prototype.push.apply(checks,items);};
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/src/lib/forgeAtlasClient.js*',r=>r.fulfill({contentType:'application/javascript',body:`export async function readAtlas(view,query={},agent_id=null){const r=await fetch('/__workspace_fixture',{method:'POST',body:JSON.stringify({view,query,agent_id})});if(!r.ok)throw Error('Unavailable');return r.json();} export async function expertChat(){return {enabled:false}}`}));
await page.route('**/__workspace_fixture',async r=>{
 const x=r.request().postDataJSON();requests.push(x);
 if(x.view==='agents')return r.fulfill({json:{agents:agents.map(id=>({agent_id:id,display_name:id,config_sha256:receipts[id].yaml_sha256}))}});
 if(x.view==='document')return r.fulfill({json:{agent_id:x.agent_id,tenant_id:'gbautomation',url:`https://fixture.s3.us-east-1.amazonaws.com/gbautomation/${x.agent_id}/index.html`,sha256:hash(docs[x.agent_id]),bytes:Buffer.byteLength(docs[x.agent_id])}});
 if(fail)return r.fulfill({status:503,body:'Unavailable'});
 if(x.view==='approvalSnapshot')return r.fulfill({json:{mode:'live_read_only',workflows:[],connection:{tenant:'gbautomation',writes_enabled:false}}});
 if(x.view==='proposals')return r.fulfill({json:{rows:[],total:0}});
 if(x.view==='proposal'){
  if(holdProposal&&x.query.proposal_id==='prop_slow')await new Promise(resolve=>{releaseProposal=resolve;});
  return r.fulfill({json:{proposal_id:x.query.proposal_id,tenant_id:'gbautomation',agent_id:x.agent_id,card_title:x.query.proposal_id==='prop_review'?'Exact proposal outside first catalog page':x.query.proposal_id,source_type:'transcript',card_type:'expert-portfolio-proposal',state:'gated',summary:'Synthetic exact proposal detail',updated_at:observed}});
 }
 if(x.view==='planning')return r.fulfill({json:{schema_version:'forge-planning-snapshot.v1',tenant_id:'gbautomation',agent_id:x.agent_id,board_slug:'gbautomation',config_sha256:receipts[x.agent_id].yaml_sha256,captured_at:new Date().toISOString(),source:'supabase',prds:[{prd_id:planID,title:'Exact indexed plan',path:'second-brain/plans/fixture/report.html',status:'draft',updated_at:observed,config_sha256:receipts[x.agent_id].yaml_sha256,source:'prd_artifacts',body_sha256:'c'.repeat(64)}],cards:[],artifacts:[]}});
 if(x.view==='history'){
  if(holdHistory&&x.query.session_key==='slow-session')await new Promise(resolve=>{releaseHistory=resolve;});
  const message=x.query.session_key===sessionKey?'Exact long-key session message':x.query.session_key;
  return r.fulfill({json:{schema_version:'forge-history-page.v1',source:'supabase',tenant_id:'gbautomation',agent_id:x.agent_id,view:x.query.view,session_key:x.query.session_key||null,message_key:x.query.message_key||null,next:null,rows:x.query.view==='messages'?[{message_key:'message-'+x.query.session_key,seq:1,ts:observed,message_text:message,preview_truncated:false}]:[]}});
 }
 if(x.view==='factorySnapshot'){
  if(failFactory)return r.fulfill({status:503,body:'Factory fixture unavailable'});
  try{const data=await factoryRead({...x,config_sha256:receipts[x.agent_id].yaml_sha256});
   if(foreignFactory)data.agent_id='foreign-expert';
   if(omitJourneys)delete data.journey_evidence;
   if(foreignJourneys&&data.journey_evidence)data.journey_evidence.expert_id='gbautomation/youtube-intel';
   return r.fulfill({json:data});
  }catch{return r.fulfill({status:503,body:'Invalid factory fixture'});}
 }
 if(x.view==='search'){
  if(records){
   const adapters={proposal:async()=>({rows:[{id:'prop_review',kind:'proposal',title:'Reviewed exact proposal'},{id:planID,kind:'plan',title:'Reviewed exact plan'}]}),
    session:async()=>({rows:[{id:'intent-one',session_key:sessionKey,title:'Reviewed exact session'},{id:'legacy-intent',title:'Legacy session without explicit key'}]}),
    pr:async()=>({rows:[{id:'pr-fixture',title:'Shared PR',href:'https://github.com/gbauto/gbautomation/pull/1660'}]}),
    code:async()=>({rows:[{id:'code-fixture',title:'Shared code',href:'https://github.com/gbauto/gbautomation/blob/main/README.md#L1'}]})};
   return r.fulfill({json:await runSearch({agent_id:x.agent_id,query:x.query},adapters)});
  }
  if(x.query.source==='session')return r.fulfill({status:503,body:'Unavailable fixture source'});
  return r.fulfill({json:{schema_version:'forge-unified-search.v1',tenant_id:'gbautomation',agent_id:x.agent_id,query:x.query.query,
   coverage:{[x.query.source]:'available'},results:[{id:x.query.source+'-fixture',source:x.query.source,title:'Reviewed '+x.query.source+' evidence',snippet:'Synthetic search result'}]}});
 }
 if(['resourceCatalog','resourceArtifact'].includes(x.view)){
  if(x.view==='resourceArtifact'&&holdArtifact)await new Promise(resolve=>{releaseArtifact=resolve;});
  try{return r.fulfill({json:await resourceRead(x)});}catch{return r.fulfill({status:503,body:'Unavailable'});}
 }
 return r.fulfill({status:503,body:'Fixture lane unavailable'});
});
await page.route('https://fixture.s3.us-east-1.amazonaws.com/**',r=>{
 const url=new URL(r.request().url());
 const id=agents.find(id=>url.pathname===`/gbautomation/${id}/index.html`);
 const saved=outputOnly?Object.values(outputFixture).find(v=>v?.manifest_bytes&&url.pathname.endsWith(JSON.parse(v.manifest_bytes).resources[0].artifact.key))?.content:null;
 const body=saved===null||saved===undefined?object:Buffer.from(saved);
 return r.fulfill({contentType:'text/html',body:id?docs[id]:tamper?Buffer.alloc(body.length,32):body,headers:{'Access-Control-Allow-Origin':base}});
});
const current=()=>page.frameLocator('iframe[title$=" Atlas"]');
// DOM visibility alone allows offscreen or clipped text to pass. Check the
// iframe viewport and every scrolling/clipping ancestor before accepting it.
async function visibleEvidence(locator){
 const deadline=Date.now()+5000;let observation;
 do{
  observation=await locator.evaluate(el=>{
   const r=el.getBoundingClientRect();let left=0,top=0,right=innerWidth,bottom=innerHeight;
   for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),box=p.getBoundingClientRect();
    if(/auto|scroll|hidden|clip/.test(s.overflowX)){left=Math.max(left,box.left);right=Math.min(right,box.right);}
    if(/auto|scroll|hidden|clip/.test(s.overflowY)){top=Math.max(top,box.top);bottom=Math.min(bottom,box.bottom);}
   }
   const cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2,hit=document.elementFromPoint(cx,cy);
   return {visible:r.width>0&&r.height>0&&r.left>=left-1&&r.right<=right+1&&r.top>=top-1&&r.bottom<=bottom+1&&!!hit&&(el.contains(hit)||hit.contains(el)),rect:r.toJSON(),clip:{left,top,right,bottom},hit:hit?.className};
  });
  const box=await locator.boundingBox(),viewport=page.viewportSize();
  if(observation.visible&&box&&box.y>=0&&box.y+box.height<=viewport.height+1)return;
  await page.waitForTimeout(20);
 }while(Date.now()<deadline);
 assert.fail('Evidence is clipped, covered or outside the viewport: '+locator+' '+JSON.stringify(observation));
}
try{
 if(outputOnly){
  await page.goto(base+'/bench/youtube-intel?window=factory');let frame=current();
  const factory=frame.locator('#window-factory');await factory.getByRole('status').filter({hasText:'Stale saved evidence'}).waitFor();
  await factory.getByRole('button',{name:'Expert journeys',exact:true}).click();
  const journey=factory.locator('[data-journey-id="yt_'+ '1'.repeat(24)+'"]');
  await journey.locator('.factory-journey-detail > summary').click();await journey.locator('.factory-journey-output > summary').click();
  const open=journey.getByRole('button',{name:'Open saved output',exact:true});await open.focus();await page.keyboard.press('Enter');
  const result=frame.frameLocator('iframe[title="Output output-0 saved result"]');
  await result.getByRole('heading',{name:'Captured output v1',exact:true}).waitFor();
  await result.getByRole('button',{name:'Play',exact:true}).click();await result.getByRole('button',{name:'Playing',exact:true}).waitFor();
  assert.equal(await result.getByText('Newer output v2',{exact:true}).count(),0);
  const pinned=requests.filter(x=>x.view==='resourceArtifact');assert(pinned.length);
  assert(pinned.every(x=>x.query.catalog_sha256===outputFixture.archived.publication.manifest_sha256&&x.query.catalog_version_id===outputFixture.archived.publication.manifest_version_id));
  checks.push('Keyboard journey output opens exact archived bytes in an existing sandboxed app window while the newer catalog is active');
  await page.screenshot({path:output+'/journey-output-desktop.png'});
  await frame.getByRole('button',{name:'Refresh saved result',exact:true}).click();await result.getByRole('heading',{name:'Captured output v1',exact:true}).waitFor();
  archivedUnavailable=true;await frame.getByRole('button',{name:'Refresh saved result',exact:true}).click();
  await frame.getByText('The saved result could not be verified. Refresh to retry.',{exact:true}).waitFor();
  assert.equal(await frame.locator('iframe[title="Output output-0 saved result"]').count(),0);
  archivedUnavailable=false;tamper=true;await frame.getByRole('button',{name:'Refresh saved result',exact:true}).click();
  await frame.getByText('The saved result could not be verified. Refresh to retry.',{exact:true}).waitFor();
  assert.equal(await frame.locator('iframe[title="Output output-0 saved result"]').count(),0);tamper=false;
  await frame.getByRole('button',{name:'Refresh saved result',exact:true}).click();await result.getByRole('heading',{name:'Captured output v1',exact:true}).waitFor();
  checks.push('Retry stays on the pinned version; missing archives and changed bytes never fall back to a newer output');
  await page.setViewportSize({width:390,height:844});await visibleEvidence(frame.locator('.expert-app-window').getByRole('button',{name:'Refresh saved result',exact:true}));
  await page.screenshot({path:output+'/journey-output-mobile.png'});
  await frame.getByRole('button',{name:'Close app window',exact:true}).click();
  await frame.locator('body').evaluate(()=>ForgeWorkspace.open('factory'));
  assert.equal(await factory.locator('[data-journey-id="yt_'+ '2'.repeat(24)+'"]').getByRole('button',{name:'Open saved output',exact:true}).count(),0);
  checks.push('Mobile saved output remains usable; unverified partial output has no invented link');
  holdArtifact=true;releaseArtifact=null;await open.click();
  for(let i=0;i<100&&!releaseArtifact;i++)await page.waitForTimeout(20);assert(releaseArtifact);
  await page.getByLabel('Registered agents').selectOption('news-agent');
  await current().locator('#window-factory').waitFor();holdArtifact=false;releaseArtifact();
  assert.equal(await current().locator('iframe[title="Output output-0 saved result"]').count(),0);
  checks.push('Switching experts fences delayed archived output replies');
 }else{
 await page.goto(base+'/bench/youtube-intel?window=resources',{waitUntil:'domcontentloaded'});
 let frame=current();await frame.getByRole('button',{name:'Open in window',exact:true}).waitFor();
 assert.equal(await frame.locator('.window').count(),20);
 assert(requests.some(x=>x.view==='resourceCatalog'&&x.query.owner==='youtube-intel'));
 assert.equal(await frame.getByText('news-agent reviewed UI',{exact:true}).count(),0);
 checks.push('All 18 original Atlas windows retained plus expert resources and Factory; exact owner filtering');
 const hostResources=page.getByRole('button',{name:'Expert resources',exact:true});
 assert.equal(await hostResources.count(),1);
 assert(await hostResources.evaluate(el=>!!el.closest('.forge-host-header nav')));
 await hostResources.focus();await page.keyboard.press('Enter');
 await page.getByRole('dialog',{name:'Expert resources',exact:true}).waitFor();
 await page.getByRole('button',{name:'Close expert resources'}).click();
 assert(await hostResources.evaluate(el=>document.activeElement===el));
 checks.push('Keyboard host resource access stays in the header and returns focus after closing');
 await frame.getByRole('button',{name:'Open in window',exact:true}).click();
 const result=frame.frameLocator('iframe[title="youtube-intel reviewed UI saved result"]');
 await result.getByRole('heading',{name:'Reviewed UI fixture'}).waitFor();
 await result.getByRole('button',{name:'Play',exact:true}).click();await result.getByRole('button',{name:'Playing'}).waitFor();
 assert.equal(await result.locator('body').getAttribute('data-parent'),'denied');
 await frame.getByText(/Stale saved result ·/).waitFor();
 checks.push('Interactive saved UI inside Atlas; nested frame cannot read parent storage; original capture remains stale');
 await page.screenshot({path:output+'/desktop.png'});
 await frame.getByRole('button',{name:'Close app window',exact:true}).click();
 assert.equal(await frame.locator('iframe[title="youtube-intel reviewed UI saved result"]').count(),0);
 checks.push('Closing an app releases its window and returns keyboard focus to resources');
 holdArtifact=true;releaseArtifact=null;
 await frame.getByRole('button',{name:'Open in window',exact:true}).click();
 await assert.doesNotReject(async()=>{for(let i=0;i<100&&!releaseArtifact;i++)await page.waitForTimeout(20);assert(releaseArtifact);});
 await page.getByLabel('Registered agents').selectOption('news-agent');
 await current().getByRole('button',{name:'Open in window',exact:true}).waitFor();
 holdArtifact=false;releaseArtifact();
 assert.equal(await current().locator('iframe[title="youtube-intel reviewed UI saved result"]').count(),0);
 checks.push('Delayed artifact response from previous expert is fenced after expert switching');
 // Resolve a resource directly after reload, including its owning expert.
 await page.goto(base+'/bench/news-agent/?window=resources&resource=ui.news-agent.review');
 frame=current();await frame.frameLocator('iframe[title="news-agent reviewed UI saved result"]').getByRole('heading',{name:'Reviewed UI fixture'}).waitFor();
 assert.equal(await page.getByLabel('Registered agents').inputValue(),'news-agent');
 checks.push('Exact expert/resource deep link, including trailing slash, opens the saved app after a full reload');
 await page.getByLabel('Registered agents').selectOption('youtube-intel');
 frame=current();await frame.getByRole('button',{name:'Open in window',exact:true}).waitFor();
 assert.equal(await frame.locator('iframe[title="news-agent reviewed UI saved result"]').count(),0);
 assert.equal(new URL(page.url()).pathname,'/bench/youtube-intel');
 const before=requests.length;
 assert.equal(await frame.locator('body').evaluate(async digest=>{try{await ForgeHost.read('workspaceArtifact',{resource_id:'ui.news-agent.review',catalog_sha256:digest});return false;}catch{return true;}},hash(raw)),true);
 checks.push('Expert switching clears old document and app frames; forged cross-owner artifact denied');
 await frame.getByLabel('Search expert resources').fill('missing query');
 await frame.locator('#window-resources').getByRole('button',{name:'Search',exact:true}).click();
 await frame.getByText('No resources match these filters.',{exact:true}).waitFor();
 fail=true;await frame.getByRole('button',{name:'Refresh',exact:true}).click();await frame.getByText(/Resources could not load/).waitFor();fail=false;
 checks.push('Explicit deterministic search and honest failure versus empty-result states');
 await frame.getByLabel('Search expert resources').fill('reviewed');
 await frame.getByLabel('Resource type').selectOption('all');
 await frame.getByText('Reviewed proposal evidence',{exact:true}).waitFor();
 await frame.getByText(/session: unavailable/).waitFor();
 assert(requests.filter(x=>x.view==='search').every(x=>x.agent_id==='youtube-intel'&&x.query.source!=='all'));
 const searchCount=requests.filter(x=>x.view==='search').length;
 await frame.getByLabel('Search expert resources').fill('typing only');await page.waitForTimeout(350);
 assert.equal(requests.filter(x=>x.view==='search').length,searchCount);
 await frame.getByLabel('Search expert resources').fill('reviewed');
 await frame.getByRole('button',{name:'Open in window',exact:true}).click();
 await frame.frameLocator('iframe[title="youtube-intel reviewed UI saved result"]').getByRole('heading',{name:'Reviewed UI fixture'}).waitFor();
 await frame.getByRole('button',{name:'Close app window',exact:true}).click();
 checks.push('Unified search combines owned resources and existing work sources, labels partial failure, and performs no reads while typing');
 records=true;await frame.locator('#window-resources').getByRole('button',{name:'Search',exact:true}).click();
 await frame.getByRole('button',{name:'Open proposal',exact:true}).waitFor();
 assert.equal(await frame.getByRole('link',{name:'Open pull request ↗'}).getAttribute('href'),'https://github.com/gbauto/gbautomation/pull/1660');
 assert.equal(await frame.getByRole('link',{name:'Open code location ↗'}).getAttribute('href'),'https://github.com/gbauto/gbautomation/blob/main/README.md#L1');
 assert.equal(await frame.locator('.expert-resource-card').filter({hasText:'Legacy session without explicit key'}).getByRole('button').count(),0);
 await frame.getByRole('button',{name:'Open proposal',exact:true}).focus();await page.keyboard.press('Enter');
 await frame.locator('#forge-approval-dialog').getByRole('heading',{name:'Exact proposal outside first catalog page'}).waitFor();
 assert(await frame.locator('#forge-approval-dialog [data-native-accept]').isDisabled());
 await visibleEvidence(frame.locator('#forge-approval-dialog h2'));
 await page.screenshot({path:output+'/record-proposal.png'});
 await frame.locator('#forge-approval-dialog .dialog-close').click();
 await frame.locator('body').evaluate(()=>ForgeWorkspace.open('resources'));
 await frame.getByRole('button',{name:'Open plan',exact:true}).click();
 await frame.locator('#planning-dialog-title').filter({hasText:'Exact indexed plan'}).waitFor();
 await frame.getByText('The plan file is not included in this offline package. Its scoped index record is available below.',{exact:true}).waitFor();
 await visibleEvidence(frame.locator('#planning-dialog-title'));
 await page.screenshot({path:output+'/record-plan.png'});
 await frame.locator('#planning-dialog').evaluate(el=>el.close());
 await frame.locator('body').evaluate(()=>ForgeWorkspace.open('resources'));
 await frame.getByRole('button',{name:'Open session',exact:true}).click();
 await frame.locator('#history-rows').getByText('Exact long-key session message',{exact:true}).waitFor();
 assert.equal(await frame.locator('#history-breadcrumb p').textContent(),sessionKey);
 checks.push('Keyboard search opens exact proposal outside catalog page, typed plan index and untruncated session; writes stay disabled, legacy destinations unavailable, shared PR/code links exact');
 holdHistory=true;
 await frame.locator('body').evaluate(()=>{window.slowHistory=ForgeHistory.refresh({view:'messages',session_key:'slow-session'});});
 for(let i=0;i<100&&!releaseHistory;i++)await page.waitForTimeout(20);assert(releaseHistory);
 await frame.locator('body').evaluate(()=>ForgeHistory.refresh({view:'messages',session_key:'newest-session'}));
 releaseHistory();await frame.locator('body').evaluate(()=>window.slowHistory);holdHistory=false;
 assert.equal(await frame.locator('#history-breadcrumb p').textContent(),'newest-session');
 holdProposal=true;
 await frame.locator('body').evaluate(()=>{window.slowProposal=ForgeApprovals.open('prop_slow');});
 for(let i=0;i<100&&!releaseProposal;i++)await page.waitForTimeout(20);assert(releaseProposal);
 await frame.locator('body').evaluate(()=>ForgeApprovals.open('prop_newest'));
 releaseProposal();await frame.locator('body').evaluate(()=>window.slowProposal);holdProposal=false;
 assert.equal(await frame.locator('#forge-approval-dialog h2').textContent(),'prop_newest');
 await frame.locator('#forge-approval-dialog .dialog-close').click();
 checks.push('Late history/proposal responses cannot replace a newer selected record across the real host channel');
 await page.setViewportSize({width:390,height:844});
 await frame.locator('body').evaluate(()=>ForgeWorkspace.open('resources'));
 await frame.getByRole('button',{name:'Open proposal',exact:true}).click();
 await frame.locator('#forge-approval-dialog h2').filter({hasText:'Exact proposal outside first catalog page'}).waitFor();
 await visibleEvidence(frame.locator('#forge-approval-dialog h2'));
 assert(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert(await page.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const signOutBox=await page.getByRole('button',{name:'Sign out',exact:true}).boundingBox();assert(signOutBox.x>=0&&signOutBox.x+signOutBox.width<=390);
 await page.screenshot({path:output+'/record-mobile.png',fullPage:true});
 await frame.locator('#forge-approval-dialog .dialog-close').click();
 await page.setViewportSize({width:1500,height:1000});
 await frame.locator('body').evaluate(()=>ForgeWorkspace.open('resources'));records=false;
 checks.push('Exact proposal review is readable at 390px with no horizontal document overflow');
 await frame.getByLabel('Resource type').selectOption('ui');
 await frame.getByLabel('Search expert resources').fill('reviewed');await frame.locator('#window-resources').getByRole('button',{name:'Search',exact:true}).click();
 await frame.getByRole('button',{name:'Open in window',exact:true}).waitFor();tamper=true;
 await frame.getByRole('button',{name:'Open in window',exact:true}).click();await frame.getByText(/saved result could not be verified/).waitFor();tamper=false;
 checks.push('Altered saved-result bytes rejected before nested scripts execute');
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/bench/news-agent?window=resources');frame=current();await frame.getByRole('button',{name:'Open in window',exact:true}).waitFor();
 await frame.getByRole('button',{name:'Open in window',exact:true}).click();await frame.frameLocator('iframe[title="news-agent reviewed UI saved result"]').getByRole('heading',{name:'Reviewed UI fixture'}).waitFor();
 assert(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:output+'/mobile.png',fullPage:true});
 checks.push('390px mobile document and owned app operate without horizontal overflow');
 await page.setViewportSize({width:1500,height:1000});
 await page.goto(base+'/bench/news-agent?window=factory');frame=current();
 const factory=frame.locator('#window-factory');
 await writeFile(output+'/factory-layout.json',JSON.stringify(await factory.evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),stage:document.getElementById('workspace').getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight],states:ForgePreview.states(),styles:getComputedStyle(document.body).cssText,body:document.body.className,scroll:[scrollX,scrollY]})),null,2));
 await factory.getByRole('heading',{name:'Shared Pi seat'}).waitFor();
 await factory.getByText('pending · 1 / 2 acceptance checks proven',{exact:true}).waitFor();
 await factory.getByText(/Proposed target · 100 %/).waitFor();
 await factory.getByText(/missed · 80 %/).waitFor();
 await factory.getByText(/pending · Unknown minutes/).waitFor();
 await factory.getByRole('status').filter({hasText:'Stale saved evidence'}).waitFor();
 await visibleEvidence(factory.getByText('pending · 1 / 2 acceptance checks proven',{exact:true}));
 const desktopBox=await factory.boundingBox();assert(desktopBox.width>1000&&desktopBox.height>500);
 assert.equal(await factory.getByText('Reviewed youtube-intel quest',{exact:true}).count(),0);
 await page.screenshot({path:output+'/factory-desktop.png'});
 checks.push('Factory displays verified goal progress, owned quests, shared Pi seat totals and proposed/missed/pending targets distinctly');
 await factory.getByRole('button',{name:'Expert journeys',exact:true}).click();
 const newsJourney=factory.locator('[data-journey-id="news-card-8"]');
 const inspect=newsJourney.locator('.factory-journey-detail > summary');await inspect.focus();await page.keyboard.press('Enter');
 await newsJourney.getByText('Tool task: 104',{exact:true}).waitFor();
 await newsJourney.getByText('Recorded model cost: Unknown',{exact:true}).waitFor();
 await newsJourney.getByText(/Tokens: 1,030 recorded total/).waitFor();
 assert.equal(await newsJourney.getByRole('link').count(),0);
 await newsJourney.locator('.factory-journey-output > summary').click();
 await newsJourney.getByText('Hosted output: Exact output link has not been published.',{exact:true}).waitFor();
 await newsJourney.getByRole('heading',{name:'News card 8'}).evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 await visibleEvidence(newsJourney.getByRole('heading',{name:'News card 8'}));
 await page.screenshot({path:output+'/journey-desktop.png'});
 await newsJourney.getByRole('button',{name:'View expert targets (aggregate)',exact:true}).click();
 await visibleEvidence(factory.getByRole('heading',{name:'Measured targets',exact:true}));
 checks.push('Keyboard journey inspection reveals exact work/output/collector IDs, generation-only metrics and unknown cost; aggregate targets remain separate and no output/trace URL is invented');
 foreignJourneys=true;await factory.getByRole('button',{name:'Refresh factory evidence'}).click();
 await factory.getByRole('status').filter({hasText:'Refresh unavailable. Keeping saved evidence captured'}).waitFor();foreignJourneys=false;
 assert.equal(await factory.locator('[data-journey-id="news-card-8"]').count(),1);
 checks.push('Foreign nested journey owner is rejected while last-good evidence remains labeled');
 failFactory=true;await factory.getByRole('button',{name:'Refresh factory evidence'}).click();
 await factory.getByRole('status').filter({hasText:'Refresh unavailable. Keeping saved evidence captured'}).waitFor();
 await factory.getByRole('heading',{name:'Shared Pi seat'}).waitFor();failFactory=false;
 console.log('Failed-refresh retention checked');
 foreignFactory=true;await factory.getByRole('button',{name:'Refresh factory evidence'}).click();
 await factory.getByRole('status').filter({hasText:'Refresh unavailable. Keeping saved evidence captured'}).waitFor();foreignFactory=false;
 checks.push('Failed or foreign factory refresh retains last-good capture without relabeling it live');
 await factory.getByRole('heading',{name:'Shared Pi seat'}).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
 await page.setViewportSize({width:390,height:844});
 console.log('Factory viewport changed to mobile');
 await visibleEvidence(factory.getByRole('heading',{name:'Shared Pi seat'}));
 const progress=factory.getByText('pending · 1 / 2 acceptance checks proven',{exact:true});
 await progress.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await visibleEvidence(progress);
 assert(await factory.locator('..').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:output+'/factory-mobile.png',fullPage:true});
 const missed=factory.getByText(/missed · 80 %/);await missed.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await visibleEvidence(missed);
 await page.screenshot({path:output+'/factory-mobile-targets.png'});
 await page.goto(base+'/bench/news-agent?window=factory');frame=current();
 await frame.locator('#window-factory').getByRole('heading',{name:'Shared Pi seat'}).waitFor();
 await visibleEvidence(frame.locator('#window-factory').getByRole('heading',{name:'Shared Pi seat'}));
 checks.push('Factory focus survives desktop-to-mobile resize and fresh mobile deep link; goals and missed targets are visible after scrolling at 390px');
 const mobileFactory=frame.locator('#window-factory');
 await mobileFactory.getByRole('button',{name:'Expert journeys',exact:true}).click();
 const mobileJourney=mobileFactory.locator('[data-journey-id="news-card-8"]');
 await mobileJourney.locator('.factory-journey-detail > summary').click();
 const cost=mobileJourney.getByText('Recorded model cost: Unknown',{exact:true});
 await cost.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await visibleEvidence(cost);
 assert(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:output+'/journey-mobile-news.png'});
 await page.goto(base+'/bench/youtube-intel?window=factory');frame=current();
 const ytFactory=frame.locator('#window-factory');await ytFactory.getByRole('status').filter({hasText:'Stale saved evidence'}).waitFor();
 await ytFactory.getByRole('button',{name:'Expert journeys',exact:true}).click();
 const partial=ytFactory.locator('[data-journey-id="yt_'+ '2'.repeat(24)+'"]');
 await partial.getByText('Recorded run: partial · Target acceptance: pending',{exact:true}).waitFor();
 await partial.locator('.factory-journey-detail > summary').click();
 const unverified=partial.locator('.factory-journey-output > summary');await unverified.click();
 await unverified.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await visibleEvidence(unverified);
 assert.match(await unverified.innerText(),/Artifact unverified/);
 assert(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:output+'/journey-mobile-youtube.png'});
 checks.push('News generation details and partial YouTube output remain readable at 390px; failed verification and pending acceptance remain visible');
 omitJourneys=true;await ytFactory.getByRole('button',{name:'Refresh factory evidence'}).click();
 await ytFactory.getByText('Native journey evidence has not been published for this expert.',{exact:true}).waitFor();
 assert.equal(await ytFactory.locator('[data-journey-id]').count(),0);omitJourneys=false;
 checks.push('Older snapshots explicitly report unavailable journeys instead of zero successes or invented history');
 for(const mode of ['bench','atlas']){
  await page.goto(base+'/'+mode+'/youtube-intel?window=factory');frame=current();
  await frame.locator('#window-factory').getByRole('status').filter({hasText:'Stale saved evidence'}).waitFor();
  const launcher=page.getByRole('button',{name:'Expert resources',exact:true});
  assert(await launcher.evaluate(el=>!!el.closest('.forge-host-header nav')));
  const geometry=await page.locator('.forge-host-header nav').evaluate(nav=>[...nav.children].map(e=>e.getBoundingClientRect().toJSON()));
  for(let i=0;i<geometry.length;i++){
   const a=geometry[i];assert(a.x>=0&&a.right<=390&&a.width>0&&a.height>0);
   for(let j=i+1;j<geometry.length;j++){const b=geometry[j];assert(Math.min(a.right,b.right)<=Math.max(a.left,b.left)||Math.min(a.bottom,b.bottom)<=Math.max(a.top,b.top),'Header controls overlap');}
  }
  await launcher.click();await page.getByRole('dialog',{name:'Expert resources',exact:true}).waitFor();
  await page.getByRole('button',{name:'Close expert resources'}).click();
  const dock=await frame.locator('#dock').boundingBox();assert(dock);
  assert(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName==='IFRAME',{x:350,y:dock.y+dock.height/2}),'Host launcher covers the dock');
  await page.screenshot({path:output+'/header-resources-'+mode+'-mobile.png'});
 }
 checks.push('Bench and legacy Atlas keep mobile resource access in a nonoverlapping header with an unobstructed dock');
 await page.goto(base+'/bench/unregistered-expert?window=resources');
 await page.getByRole('status').filter({hasText:'This expert is not registered for your account.'}).waitFor();
 assert.equal(await page.locator('iframe[title$=" Atlas"]').count(),0);
 checks.push('Unknown requested expert cannot silently open a different registered expert');
 }
 assert.deepEqual(errors,[]);
 await writeFile(output+'/validation.json',JSON.stringify({ok:true,checks,fixture:true,productionAcceptance:false,sourceDocuments:Object.fromEntries(agents.map(id=>[id,hash(docs[id])]))},null,2));
 console.log(JSON.stringify({ok:true,checks}));
}catch(error){await page.screenshot({path:output+'/failure.png'}).catch(()=>{});await writeFile(output+'/failure.json',JSON.stringify({ok:false,error:String(error),errors,checks,requests},null,2));throw error;}
finally{clearTimeout(watchdog);releaseArtifact?.();releaseHistory?.();releaseProposal?.();await page.unrouteAll({behavior:'ignoreErrors'});await browser.close();}
