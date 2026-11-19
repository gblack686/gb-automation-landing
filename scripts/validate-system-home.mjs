// Isolated browser checks: no real identity, storage, telemetry or credentials.
// Start Vite on 127.0.0.1:5208. Set SYSTEM_HOME_OUTPUT to a private evidence dir.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {systemFixture} from '../amplify/functions/forge-atlas/fixtures/system-home.mjs';
import {validateSystemSnapshot} from '../amplify/functions/forge-atlas/system-home.mjs';
const base=process.env.SYSTEM_HOME_BASE||'http://127.0.0.1:5208',output=process.env.SYSTEM_HOME_OUTPUT||process.argv[2];
if(!output)throw Error('SYSTEM_HOME_OUTPUT must name a private evidence directory');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(60000);
await page.clock.install();
const checks=[],errors=[],reads=[],external=[];let mode='admin',fail=false,hold=null,pending=null,empty=false,graphCase='normal';
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>{
 const url=new URL(route.request().url());if(url.origin!==new URL(base).origin){external.push(url.origin);return route.abort();}return route.continue();
});
await page.route('**/src/lib/systemHomeClient.js*',route=>route.fulfill({contentType:'application/javascript',body:`
 import {createSystemSession} from '/src/lib/systemHome.mjs';
 export function openSystemSession(onInvalidate){return createSystemSession({
 session:async()=>({tokens:{idToken:{payload:{sub:window.__account||'fixture-owner',iss:'fixture-issuer',exp:window.__expiry||Math.floor(Date.now()/1000)+120}}}}),
 onInvalidate,listen:cb=>{const f=e=>cb(e.detail);window.addEventListener('fixture-auth',f);return ()=>window.removeEventListener('fixture-auth',f);},
 request:async view=>{const r=await fetch('/__system_fixture',{method:'POST',body:JSON.stringify({view})});const p=await r.json();if(!p.ok)throw Object.assign(Error('Unavailable'),{code:p.error});return p.data;}});}`}));
await page.route('**/src/lib/forgeResourceClient.js*',route=>route.fulfill({contentType:'application/javascript',body:`
 export async function readResourceCatalog(){return {rows:[],total:0,owners:[],catalog_sha256:'${'a'.repeat(64)}'};}
 export async function readResourceArtifact(){throw Error('No fixture artifact selected');}
 export function resourceDocument(){return '';}`}));
// The non-admin redirect mounts the existing tenant portal. Isolate its readers
// and the unrelated global command widget without replacing routing/auth logic.
await page.route('**/src/clients/jid5274/lib/portalData.js*',route=>route.fulfill({contentType:'application/javascript',body:`
 export async function fetchJid5274Schedules(){return [];}
 export async function fetchJid5274Runs(){return [];}
 export async function fetchJid5274RunOutputs(){return [];}
 export async function fetchJid5274Board(){return [];}`}));
