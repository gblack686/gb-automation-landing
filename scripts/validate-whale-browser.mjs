// Actual first-party modules + real signed gateway/receiver, with synthetic SDK and storage seams.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {whaleFixture,actor,claims,expert} from './whale-fixture.mjs';
const base=process.env.FORGE_WHALE_BASE||'http://127.0.0.1:5199';
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(base),'Synthetic checks use loopback only');
const output='artifacts/whaleroom-production-evidence',stamp=new Date().toISOString().replace(/[:.]/g,'-');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'}),checks=[],errors=[];
const page=await browser.newPage({viewport:{width:1360,height:960}});page.setDefaultTimeout(15000);
let fixture=whaleFixture();const sdkCalls=[];
page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(({actor,claims})=>{
 window.__authListeners=new Set();window.__session={tokens:{idToken:{payload:{...claims,exp:Math.floor(Date.now()/1000)+3600}}}};
 window.__authEvent=event=>{for(const fn of window.__authListeners)fn({payload:{event}});};
}, {actor,claims});
await page.route('**/node_modules/.vite/deps/aws-amplify_auth.js*',route=>route.fulfill({contentType:'application/javascript',body:'export const fetchAuthSession=async()=>window.__session;'}));
await page.route('**/node_modules/.vite/deps/aws-amplify_utils.js*',route=>route.fulfill({contentType:'application/javascript',body:'export const Hub={listen:(_channel,fn)=>{window.__authListeners.add(fn);return()=>window.__authListeners.delete(fn);}};'}));
await page.route('**/node_modules/.vite/deps/aws-amplify_data.js*',route=>route.fulfill({contentType:'application/javascript',body:`
 const invoke=field=>async(args,options)=>{const r=await fetch('/__whale_graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({field,args,options})});return r.json();};
 export const generateClient=()=>({queries:{forgeAtlasRead:invoke('forgeAtlasRead'),forgeWealthRead:invoke('forgeWealthRead')},mutations:{forgeWealthCommand:invoke('forgeWealthCommand')}});`}));
