// Real canonical document + host + resource verifier. All data is synthetic;
// no credentials, real Cognito, production API or Mini connection are used.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeResourceService} from '../amplify/functions/forge-atlas/resources.mjs';
import {makeFactoryService} from '../amplify/functions/forge-atlas/factory.mjs';
const root=process.env.FORGE_WORKSPACE_FIXTURES;
if(!root)throw Error('Set FORGE_WORKSPACE_FIXTURES to the canonical renderer fixture directory');
const base=process.env.FORGE_WORKSPACE_BASE||'http://127.0.0.1:5201';
const output='artifacts/atlas-factory-workspace-validation/'+new Date().toISOString().replace(/[:.]/g,'-');await mkdir(output,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const agents=['youtube-intel','news-agent'];const docs={},receipts={};
for(const id of agents){docs[id]=await readFile(`${root}/${id}.html`,'utf8');receipts[id]=JSON.parse(await readFile(`${root}/${id}.json`));}
const object=Buffer.from('<!doctype html><html><head></head><body><h1>Reviewed UI fixture</h1><button id="play" onclick="this.textContent=\'Playing\'">Play</button><script>try{parent.localStorage.getItem("x");document.body.dataset.parent="allowed"}catch{document.body.dataset.parent="denied"}</script></body></html>');
const asset={sha256:hash(object),key:`gbautomation/resources/artifacts/${hash(object)}.html`,bytes:object.length,media_type:'text/html',version_id:'fixture-v1'};
const artifactURL=`https://fixture.s3.us-east-1.amazonaws.com/${asset.key}?versionId=fixture-v1&X-Amz-Expires=60`;
const observed=new Date(Date.now()-3600_000).toISOString(),expires=new Date(Date.now()-60_000).toISOString();
const rows=agents.map(id=>({id:`ui.${id}.review`,title:`${id} reviewed UI`,kind:'ui',owner_expert:id,delivery_mode:'artifact',source_commit:'a'.repeat(40),content_sha256:asset.sha256,observed_at:observed,expires_at:expires,artifact:asset}));
rows.push({...rows[0],id:'ui.youtube-intel.unavailable',title:'Waiting for a published UI',delivery_mode:'unavailable',artifact:undefined,content_sha256:undefined});
const raw=Buffer.from(JSON.stringify({schema_version:'hosted-resource-delivery.v1',tenant_id:'gbautomation',source_commit:'a'.repeat(40),captured_at:observed,resources:rows}));
const resourceRead=makeResourceService({enabled:true,loadManifest:async()=>({bytes:raw,sha256:hash(raw)}),describeArtifact:async()=>({url:artifactURL})});
const factoryRead=makeFactoryService({enabled:true,load:async id=>{const bytes=await readFile(`${root}/${id}-factory.json`);return {bytes,sha256:hash(bytes)};}});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1500,height:1000}});page.setDefaultTimeout(20000);
const errors=[],checks=[],requests=[];let fail=false,tamper=false,holdArtifact=false,releaseArtifact=null,failFactory=false,foreignFactory=false;
const watchdog=setTimeout(async()=>{await writeFile(output+'/timeout.json',JSON.stringify({ok:false,checks,errors,requests},null,2));console.error('Browser validation exceeded 150 seconds: '+output);process.exit(1);},150_000);
checks.push=(...items)=>{console.log(items.join('\n'));return Array.prototype.push.apply(checks,items);};
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/src/lib/forgeAtlasClient.js*',r=>r.fulfill({contentType:'application/javascript',body:`export async function readAtlas(view,query={},agent_id=null){const r=await fetch('/__workspace_fixture',{method:'POST',body:JSON.stringify({view,query,agent_id})});if(!r.ok)throw Error('Unavailable');return r.json();} export async function expertChat(){return {enabled:false}}`}));
await page.route('**/__workspace_fixture',async r=>{
 const x=r.request().postDataJSON();requests.push(x);
 if(x.view==='agents')return r.fulfill({json:{agents:agents.map(id=>({agent_id:id,display_name:id,config_sha256:receipts[id].yaml_sha256}))}});
 if(x.view==='document')return r.fulfill({json:{agent_id:x.agent_id,tenant_id:'gbautomation',url:`https://fixture.s3.us-east-1.amazonaws.com/gbautomation/${x.agent_id}/index.html`,sha256:hash(docs[x.agent_id]),bytes:Buffer.byteLength(docs[x.agent_id])}});
 if(fail)return r.fulfill({status:503,body:'Unavailable'});
 if(x.view==='factorySnapshot'){
  if(failFactory)return r.fulfill({status:503,body:'Factory fixture unavailable'});
  try{const data=await factoryRead({...x,config_sha256:receipts[x.agent_id].yaml_sha256});
   if(foreignFactory)data.agent_id='foreign-expert';
   return r.fulfill({json:data});
  }catch{return r.fulfill({status:503,body:'Invalid factory fixture'});}
 }
 if(x.view==='search'){
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
 return r.fulfill({contentType:'text/html',body:id?docs[id]:tamper?Buffer.alloc(object.length,32):object,headers:{'Access-Control-Allow-Origin':base}});
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
 await page.goto(base+'/bench/youtube-intel?window=resources',{waitUntil:'domcontentloaded'});
 let frame=current();await frame.getByRole('button',{name:'Open in window',exact:true}).waitFor();
 assert.equal(await frame.locator('.window').count(),20);
 assert(requests.some(x=>x.view==='resourceCatalog'&&x.query.owner==='youtube-intel'));
 assert.equal(await frame.getByText('news-agent reviewed UI',{exact:true}).count(),0);
 checks.push('All 18 original Atlas windows retained plus expert resources and Factory; exact owner filtering');
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
 await frame.getByRole('button',{name:'Search',exact:true}).click();
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
 await frame.getByLabel('Resource type').selectOption('ui');
 await frame.getByLabel('Search expert resources').fill('reviewed');await frame.getByRole('button',{name:'Search',exact:true}).click();
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
 failFactory=true;await factory.getByRole('button',{name:'Refresh factory evidence'}).click();
 await factory.getByRole('status').filter({hasText:'Refresh unavailable. Keeping saved evidence captured'}).waitFor();
 await factory.getByRole('heading',{name:'Shared Pi seat'}).waitFor();failFactory=false;
 console.log('Failed-refresh retention checked');
 foreignFactory=true;await factory.getByRole('button',{name:'Refresh factory evidence'}).click();
 await factory.getByRole('status').filter({hasText:'Refresh unavailable. Keeping saved evidence captured'}).waitFor();foreignFactory=false;
 checks.push('Failed or foreign factory refresh retains last-good capture without relabeling it live');
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
 await page.goto(base+'/bench/unregistered-expert?window=resources');
 await page.getByRole('status').filter({hasText:'This expert is not registered for your account.'}).waitFor();
 assert.equal(await page.locator('iframe[title$=" Atlas"]').count(),0);
 checks.push('Unknown requested expert cannot silently open a different registered expert');
 assert.deepEqual(errors,[]);
 await writeFile(output+'/validation.json',JSON.stringify({ok:true,checks,fixture:true,productionAcceptance:false,sourceDocuments:Object.fromEntries(agents.map(id=>[id,hash(docs[id])]))},null,2));
 console.log(JSON.stringify({ok:true,checks}));
}catch(error){await page.screenshot({path:output+'/failure.png'}).catch(()=>{});await writeFile(output+'/failure.json',JSON.stringify({ok:false,error:String(error),errors,checks,requests},null,2));throw error;}
finally{clearTimeout(watchdog);releaseArtifact?.();await page.unrouteAll({behavior:'ignoreErrors'});await browser.close();}
