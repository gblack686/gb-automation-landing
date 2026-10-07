// Website host acceptance. Optional FORGE_ATLAS_HTML exercises a real generated Forge document.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const base=process.env.FORGE_ATLAS_BASE || 'http://127.0.0.1:5197';
const output='artifacts/forge-atlas-validation';await mkdir(output,{recursive:true});
const fixture=`<!doctype html><html><head></head><body><h1>Hosted document fixture</h1><script>
 const channel=document.querySelector('meta[name="forge-host-channel"]').content;let sequence=0;const pending=new Map();
 window.ForgeHost={chatReady:false,read(view,input={}){return new Promise((resolve,reject)=>{const id=String(++sequence);setTimeout(()=>{if(pending.delete(id))reject(Error('Timed out'));},10000);pending.set(id,{resolve,reject,type:'forge-atlas.response.v1'});parent.postMessage({type:'forge-atlas.request.v1',channel,id,view,input},'*');});},chat(action,input={}){return new Promise((resolve,reject)=>{const id=String(++sequence);setTimeout(()=>{if(pending.delete(id))reject(Error('Timed out'));},10000);pending.set(id,{resolve,reject,type:'forge-chat.response.v1'});parent.postMessage({type:'forge-chat.request.v1',channel,id,action,input},'*');});}};
 addEventListener('message',e=>{if(e.source!==parent||e.data?.channel!==channel)return;if(e.data.type==='forge-chat.ready.v1'){ForgeHost.chatReady=true;return;}const p=pending.get(e.data.id);if(p&&p.type===e.data.type){pending.delete(e.data.id);e.data.ok?p.resolve(e.data.payload):p.reject(Error('Unavailable'));}});
 </script></body></html>`;
