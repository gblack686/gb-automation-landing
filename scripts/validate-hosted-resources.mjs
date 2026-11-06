// Fixture-backed browser acceptance. Never reads credentials or calls production services.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { makeHandler } from '../amplify/functions/forge-atlas/contract.mjs';
import { makeResourceService } from '../amplify/functions/forge-atlas/resources.mjs';

const base=process.env.FORGE_RESOURCE_BASE||'http://127.0.0.1:5198';
const output='artifacts/hosted-resources-validation';await mkdir(output,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const agent='artist-packet-expert',operator='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',issuer='https://cognito-idp.us-east-1.amazonaws.com/fixture';
const document='<!doctype html><html><head></head><body><h1>Character Forge fixture</h1><p>forge-atlas.request.v1</p></body></html>';
const documentURL=`https://fixture.s3.us-east-1.amazonaws.com/gbautomation/${agent}/index.html`;
const content=Buffer.from(`<!doctype html><html><head></head><body><h1>Reviewed chart fixture</h1><button id="play" onclick="this.textContent='Playing'">Play</button><script>
 try{window.parent.localStorage.getItem('private-fixture');document.body.dataset.parentAccess='allowed';}catch{document.body.dataset.parentAccess='denied';}
 fetch('https://untrusted.invalid/leak').catch(()=>{});
 </script></body></html>`);
const asset={key:`gbautomation/resources/artifacts/${hash(content)}.html`,sha256:hash(content),bytes:content.length,media_type:'text/html',version_id:'fixture-object-version'};
const artifactURL=`https://fixture.s3.us-east-1.amazonaws.com/${asset.key}?versionId=${asset.version_id}&X-Amz-Expires=60`;
const observed='2026-11-01T10:00:00Z';
const rows=Array.from({length:61},(_,i)=>({id:`ui.result-${i}`,title:`UI result ${i}`,kind:'ui',owner_expert:i<60?'youtube-intel':'news-agent',
 delivery_mode:'artifact',source_commit:'a'.repeat(40),content_sha256:asset.sha256,observed_at:observed,expires_at:'2026-11-01T10:15:00Z',artifact:asset}));
rows.push({...rows[0],id:'kb.handbook',title:'Expert handbook',kind:'kb'});
const appEnabled=process.env.FORGE_APP_FIXTURE_ENABLED==='1';let appReads=0,appFail=false;
if(appEnabled){const live=rows[59];delete live.artifact;delete live.content_sha256;Object.assign(live,{owner_expert:'pi',delivery_mode:'live_app',app_id:'benchmark-comparison'});}
const raw=Buffer.from(JSON.stringify({schema_version:'hosted-resource-delivery.v1',tenant_id:'gbautomation',source_commit:'a'.repeat(40),captured_at:observed,resources:rows}));
const service=makeResourceService({enabled:true,liveAppAvailable:row=>appEnabled&&row.id==='ui.result-59',loadManifest:async()=>({bytes:raw,sha256:hash(raw)}),describeArtifact:async()=>({url:artifactURL})});
const handler=makeHandler({issuer,operatorSubject:operator,resources:service});
const requests=[],checks=[];let fail=false,tamper=false,expired=false,external=0;
const piEnabled=process.env.FORGE_PI_FIXTURE_ENABLED==='1';const piRequests=[],piJobs=new Map();let piLoseAck=true;
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
const page=await browser.newPage({viewport:{width:1400,height:1000}});page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.route('https://untrusted.invalid/**',route=>{external++;return route.abort();});
await page.route('**/src/lib/forgeLiveAppClient.js*',route=>route.fulfill({contentType:'application/javascript',body:`
 export async function readLiveBenchmark(){const r=await fetch('/__live_app_fixture');if(!r.ok)throw Error('The Mini live view is unavailable. Saved results remain in the gallery.');return r.json();}`}));
await page.route('**/__live_app_fixture',route=>{appReads++;return appFail?route.fulfill({status:503,body:'Unavailable'}):route.fulfill({json:{
 retrieved_at:new Date().toISOString(),source_commit:'a'.repeat(40),receipt_sha256:'b'.repeat(64),attempts:[{attempt_id:'fixture-1',task_id:'ui-enhancement',lane:'pi',occurred_at:observed,acceptance:'pass',tokens:1234,worker_seconds:30,elapsed_seconds:null}]}});});
await page.route('**/src/lib/forgePiClient.js*',route=>route.fulfill({contentType:'application/javascript',body:`
 export async function piRequest(action,input,agentId){const r=await fetch('/__pi_fixture',{method:'POST',body:JSON.stringify({action,input,agentId})});if(!r.ok)throw Error('Unavailable');return r.json();}`}));
await page.route('**/__pi_fixture',async route=>{
 const request=route.request().postDataJSON();piRequests.push(request);
 if(request.action==='capability')return route.fulfill({json:{schema_version:'forge-pi-capability.v1',tenant_id:'gbautomation',agent_id:request.agentId,
   enabled:piEnabled&&request.agentId==='youtube-intel',actions:piEnabled?['projection.refresh','expert.report']:[]}});
 if(request.action==='status')return route.fulfill({json:piJobs.get(request.input.idempotency_key)||null});
 const key=request.input.idempotency_key;
 if(!piJobs.has(key))piJobs.set(key,{schema_version:'forge-pi-job.v1',tenant_id:'gbautomation',agent_id:request.agentId,idempotency_key:key,
  job_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',state:'accepted',result:{kind:'native-run',run_id:'yt_maint_browser_fixture'}});
 if(piLoseAck){piLoseAck=false;return route.fulfill({status:503,body:'Lost acknowledgement'});}
 return route.fulfill({json:piJobs.get(key)});
});
await page.route('**/src/lib/forgeAtlasClient.js*',route=>route.fulfill({contentType:'application/javascript',body:`
 export async function readAtlas(view,query={},agent_id=null){const r=await fetch('/__resource_fixture',{method:'POST',body:JSON.stringify({view,query,agent_id})});if(!r.ok)throw Error('Unavailable');return r.json();}
 export async function expertChat(){return {enabled:false};}`}));
await page.route('**/__resource_fixture',async route=>{
 const input=route.request().postDataJSON();requests.push(input);
 if(input.view==='agents')return route.fulfill({json:{agents:[{agent_id:agent,display_name:'Artist Packet Expert',config_sha256:'a'.repeat(64),status:'active'}]}});
 if(input.view==='document')return route.fulfill({json:{url:documentURL,sha256:hash(document),bytes:Buffer.byteLength(document),agent_id:agent,tenant_id:'gbautomation'}});
 if(fail)return route.fulfill({status:503,body:'Unavailable'});
 const response=await handler({identity:{claims:{iss:issuer,sub:operator,'cognito:groups':['tenant-gbautomation']}},typeName:'Query',fieldName:'forgeAtlasRead',arguments:{input}});
 if(!response.payload.ok)return route.fulfill({status:403,body:'Denied'});
 if(expired&&input.view==='resourceArtifact')response.payload.data.expires_at='2020-01-01T00:00:00Z';
 return route.fulfill({json:response.payload.data});
});
await page.route(documentURL,route=>route.fulfill({contentType:'text/html',body:document,headers:{'Access-Control-Allow-Origin':base}}));
await page.route(artifactURL,route=>route.fulfill({contentType:'text/html',body:tamper?Buffer.alloc(content.length,32):content,headers:{'Access-Control-Allow-Origin':base}}));
try{
 await page.goto(`${base}/atlas/${agent}?window=resources`,{waitUntil:'domcontentloaded'});
 const dialog=page.getByRole('dialog',{name:'Expert resources'});await dialog.waitFor();
 await dialog.getByRole('button',{name:'Open saved result'}).first().waitFor();
 assert.equal(await dialog.locator('.resource-grid > li').count(),50);
 await dialog.getByRole('button',{name:'Next',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.resource-grid > li').length===11);
 await dialog.getByLabel('Expert owner').selectOption('news-agent');
 await dialog.getByRole('heading',{name:'UI result 60',exact:true}).waitFor();
 assert.equal(await dialog.locator('.resource-grid > li').count(),1);
 assert(requests.some(r=>r.view==='resourceCatalog'&&r.query.owner==='news-agent'));
 await dialog.getByLabel('Expert owner').selectOption('youtube-intel');
 await dialog.getByLabel('Find a resource').fill('no such result');await dialog.getByRole('button',{name:'Search',exact:true}).click();
 await dialog.getByText('No resources match these filters.').waitFor();
 await dialog.getByLabel('Find a resource').fill('');await dialog.getByRole('button',{name:'Search',exact:true}).click();
 await dialog.getByRole('button',{name:'Open saved result'}).first().waitFor();
 checks.push('Exact expert filters, bounded pagination, search and empty state');
 if(piEnabled){
  const panel=page.getByRole('region',{name:'Pi actions'});
  await panel.getByLabel('Pi action',{exact:true}).selectOption('expert.report');
  await panel.getByRole('button',{name:'Request from Pi'}).click();
  await panel.getByRole('alert').filter({hasText:'outcome could not be confirmed'}).waitFor();
  const key=piRequests.find(request=>request.action==='expert.report').input.idempotency_key;
  await panel.getByRole('button',{name:'Retry same request'}).click();
  await panel.getByRole('status').filter({hasText:'Admitted by Pi'}).waitFor();
  assert.equal(piJobs.size,1);assert.equal(piRequests.filter(request=>request.action==='expert.report').length,2);
  assert(piRequests.filter(request=>request.action==='expert.report').every(request=>request.input.idempotency_key===key));
  await panel.getByRole('button',{name:'Check request status'}).click();
  await panel.getByRole('status').filter({hasText:'yt_maint_browser_fixture'}).waitFor();
  const count=piRequests.length;await page.waitForTimeout(1200);assert.equal(piRequests.length,count);
  const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('forge.pi.pending.youtube-intel')));
  assert.equal(saved.idempotency_key,key);
  checks.push('Pi lost-ack retry keeps one identity, admission is labeled separately from completion, status is explicit and no idle polling occurs');
 }
 await dialog.getByLabel('Resource type').selectOption('kb');await dialog.getByRole('heading',{name:'Expert handbook'}).waitFor();
 await dialog.getByLabel('Resource type').selectOption('ui');await dialog.getByRole('button',{name:'Open saved result'}).first().waitFor();
 await page.screenshot({path:`${output}/desktop.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth));
 await page.screenshot({path:`${output}/mobile.png`,fullPage:true});
 checks.push('UI and knowledge galleries, desktop and 390px layout without dialog overflow');
 await dialog.getByRole('button',{name:'Open saved result'}).first().click();
 const frame=page.frameLocator('iframe[title="UI result 0 saved result"]');
 await frame.getByRole('heading',{name:'Reviewed chart fixture'}).waitFor();
 assert.equal(await frame.locator('body').getAttribute('data-parent-access'),'denied');
 assert.equal(await page.locator('iframe[title="UI result 0 saved result"]').getAttribute('sandbox'),'allow-scripts');
 await frame.getByRole('button',{name:'Play',exact:true}).click();await frame.getByRole('button',{name:'Playing'}).waitFor();
 assert.equal(external,0);await page.getByText('Saved result is stale',{exact:false}).waitFor();
 checks.push('Digest-verified interactive artifact, opaque sandbox, blocked parent storage and outbound fetch, honest stale capture');
 await page.getByRole('button',{name:'Back to gallery'}).click();
 tamper=true;await dialog.getByRole('button',{name:'Open saved result'}).first().click();
 await page.getByRole('alert').filter({hasText:'integrity check failed'}).waitFor();
 assert.equal(await page.locator('iframe[title="UI result 0 saved result"]').count(),0);
 await page.getByRole('button',{name:'Back to gallery'}).click();tamper=false;expired=true;
 await dialog.getByRole('button',{name:'Open saved result'}).first().click();
 await page.getByRole('alert').filter({hasText:'Refresh the catalog'}).waitFor();
 await page.getByRole('button',{name:'Back to gallery'}).click();expired=false;
 checks.push('Replaced object bytes and expired signed-link descriptors never render');
 if(appEnabled){
  await dialog.getByLabel('Expert owner').selectOption('pi');await dialog.getByRole('button',{name:'Open live view',exact:true}).click();
  const live=page.getByRole('region',{name:'Read-only benchmark view'});await live.getByRole('cell',{name:'1,234'}).waitFor();
  const initialReads=appReads;assert(initialReads>=1&&initialReads<=2); // React StrictMode may mount twice in the development fixture.
  await page.waitForTimeout(1100);assert.equal(appReads,initialReads);
  assert(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.screenshot({path:`${output}/live-mobile.png`,fullPage:true});
  await page.setViewportSize({width:1400,height:1000});await page.screenshot({path:`${output}/live-desktop.png`,fullPage:true});
  appFail=true;await live.getByRole('button',{name:'Refresh live view'}).click();await live.getByRole('alert').filter({hasText:'last successful read'}).waitFor();
  await live.getByRole('cell',{name:'1,234'}).waitFor();assert.equal(appReads,initialReads+1);
  await page.getByRole('button',{name:'Back to gallery'}).click();await dialog.getByLabel('Expert owner').selectOption('youtube-intel');
  await dialog.getByRole('button',{name:'Open saved result'}).first().waitFor();
  checks.push('Read-only live metrics preserve unknowns, mobile layout, explicit refresh and last-good offline state; zero idle polling');
 }
 fail=true;await dialog.getByRole('button',{name:'Refresh',exact:true}).click();
 await dialog.getByRole('alert').filter({hasText:'last successful read'}).waitFor();
 assert.equal(await dialog.locator('.resource-grid > li').count(),50);
 const count=requests.filter(r=>r.view==='resourceCatalog').length;
 await page.waitForTimeout(1500);assert.equal(requests.filter(r=>r.view==='resourceCatalog').length,count);
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
 checks.push('Failed refresh retains labeled last-good results; no automatic resource polling; Escape closes modal');
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/browser.json`,JSON.stringify({status:'pass',scope:'Synthetic authenticated transport and private-object fixtures; no production acceptance',checks,requests:requests.length,externalArtifactRequests:external},null,2)+'\n');
 console.log(JSON.stringify({status:'pass',checks}));
}catch(error){
 await page.screenshot({path:`${output}/failure.png`,fullPage:true}).catch(()=>{});
 console.error(JSON.stringify({errors,piRequests,piPanelText:await page.locator('.resource-actions').allTextContents()}));
 throw error;
}finally{await browser.close();}