await page.route('**/src/components/HermesCommandLayer.jsx*',route=>route.fulfill({contentType:'application/javascript',body:'export default function HermesCommandLayer(){return null;}'}));
await page.route('**/__system_fixture',async route=>{
 const {view}=route.request().postDataJSON();reads.push(view);
 if(hold&&view==='snapshot'){pending=route;hold();hold=null;return;}
 if(mode==='denied')return route.fulfill({json:{ok:false,error:'system_access_required'}});
 if(mode==='access-fail')return route.fulfill({json:{ok:false,error:'access_unavailable'}});
 if(view==='access')return route.fulfill({json:{ok:true,data:{admin:mode==='admin',destination:mode==='admin'?'/system':'/clients/jid5274',agent_id:mode==='admin'?'fixture-expert':null}}});
 if(fail)return route.fulfill({json:{ok:false,error:'system_unavailable'}});
 const x=systemFixture();if(empty){x.docs.rows=[];x.docs.count=0;x.observability.sessions=[];x.operations.sources=[];}
 if(graphCase!=='normal'){
  const g=x.context_graph;
  g.sources=g.sources.map(s=>graphCase==='unavailable'||s.id==='knowledge'?{...s,status:'unavailable',reason:'source_unavailable',generated_at:null,nodes_total:null,nodes_returned:null,possibly_truncated:false}:s);
  if(graphCase==='unavailable'){g.nodes=[];g.links=[];}
  else {g.nodes=g.nodes.filter(n=>n.sources.includes('operations')).map(n=>({...n,sources:['operations']}));g.links=g.links.filter(l=>l.sources.includes('operations')).map(l=>({...l,sources:['operations']}));}
 }
 return route.fulfill({json:{ok:true,data:validateSystemSnapshot(x)}});
});
try {
 await page.goto(`${base}/system#view=operations&sid=dna-local-1`,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Operations + knowledge graph',exact:true}).waitFor();
 assert.deepEqual(reads.slice(0,2),['access','snapshot']);await page.getByText('Unknown',{exact:true}).first().waitFor();
 const nodes=page.locator('[data-context-node]'),links=page.locator('[data-context-link]');
 assert.equal(await nodes.count(),5);assert.equal(await links.count(),2);assert.equal(await page.locator('.system-context iframe').count(),0);
 await page.getByRole('article',{name:'Knowledge graph source'}).getByText('Retained stale source snapshot').waitFor();
 assert.equal(await page.getByRole('article',{name:'Knowledge graph source'}).locator('time').getAttribute('datetime'),'2020-01-01T00:00:00Z');
 await page.getByRole('article',{name:'Operations graph source'}).getByText('Possibly truncated',{exact:true}).waitFor();
 await page.getByLabel('Graph source',{exact:true}).selectOption('shared');assert.equal(await nodes.count(),1);assert.equal(await links.count(),0);
 await page.getByLabel('Graph source',{exact:true}).selectOption('knowledge');assert.equal(await nodes.count(),3);
 await page.getByLabel('Graph source',{exact:true}).selectOption('all');await page.getByLabel('Graph area',{exact:true}).selectOption('example');assert.equal(await nodes.count(),3);assert.equal(await links.count(),1);
 await page.getByRole('button',{name:'Reset graph filters'}).click();await page.getByLabel('Find graph nodes',{exact:true}).fill('conflicting title');assert.equal(await nodes.count(),2);assert.equal(await links.count(),0);
 const conflictIds=await nodes.evaluateAll(ns=>ns.map(n=>n.dataset.contextNode));assert.equal(new Set(conflictIds).size,2);
 await page.getByRole('button',{name:'Reset graph filters'}).click();
 await page.getByRole('button',{name:/Inspect context Synthetic shared project/}).click();
 const inspector=page.getByRole('complementary',{name:'Context node inspector'});await inspector.getByRole('heading',{name:'Observed connections (2)'}).waitFor();assert.equal(await inspector.locator('.context-badges').first().locator('span').count(),2);
 const context=page.getByRole('group',{name:/Combined context graph/}),initialCamera=await context.getAttribute('viewBox');
 await context.hover();await page.mouse.wheel(0,-120);await page.waitForTimeout(100);assert.notEqual(await context.getAttribute('viewBox'),initialCamera);
 const contextBox=await context.boundingBox();const zoomed=await context.getAttribute('viewBox');await page.mouse.move(contextBox.x+5,contextBox.y+5);await page.mouse.down();await page.mouse.move(contextBox.x+45,contextBox.y+45);await page.mouse.up();assert.notEqual(await context.getAttribute('viewBox'),zoomed);
 await page.getByRole('button',{name:'Focus node',exact:true}).click();await page.getByRole('button',{name:'Fit graph',exact:true}).click();
 await page.screenshot({path:`${output}/combined-graph-desktop.png`,fullPage:true});
 await page.locator('.context-source-status').screenshot({path:`${output}/combined-sources-desktop.png`});
 await inspector.getByRole('button',{name:'Search Docs for this node'}).click();await page.getByRole('heading',{name:'Docs / KB',exact:true}).waitFor();assert.equal(await page.getByRole('searchbox').inputValue(),'Synthetic shared project');await page.getByRole('cell',{name:'Synthetic shared project',exact:true}).waitFor();assert.match(page.url(),/sid=dna-local-1/);
 await page.getByRole('button',{name:/^Operations Center/}).click();
 const refreshGraph=async()=>{const response=page.waitForResponse(r=>r.url().endsWith('/__system_fixture')&&r.request().postDataJSON()?.view==='snapshot');await page.getByRole('button',{name:'Refresh',exact:true}).click();await response;await page.waitForFunction(()=>!document.querySelector('.system-actions button')?.disabled);};
 graphCase='missing';await refreshGraph();await page.getByRole('article',{name:'Knowledge graph source'}).getByText('Unknown source timestamp').waitFor();assert.equal(await nodes.count(),3);assert.equal(await links.count(),1);
 graphCase='unavailable';await refreshGraph();await page.getByText('No graph nodes are available from the reported sources.').waitFor();assert.equal(await nodes.count(),0);
 graphCase='normal';await refreshGraph();await page.waitForFunction(()=>document.querySelectorAll('[data-context-node]').length===5);
 const stableCamera=await context.getAttribute('viewBox');await page.getByRole('button',{name:'Zoom context graph in'}).click();const exploredCamera=await context.getAttribute('viewBox');assert.notEqual(exploredCamera,stableCamera);await refreshGraph();assert.equal(await context.getAttribute('viewBox'),exploredCamera);
 checks.push('One combined graph preserves shared identity, distinct conflicting titles and observed-only links; source/area/search filters, source ages/truncation/unavailable/empty states, pan/zoom/focus and stable refresh; node inspector bridges to Docs search');
 await page.getByRole('button',{name:'Architecture reference',exact:true}).click();await page.getByRole('heading',{name:'System atlas',exact:true}).waitFor();
 await page.getByRole('button',{name:'Inspect Example reader',exact:true}).click();await page.getByRole('link',{name:'View pinned source on GitHub'}).waitFor();
 assert.match(await page.getByRole('link',{name:'View pinned source on GitHub'}).getAttribute('href'),/github.com/);
 const graph=page.getByRole('group',{name:/Interactive system atlas/});const before=await graph.getAttribute('viewBox');await graph.hover();await page.mouse.wheel(0,-100);await page.waitForTimeout(100);assert.notEqual(await graph.getAttribute('viewBox'),before);
 await page.getByLabel('Fit boundary').selectOption('fixture-second');const focused=await graph.getAttribute('viewBox');await page.getByRole('button',{name:'Fit all',exact:true}).click();assert.notEqual(await graph.getAttribute('viewBox'),focused);assert.equal(await page.getByLabel('Fit boundary').inputValue(),'');
 const box=await graph.boundingBox();await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+60,box.y+60);await page.mouse.up();assert.notEqual(await graph.getAttribute('viewBox'),before);
 checks.push('Admin capability precedes snapshot; unknown counts and source times; secondary architecture remains in the same shell with inspector, pinned link, zoom/pan and boundary fit');
 await page.getByRole('button',{name:'Operations + knowledge',exact:true}).click();
 await page.screenshot({path:`${output}/operations-desktop.png`,fullPage:true});
 await page.getByRole('button',{name:/^Operations Center/}).focus();await page.keyboard.press('Shift+Tab');await page.getByRole('heading',{name:'Docs / KB',exact:true}).waitFor();
 await page.screenshot({path:`${output}/docs-desktop.png`,fullPage:true});
 await page.getByRole('button',{name:'Browse saved reports'}).click();await page.getByRole('dialog',{name:'Expert resources'}).waitFor();await page.keyboard.press('Shift+Tab');assert.match(page.url(),/view=docs/);await page.getByRole('button',{name:'Close expert resources'}).click();
 const input=page.getByRole('searchbox');await input.fill('Synthetic');await page.keyboard.press('Shift+Tab');assert.match(page.url(),/view=docs/);
 await page.getByRole('button',{name:/^Docs \/ KB/}).focus();await page.keyboard.press('Shift+Tab');await page.getByRole('heading',{name:'Agent Observability',exact:true}).waitFor();assert.match(page.url(),/sid=dna-local-1/);
 await page.getByRole('combobox',{name:'Session',exact:true}).selectOption('fixture-session');await page.getByRole('button',{name:/^Agent Observability/}).focus();await page.keyboard.press('Shift+Tab');await page.getByRole('heading',{name:'Operations Center',exact:true}).waitFor();assert.match(page.url(),/sid=fixture-session/);
 await page.evaluate(()=>{const d=document.createElement('dialog');d.id='fixture-dialog';d.innerHTML='<button>Close test dialog</button>';document.body.append(d);d.showModal();});await page.keyboard.press('Shift+Tab');assert.match(page.url(),/view=operations/);await page.evaluate(()=>document.getElementById('fixture-dialog').remove());
 checks.push('Visible switcher, Shift+Tab order/wrap, input/dialog exclusion and session URL persistence');
 const beforeHidden=reads.length;
 await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'}));
 await page.clock.fastForward(31000);assert.equal(reads.length,beforeHidden);
 const isSnapshot=r=>r.url().endsWith('/__system_fixture')&&r.request().postDataJSON()?.view==='snapshot';
 const visibleResponse=page.waitForResponse(isSnapshot);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
 await visibleResponse;await page.waitForFunction(()=>!document.querySelector('.system-actions button')?.disabled);assert(reads.length>beforeHidden);
 const beforeTick=reads.length,tickResponse=page.waitForResponse(isSnapshot);await page.clock.fastForward(31000);await tickResponse;await page.waitForFunction(()=>!document.querySelector('.system-actions button')?.disabled);assert(reads.length>beforeTick);
 checks.push('30-second refresh runs while visible and suppresses snapshot reads while hidden');
 fail=true;await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('alert').waitFor();await page.getByText('Last successful snapshot',{exact:true}).waitFor();await page.getByRole('heading',{name:'Operations + knowledge graph',exact:true}).waitFor();await page.getByText('Refresh unavailable. Showing the last successful combined graph.').waitFor();fail=false;
 mode='denied';await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.system-content'));assert.equal(await page.getByText('Example reader',{exact:true}).count(),0);
 checks.push('Transient outage labels retained data; server revocation clears all private views');
 mode='admin';await page.reload();await page.getByRole('heading',{name:'Operations + knowledge graph',exact:true}).waitFor();
 const delayed=new Promise(resolve=>hold=resolve);await page.getByRole('button',{name:'Refresh',exact:true}).click();await delayed;
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('fixture-auth',{detail:'signedOut'})));await page.waitForFunction(()=>!document.querySelector('.system-content'));
 await pending.fulfill({json:{ok:true,data:validateSystemSnapshot(systemFixture())}});pending=null;await page.waitForTimeout(150);assert.equal(await page.locator('.system-content').count(),0);
 await page.reload();await page.getByRole('heading',{name:'Operations + knowledge graph',exact:true}).waitFor();await page.evaluate(()=>window.__account='another-account');await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.system-content'));
 await page.reload();await page.getByRole('heading',{name:'Operations + knowledge graph',exact:true}).waitFor();await page.evaluate(()=>window.__expiry=Math.floor(Date.now()/1000)+5);await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.system-actions button')?.disabled);await page.clock.fastForward(5100);await page.waitForFunction(()=>!document.querySelector('.system-content'));
 checks.push('Logout, token expiry and account switch scrub private state; in-flight reply cannot repopulate it');
 mode='user';const count=reads.filter(x=>x==='snapshot').length;await page.goto(`${base}/system`);await page.waitForURL('**/clients/jid5274');assert.equal(reads.filter(x=>x==='snapshot').length,count);
 mode='access-fail';await page.goto(`${base}/system`);await page.getByRole('alert').waitFor();assert.equal(reads.filter(x=>x==='snapshot').length,count);assert.equal(await page.locator('.system-content').count(),0);
 checks.push('Non-admin goes to own portal with zero snapshot calls; failed capability lookup fails closed');
 mode='admin';empty=true;await page.getByRole('button',{name:/^Docs \/ KB/}).click();await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByText('No indexed records are available in this snapshot.').waitFor();empty=false;
 await page.setViewportSize({width:390,height:844});await page.goto(`${base}/system#view=observability&sid=unknown-session`);await page.getByText('Session not observed in the bounded sample.').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:`${output}/observability-mobile.png`,fullPage:true});
 await page.getByRole('button',{name:'Operations Center',exact:false}).click();await page.getByRole('heading',{name:'Operations + knowledge graph',exact:true}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:`${output}/operations-mobile.png`,fullPage:true});await page.getByLabel('Inspect context node',{exact:true}).selectOption('g_'+(1).toString(16).padStart(24,'0'));await page.getByRole('button',{name:'Focus node',exact:true}).click();await page.getByRole('button',{name:'Fit graph',exact:true}).click();
 await page.locator('.context-canvas').screenshot({path:`${output}/combined-graph-mobile.png`});
 await page.locator('.context-source-status').screenshot({path:`${output}/combined-sources-mobile.png`});
 checks.push('Empty data stays empty; unknown session unavailable; mobile views fit viewport');
 // Exercise the actual login component with only its auth provider fixture replaced.
 await page.route('**/node_modules/.vite/deps/@aws-amplify_ui-react.js*',route=>route.fulfill({contentType:'application/javascript',body:`export function Authenticator({children}){return children;}Authenticator.Provider=Authenticator;export function useAuthenticator(){return {authStatus:'authenticated'};}`}));
 await page.goto(`${base}/login`);await page.waitForURL('**/system');await page.getByRole('heading',{name:'Operations + knowledge graph',exact:true}).waitFor();
 await page.goto(`${base}/login?next=${encodeURIComponent('/system?context=fixture#view=docs&sid=fixture-session')}`);await page.waitForURL('**/system?context=fixture#view=docs&sid=fixture-session');await page.getByRole('heading',{name:'Docs / KB',exact:true}).waitFor();
 checks.push('Actual login default uses server destination and preserves safe explicit query/hash');
 // Global pre-existing typography requests are blocked too; no app/credential
 // request may leave the fixture origin.
 assert.deepEqual(errors,[]);assert.deepEqual(external.filter(x=>!['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(x)),[]);
 await writeFile(`${output}/browser.json`,JSON.stringify({ok:true,checks,reads,errors,external},null,2));console.log(JSON.stringify({ok:true,checks,reads:reads.length,external,errors},null,2));
}catch(error){await writeFile(`${output}/browser-failure-${Date.now()}.json`,JSON.stringify({error:String(error),checks,reads,errors,external},null,2));await page.screenshot({path:`${output}/failure-${Date.now()}.png`,fullPage:true});throw error;}finally{await browser.close();}
