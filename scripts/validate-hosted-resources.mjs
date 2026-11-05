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
const raw=Buffer.from(JSON.stringify({schema_version:'hosted-resource-delivery.v1',tenant_id:'gbautomation',source_commit:'a'.repeat(40),captured_at:observed,resources:rows}));
const service=makeResourceService({enabled:true,loadManifest:async()=>({bytes:raw,sha256:hash(raw)}),describeArtifact:async()=>({url:artifactURL})});
const handler=makeHandler({issuer,operatorSubject:operator,resources:service});
const requests=[],checks=[];let fail=false,tamper=false,expired=false,external=0;
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
const page=await browser.newPage({viewport:{width:1400,height:1000}});page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.route('https://untrusted.invalid/**',route=>{external++;return route.abort();});
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
}finally{await browser.close();}