const html=process.env.FORGE_ATLAS_HTML ? await readFile(process.env.FORGE_ATLAS_HTML,'utf8') : fixture;
const sha256=createHash('sha256').update(html).digest('hex');
const url='https://fixture-bucket.s3.us-east-1.amazonaws.com/gbautomation/artist-packet-expert/index.html';
let mismatch=false,fail=false,capabilityAttempts=0;const requests=[],chatRequests=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'})});
const page=await browser.newPage({viewport:{width:1500,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(20000);
await page.route('**/src/lib/forgeAtlasClient.js*',r=>r.fulfill({contentType:'application/javascript',body:`export async function readAtlas(view,query={},agent_id=null) {const response=await fetch('/__atlas_fixture',{method:'POST',body:JSON.stringify({view,query,agent_id})});if(!response.ok)throw Error('Unavailable');return response.json();}export async function expertChat(action,input,agent_id){const response=await fetch('/__chat_fixture',{method:'POST',body:JSON.stringify({action,input,agent_id})});if(!response.ok)throw Error('Chat unavailable');return response.json();}`}));
await page.route('**/__chat_fixture',async route=>{
 const request=route.request().postDataJSON();chatRequests.push(request);
 const envelope={tenant_id:'gbautomation',agent_id:'artist-packet-expert',session_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 if(request.action==='capability'){
  if(++capabilityAttempts===1)return route.fulfill({status:503,body:'Transient capability failure'});
  return route.fulfill({json:{schema_version:'forge-chat-capability.v1',enabled:true,tenant_id:envelope.tenant_id,agent_id:envelope.agent_id}});
 }
 if(request.action==='start')return route.fulfill({json:{...envelope,status:'ready'}});
 if(['send','poll'].includes(request.action))return route.fulfill({json:{...envelope,status:'ready',messages:[{role:'user',content:'Summarize the file'},{role:'assistant',content:'A bounded answer.'}]}});
 return route.fulfill({status:400,body:'invalid chat action'});
});
await page.route('**/__atlas_fixture',async route=>{
 const request=route.request().postDataJSON();requests.push(request);
 if(request.view==='agents')return route.fulfill({json:{schema_version:'forge-agent-registry.v1',tenant_id:'gbautomation',source:'s3',agents:[{agent_id:'artist-packet-expert',display_name:'Artist Packet Expert',config_sha256:'a'.repeat(64),status:'active'}]}});
 if(fail && request.view!=='document')return route.fulfill({status:503,body:'unavailable'});
 if(request.view==='document')return route.fulfill({json:{url,sha256:mismatch?'0'.repeat(64):sha256,bytes:Buffer.byteLength(html),agent_id:'artist-packet-expert',tenant_id:'gbautomation'}});
 if(request.view==='approvalSnapshot')return route.fulfill({json:{mode:'live_read_only',workflows:[],connection:{tenant:'gbautomation',writes_enabled:false,review_host:'web'}}});
 if(request.view==='proposals')return route.fulfill({json:{tenant_id:'gbautomation',agent_id:'artist-packet-expert',rows:[{tenant_id:'gbautomation',agent_id:'artist-packet-expert',proposal_id:'prop_web',card_title:'Web proposal',source_type:'youtube_transcript',card_type:'expert-portfolio-proposal',state:'gated'}],offset:request.query.offset||0,total:1,limit:50}});
 if(request.view==='proposal')return route.fulfill({json:{tenant_id:'gbautomation',agent_id:'artist-packet-expert',proposal_id:'prop_web',card_title:'Web proposal',source_type:'youtube_transcript',card_type:'expert-portfolio-proposal',state:'gated',summary:'A <script> is text',action_items:['Inspect the brief'],updated_at:'2026-09-24T00:00:00Z'}});
 if(request.view==='schedule')return route.fulfill({json:{schema_version:'forge-schedule.v1',agent_id:'artist-packet-expert',profile:'artist-packet-expert',date:request.query.date,timezone:'America/Los_Angeles',captured_at:new Date().toISOString(),source:'Hermes profile jobs.json',coverage:'Exact profile',jobs:[]}});
 return route.fulfill({json:{private_fixture:'private runtime value',view:request.view}});
});
await page.route(url,route=>route.fulfill({contentType:'text/html',body:html,headers:{'Access-Control-Allow-Origin':base}}));
const checks=[];
try {
 await page.goto(base+'/atlas/artist-packet-expert?window=chat',{waitUntil:'domcontentloaded',timeout:60000});
 const iframe=page.locator('iframe[title="Artist Packet Expert Atlas"]');await iframe.waitFor();
 assert.equal(await page.getByRole('combobox',{name:'Registered agents'}).inputValue(),'artist-packet-expert');
 assert(requests.some(r=>r.view==='agents'));
 assert(requests.some(r=>r.view==='document'&&r.agent_id==='artist-packet-expert'));
 console.log('Private document loaded through the fixture transport');
 assert.equal(await iframe.getAttribute('sandbox'),'allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox');
 const frame=await iframe.contentFrame();
 await frame.locator('body').waitFor();
 assert.equal(await frame.locator('meta[name="forge-start-window"]').getAttribute('content'),'chat');
 await frame.locator('body').evaluate(()=>new Promise((resolve,reject)=>{if(ForgeHost.chatReady)return resolve();const poll=setInterval(()=>{if(ForgeHost.chatReady){clearInterval(poll);clearTimeout(timeout);resolve();}},50);const timeout=setTimeout(()=>{clearInterval(poll);reject(Error('Chat capability missing'));},10000);}));
 assert(capabilityAttempts>=2);
 checks.push('Chat deep link is bound to the iframe; a transient capability failure retries successfully');
 const chat=await frame.locator('body').evaluate(async()=>{const started=await ForgeHost.chat('start',{});const sent=await ForgeHost.chat('send',{session_id:started.session_id,content:'Summarize the file',source:{path:'resources/deployments/artist-packet-expert/README.md',sha256:'a'.repeat(64)}});return sent;});
 assert.equal(chat.messages[1].content,'A bounded answer.');
 assert(chatRequests.some(r=>r.action==='send'&&r.agent_id==='artist-packet-expert'&&r.input.source.path==='resources/deployments/artist-packet-expert/README.md'));
 checks.push('Expert chat crosses the authenticated host with selected-agent and source binding');
 const result=await frame.locator('body').evaluate(async()=>window.ForgeHost.read('history',{view:'sessions'}));
 assert.equal(result.private_fixture,'private runtime value');checks.push('Authenticated host transport returns a bounded private read to the sandbox');
 const proposals=await frame.locator('body').evaluate(async()=>window.ForgeHost.read('proposals',{search:'brief',offset:0,state:'gated'}));
 assert.equal(proposals.rows[0].proposal_id,'prop_web');
 assert(requests.some(r=>r.view==='proposals'&&r.query.search==='brief'&&r.query.state==='gated'));
 checks.push('Proposal filters pass through the authenticated host');
 const schedule=await frame.locator('body').evaluate(async()=>window.ForgeHost.read('schedule',{date:'2026-10-05'}));
 assert.equal(schedule.profile,'artist-packet-expert');
 assert(requests.some(r=>r.view==='schedule'&&r.query.date==='2026-10-05'&&r.agent_id==='artist-packet-expert'));
 checks.push('Schedule date crosses the authenticated host with the selected expert fixed by the parent');
 if(process.env.FORGE_ATLAS_HTML) {
  await page.getByRole('link',{name:'Proposals',exact:true}).click();
  if(html.includes('private-studio-data')) {
   await frame.locator('.window.full[data-window="proposals"]').waitFor();
   await frame.locator('[data-action="proposal-open"]').first().click();
   await frame.getByText('A <script> is text',{exact:true}).waitFor();
   assert.equal(await frame.getByRole('button',{name:'Accept proposal',exact:true}).isDisabled(),true);
   assert.equal(await frame.locator('#proposal-detail script').count(),0);
  } else {
  await frame.locator('[data-native-open="prop_web"]').waitFor();
  await frame.locator('[data-native-open="prop_web"]').click();
  assert((await frame.locator('#forge-approval-dialog').innerText()).includes('A <script> is text'));
  assert.equal(await frame.locator('[data-native-accept]').isDisabled(),true);
  assert.equal(await frame.locator('#forge-approval-dialog script').count(),0);
  await frame.getByRole('button',{name:'Close approval review',exact:true}).click();
  }
  checks.push('Proposals navigation opens the real window; detail escapes stored text and disables writes');
 }
 assert.equal(await frame.locator('body').evaluate(()=>{try{return !!parent.document;}catch{return false;}}),false);
 assert.equal(await frame.locator('body').evaluate(()=>{try{localStorage.setItem('private','x');return true;}catch{return false;}}),false);checks.push('Document cannot access parent credentials or browser storage');
 const count=requests.length;
 await page.evaluate(()=>window.postMessage({type:'forge-atlas.request.v1',channel:'wrong',id:'99',view:'history',input:{view:'sessions'}},'*'));
 await page.waitForTimeout(100);assert.equal(requests.length,count);checks.push('Wrong-window bridge messages are ignored');
 fail=true;assert.equal(await frame.locator('body').evaluate(async()=>{try{await ForgeHost.read('history',{view:'sessions'});return false;}catch{return true;}}),true);fail=false;
 checks.push('Backend failure is returned as an error without provider detail');
 for(const width of [1280,768,390]){await page.setViewportSize({width,height:900});assert.equal((await iframe.boundingBox()).width,width);}
 await page.screenshot({path:output+'/host-mobile.png'});checks.push('Fullscreen host fits desktop, tablet and mobile');
 mismatch=true;await page.reload();await page.getByRole('button',{name:'Retry',exact:true}).waitFor();assert.equal(await page.locator('iframe').count(),0);checks.push('Document hash mismatch is rejected before scripts run');
 assert.deepEqual(errors,[]);
 await writeFile(output+'/validation.json',JSON.stringify({ok:true,checks,transport:'synthetic website host; live Cognito and Supabase not exercised'},null,2));
 console.log(JSON.stringify({ok:true,checks}));
} catch(error) {
 console.error(JSON.stringify({error:String(error),requests,errors}));throw error;
} finally {await browser.close();}
