import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuilderTransport} from './forgeBuilderTransport.js';
function setup(request,maxPolls=2){const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 return {values,storage,client:createBuilderTransport({request,storage,actor:'operator',maxPolls,delay:async()=>{}})};}
test('reload repairs an enqueue and recovers current state without repeating voice mint',async()=>{
 const calls=[],request=async input=>{calls.push(input);if(input.action==='submit')throw Error('network');return input.action==='status'?{status:'done',data:{voice_reservation:{session_id:'x'}}}:{draft:{version:1}};};
 const f=setup(request);await assert.rejects(()=>f.client.transport({action:'voice',confirmed:true,answers:'private brief'}));
 const stored=[...f.values.values()].join();assert.equal(stored.includes('private brief'),false);
 const recovered=createBuilderTransport({request,storage:f.storage,actor:'operator',delay:async()=>{}});await recovered.recover();
 assert.equal(calls.some(x=>x.action==='retry'),true);assert.equal(calls.some(x=>x.action==='claim_voice'),false);assert.equal(f.values.size,0);
});
test('a pending command blocks a different request; exact retry retains id',async()=>{
 const submitted=[],f=setup(async input=>{if(input.action==='submit'){submitted.push(input.id);return {};}return {status:'queued'};});
 await assert.rejects(()=>f.client.transport({action:'save',version:1}),/command_pending/);
 await assert.rejects(()=>f.client.transport({action:'generate',version:1}),/command_pending/);
 await assert.rejects(()=>f.client.transport({action:'save',version:1}),/command_pending/);assert.equal(new Set(submitted).size,1);
});
test('terminal failures clear pending and carry the version error back to the editor',async()=>{
 const f=setup(async input=>input.action==='status'?{status:'failed',error:'version_conflict'}:{});
 await assert.rejects(()=>f.client.transport({action:'save'}),/version_conflict/);assert.equal(f.values.size,0);
});
test('unmount stops polling before claiming a voice reservation',async()=>{
 const controller=new AbortController(),calls=[];const f=setup(async input=>{calls.push(input.action);if(input.action==='status'){controller.abort();return {status:'done',data:{}};}return {};});
 const client=createBuilderTransport({request:async input=>{calls.push(input.action);if(input.action==='status'){controller.abort();return {status:'done',data:{}};}return {};},storage:f.storage,actor:'operator',signal:controller.signal});
 await assert.rejects(()=>client.transport({action:'voice'}),/builder_closed/);assert.equal(calls.includes('claim_voice'),false);
});
