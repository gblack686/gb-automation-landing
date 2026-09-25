import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newJob,transition,QUOTES,digest,assetKey,VisualError,inputHash,defaultCardText,stagesFor} from './domain.mjs';
import {makeVisualHandler} from './api.mjs';
import {makeWorker} from './worker.mjs';
import {promptFor,imageEditInputs,providers as realProviders} from './providers.mjs';
import {packetFor} from './packet.mjs';
import {cardTextVariants} from './card-variants.mjs';
import {deriveAvatarIcons} from './avatar-icons.mjs';
import {optimize} from './optimize.mjs';
import {CONFIG_SHA} from '../forge-atlas/contract.mjs';
import {Document,NodeIO} from '@gltf-transform/core';
import {build} from 'esbuild';
import sharp from 'sharp';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',actor='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',time='2026-09-25T12:00:00Z',issuer='https://cognito-idp.us-east-1.amazonaws.com/test';
const brief=()=>({kind:'agent-card-forge.visual-brief',version:1,expert:{tenant_id:'gbautomation',expert_id:'artist-packet-expert',display_name:'Artist Packet Expert',purpose:'Create packets'},intake:{config_sha256:CONFIG_SHA},card:{scryfall_id:id,face_index:0,selection:{status:'selected'}},direction:{pose:'action',finish:'detailed painted tabletop miniature',operator_notes:'indigo and ember'},generation:{proposed_credit_cap:35}});
const event=(input,write=true)=>({identity:{claims:{iss:issuer,sub:actor,'cognito:groups':['tenant-gbautomation','forge-visual-operator']}},typeName:write?'Mutation':'Query',fieldName:write?'forgeVisualCommand':'forgeVisualRead',arguments:{input}});
function memory(){
 const states=new Map(),assets=new Map(),counts={image:0,submit:0,poll:0,queue:0};let active=null;
 const store={get:async id=>{const r=states.get(id);return r&&structuredClone(r);},put:async(job,etag)=>{const old=states.get(job.id);if((old?.etag||null)!==etag)throw new VisualError('stale_revision');states.set(job.id,{value:structuredClone(job),etag:String(Number(etag||0)+1)});},list:async()=>[...states.values()].map(r=>structuredClone(r.value)),active:async()=>active,activate:async x=>active=x,sign:async x=>x,
  recover:async(job,role)=>assets.get(assetKey(job,role))?.asset||null,bytes:async(job,role)=>assets.get(assetKey(job,role)).bytes,
  output:async(job,role,bytes,input,extra={})=>{const asset={key:assetKey(job,role),sha256:digest(bytes),bytes:bytes.length,mime:'image/png',input_sha256:input,...extra};assets.set(asset.key,{asset,bytes});return asset;},receipt:async()=>{}};
 const queue=async()=>{counts.queue++;};
 const providers={preflight:async()=>{},card:async()=>({bytes:Buffer.from('card pixels'),full:Buffer.from('full card pixels'),metadata:{name:'Selected printing',mana_cost:'{1}{W}{B}{R}',type_line:'Legendary Creature ? Human Samurai',power:'3',toughness:'4'}}),image:async(job,stage,bytes)=>{counts.image++;if(stage==='agent_card'){assert.equal(bytes.source_card.toString(),'full card pixels');assert.equal(bytes.portrait.toString(),'portrait pixels');}else assert(bytes.length);return {bytes:Buffer.from(stage+' pixels'),receipt:{usage:{total_tokens:20}}};},meshSubmit:async()=>{counts.submit++;return id;},meshPoll:async()=>{counts.poll++;return {status:'SUCCEEDED',credits:30,url:'private output'};},meshDownload:async()=>Buffer.from('model bytes')};
 return {store,queue,providers,counts,states,assets};
}
async function fixture(legacy=true){const deps=memory(),job=newJob(id,brief(),actor,time);if(legacy){delete job.pipeline_version;delete job.output_version;}await deps.store.put(job,null);return deps;}
async function start(deps,stage){const r=await deps.store.get(id),j=r.value;const sha=inputHash(j,stage);
 await deps.store.put(transition(j,{action:'start',id,stage,revision:j.revision,sha256:sha,quote:QUOTES[stage]},actor,time),r.etag);}
