// Actual first-party modules + real signed gateway/receiver, with synthetic SDK and storage seams.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {whaleFixture,actor,claims,expert} from './whale-fixture.mjs';
const base=process.env.FORGE_WHALE_BASE||'http://127.0.0.1:5199';
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(base),'Synthetic checks use loopback only');
const output='artifacts/whaleroom-production-evidence',stamp=new Date().toISOString().replace(/[:.]/g,'-');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:!process.argv.includes('--open'),channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'}),checks=[],errors=[];
const page=await browser.newPage({viewport:{width:1360,height:960}});page.setDefaultTimeout(15000);
let fixture=whaleFixture({controls:{forumPreview:true,channels:[{id:'1193836001827770389',name:'columbus-trades'},{id:'20000001',name:'sea-scalper-farouk'},{id:'20000002',name:'quant-flow'},{id:'20000003',name:'josh-the-navigator'},{id:'20000004',name:'captains-take'},{id:'20000005',name:'institutional-charts'},{id:'20000006',name:'degen-calls'},{id:'20000007',name:'trade-set-ups'},{id:'20000008',name:'gold-trades'},{id:'20000009',name:'forex-nasdaq-silver-trades'},{id:'20000010',name:'limit-order-trades'},{id:'20000011',name:'daily-candle'}]}});const sdkCalls=[];
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

await page.goto(base+'/__whale_harness');
await page.getByRole('button',{name:'Open Whale Room',exact:true}).click();
await page.locator('[data-capture-id]').first().waitFor();
await page.locator('[data-capture-id]').first().click();
await page.locator('.wr-original').waitFor();
await page.evaluate(()=>{document.title='Whale Room — interactive design preview';const label=document.querySelector('.resource-whale-private');label.textContent='EXAMPLE MESSAGES';label.style.cssText='display:block;color:#b6bbff;font-size:9px;padding-left:6px;white-space:nowrap';});
await page.screenshot({path:output+'/forum-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:output+'/forum-mobile-detail.png',fullPage:true});
await page.getByRole('button',{name:'Back to saved captures',exact:true}).click();
await page.screenshot({path:output+'/forum-mobile-feed.png',fullPage:true});
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.setViewportSize({width:1440,height:960});
await page.locator('[data-capture-id]').first().click();
await page.locator('.wr-original').waitFor();
assert.deepEqual(errors,[]);
console.log(JSON.stringify({preview:'ready',synthetic:true,images:['forum-desktop.png','forum-mobile-detail.png','forum-mobile-feed.png'],externalCapture:false}));
if(process.argv.includes('--open'))await new Promise(resolve=>browser.on('disconnected',resolve));
else await browser.close();
