// Offline browser acceptance: actual React controls and GLTFLoader, deterministic
// job store/provider outputs. No network service or paid generation is started.
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {Document,NodeIO} from '@gltf-transform/core';
import {newJob,transition,QUOTES,digest,assetKey,publicJob,defaultCardText} from '../amplify/functions/forge-visual/domain.mjs';
import {deriveAvatarIcons} from '../amplify/functions/forge-visual/avatar-icons.mjs';
import {ISSHIN_PRINTING} from '../amplify/functions/forge-visual/card-frame.mjs';
import {composeCard} from '../amplify/functions/forge-visual/card-compositor.mjs';
import {packetFor} from '../amplify/functions/forge-visual/packet.mjs';
import {unzipSync,strFromU8} from 'fflate';
import {CONFIG_SHA} from '../amplify/functions/forge-atlas/contract.mjs';
const out='artifacts/forge-atlas-validation';await mkdir(out,{recursive:true});
const card=ISSHIN_PRINTING,actor='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const brief={kind:'agent-card-forge.visual-brief',version:1,expert:{tenant_id:'gbautomation',expert_id:'artist-packet-expert',display_name:'Artist Packet Expert',purpose:'Create packets'},intake:{config_sha256:CONFIG_SHA},card:{name:'Isshin, Two Heavens as One',scryfall_id:card,face_index:0,selection:{status:'selected'}},direction:{pose:'action',finish:'detailed painted tabletop miniature'},generation:{proposed_credit_cap:35}};
const png=await sharp({create:{width:256,height:256,channels:4,background:'#be5e40'}}).png().toBuffer();
const source=await sharp({create:{width:488,height:680,channels:3,background:'#c9b580'}}).jpeg().toBuffer();
const doc=new Document(),buffer=doc.createBuffer(),positions=doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array([-1,-1,0,1,-1,0,0,1,0]));
const material=doc.createMaterial().setBaseColorFactor([.7,.25,.1,1]).setDoubleSided(true),mesh=doc.createMesh().addPrimitive(doc.createPrimitive().setAttribute('POSITION',positions).setMaterial(material));doc.createScene().addChild(doc.createNode().setMesh(mesh));const glb=Buffer.from(await new NodeIO().writeBinary(doc));
const jobs=new Map(),actions=[],assets=new Map();let activated=null;
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Studio from './src/components/ForgeVisualStudio';window.mount=()=>createRoot(document.getElementById('root')).render(<Studio brief={window.fixtureBrief} onClose={()=>{}} onAdopt={()=>{window.adopted=true;}}/>);window.mount();`,resolveDir:process.cwd(),loader:'jsx'},jsx:'automatic',bundle:true,write:false,format:'iife',outdir:'fixture',plugins:[{name:'offline-transport',setup(b){b.onResolve({filter:/forgeVisualClient$/},()=>({path:'transport',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:`export const visualRequest=(i,w)=>window.visualRequest(i,w);export async function visualAsset(id,role){const r=await window.visualAsset(id,role);return {bytes:new Uint8Array(r.bytes),asset:r.asset};}`,loader:'js'}));}}]});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text,css=bundle.outputFiles.find(f=>f.path.endsWith('.css')).text;
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'}),page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.exposeFunction('visualRequest',async(input,write)=>{
  actions.push({...input,write});const now=new Date().toISOString();
  if(input.action==='list')return {jobs:[...jobs.values()].map(publicJob),operator:true,quotes:QUOTES,active_id:activated};
  if(input.action==='create'){const j=newJob(input.id,input.brief,actor,now);jobs.set(j.id,j);return publicJob(j);}
  const j=jobs.get(input.id);assert(j);
  if(input.action==='get')return publicJob(j);
  if(input.action==='packet')return {manifest:packetFor(j),receipt:publicJob(j)};
  if(input.action==='adopt'){assert.equal(j.status,'ready');activated=j.id;return {id:j.id};}
  let next=transition(j,input,actor,now);
  if(input.action==='start'){
   const stage=input.stage;let bytes=['web','master'].includes(stage)?glb:png;
    if(stage==='agent_card'){const result=await composeCard(next,{source_card:source,portrait:png});bytes=result.bytes;next.stages[stage].receipt=result.receipt;}
   next.assets[stage]={key:assetKey(next,stage),sha256:digest(bytes),bytes:bytes.length,mime:stage==='web'||stage==='master'?'model/gltf-binary':'image/png'};
   if(stage==='portrait'){
    for(const role of ['card','source_card']){next.assets[role]={key:assetKey(next,role),sha256:digest(source),bytes:source.length,mime:'image/jpeg'};assets.set(role,source);}
    next.assets.card.printing={name:'Selected source',mana_cost:'{1}{W}',type_line:'Creature ? Advisor',power:'2',toughness:'3'};next.card_text=defaultCardText(next);
    for(const icon of await deriveAvatarIcons(png)){next.assets[icon.role]={key:assetKey(next,icon.role),sha256:digest(icon.bytes),bytes:icon.bytes.length,mime:'image/png',input_sha256:next.assets.portrait.sha256,width:icon.size,height:icon.size};assets.set(icon.role,icon.bytes);}
   }
   assets.set(stage,bytes);next.status='review';next.stages[stage].status='review';
   if(stage==='web')next.stages.web.metrics={passed:true,triangles:1,max_texture_edge_px:0,bytes:glb.length};
  }
  jobs.set(next.id,next);return publicJob(next);
 });
 await page.exposeFunction('visualAsset',async(id,role)=>{assert(jobs.has(id));return {bytes:[...assets.get(role)],asset:jobs.get(id).assets[role]};});
 const fixturePath=resolve(out,'visual-fixture.html');await writeFile(fixturePath,'<html><head><style>'+css+'</style></head><body><div id="root"></div></body></html>');await page.goto(pathToFileURL(fixturePath).href);
 await page.evaluate(b=>window.fixtureBrief=b,brief);await page.addScriptTag({content:js});
 await page.getByRole('button',{name:'Save generation job',exact:true}).click();
 await page.getByRole('button',{name:'Generate portrait →',exact:true}).waitFor();assert.equal(actions.filter(a=>a.action==='start').length,0);
 for(const [stage,label] of [['portrait','portrait'],['agent_card','agent card'],['character','full character'],['master','3d master'],['web','web model']]){
  if(stage==='agent_card'){
   const generate=page.getByRole('button',{name:'Generate agent card →',exact:true});await generate.waitFor();assert(await generate.isDisabled());
   await page.getByRole('button',{name:'Preview text variants',exact:true}).click();await page.getByRole('button',{name:'Use The storyteller',exact:true}).click();await page.getByLabel('Choose abilities variant',{exact:true}).selectOption('practical');assert.match(await page.getByLabel('Abilities',{exact:true}).inputValue(),/Assemble/);await page.getByLabel('Card title',{exact:true}).fill('The Packet Sage');await page.getByLabel('Flavor quote',{exact:true}).fill('Every story deserves a frame.');
   await page.getByRole('button',{name:'Save card text',exact:true}).click();
   await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Generate agent card →'&&!b.disabled));
   await page.locator('.card-draft-workspace').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/agent-card-editor-desktop.png'});
   await page.setViewportSize({width:390,height:844});assert(await page.locator('.forge-visual-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:out+'/agent-card-editor-mobile.png'});await page.setViewportSize({width:1440,height:1000});
  }
  await page.getByRole('button',{name:`Generate ${label} →`,exact:true}).click();
  await page.getByRole('heading',{name:'Approve this generation'}).waitFor();
  assert.equal(actions.filter(a=>a.action==='start').length,['portrait','agent_card','character','master','web'].indexOf(stage));
  await page.getByRole('button',{name:stage==='agent_card'?'Approve & assemble card':'Approve charge & generate',exact:true}).click();
  if(stage==='master')await page.getByRole('button',{name:/Load master/}).click();
  if(stage==='portrait'){await page.getByRole('button',{name:'Approve & continue',exact:true}).waitFor();await page.getByRole('button',{name:'View full output package',exact:true}).click();assert.equal(await page.locator('.visual-preview').count(),0);assert(await page.getByRole('button',{name:'Approve & continue',exact:true}).isDisabled());await page.getByRole('button',{name:'Inspect Agent portrait',exact:true}).click();}
  const approve=page.getByRole('button',{name:'Approve & continue',exact:true});await approve.waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Approve & continue'&&!b.disabled));
  if(['master','web'].includes(stage)){for(const name of ['Front','Side','Back'])await page.getByRole('button',{name,exact:true}).click();assert.equal(await page.locator('canvas').count(),1);}
  if(stage==='web')await page.screenshot({path:out+'/visual-review-desktop.png'});
  await approve.click();
 }
 await page.getByRole('button',{name:'Use approved character in Forge',exact:true}).click();await page.getByText('Approved visuals are now used in Forge.').waitFor();assert(activated);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download approved packet · ZIP',exact:true}).click();const download=await downloadPromise;const zip=unzipSync(await readFile(await download.path()));
 assert.equal(Object.keys(zip).length,15);assert.equal(JSON.parse(strFromU8(zip['card-text.json'])).title,'The Packet Sage');
 const manifest=JSON.parse(strFromU8(zip['manifest.json']));for(const f of manifest.files)assert.equal(digest(zip[f.filename]),f.sha256);
 await page.getByRole('button',{name:'View full output package',exact:true}).click();await page.screenshot({path:out+'/output-package-desktop.png'});await page.setViewportSize({width:390,height:844});assert(await page.locator('.forge-visual-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.screenshot({path:out+'/visual-review-mobile.png'});
 assert.deepEqual(errors,[]);assert.equal(actions.filter(a=>a.action==='start').length,5);
 const receipt={ok:true,checks:['Saving does not generate','Whole-card and per-field variants preview before saving and charge','ZIP contains ten verified assets and five metadata records','Each paid stage requires separate bound confirmation; local card is free','Hidden package assets cannot satisfy visible stage inspection','Actual GLTFLoader front/side/back controls','Web gate before adoption','Mobile fit','No JavaScript errors'],providers:'synthetic; no charges'};
 await writeFile(out+'/visual-browser.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}catch(error){await page.screenshot({path:out+'/visual-failure.png',fullPage:true});console.error(JSON.stringify({error:String(error),errors,actions:actions.map(a=>a.action)}));throw error;}finally{await browser.close();}