async function approve(deps,stage){const r=await deps.store.get(id),j=r.value;await deps.store.put(transition(j,{action:'review',id,stage,revision:j.revision,sha256:j.assets[stage].sha256,decision:'approve'},actor,time),r.etag);}
const worker=deps=>makeWorker({...deps,deriveIcons:async()=>[32,64,128].map(size=>({role:`avatar${size}`,size,bytes:Buffer.from(`icon ${size}`)})),now:()=>time,optimize:async()=>({bytes:Buffer.from('web model'),metrics:{passed:true,triangles:20,max_texture_edge_px:1024,bytes:9}})});
test('auth, operator role and expert binding deny before writes',async()=>{
 const d=memory(),handler=makeVisualHandler({issuer,...d});
 const request=event({action:'create',id,brief:brief()});delete request.identity;assert.equal((await handler(request)).payload.ok,false);
 const readOnly=event({action:'create',id,brief:brief()});readOnly.identity.claims['cognito:groups']=['tenant-gbautomation'];assert.equal((await handler(readOnly)).payload.error,'operator_access_required');
 const wrong=brief();wrong.expert.expert_id='youtube-intel';assert.equal((await handler(event({action:'create',id,brief:wrong}))).payload.error,'wrong_expert_or_revision');
 assert.equal(d.states.size,0);
});
test('creation is idempotent and discards injected routing/approval/URLs',async()=>{
 const d=memory(),h=makeVisualHandler({issuer,...d}),b=brief();b.card.art_crop_url='http://169.254.169.254';b.expert.artifact_root='foreign';b.generation.approved_credit_cap=500;
 const first=(await h(event({action:'create',id,brief:b}))).payload;assert.equal(first.ok,true);
 assert.equal((await h(event({action:'create',id,brief:b}))).payload.data.id,id);assert.equal(d.states.size,1);assert.equal(d.counts.submit,0);
 assert.equal(first.data.brief.credit_cap,35);assert.equal(first.data.brief.card.art_crop_url,undefined);
 b.direction.pose='casting';assert.equal((await h(event({action:'create',id,brief:b}))).payload.error,'idempotency_conflict');
});
test('double-click and concurrent starts reserve only one image attempt',async()=>{
 const d=await fixture(),r=await d.store.get(id),input={action:'start',id,stage:'portrait',revision:0,sha256:r.value.brief_sha256,quote:QUOTES.portrait},h=makeVisualHandler({issuer,...d,now:()=>time});
 const results=await Promise.all([h(event(input)),h(event(input))]);assert.equal(results.filter(r=>r.payload.ok).length,1);
 await Promise.all([worker(d)(id),worker(d)(id)]);assert.equal(d.counts.image,1);
 await worker(d)(id);assert.equal(d.counts.image,1);
});
test('stale inputs, bypassed reviews and extra attempts fail closed',async()=>{
 const d=await fixture(),j=(await d.store.get(id)).value;
 for(const change of [{revision:9},{sha256:'0'.repeat(64)},{quote:'free'},{stage:'master'}])assert.throws(()=>transition(j,{action:'start',id,stage:'portrait',revision:0,sha256:j.brief_sha256,quote:QUOTES.portrait,...change},actor,time));
 await start(d,'portrait');await worker(d)(id);assert.rejects(()=>start(d,'character'));
});
test('uncertain image submission never retries the paid provider',async()=>{
 const d=await fixture();d.providers.image=async()=>{d.counts.image++;throw Error('token=secret');};await start(d,'portrait');await worker(d)(id);await worker(d)(id);
 assert.equal(d.counts.image,1);const j=(await d.store.get(id)).value;assert.equal(j.status,'outcome_unknown');assert(!JSON.stringify(j).includes('token=secret'));
});
test('an uploaded output survives a crash before state completion',async()=>{
 const d=await fixture();await start(d,'portrait');const r=await d.store.get(id);r.value.status='outcome_unknown';r.value.stages.portrait.submitted_at=time;await d.store.put(r.value,r.etag);
 await d.store.output(r.value,'portrait',Buffer.from('saved pixels'),r.value.brief_sha256);await worker(d)(id);
 assert.equal((await d.store.get(id)).value.status,'review');assert.equal(d.counts.image,0);
});
test('complete pipeline preserves references, task IDs, budgets and reviewed activation',async()=>{
 const d=await fixture(),w=worker(d);
 for(const stage of ['portrait','character','master','web']){
  await start(d,stage);await w(id);
  if(['master','web'].includes(stage)){d.providers.meshPoll=async()=>({status:'SUCCEEDED',credits:stage==='master'?30:5,url:'private output'});await w(id);}
  assert.equal((await d.store.get(id)).value.status,'review');await approve(d,stage);
 }
 const j=(await d.store.get(id)).value;assert.equal(j.status,'ready');assert.equal(d.counts.image,2);assert.equal(d.counts.submit,2);assert.equal(j.stages.web.actual_credits,5);
 const h=makeVisualHandler({issuer,...d});assert.equal((await h(event({action:'adopt',id,revision:j.revision,sha256:j.assets.web.sha256}))).payload.ok,true);assert.equal((await d.store.active()).id,id);assert.equal((await d.store.active()).card.name,'Selected printing');
});
test('asset URLs are selected by role and cannot escape the expert run',async()=>{
 const d=await fixture(),h=makeVisualHandler({issuer,...d});assert.equal((await h(event({action:'asset',id,stage:'../../index'},false))).payload.ok,false);
 const r=await d.store.get(id);r.value.assets.portrait={key:'other/portrait.png',sha256:'0'.repeat(64)};d.states.set(id,r);
 assert.equal((await h(event({action:'get',id},false))).payload.error,'artifact_routing_failed');
});
test('a pending provider task is polled without duplicate submission',async()=>{
 const d=await fixture();await start(d,'portrait');await worker(d)(id);await approve(d,'portrait');await start(d,'character');await worker(d)(id);await approve(d,'character');await start(d,'master');await worker(d)(id);
 d.providers.meshPoll=async()=>({status:'IN_PROGRESS',progress:42,credits:30});await worker(d)(id);await worker(d)(id);
 assert.equal(d.counts.submit,1);assert.equal((await d.store.get(id)).value.stages.master.progress,42);
});
test('actual overage prevents authorizing the next paid Meshy stage',()=>{
 const j=newJob(id,brief(),actor,time);j.stage='web';j.stages.master={review:{decision:'approve'},reserved_credits:30,actual_credits:35};j.assets.master={key:assetKey(j,'master'),sha256:'a'.repeat(64)};
 assert.throws(()=>transition(j,{action:'start',id,revision:0,stage:'web',sha256:j.assets.master.sha256,quote:QUOTES.web},actor,time),/credit_cap_exceeded/);
});
test('prompts use the chosen identity without a global samurai palette',()=>{
 const j=newJob(id,brief(),actor,time);assert.match(promptFor(j,'character'),/COMPLETE FULL CHARACTER/);assert.match(promptFor(j,'character'),/indigo and ember/);assert.doesNotMatch(promptFor(j,'portrait'),/emerald|samurai|bust/);
});
test('web optimization measures the actual binary and blocks external glTF resources',async()=>{
 const doc=new Document(),buffer=doc.createBuffer();const positions=doc.createAccessor().setBuffer(buffer).setType('VEC3').setArray(new Float32Array([0,0,0,1,0,0,0,1,0]));
 const pixels=Buffer.alloc(3000*2000*3);for(let n=0;n<pixels.length;n+=3){pixels[n]=Math.floor(n/3)%256;pixels[n+1]=Math.floor(n/9000)%256;pixels[n+2]=128;}
 const texture=doc.createTexture().setImage(await sharp(pixels,{raw:{width:3000,height:2000,channels:3}}).png().toBuffer()).setMimeType('image/png');
 const material=doc.createMaterial().setBaseColorTexture(texture),uv=doc.createAccessor().setBuffer(buffer).setType('VEC2').setArray(new Float32Array([0,0,1,0,0,1]));
 const mesh=doc.createMesh().addPrimitive(doc.createPrimitive().setAttribute('POSITION',positions).setAttribute('TEXCOORD_0',uv).setMaterial(material));doc.createScene().addChild(doc.createNode().setMesh(mesh));
 const bytes=Buffer.from(await new NodeIO().writeBinary(doc)),result=await optimize(bytes);assert.equal(result.metrics.triangles,1);assert.equal(result.metrics.max_texture_edge_px,2048);assert.equal(result.metrics.passed,true);assert.equal(result.bytes.readUInt32LE(0),0x46546c67);
 await assert.rejects(()=>optimize(Buffer.from('not glb')));
});
test('both Lambda entrypoints bundle with explicit native dependency handling',async()=>{
 for(const entry of ['handler','worker-handler']){const r=await build({entryPoints:[`amplify/functions/forge-visual/${entry}.ts`],bundle:true,platform:'node',target:'node22',format:'cjs',external:['sharp'],write:false,logLevel:'silent'});assert(r.outputFiles[0].contents.length>0);}
});

