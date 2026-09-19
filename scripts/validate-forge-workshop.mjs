// Browser-only fixture transport. Production auth/database behavior is tested separately.
// Start Vite on 127.0.0.1:5196, then node scripts/validate-forge-workshop.mjs.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { makeHandler } from '../amplify/functions/forge-workshop/contract.mjs';

const base=process.env.FORGE_REVIEW_URL||'http://127.0.0.1:5196';
const out=process.env.FORGE_REVIEW_OUTPUT||'artifacts/forge-workshop-validation';
await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('../amplify/functions/forge-workshop/catalog.json',import.meta.url),'utf8'));
const identity={claims:{iss:'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_fixture',sub:'9945d1fa-b333-489e-ba78-b4792161887d','cognito:groups':['tenant-gbautomation']}};
let draft=null,job=null,failSave=null,runCount=0,requests=0;
const handler=makeHandler({issuer:identity.claims.iss,enabled:true,catalog,rpc:async(_name,{p_command,p_input})=>{
  if(p_command==='read')return {ok:true,draft,run:job};
  if(p_command==='save'){
    if(failSave)return {ok:false,error:failSave};
    draft={configuration:p_input.config,version:(draft?.version||0)+1};return {ok:true,draft};
  }
  if(p_command==='run'){runCount++;job={id:p_input.request_id,status:'pending'};return {ok:true,run:job};}
  return {ok:true,run:job};
}});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'})});
const errors=[],checks=[];
const page=await browser.newPage({viewport:{width:1600,height:1000}});
page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(20000);
await page.route('**/src/lib/forgeWorkshopClient.js*',route=>route.fulfill({contentType:'application/javascript',body:
  `export async function workshopCommand(method,input){return (await fetch('/__forge_fixture',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,input})})).json();}`}));