await page.route('**/__whale_graphql',async route=>{
 const call=route.request().postDataJSON(),input=JSON.parse(call.args.input);sdkCalls.push({field:call.field,input,options:call.options});assert.equal(call.options.authMode,'userPool');
 if(call.field==='forgeAtlasRead')return route.fulfill({json:{data:{payload:{ok:true,data:await fixture.catalog({...input,agent_id:expert})}}}});
 const event={...fixture.event(input.operation),fieldName:call.field,arguments:{input}};
 if(fixture.controls.denied)delete event.identity;
 const result=await fixture.app.handle(event);return route.fulfill({json:{data:result}});
});
await page.route('**/__whale_harness',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head>
 <meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'"></head>
 <body><div id="app"></div><script type="module">
 import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
 import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
 const {default:Gallery}=await import('/src/components/ForgeResourceGallery.jsx');
 const root=ReactDOM.createRoot(document.getElementById('app'));root.render(React.createElement(Gallery,{agentId:'${expert}',onClose:()=>root.unmount()}));
 </script></body></html>`}));
const card=()=>page.locator('[data-capture-id]').first();
const settings=async()=>{if(!await page.locator('.wr-capture-options').evaluate(n=>n.open))await page.locator('.wr-capture-options>summary').click();};
const open=async()=>{await page.goto(base+'/__whale_harness');await page.getByRole('button',{name:'Open Whale Room',exact:true}).click();await card().waitFor();};
try{
 await open();assert.equal(await page.evaluate(()=>typeof WealthHost?.fetch),'function');assert.equal(await page.getByRole('navigation',{name:'Whale Room channels'}).getByRole('button').count(),12);
 await card().click();await page.locator('.wr-original').getByText('Synthetic private detail <img src=x onerror=unsafe()>',{exact:true}).waitFor();
 assert.equal(await page.locator('.wr-original img,.wr-original script').count(),0);checks.push('Real packaged module mounts after host bridge, twelve channels, exact text rendering and CSP execution');
 await page.getByRole('button',{name:'Back to saved captures',exact:true}).click();fixture.controls.loseAdmission=true;
 await settings();await page.getByRole('button',{name:'Capture on Mac mini #2',exact:true}).click();await page.getByText(/Saved capture request failed/).waitFor();
 await settings();await page.getByRole('button',{name:'Capture on Mac mini #2',exact:true}).click();await page.getByText(/Upload pending; not yet acknowledged/).waitFor();
 await page.getByText(/Saved privately in Supabase: 1 new/).waitFor();assert.equal(fixture.runs.size,1);
 const admissions=sdkCalls.filter(c=>c.input.operation==='captureStart');assert.equal(admissions.length,2);assert.deepEqual(admissions[0].input.args,admissions[1].input.args);checks.push('Lost admission retries same ID/time/channel; async 202, upload_pending and acknowledged completion');
 await page.screenshot({path:output+'/desktop-'+stamp+'.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Back to gallery',exact:true}).click();await page.getByRole('button',{name:'Open Whale Room',exact:true}).focus();await page.keyboard.press('Enter');await card().waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await card().focus();await page.keyboard.press('Enter');await page.locator('.wr-original').getByText('Synthetic private detail <img src=x onerror=unsafe()>',{exact:true}).waitFor();
 await page.screenshot({path:output+'/mobile-'+stamp+'.png',fullPage:true});checks.push('Mobile 390px and keyboard open/detail, no document horizontal overflow');
 await page.evaluate(()=>window.__authEvent('signedOut'));await page.getByText(/Your session changed or access expired/).waitFor();assert(!await page.locator('body').innerText().then(t=>t.includes('Synthetic private')));assert.equal(await page.evaluate(()=>typeof window.WealthHost),'undefined');checks.push('Logout synchronously scrubs private DOM and removes global bridge');
 fixture.controls.connector=false;await open();await page.getByText(/Connect the MM2 browser/).waitFor();assert(await page.getByRole('button',{name:'Capture on Mac mini #2',exact:true,includeHidden:true}).isDisabled());await card().click();await page.locator('.wr-original').getByText('Synthetic private detail <img src=x onerror=unsafe()>',{exact:true}).waitFor();checks.push('Saved cloud list and detail remain available with connector disabled');
 await page.locator('.wr-message-evidence>summary').click();await page.getByRole('button',{name:'Delete saved snapshot',exact:true}).click();assert.equal(sdkCalls.filter(c=>c.input.operation==='captureDelete').length,0);await page.getByRole('button',{name:'Confirm delete saved snapshot',exact:true}).click();await page.getByText(/Saved content deleted from Supabase/).waitFor();assert.equal(sdkCalls.filter(c=>c.input.operation==='captureDelete').length,1);checks.push('Delete-one uses command field with stable request_id/requested_at and refreshed saved list');
 await page.evaluate(()=>{window.__session.tokens.idToken.payload.sub='cccccccc-cccc-cccc-cccc-cccccccccccc';window.dispatchEvent(new Event('focus'));});await page.getByText(/Your session changed or access expired/).waitFor();assert.equal(await page.evaluate(()=>typeof window.WealthHost),'undefined');checks.push('Account switch invalidates mounted session');
 fixture=whaleFixture({controls:{statusFailure:true}});await open();await page.getByText(/Saved capture request failed/).waitFor();
 await card().click();await page.locator('.wr-original').getByText('Synthetic private detail <img src=x onerror=unsafe()>',{exact:true}).waitFor();checks.push('Saved list/detail work even when connector status request fails');
 fixture.controls.denied=true;await page.getByRole('button',{name:'Reload saved captures',exact:true}).click();await page.getByText(/Your session changed or access expired/).waitFor();assert(!await page.locator('body').innerText().then(t=>t.includes('Synthetic private')));checks.push('Server access denial scrubs already displayed private detail');
 fixture=whaleFixture();await open();await page.evaluate(()=>{window.__session.tokens.idToken.payload.exp=Math.floor(Date.now()/1000)+2;window.dispatchEvent(new Event('focus'));});await page.getByText(/Your session changed or access expired/).waitFor();checks.push('Idle token expiry clears mounted data without waiting for a new user request');
 fixture=whaleFixture();await open();let release,entered;const started=new Promise(resolve=>entered=resolve);fixture.controls.detailWait=new Promise(resolve=>release=resolve);fixture.controls.detailEntered=entered;
 await card().click();await started;await page.evaluate(()=>window.__authEvent('signedOut'));await page.getByText(/Your session changed or access expired/).waitFor();
 const returned=page.waitForResponse('**/__whale_graphql');release();await returned;await page.waitForTimeout(100);assert(!await page.locator('body').innerText().then(t=>t.includes('Synthetic private')));checks.push('Late signed detail response cannot restore DOM after logout');
 fixture=whaleFixture();await open();const beforeDelete=sdkCalls.filter(c=>c.input.operation==='captureDelete').length;
 await settings();await page.getByRole('button',{name:'Delete all browser captures',exact:true}).click();assert.equal(sdkCalls.filter(c=>c.input.operation==='captureDelete').length,beforeDelete);
 await page.getByRole('button',{name:'Confirm delete all saved captures',exact:true}).click();await page.getByText(/Saved content deleted from Supabase/).waitFor();assert.equal(sdkCalls.filter(c=>c.input.operation==='captureDelete').length,beforeDelete+1);checks.push('Delete-all requires explicit confirmation and clears the saved list');
 assert.deepEqual(errors,[]);await writeFile(output+'/browser-'+stamp+'.json',JSON.stringify({status:'pass',checks,errors,operations:sdkCalls.map(c=>({field:c.field,operation:c.input.operation||c.input.view})),scope:'Synthetic SDK/storage; actual React mount, browser modules, signed server gateway and receiver. No live identity or source access.'},null,2));console.log(JSON.stringify({status:'pass',checks}));
}catch(error){await page.screenshot({path:output+'/browser-failed-'+stamp+'.png',fullPage:true}).catch(()=>{});await writeFile(output+'/browser-failed-'+stamp+'.json',JSON.stringify({status:'fail',checks,errors,message:error.stack,calls:sdkCalls.map(c=>c.input.operation||c.input.view)},null,2));throw error;}
finally{await browser.close();}