async function saveCardText(d,changes={}){const r=await d.store.get(id),j=r.value;await d.store.put(transition(j,{action:'card_text',id,revision:j.revision,card_text:{...j.card_text,...changes}},actor,time),r.etag);}
test('full-card workflow binds both pixel inputs and exact editable text; 3D keeps art-only lineage',async()=>{
 const d=await fixture(false),w=worker(d);await start(d,'portrait');await w(id);await approve(d,'portrait');
 let j=(await d.store.get(id)).value;assert.equal(j.stage,'agent_card');assert.equal(j.card_text.power,'3');assert.equal(j.card_text.toughness,'4');assert.equal(j.card_text.mana_cost,'{1}{W}{B}{R}');
 await assert.rejects(()=>start(d,'agent_card'),/card_text_review_required/);
 await saveCardText(d,{title:'Packet Sage',quote:'Make the story travel.'});j=(await d.store.get(id)).value;
 const oldHash=inputHash(j,'agent_card');await saveCardText(d,{power:'5'});j=(await d.store.get(id)).value;assert.notEqual(oldHash,inputHash(j,'agent_card'));
 assert.throws(()=>transition(j,{action:'start',id,revision:j.revision,stage:'agent_card',sha256:oldHash,quote:QUOTES.agent_card},actor,time),/approval_binding_changed/);
 const edit=imageEditInputs(j,'agent_card',{source_card:Buffer.from('full source pixels'),portrait:Buffer.from('approved portrait pixels')});
 const inputs=edit.form.getAll('image[]');assert.equal(inputs.length,2);assert.equal(await inputs[0].text(),'full source pixels');assert.equal(await inputs[1].text(),'approved portrait pixels');assert.match(edit.prompt,/Packet Sage/);assert.match(edit.prompt,/bottom.right/);
 assert.doesNotMatch(promptFor(j,'character'),/Packet Sage|Make the story travel/);
 await start(d,'agent_card');await w(id);await assert.rejects(()=>saveCardText(d,{title:'Late edit'}),/stage_not_ready/);await approve(d,'agent_card');
 j=(await d.store.get(id)).value;assert.equal(inputHash(j,'character'),j.assets.portrait.sha256);assert.notEqual(inputHash(j,'character'),j.assets.agent_card.sha256);
 for(const stage of ['character','master','web']){await start(d,stage);await w(id);if(stage!=='character'){d.providers.meshPoll=async()=>({status:'SUCCEEDED',credits:stage==='master'?30:5,url:'private output'});await w(id);}await approve(d,stage);}
 j=(await d.store.get(id)).value;const packet=packetFor(j);assert.equal(packet.files.length,10);assert.equal(d.counts.image,3);assert.equal(d.counts.submit,2);assert.deepEqual(packet.lineage.master,['character']);assert.equal(packet.card_text.title,'Packet Sage');
 const handler=makeVisualHandler({issuer,...d});assert.equal((await handler(event({action:'packet',id},false))).payload.data.manifest.files.length,10);
 assert.equal((await handler(event({action:'adopt',id,revision:j.revision,sha256:j.assets.web.sha256}))).payload.ok,true);assert.equal((await d.store.active()).agent_card.sha256,j.assets.agent_card.sha256);
 const legacy=structuredClone(j);delete legacy.output_version;for(const role of ['avatar32','avatar64','avatar128'])delete legacy.assets[role];assert.equal(packetFor(legacy).files.length,7);
 const wrongIcon=structuredClone(j);wrongIcon.assets.avatar64.input_sha256='0'.repeat(64);assert.throws(()=>packetFor(wrongIcon),/packet_not_ready/);
 j.stages.agent_card.review.sha256='0'.repeat(64);assert.throws(()=>packetFor(j),/packet_not_ready/);
});
test('card text limits, missing outputs and legacy packets are explicit',()=>{
 const j=newJob(id,brief(),actor,time);j.stage='agent_card';j.card_text=defaultCardText(j);
 for(const invalid of [{title:''},{abilities:'x'.repeat(1201)},{power:'2',toughness:''},{extra:'injected'}])assert.throws(()=>transition(j,{action:'card_text',id,revision:0,card_text:{...j.card_text,...invalid}},actor,time),/invalid_card_text/);
 assert.throws(()=>packetFor(j),/packet_not_ready/);delete j.pipeline_version;assert.deepEqual(stagesFor(j),['portrait','character','master','web']);
});
test('uncertain full-card submission cannot repeat its charge',async()=>{
 const d=await fixture(false),w=worker(d);await start(d,'portrait');await w(id);await approve(d,'portrait');await saveCardText(d);
 d.providers.image=async()=>{d.counts.image++;throw Error('uncertain');};await start(d,'agent_card');await w(id);await w(id);assert.equal(d.counts.image,2);assert.equal((await d.store.get(id)).value.status,'outcome_unknown');
});
test('both Scryfall image downloads identify the client and preserve distinct source pixels',async()=>{
 const original=globalThis.fetch,downloads=[];
 globalThis.fetch=async(url,options)=>{
  if(String(url).startsWith('https://api.scryfall.com/'))return new Response(JSON.stringify({id,name:'Reference',image_uris:{art_crop:'https://cards.scryfall.io/art_crop/a.jpg',normal:'https://cards.scryfall.io/normal/a.jpg'},mana_cost:'{U}',type_line:'Creature',power:'0',toughness:'2'}));
  assert.equal(options.headers['User-Agent'],'GBAutoForge/1.0');assert.equal(options.headers.Accept,'image/jpeg');assert.equal(options.redirect,'error');
  downloads.push(String(url));return new Response(String(url).includes('art_crop')?'art-only pixels':'full-frame pixels');
 };
 try{const result=await realProviders.card({card:{scryfall_id:id,face_index:0}});assert.equal(result.bytes.toString(),'art-only pixels');assert.equal(result.full.toString(),'full-frame pixels');assert.equal(result.metadata.power,'0');assert.equal(downloads.length,2);}finally{globalThis.fetch=original;}
});

