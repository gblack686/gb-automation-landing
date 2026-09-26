import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBuilderHandler} from './api.mjs';
import {BINDING,BuilderError} from './domain.mjs';
const actor='11111111-2222-3333-4444-555555555555',id='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const claims={iss:'https://issuer',sub:actor,'cognito:groups':['tenant-gbautomation','forge-builder-operator']};
const event=(input,write=true,c=claims)=>({typeName:write?'Mutation':'Query',fieldName:write?'forgeBuilderCommand':'forgeBuilderRead',arguments:{input:JSON.stringify(input)},identity:{claims:c}});
function fixture(){
 const intents=new Map(),results=new Map(),claimsUsed=new Set();let current={state:{draft:{version:1,binding:BINDING}},payload:{scope:BINDING}},enqueued=0,minted=0,failQueue=false,failMint=false;
 const store={intent:async id=>intents.get(id),result:async id=>results.get(id),current:async()=>current,present:async s=>s,
  createIntent:async intent=>{intents.set(intent.id,intent);},claimVoice:async id=>{if(claimsUsed.has(id))throw new BuilderError('voice_already_claimed');claimsUsed.add(id);},
  packet:async()=>({ok:true}),asset:async()=>({ok:true})};
 const handler=makeBuilderHandler({issuer:'https://issuer',store,queue:async()=>{if(failQueue)throw Error('private details');enqueued++;},
  now:()=> '2026-09-26T22:00:00.000Z',voice:{validate:async()=>{},mint:async()=>{minted++;if(failMint)throw Error('private key');return {signed_url:'ephemeral-url'};}}});
 return {call:async(...args)=>(await handler(event(...args))).payload,intents,results,claimsUsed,stats:()=>({enqueued,minted}),
  setCurrent:v=>current=v,queueFail:v=>failQueue=v,mintFail:v=>failMint=v};
}
const submit=(action='initialize',extra={})=>({action:'submit',id,body:{action,binding:BINDING,...extra}});
test('verified tenant reads; only builder operators can write',async()=>{
 const f=fixture();assert.equal((await f.call({action:'read'},false,null)).error,'authentication_required');
 assert.equal((await f.call({action:'read'},false,{...claims,iss:'https://foreign'})).error,'authentication_required');
 assert.equal((await f.call({action:'read'},false,{...claims,'cognito:groups':['forge-builder-operator']})).error,'tenant_access_required');
 const member={...claims,'cognito:groups':['tenant-gbautomation']};assert.equal((await f.call({action:'read'},false,member)).data.operator,false);
 assert.equal((await f.call(submit(),true,member)).error,'operator_access_required');assert.equal(f.intents.size,0);
});
test('query cannot mutate; actor overrides, foreign identities and invalid paths fail',async()=>{
 const f=fixture();assert.equal((await f.call(submit(),false)).error,'invalid_request');
 for(const binding of [{...BINDING,agent_id:'other'},{...BINDING,tenant_id:'other'},{...BINDING,config_sha256:'a'.repeat(64)}])assert.equal((await f.call({...submit(),body:{action:'initialize',binding}})).error,'builder_scope_mismatch');
 assert.equal((await f.call({...submit(),body:{...submit().body,actor}})).error,'invalid_request');
 for(const path of ['../signing-key','assets//x','assets/./x','/etc/passwd','a%2fb','x\\y'])assert.equal((await f.call({action:'asset',packet_id:'a'.repeat(64),path},false)).error,'invalid_request');
 assert.equal(f.intents.size,0);
});
test('duplicate submissions repair failed enqueue and retain one immutable intent',async()=>{
 const f=fixture();f.queueFail(true);assert.equal((await f.call(submit())).error,'builder_unavailable');assert.equal(f.intents.size,1);
 f.queueFail(false);assert.equal((await f.call({action:'retry',id})).ok,true);assert.equal((await f.call(submit())).ok,true);assert.equal(f.intents.size,1);assert.equal(f.stats().enqueued,2);
 assert.equal((await f.call(submit('voice',{version:1,confirmed:true}))).error,'idempotency_conflict');
});
test('command reads and repairs are restricted to the submitting subject',async()=>{
 const f=fixture();await f.call(submit());const stranger={...claims,sub:'99999999-2222-3333-4444-555555555555'};
 assert.equal((await f.call({action:'status',id},false,stranger)).error,'command_not_found');
 assert.equal((await f.call({action:'retry',id},true,stranger)).error,'command_not_found');
});
async function voiceReady(){const f=fixture();await f.call(submit('voice',{version:1,confirmed:true}));f.results.set(id,{status:'done',data:{voice_reservation:{session_id:id}}});return f;}
test('voice claim is once only and never persists its URL',async()=>{
 const f=await voiceReady();assert.equal((await f.call({action:'claim_voice',id})).data.signed_url,'ephemeral-url');
 assert.equal((await f.call({action:'claim_voice',id})).error,'voice_already_claimed');assert.equal(f.stats().minted,1);
 assert.equal(JSON.stringify([...f.intents,...f.results]).includes('ephemeral-url'),false);
});
test('ambiguous voice mint is not replayed; expired and stale reservations are denied',async()=>{
 const f=await voiceReady();f.mintFail(true);assert.equal((await f.call({action:'claim_voice',id})).error,'builder_unavailable');f.mintFail(false);
 assert.equal((await f.call({action:'claim_voice',id})).error,'voice_already_claimed');assert.equal(f.stats().minted,1);
 const expired=await voiceReady();expired.intents.get(id).created_at='2026-09-26T21:00:00Z';assert.equal((await expired.call({action:'claim_voice',id})).error,'voice_reservation_unavailable');
 const stale=await voiceReady();stale.setCurrent({state:{draft:{version:2}}});assert.equal((await stale.call({action:'claim_voice',id})).error,'voice_reservation_unavailable');
});
test('exact document confirmation is required before queuing a gate decision',async()=>{
 const f=fixture();for(const extra of [{version:1},{version:1,confirmed:true,workflow_id:'other',workflow_revision:1}])assert.equal((await f.call(submit('decide',extra))).ok,false);
 assert.equal(f.intents.size,0);
});
