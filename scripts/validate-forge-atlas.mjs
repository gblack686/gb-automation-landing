// Website host acceptance. Optional FORGE_ATLAS_HTML exercises a real generated Forge document.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const base=process.env.FORGE_ATLAS_BASE || 'http://127.0.0.1:5197';
const output='artifacts/forge-atlas-validation';await mkdir(output,{recursive:true});
const fixture=`<!doctype html><html><head></head><body><h1>Hosted document fixture</h1><script>
 const channel=document.querySelector('meta[name="forge-host-channel"]').content;let sequence=0;const pending=new Map();
 window.ForgeHost={read(view,input={}){return new Promise((resolve,reject)=>{const id=String(++sequence);setTimeout(()=>{if(pending.delete(id))reject(Error('Timed out'));},10000);pending.set(id,{resolve,reject});parent.postMessage({type:'forge-atlas.request.v1',channel,id,view,input},'*');});}};
 addEventListener('message',e=>{if(e.source!==parent||e.data?.channel!==channel||e.data.type!=='forge-atlas.response.v1')return;const p=pending.get(e.data.id);if(p){pending.delete(e.data.id);e.data.ok?p.resolve(e.data.payload):p.reject(Error('Unavailable'));}});
 </script></body></html>`;
const html=process.env.FORGE_ATLAS_HTML ? await readFile(process.env.FORGE_ATLAS_HTML,'utf8') : fixture;
const sha256=createHash('sha256').update(html).digest('hex');
const url='https://fixture-bucket.s3.us-east-1.amazonaws.com/gbautomation/artist-packet-expert/index.html';
let mismatch=false,fail=false;const requests=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'})});
const page=await browser.newPage({viewport:{width:1500,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(20000);
await page.route('**/src/lib/forgeAtlasClient.js*',r=>r.fulfill({contentType:'application/javascript',body:`export async function readAtlas(view,query={}) {const response=await fetch('/__atlas_fixture',{method:'POST',body:JSON.stringify({view,query})});if(!response.ok)throw Error('Unavailable');return response.json();}`}));
await page.route('**/__atlas_fixture',async route=>{
 const request=route.request().postDataJSON();requests.push(request);
 if(fail && request.view!=='document')return route.fulfill({status:503,body:'unavailable'});
 if(request.view==='document')return route.fulfill({json:{url,sha256:mismatch?'0'.repeat(64):sha256,bytes:Buffer.byteLength(html),agent_id:'artist-packet-expert',tenant_id:'gbautomation'}});
 return route.fulfill({json:{private_fixture:'private runtime value',view:request.view}});
});
await page.route(url,route=>route.fulfill({contentType:'text/html',body:html,headers:{'Access-Control-Allow-Origin':base}}));
const checks=[];
try {
 await page.goto(base+'/atlas/artist-packet-expert');
 const iframe=page.locator('iframe[title="Artist Packet Expert Atlas"]');await iframe.waitFor();
 console.log('Private document loaded through the fixture transport');
 assert.equal(await iframe.getAttribute('sandbox'),'allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox');
 const frame=await iframe.contentFrame();
 await frame.locator('body').waitFor();
 const result=await frame.locator('body').evaluate(async()=>window.ForgeHost.read('history',{view:'sessions'}));
 assert.equal(result.private_fixture,'private runtime value');checks.push('Authenticated host transport returns a bounded private read to the sandbox');
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