test('avatar PNG derivation preserves palette, dimensions and deterministic bytes',async()=>{
 const source=await sharp({create:{width:512,height:512,channels:4,background:'#334477'}}).png().toBuffer();
 const icons=await deriveAvatarIcons(source),again=await deriveAvatarIcons(source);
 for(const [index,icon] of icons.entries()){const meta=await sharp(icon.bytes).metadata();assert.equal(meta.width,icon.size);assert.equal(meta.height,icon.size);assert.equal(meta.format,'png');assert.equal(digest(icon.bytes),digest(again[index].bytes));const {data}=await sharp(icon.bytes).raw().toBuffer({resolveWithObject:true});assert.deepEqual([...data.subarray(0,3)],[51,68,119]);}
 await assert.rejects(()=>deriveAvatarIcons(Buffer.from('invalid')));
});
test('partial icon derivation resumes with the saved portrait and never buys another image',async()=>{
 const d=await fixture(false);let crashed=false;const output=d.store.output;
 d.store.output=async(j,role,...args)=>{if(role==='avatar64'&&!crashed){crashed=true;throw Error('interrupted');}return output(j,role,...args);};
 await start(d,'portrait');await worker(d)(id);assert.equal((await d.store.get(id)).value.status,'outcome_unknown');
 await worker(d)(id);const j=(await d.store.get(id)).value;assert.equal(j.status,'review');assert.equal(d.counts.image,1);
 for(const size of [32,64,128])assert.equal(j.assets[`avatar${size}`].input_sha256,j.assets.portrait.sha256);
});
test('local text treatments can be mixed and are bound to the saved card text',()=>{
 const j=newJob(id,brief(),actor,time);j.stage='agent_card';j.card_text=defaultCardText(j);
 const variants=cardTextVariants(j);assert.equal(variants.variants.length,3);assert.equal(variants.method,'local-role-templates');
 const chosen={...j.card_text,title:variants.variants[1].text.title,abilities:variants.variants[2].text.abilities,quote:variants.variants[0].text.quote};
 const saved=transition(j,{action:'card_text',id,revision:0,card_text:chosen},actor,time);assert.deepEqual(saved.card_text,chosen);assert.notEqual(inputHash(j,'agent_card'),inputHash(saved,'agent_card'));
});
