// Compiled Forge route + real Amplify SDK; only synthetic identities/storage and loopback.
import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {whaleFixture,actor,claims,expert,channel,captureId} from './whale-fixture.mjs';

assert.equal(process.version,'v24.22.1');
assert(process.argv[2],'Pass the frozen upstream wealth-platform source root');
const upstream=resolve(process.argv[2]),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const lock=JSON.parse(await readFile('scripts/wealth-package.lock.json','utf8'));
for(const [path,expected] of Object.entries(lock.files))assert.equal(hash(await readFile(resolve(upstream,path))),expected.sha256,'Upstream drift: '+path);
const registry=await readFile(resolve(upstream,'wealth_platform/community/source.py'),'utf8');
const channelBlock=registry.match(/CHANNELS = \{([\s\S]*?)\n\}/)?.[1];assert(channelBlock);
const channels=[...channelBlock.matchAll(/'([0-9]+)': '([a-z0-9-]+)'/g)].map(([,id,name])=>({id,name}));
assert.equal(channels.length,12);assert.equal(channels[0].id,channel);
const output='artifacts/whaleroom-production-evidence/presentation-'+new Date().toISOString().replace(/[:.]/g,'-');
await mkdir(output,{recursive:true});
const server=await preview({configFile:false,preview:{host:'127.0.0.1',port:5207,strictPort:true}});
const base='http://127.0.0.1:5207';
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
// Playwright's serviceWorkers:'block' initializer touches navigator.serviceWorker in
// opaque frames and raises a SecurityError. This fresh context has no workers;
// the closed network route below permits only the reviewed static app and fixtures.
const context=await browser.newContext({viewport:{width:1360,height:960}});
const page=await context.newPage();page.setDefaultTimeout(15000);
const checks=[],errors=[],requests=[],blocked=[],layouts=[];
page.on('pageerror',e=>errors.push(e.message));
const fixture=whaleFixture({controls:{channels,multichannel:true}});
const documentHTML='<!doctype html><html><head></head><body><p>Synthetic containing Forge workspace</p><!-- forge-atlas.request.v1 --></body></html>';
const docURL=`https://fixture-bucket.s3.us-east-1.amazonaws.com/gbautomation/${expert}/index.html`;
const jwt=payload=>Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.synthetic';
const tokenClaims={...claims,username:actor,'cognito:username':actor,email:'synthetic@example.invalid',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600};
await context.addInitScript(({id,access,actor})=>{
 if(window!==window.top||location.hostname!=='127.0.0.1')return;
 const prefix='CognitoIdentityServiceProvider.syntheticclient.';
 localStorage.setItem(prefix+'LastAuthUser',actor);
 localStorage.setItem(prefix+actor+'.idToken',id);localStorage.setItem(prefix+actor+'.accessToken',access);
 localStorage.setItem(prefix+actor+'.clockDrift','0');
},{actor,id:jwt({...tokenClaims,token_use:'id',aud:'syntheticclient'}),access:jwt({...tokenClaims,token_use:'access',client_id:'syntheticclient'})});
await context.route('**/*',async route=>{
 const request=route.request(),url=request.url();
 if(url===docURL)return route.fulfill({contentType:'text/html',body:documentHTML});
 if(url==='https://synthetic.invalid/graphql'){
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':base,'access-control-allow-headers':'*','access-control-allow-methods':'POST'}});
  const call=request.postDataJSON(),field=call.query.match(/\b(forge\w+)\s*\(/)?.[1];assert(field,call.query);
  const input=JSON.parse(call.variables.input);requests.push({field,input});
  // Only a fake token is accepted by this local fixture. Never contact an identity provider.
  assert(request.headers().authorization?.endsWith('.synthetic'));
  let result;
  if(field==='forgeAtlasRead'){
   let data;
   if(input.view==='agents')data={schema_version:'forge-agent-registry.v1',tenant_id:'gbautomation',source:'s3',agents:[{agent_id:expert,display_name:'Whale Room',status:'active',config_sha256:'c'.repeat(64)}]};
   else if(input.view==='resourceCatalog')data=await fixture.catalog(input);
   else if(input.view==='document')data={url:docURL,sha256:hash(documentHTML),bytes:Buffer.byteLength(documentHTML),tenant_id:'gbautomation',agent_id:expert};
   else throw Error('Unexpected Atlas read '+input.view);
   result={payload:JSON.stringify({ok:true,data})};
  }else if(['forgePiRead','forgeChatRead'].includes(field))result={payload:JSON.stringify({ok:true,data:{enabled:false,tenant_id:'gbautomation',agent_id:expert}})};
  else {
   assert(['forgeWealthRead','forgeWealthCommand'].includes(field));
   result=await fixture.app.handle({...fixture.event(input.operation),fieldName:field,arguments:{input}});
  }
  return route.fulfill({json:{data:{[field]:result}},headers:{'access-control-allow-origin':base}});
 }
 if(url.startsWith(base+'/'))return route.continue();
 blocked.push(url);return route.abort();
});
const rail=page.getByRole('navigation',{name:'Whale Room channels',exact:true});
const channelButton=index=>rail.getByRole('button',{name:'#'+channels[index].name,exact:true});
const captures=page.getByRole('list',{name:'Saved browser captures',exact:true});
const detail=page.getByRole('region',{name:'Saved capture detail',exact:true});
const lastList=()=>requests.filter(r=>r.input.operation==='captureList').at(-1).input.args;
const waitList=text=>captures.getByText(text,{exact:false}).first().waitFor();
const browse=async()=>{if(page.viewportSize().width<=700&&!await rail.isVisible())await page.getByRole('button',{name:'Browse channels',exact:true}).click();};
const select=async index=>{await browse();await channelButton(index).click();await page.waitForFunction(id=>document.querySelector(`.wr-sidebar button[data-channel-id="${id}"]`)?.getAttribute('aria-current')==='true',channels[index].id);};
const snapshot=async label=>{
 const layout=await page.evaluate(()=>{
  const measure=selector=>{const n=document.querySelector(selector),s=getComputedStyle(n),r=n.getBoundingClientRect();return {selector,font:s.fontFamily,display:s.display,columns:s.gridTemplateColumns,direction:s.flexDirection,x:r.x,y:r.y,width:r.width,height:r.height,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight,overflow:s.overflow};};
  return {url:location.href,bodyFont:getComputedStyle(document.body).fontFamily,overflow:document.documentElement.scrollWidth>innerWidth,
   elements:['.forge-resource-dialog','.wr-cloud','.wr-sidebar','.wr-sidebar nav'].map(measure),
   selected:[...document.querySelectorAll('.wr-sidebar [aria-current]')].map(n=>({text:n.textContent,current:n.getAttribute('aria-current'),background:getComputedStyle(n).backgroundColor,border:getComputedStyle(n).borderColor,fontWeight:getComputedStyle(n).fontWeight})),
   styles:[...document.styleSheets].map(s=>s.href).filter(Boolean)};
 });
 assert.equal(layout.overflow,false);assert(layout.styles.some(s=>/\/assets\/.*\.css$/.test(s)));assert(layout.styles.some(s=>s.endsWith('/apps/wealth/whale-room.css')));
 assert.match(layout.bodyFont,/sans-serif/);layouts.push({label,...layout});await page.screenshot({path:output+'/'+label+'.png',fullPage:true});
};
try{
 await page.goto(`${base}/atlas/${expert}?window=resources&owner=${expert}`);
 await page.getByRole('button',{name:'Open Whale Room',exact:true}).click();
 await waitList('Synthetic second channel capture');await channelButton(11).waitFor({state:'attached'});
 assert.equal(await rail.getByRole('button').count(),12);
 assert.equal(await page.getByRole('button',{name:'Back to workspace',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'All saved captures',exact:true}).getAttribute('aria-current'),'true');
 assert.equal(await page.evaluate(()=>typeof WealthHost.fetch),'function');
 checks.push('Compiled /atlas route, actual Amplify SDK and authenticated host bridge; twelve registry labels; All saved captures selected; false Back omitted');
 const target=await page.getByRole('combobox',{name:'Capture channel',exact:true,includeHidden:true}).inputValue();
 fixture.controls.paged=true;await select(0);await waitList('Synthetic private capture');
 await page.getByRole('button',{name:'More captures',exact:true}).click();await waitList('No saved captures for this channel');
 assert.deepEqual(lastList(),{offset:40,revision:7,channel_id:channels[0].id});
 fixture.controls.paged=false;await select(1);await waitList('Synthetic second channel capture');
 assert.deepEqual(lastList(),{offset:0,channel_id:channels[1].id});
 assert.equal(await captures.getByRole('button').count(),1);assert(!(await captures.innerText()).includes('columbus-trades'));
 assert.equal(await page.getByRole('button',{name:'Previous captures',exact:true}).isDisabled(),true);
 assert.equal(await page.getByRole('combobox',{name:'Capture channel',exact:true,includeHidden:true}).inputValue(),target);
 assert.equal(await page.locator('.wr-sidebar [aria-current="true"]').count(),1);
 checks.push('Exact signed captureList channel argument; server filters results; pagination offset/revision reset; capture target stays independent');
 await snapshot('desktop-selected');
 assert.equal(layouts.at(-1).elements.find(e=>e.selector==='.wr-sidebar nav').direction,'column');
 assert.equal(layouts.at(-1).selected[0].background,'rgb(64, 66, 73)');
 const viewport=page.viewportSize(),dialog=layouts.at(-1).elements.find(e=>e.selector==='.forge-resource-dialog');
 assert.equal(dialog.x,0);assert.equal(dialog.y,0);assert.equal(dialog.width,viewport.width);assert.equal(dialog.height,viewport.height);
 assert.match(await page.locator('.wr-post-title').first().evaluate(n=>getComputedStyle(n).fontFamily),/sans-serif/);
 const beforeModes=requests.length;await page.getByRole('searchbox',{name:'Search saved messages on this page'}).fill('absent-example');
 assert.equal(await captures.locator('[data-capture-id]:visible').count(),0);await page.getByRole('searchbox').fill('');
 await page.getByRole('button',{name:'Chat',exact:true}).click();assert.equal(await page.locator('.wr-cloud').getAttribute('data-view'),'chat');await page.getByRole('button',{name:'Forum',exact:true}).click();assert.equal(requests.length,beforeModes);
 checks.push('Desktop uses compiled host CSS, vertical channel navigation and visible selected-channel styling');
 await select(2);await waitList('No saved captures for this channel');
 const empty=await captures.innerText();assert(empty.includes('prepared Mac mini #2 browser'));assert(empty.includes('Capture on Mac mini #2'));assert(!empty.includes('Capture visible messages'));
 checks.push('Empty cloud channel names prepared MM2 browser and the actual capture action');
 await select(0);await waitList('Synthetic private capture');
 let releaseDetail,enteredDetail;const startedDetail=new Promise(resolve=>enteredDetail=resolve);
 fixture.controls.detailWait=new Promise(resolve=>releaseDetail=resolve);fixture.controls.detailEntered=enteredDetail;
 await captures.getByRole('button').click();await startedDetail;
 await select(1);assert.equal(await detail.locator('.wr-original').count(),0);assert(!(await detail.innerText()).includes('Synthetic private'));
 fixture.controls.detailWait=null;releaseDetail();await waitList('Synthetic second channel capture');
 assert.equal(await detail.locator('.wr-original').count(),0);assert(!(await detail.innerText()).includes('Synthetic private'));assert(!(await captures.innerText()).includes('Synthetic private'));
 checks.push('Channel change scrubs detail immediately and fences a delayed signed previous-channel detail response');
 let releaseList,enteredList;const startedList=new Promise(resolve=>enteredList=resolve);
 fixture.controls.listWait=new Promise(resolve=>releaseList=resolve);fixture.controls.listEntered=enteredList;
 await select(0);await startedList;await select(1);assert.equal(await captures.innerText(),'');
 fixture.controls.listWait=null;releaseList();await waitList('Synthetic second channel capture');
 assert(!(await captures.innerText()).includes('Synthetic private'));assert.deepEqual(lastList(),{offset:0,channel_id:channels[1].id});
 checks.push('Channel change scrubs old list immediately and fences delayed signed previous-channel list response');
 await page.getByRole('button',{name:'All saved captures',exact:true}).click();await waitList('Synthetic private capture');await waitList('Synthetic second channel capture');
 assert.deepEqual(lastList(),{offset:0});checks.push('All saved captures clears the channel filter and restores both synthetic histories');
 await page.setViewportSize({width:390,height:844});
 await browse();assert(await page.locator('.wr-sidebar [aria-current="true"]').evaluate(n=>document.activeElement===n));
 await page.keyboard.press('Escape');assert.equal(await rail.isVisible(),false);assert(await page.getByRole('button',{name:'Browse channels',exact:true}).evaluate(n=>document.activeElement===n));
 checks.push('Mobile drawer focuses the selected channel and Escape returns focus to Browse channels without closing the app');
 for(let index=0;index<12;index++){
  await browse();
  const button=channelButton(index);await button.focus();await page.keyboard.press('Space');
  await page.waitForFunction(id=>document.querySelector(`.wr-sidebar button[data-channel-id="${id}"]`)?.getAttribute('aria-current')==='true',channels[index].id);
  await page.getByText('Saved history: #'+channels[index].name,{exact:true}).waitFor({state:'attached'});
  await waitList(index===0?'Synthetic private capture':index===1?'Synthetic second channel capture':'No saved captures for this channel');
  assert.deepEqual(lastList(),{offset:0,channel_id:channels[index].id});
 }
 await browse();await channelButton(11).focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
 assert.equal(await channelButton(11).evaluate(n=>document.activeElement===n),true);
 const focus=await channelButton(11).evaluate(n=>({visible:n.matches(':focus-visible'),outline:getComputedStyle(n).outlineWidth}));
 assert(focus.visible);assert.equal(focus.outline,'3px');
 await snapshot('mobile-last-channel-keyboard');
 assert.equal(layouts.at(-1).elements.find(e=>e.selector==='.wr-sidebar nav').display,'flex');
 checks.push('390px mobile channel drawer; keyboard selects all twelve channels and returns to feed; selected and focus styles visible; no horizontal overflow');
 await select(0);await waitList('Synthetic private capture');
 await captures.getByRole('button').focus();await page.keyboard.press('Enter');
 await page.locator('.wr-original').getByText('Synthetic private detail <img src=x onerror=unsafe()>',{exact:true}).waitFor();
 assert.equal(await page.locator('.wr-original img,.wr-original script').count(),0);await snapshot('mobile-detail');
 checks.push('Mobile keyboard opens detail with exact safe text rendering and reachable nested scroll areas');
 await page.getByRole('button',{name:'Back to gallery',exact:true}).click();await page.getByRole('button',{name:'Open Whale Room',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>typeof window.WealthHost),'undefined');assert(!(await page.locator('body').innerText()).includes('Synthetic private'));
 await page.getByRole('button',{name:'Close expert resources',exact:true}).click();assert.equal(await page.locator('.forge-resource-dialog').count(),0);
 checks.push('Existing Back to gallery and Close expert resources navigate correctly and remove private DOM/host bridge');
 assert.deepEqual(errors,[]);
 const assets=[];for(const path of ['dist/index.html','dist/apps/wealth/whale-cloud.js','dist/apps/wealth/whale-browser-captures.js','dist/apps/wealth/whale-room.css'])assets.push({path,sha256:hash(await readFile(path))});
 await writeFile(output+'/report.json',JSON.stringify({status:'pass',node:process.version,checks,layouts,errors,blocked,requests,assets,registry_sha256:hash(registry),scope:'Compiled production app/actual SDK and signed gateway/receiver; synthetic credentials, registry and storage; external requests blocked; no live acceptance.'},null,2)+'\n');
 console.log(JSON.stringify({status:'pass',checks,report:output+'/report.json'}));
}catch(error){
 await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});
 await writeFile(output+'/failure.json',JSON.stringify({status:'fail',message:error.stack,checks,errors,requests,blocked,layouts},null,2)+'\n');throw error;
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
