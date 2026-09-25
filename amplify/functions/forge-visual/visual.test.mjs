import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newJob,transition,QUOTES,digest,assetKey,VisualError} from './domain.mjs';
import {makeVisualHandler} from './api.mjs';
import {makeWorker} from './worker.mjs';
import {promptFor} from './providers.mjs';
import {optimize} from './optimize.mjs';
import {CONFIG_SHA} from '../forge-atlas/contract.mjs';
import {Document,NodeIO} from '@gltf-transform/core';
import {build} from 'esbuild';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',actor='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',time='2026-09-25T12:00:00Z',issuer='https://cognito-idp.us-east-1.amazonaws.com/test';
const brief=()=>({kind:'agent-card-forge.visual-brief',version:1,expert:{tenant_id:'gbautomation',expert_id:'artist-packet-expert',display_name:'Artist Packet Expert',purpose:'Create packets'},intake:{config_sha256:CONFIG_SHA},card:{scryfall_id:id,face_index:0,selection:{status:'selected'}},direction:{pose:'action',finish:'detailed painted tabletop miniature',operator_notes:'indigo and ember'},generation:{proposed_credit_cap:35}});
const event=(input,write=true)=>({identity:{claims:{iss:issuer,sub:actor,'cognito:groups':['tenant-gbautomation','forge-visual-operator']}},typeName:write?'Mutation':'Query',fieldName:write?'forgeVisualCommand':'forgeVisualRead',arguments:{input}});
function memory(){
 const states=new Map(),assets=new Map(),counts={image:0,submit:0,poll:0,queue:0};let active=null;
 const store={get:async id=>{const r=states.get(id);return r&&structuredClone(r);},put:async(job,etag)=>{const old=states.get(job.id);if((old?.etag||null)!==etag)throw new VisualError('stale_revision');states.set(job.id,{value:structuredClone(job),etag:String(Number(etag||0)+1)});},list:async()=>[...states.values()].map(r=>structuredClone(r.value)),active:async()=>active,activate:async x=>active=x,sign:async x=>x,
  recover:async(job,role)=>assets.get(assetKey(job,role))?.asset||null,bytes:async(job,role)=>assets.get(assetKey(job,role)).bytes,
  output:async(job,role,bytes,input,extra={})=>{const asset={key:assetKey(job,role),sha256:digest(bytes),bytes:bytes.length,mime:'image/png',input_sha256:input,...extra};assets.set(asset.key,{asset,bytes});return asset;},receipt:async()=>{}};
 const queue=async()=>{counts.queue++;};
 const providers={preflight:async()=>{},card:async()=>({bytes:Buffer.from('card pixels'),metadata:{name:'Selected printing'}}),image:async(job,stage,bytes)=>{counts.image++;assert(bytes.length);return {bytes:Buffer.from(stage+' pixels'),receipt:{usage:{total_tokens:20}}};},meshSubmit:async()=>{counts.submit++;return id;},meshPoll:async()=>{counts.poll++;return {status:'SUCCEEDED',credits:30,url:'private output'};},meshDownload:async()=>Buffer.from('model bytes')};
 return {store,queue,providers,counts,states,assets};
}
async function fixture(){const deps=memory();await deps.store.put(newJob(id,brief(),actor,time),null);return deps;}
async function start(deps,stage){const r=await deps.store.get(id),j=r.value;const sha=stage==='portrait'?j.brief_sha256:j.assets[{character:'portrait',master:'character',web:'master'}[stage]].sha256;
 await deps.store.put(transition(j,{action:'start',id,stage,revision:j.revision,sha256:sha,quote:QUOTES[stage]},actor,time),r.etag);}
async function approve(deps,stage){const r=await deps.store.get(id),j=r.value;await deps.store.put(transition(j,{action:'review',id,stage,revision:j.revision,sha256:j.assets[stage].sha256,decision:'approve'},actor,time),r.etag);}
const worker=deps=>makeWorker({...deps,now:()=>time,optimize:async()=>({bytes:Buffer.from('web model'),metrics:{passed:true,triangles:20,max_texture_edge_px:1024,bytes:9}})});
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
 const h=makeVisualHandler({issuer,...d});assert.equal((await h(event({action:'adopt',id,revision:j.revision,sha256:j.assets.web.sha256}))).payload.ok,true);assert.equal((await d.store.active()).id,id);
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
 const mesh=doc.createMesh().addPrimitive(doc.createPrimitive().setAttribute('POSITION',positions));doc.createScene().addChild(doc.createNode().setMesh(mesh));
 const bytes=Buffer.from(await new NodeIO().writeBinary(doc)),result=await optimize(bytes);assert.equal(result.metrics.triangles,1);assert.equal(result.metrics.passed,true);assert.equal(result.bytes.readUInt32LE(0),0x46546c67);
 await assert.rejects(()=>optimize(Buffer.from('not glb')));
});
test('both Lambda entrypoints bundle with explicit native dependency handling',async()=>{
 for(const entry of ['handler','worker-handler']){const r=await build({entryPoints:[`amplify/functions/forge-visual/${entry}.ts`],bundle:true,platform:'node',target:'node22',format:'cjs',external:['sharp'],write:false,logLevel:'silent'});assert(r.outputFiles[0].contents.length>0);}
});