await page.route('**/__forge_fixture',async route=>{
  requests++;const {method,input}=route.request().postDataJSON();
  const result=await handler({identity,info:{fieldName:{read:'forgeWorkshopRead',save:'forgeWorkshopSave',run:'forgeWorkshopRun',status:'forgeWorkshopStatus'}[method]},arguments:{input}});
  await route.fulfill({json:result.payload});
});
async function frame(){await page.locator('iframe[title="Agent Workshop Studio"]').waitFor();const f=page.frameLocator('iframe[title="Agent Workshop Studio"]');await f.locator('#connection-status').filter({hasText:'Refresh connection'}).waitFor();return f;}
async function waitText(locator,text){await locator.filter({hasText:text}).waitFor();}
try {
  await page.goto(base+'/workshop',{waitUntil:'domcontentloaded',timeout:60000});let f=await frame();console.log('Studio connected to local fixture');
  await f.locator('body').evaluate(el=>{el.dataset.testTransport='local-fixture';document.querySelector('.app-status>span').textContent='LOCAL TEST FIXTURE: saves and health responses are simulated. No live command runs.';});
  assert.deepEqual(await page.locator('iframe[title="Agent Workshop Studio"]').boundingBox(),{x:0,y:0,width:1600,height:1000});checks.push('Full-screen Studio iframe');
  await waitText(f.locator('#connected-checks'),'Identity verified');
  assert.equal(await f.locator('#window-checks .readiness-number').count(),0);checks.push('Real status replaces sample readiness score');
  await page.screenshot({path:out+'/studio-light.png'});
  await f.locator('#mode-toggle').click();
  assert.equal(await f.locator('body').getAttribute('data-mode'),'dark');
  assert.equal(await f.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(3, 4, 5)');
  await page.screenshot({path:out+'/studio-dark.png'});checks.push('Official dark canvas and readable Studio windows');
  await f.locator('#mode-toggle').click();
  await f.locator('#dock [data-open="config"]').click();
  const name=f.locator('#config-form [name="name"]'),save=f.locator('#config-form button').filter({hasText:'Save draft'});
  await name.fill('Browser fixture expert');await save.click();
  await waitText(f.locator('#window-config .config-note'),'v1');
  assert.equal(draft.configuration.name,'Browser fixture expert');
  await page.reload({waitUntil:'domcontentloaded'});f=await frame();
  assert.equal(await f.locator('#config-form [name="name"]').inputValue(),'Browser fixture expert');checks.push('Private draft saves and reloads through host bridge');
  await f.locator('#dock [data-open="config"]').click();
  for(const code of ['stale_draft_version','workshop_unavailable']) {
    failSave=code;await f.locator('#config-form [name="name"]').fill('Preserve my edits');
    await f.locator('#config-form button').filter({hasText:'Save draft'}).click();
    await waitText(f.locator('#window-config .config-note'),'preserved');
    assert.equal(await f.locator('#config-form [name="name"]').inputValue(),'Preserve my edits');
  }
  failSave=null;checks.push('Conflict and network errors preserve form input');
  const stored=await f.locator('body').evaluate(()=>JSON.stringify(localStorage));
  assert.ok(!stored.includes('Browser fixture expert')&&!stored.includes('Preserve my edits'));checks.push('Private configuration is not persisted in shared browser storage');
  await f.locator('#dock [data-open="commands"]').click();
  await f.locator('[data-recipe="install"]').click();
  assert.ok(await f.locator('[data-action="demo-run"]').isDisabled());
  await f.locator('[data-recipe="health"]').click();
  await f.locator('[data-action="demo-run"]').click();
  await waitText(f.locator('#console-log'),'pending');assert.equal(runCount,1);
  await f.locator('body').evaluate(()=>{window.fixtureNow=Date.now;Date.now=()=>window.fixtureNow()+301000;});
  await waitText(f.locator('#connected-checks'),'Automatic refresh paused');
  assert.equal(runCount,1);
  await f.locator('body').evaluate(()=>{Date.now=window.fixtureNow;delete window.fixtureNow;});
  job={...job,status:'done',result:{schema_version:'forge-workshop-health.v1',healthy:false,checks:[{id:'query.supabase',status:'blocked'}]}};
  await f.locator('#dock [data-open="commands"]').click();
  await f.locator('[data-action="demo-run"]').click();
  await waitText(f.locator('#console-log'),'completed with findings');checks.push('Only health can run; unhealthy completion remains a finding');
  assert.equal(runCount,1);checks.push('Polling pauses after five minutes; explicit refresh does not resubmit');
  await f.locator('#dock [data-open="commands"]').click();
  await f.locator('[data-action="demo-run"]').click();await waitText(f.locator('#console-log'),'pending');
  job={...job,status:'error'};await waitText(f.locator('#console-log'),'Health check failed');checks.push('Worker execution errors are distinct from health findings');
  const before=requests;
  await page.evaluate(()=>window.postMessage({type:'forge-workshop.request.v1',id:'forged',method:'run',input:{}},location.origin));
  await page.waitForTimeout(200);assert.equal(requests,before);checks.push('Messages from the wrong window cannot invoke the bridge');
  for(const width of [1280,768,390]) {
    await page.setViewportSize({width,height:900});await page.waitForTimeout(350);
    const dimensions=await f.locator('body').evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
    assert.ok(dimensions.scroll<=dimensions.width+1,JSON.stringify(dimensions));
    await page.screenshot({path:out+`/studio-${width}.png`});
  }
  checks.push('No horizontal document overflow at 1280, 768 and 390px');
  await page.goto(base+'/workshop-ui/index.html');
  assert.ok(await page.locator('[data-action="demo-run"]').isDisabled());checks.push('Standalone page cannot submit commands');
  assert.deepEqual(errors,[]);
  await writeFile(out+'/validation.json',JSON.stringify({ok:true,checks,transport:'local fixture; Cognito and live worker were not exercised',errors},null,2));
  console.log(JSON.stringify({ok:true,checks},null,2));
} finally {await page.close();await browser.close();}
