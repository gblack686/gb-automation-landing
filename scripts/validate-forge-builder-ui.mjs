// Real React/editor/transport with test authentication and the container's outputs.
// No cloud calls, microphone access, provider sessions or external writes.
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {INTAKE_PROMPT} from '../amplify/functions/forge-builder/canonical/voice.mjs';
const proof=process.env.FORGE_BUILDER_PROOF;if(!proof)throw Error('FORGE_BUILDER_PROOF must name a completed container proof directory');
const fixture=JSON.parse(await readFile(join(proof,'ui-states.json'),'utf8'));
const output=process.env.FORGE_BUILDER_UI_OUTPUT||'artifacts/forge-atlas-validation/builder';await mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Builder from './src/components/ForgeExpertBuilder';window.root=createRoot(document.getElementById('root'));window.root.render(<Builder onClose={()=>window.root.unmount()}/>);`,resolveDir:process.cwd(),loader:'jsx'},
 jsx:'automatic',bundle:true,write:false,format:'iife',outdir:'fixture',plugins:[{name:'test-boundaries',setup(b){
  b.onResolve({filter:/forgeBuilderClient$/},()=>({path:'client',namespace:'test'}));
  b.onResolve({filter:/^aws-amplify\/auth$/},()=>({path:'auth',namespace:'test'}));
  b.onResolve({filter:/^@elevenlabs\/client$/},()=>({path:'voice',namespace:'test'}));
  b.onLoad({filter:/.*/,namespace:'test'},args=>({loader:'js',contents:args.path==='auth'?`export const getCurrentUser=async()=>({userId:'browser-fixture'});`:
   args.path==='voice'?`export const Conversation={startSession:async options=>{window.voiceOptions=options;window.voiceStarted=true;window.voiceEnded=false;return {endSession:async()=>{window.voiceEnded=true;window.voiceEndCount=(window.voiceEndCount||0)+1;options.onDisconnect();},sendContextualUpdate:message=>{(window.voiceContext||=[]).push(message);}};}};`:
   `export const builderRequest=(i,w)=>window.testRequest(i,w);export const verifiedBuilderAsset=async()=>{throw Error('No bootstrap card in this fixture');};export async function builderAsset(id,path){const r=await window.testAsset(id,path);return {...r,bytes:Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0))};}`}));
 }}]});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text,css=bundle.outputFiles.find(f=>f.path.endsWith('.css')).text;console.log('Built browser fixture');
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],commands=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
let state=structuredClone(fixture.states[0].state),operator=true,voiceClaims=0;
const done=new Map(),payload=fixture.payload;
const view=s=>({...structuredClone(s),payload,operator,visuals:{},draft:{...s.draft,packet:s.draft.packet?{...s.draft.packet,download:'#'}:null}});
await page.exposeFunction('testRequest',async(input,write)=>{
 if(input.action==='read')return view(state);
 if(input.action==='status')return {id:input.id,status:'done',data:view(done.get(input.id))};
 if(input.action==='claim_voice'){voiceClaims++;return {signed_url:'wss://test.invalid',session_id:input.id,max_seconds:300,prompt:INTAKE_PROMPT,tool_id:'test'};}
 if(input.action==='packet')return fixture.packet;
 assert.equal(write,true);assert.equal(operator,true);commands.push(input);
 if(input.action==='retry')return {id:input.id,status:'queued'};
 const b=input.body;assert.deepEqual(b.binding,fixture.binding);assert.equal(b.version,state.draft.version);
 if(b.action==='save'){state.draft.answers=structuredClone(b.answers);state.draft.version++;state.draft.workflow_id=null;state.workflow=null;state.draft.packet=null;}
 else if(b.action!=='voice'){
  const matches=fixture.states.filter(r=>r.action===b.action);
  const next=b.action==='decide'?matches.find(r=>r.state.workflow.state===(state.workflow.gate==='scope'?'review':'approved')):matches[0];
  if(b.action==='decide')assert.equal(b.confirmed,true);
  state=structuredClone(next.state);
 }
 done.set(input.id,structuredClone(state));return {id:input.id,status:'queued'};
});
await page.exposeFunction('testAsset',async(id,path)=>{assert.equal(id,fixture.packet.manifest.packet_id);const bytes=await readFile(join(proof,'package',path));return {base64:bytes.toString('base64'),asset:{mime:path.endsWith('.png')?'image/png':path.endsWith('.glb')?'model/gltf-binary':'application/json'}};});
const path=resolve(output,'walkthrough.html');await writeFile(path,'<!doctype html><html><head><meta charset="utf-8"><title>Forge builder local acceptance</title><style>'+css+'</style></head><body><div id="root"></div></body></html>');
async function mount(){await page.goto(pathToFileURL(path).href);await page.evaluate(()=>{Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{window.micCalls=(window.micCalls||0)+1;return {getTracks:()=>[{stop(){}}]};}},configurable:true});});await page.addScriptTag({content:js});await page.getByRole('button',{name:'Save answer',exact:true}).waitFor();}
try{
 await mount();console.log('Mounted hosted editor');assert.match(await page.locator('body').innerText(),/Saved in your private workspace/);
 for(const field of ['problem','audience','data_access','output','success']){await page.locator(`[data-builder-field="${field}"]`).click();await page.locator('#builder-answer').fill('Explicit '+field+' answer');}
 await page.getByRole('button',{name:'Save answer',exact:true}).click();await page.getByText('Version 2',{exact:false}).waitFor();
 await page.locator('[data-builder-reviewed]').check();await page.getByRole('button',{name:'Create proposal',exact:true}).click();
 await page.getByRole('button',{name:'Accept proposal',exact:true}).click();
 for(let n=0;n<2;n++){await page.locator('[data-builder-gate-confirm]').check();await page.getByRole('button',{name:'Approve current gate',exact:true}).click();}
 await page.getByRole('button',{name:'Generate package',exact:true}).click();await page.getByRole('button',{name:'Preview package',exact:true}).waitFor();
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download package ZIP',exact:true}).click();
 const downloaded=await downloading;assert.equal(createHash('sha256').update(await readFile(await downloaded.path())).digest('hex'),fixture.packet.archive_sha256);
 console.log('Completed three gates and generation');await page.screenshot({path:output+'/desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Preview package',exact:true}).click();await page.getByAltText('Selected agent card').waitFor();await page.locator('canvas').waitFor();
 await page.screenshot({path:output+'/packet.png',fullPage:true});await page.getByRole('button',{name:'Back to brief',exact:true}).click();
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.forge-builder-overlay').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 await page.screenshot({path:output+'/mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Reload saved version',exact:true}).click();await page.getByRole('button',{name:'Preview package',exact:true}).waitFor();
 state=structuredClone(fixture.states[0].state);await mount();
 await page.clock.install();
 await page.getByRole('button',{name:/Talk it through/}).click();await page.getByRole('button',{name:'Start conversation',exact:true}).click();assert.equal(voiceClaims,0);
 await page.locator('[data-builder-consent]').check();await page.getByRole('button',{name:'Start conversation',exact:true}).click();await page.waitForFunction(()=>window.voiceStarted===true);assert.equal(voiceClaims,1);
 const captured=await page.evaluate(async()=>{window.voiceOptions.onMessage({source:'user',message:'Approved artist files produce a weekly packet.'});return window.voiceOptions.clientTools.capture_intake({answers:[{field:'output',status:'captured',value:'Weekly packet',evidence:'weekly packet'}]});});
 assert.match(captured,/covered/);assert.equal(state.draft.answers.output.value,'Weekly packet');
 const closing=await page.evaluate(async()=>{
  const utterance='Artists need approved Drive inputs to produce a weekly packet with every credit verified.';
  window.voiceOptions.onMessage({source:'user',message:utterance});
  return JSON.parse(await window.voiceOptions.clientTools.capture_intake({answers:['problem','audience','data_access','output','success'].map(field=>({field,status:'captured',value:utterance,evidence:utterance}))}));
 });
 assert.equal(closing.covered,5);assert.equal(closing.human_finish_required,true);assert.equal(closing.draft_revisable,true);
 assert.equal(await page.evaluate(()=>window.voiceEnded),false);assert.equal(state.workflow,null);
 assert.match(await page.evaluate(()=>window.voiceOptions.overrides.agent.firstMessage),/always revise/);
 assert.match(await page.evaluate(()=>window.voiceOptions.overrides.agent.prompt.prompt),/Wait for the human's answer/);
 await page.clock.fastForward(240000);
 await page.getByText(/About one minute remains before the pilot session limit/).waitFor();
 assert.equal(await page.evaluate(()=>window.voiceEnded),false);assert.equal(await page.evaluate(()=>window.voiceContext.length),1);
 await page.evaluate(()=>{window.previousVoice=window.voiceOptions;});
 await page.getByRole('button',{name:'Finish conversation',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.voiceEndCount),1);await page.getByText(/Finished for now/).waitFor();
 await page.clock.fastForward(60000);assert.equal(await page.evaluate(()=>window.voiceEndCount),1);
 await page.locator('[data-builder-consent]').check();await page.getByRole('button',{name:'Start conversation',exact:true}).click();
 await page.waitForFunction(()=>window.voiceStarted&&!window.voiceEnded);
 await page.evaluate(()=>window.previousVoice.onDisconnect());
 assert.equal(await page.getByRole('button',{name:'Finish conversation',exact:true}).isEnabled(),true);
 await page.clock.fastForward(300000);
 await page.getByText(/The pilot session limit was reached/).waitFor();
 assert.equal(await page.evaluate(()=>window.voiceEndCount),2);assert.equal(state.workflow,null);
 assert.equal(state.draft.answers.success.status,'captured');
 await page.locator('[data-builder-consent]').check();await page.getByRole('button',{name:'Start conversation',exact:true}).click();
 await page.waitForFunction(()=>window.voiceStarted&&!window.voiceEnded);
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.waitForFunction(()=>window.voiceEnded===true);
 assert.equal(await page.evaluate(()=>window.voiceEndCount),3);
 operator=false;await mount();assert.equal(await page.getByRole('button',{name:'Save answer',exact:true}).isDisabled(),true);
 assert.deepEqual(errors,[]);
 const receipt={pass:true,checks:['hosted storage wording','shared five-field brief','proposal/scope/plan gates','exact ZIP download bytes','generated card and 3D preview','mobile layout','saved reload','microphone consent before reservation','verbatim voice capture','complete brief stays connected','human finishes conversation','limit warning before disconnect','timeout preserves unapproved editable draft','stale disconnect cannot stop a new session','voice cleanup on close','member read-only'],commands:commands.length,voice_claims:voiceClaims,provider_calls:0};
 await writeFile(output+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}finally{await browser.close();}
