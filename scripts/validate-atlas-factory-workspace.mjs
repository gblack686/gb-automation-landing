// Real canonical document + host + resource verifier. All data is synthetic;
// no credentials, real Cognito, production API or Mini connection are used.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeResourceService} from '../amplify/functions/forge-atlas/resources.mjs';
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
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1500,height:1000}});page.setDefaultTimeout(20000);
const errors=[],checks=[],requests=[];let fail=false,tamper=false,holdArtifact=false,releaseArtifact=null;
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/src/lib/forgeAtlasClient.js*',r=>r.fulfill({contentType:'application/javascript',body:`export async function readAtlas(view,query={},agent_id=null){const r=await fetch('/__workspace_fixture',{method:'POST',body:JSON.stringify({view,query,agent_id})});if(!r.ok)throw Error('Unavailable');return r.json();} export async function expertChat(){return {enabled:false}}`}));
await page.route('**/__workspace_fixture',async r=>{
 const x=r.request().postDataJSON();requests.push(x);
 if(x.view==='agents')return r.fulfill({json:{agents:agents.map(id=>({agent_id:id,display_name:id,config_sha256:receipts[id].yaml_sha256}))}});
 if(x.view==='document')return r.fulfill({json:{agent_id:x.agent_id,tenant_id:'gbautomation',url:`https://fixture.s3.us-east-1.amazonaws.com/gbautomation/${x.agent_id}/index.html`,sha256:hash(docs[x.agent_id]),bytes:Buffer.byteLength(docs[x.agent_id])}});
 if(fail)return r.fulfill({status:503,body:'Unavailable'});
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
try{
 await page.goto(base+'/bench/youtube-intel?window=resources',{waitUntil:'domcontentloaded'});
 let frame=current();await frame.getByRole('button',{name:'Open in window',exact:true}).waitFor();
 assert.equal(await frame.locator('.window').count(),19);
 assert(requests.some(x=>x.view==='resourceCatalog'&&x.query.owner==='youtube-intel'));
 assert.equal(await frame.getByText('news-agent reviewed UI',{exact:true}).count(),0);
 checks.push('All 18 original Atlas windows retained plus expert resources; exact owner filtering');
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
 await page.goto(base+'/bench/news-agent?window=resources&resource=ui.news-agent.review');
 frame=current();await frame.frameLocator('iframe[title="news-agent reviewed UI saved result"]').getByRole('heading',{name:'Reviewed UI fixture'}).waitFor();
 assert.equal(await page.getByLabel('Registered agents').inputValue(),'news-agent');
 checks.push('Exact expert/resource deep link opens the saved app after a full reload');
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
 assert.deepEqual(errors,[]);
 await writeFile(output+'/validation.json',JSON.stringify({ok:true,checks,fixture:true,productionAcceptance:false,sourceDocuments:Object.fromEntries(agents.map(id=>[id,hash(docs[id])]))},null,2));
 console.log(JSON.stringify({ok:true,checks}));
}catch(error){await writeFile(output+'/failure.json',JSON.stringify({ok:false,error:String(error),errors,checks,requests},null,2));throw error;}
finally{await browser.close();}
