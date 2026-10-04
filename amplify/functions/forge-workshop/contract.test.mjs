import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler, digest, EXPERT } from './contract.mjs';

const issuer='https://cognito-idp.us-east-1.amazonaws.com/us-east-1_fixture';
const subject='4da71cde-a4e8-4eaa-88b3-09fafaa86c91';
const id='89364868-e7c4-43a6-87ec-3d3c9526bc14';
const identity={claims:{iss:issuer,sub:subject,'cognito:groups':['tenant-gbautomation']}};
const configuration={name:'YouTube',purpose:'Trusted reports',model:'gpt-5.6-sol',scan_cap:5,approvals:'manual'};
const event=(field='forgeWorkshopRead',input={expert_id:EXPERT})=>({identity,info:{fieldName:field},arguments:{input:JSON.stringify(input)}});
function harness(enabled=true,rpcResult={ok:true,draft:null}) {
  const calls=[];
  return {calls,handler:makeHandler({issuer,enabled,catalog:{expert_id:EXPERT},rpc:async(name,body)=>{calls.push({name,body});return rpcResult;}})};
}
test('Cognito issuer, subject and tenant claims are mandatory before any RPC',async()=>{
  for(const claims of [null,{}, {...identity.claims,iss:issuer+'other'},{...identity.claims,sub:'email@example.com'}, {...identity.claims,'cognito:groups':['tenant-other']},{...identity.claims,'cognito:groups':'tenant-gbautomation'}]) {
    const h=harness();assert.equal((await h.handler({...event(),identity:{claims}})).payload.ok,false);assert.equal(h.calls.length,0);
  }
});
test('activation defaults closed',async()=>{
  const h=harness(false);assert.equal((await h.handler(event())).payload.error,'workshop_not_enabled');assert.equal(h.calls.length,0);
});
test('only exact expert/recipe/input fields reach RPC',async()=>{
  for(const [field,input] of [
    ['forgeWorkshopRead',{expert_id:EXPERT,owner_user_id:subject}],['forgeWorkshopRead',{expert_id:'other'}],
    ['forgeWorkshopRun',{expert_id:EXPERT,recipe:'install',request_id:id}],['forgeWorkshopRun',{expert_id:EXPERT,recipe:'health; id',request_id:id}],
    ['forgeWorkshopRun',{expert_id:EXPERT,recipe:'health',request_id:id,args:['--write']}],['unknown',{}],
    ['forgeWorkshopStatus',{expert_id:EXPERT,run_id:'invalid'}],['forgeWorkshopRun',{expert_id:EXPERT,recipe:'health',request_id:'invalid'}],
  ]) { const h=harness();assert.equal((await h.handler(event(field,input))).payload.ok,false);assert.equal(h.calls.length,0); }
});
test('configuration schema enforces draft scope and rejects credential-shaped text',async()=>{
  for(const config of [{...configuration,name:''},{...configuration,purpose:'x'.repeat(2001)},{...configuration,scan_cap:51},{...configuration,scan_cap:1.1},{...configuration,approvals:'auto'},{...configuration,model:'other'},{...configuration,purpose:'api_key=secret'}, {...configuration,password:'secret'}]) {
    const h=harness();assert.equal((await h.handler(event('forgeWorkshopSave',{expert_id:EXPERT,config,request_id:id,expected_version:0}))).payload.ok,false);assert.equal(h.calls.length,0);
  }
});
test('actor is derived from identity; catalog and digest are server-owned',async()=>{
  const h=harness();const result=await h.handler(event());assert.equal(result.payload.catalog.expert_id,EXPERT);
  assert.equal(h.calls[0].body.p_subject,subject);assert.equal(h.calls[0].body.p_issuer,issuer);
  assert.equal(h.calls[0].body.p_command,'read');assert.equal(h.calls[0].body.p_request_sha256.length,64);
  assert.equal(digest({a:1,b:2}),digest({b:2,a:1}));
});
test('valid saves, health requests and lookups reach only the service RPC',async()=>{
  for(const [field,input,command] of [
    ['forgeWorkshopSave',{expert_id:EXPERT,config:configuration,expected_version:0,request_id:id},'save'],
    ['forgeWorkshopRun',{expert_id:EXPERT,recipe:'health',request_id:id},'run'],
    ['forgeWorkshopStatus',{expert_id:EXPERT,run_id:id},'status'],
  ]) {const h=harness();assert.equal((await h.handler(event(field,input))).payload.ok,true);assert.equal(h.calls[0].name,'agent_forge_workshop_command');assert.equal(h.calls[0].body.p_command,command);assert.deepEqual(h.calls[0].body.p_input,input);}
});
test('database failures do not expose error text or credentials',async()=>{
  const handler=makeHandler({issuer,enabled:true,catalog:{},rpc:async()=>{throw new Error('secret fixture');}});
  assert.deepEqual(await handler(event()),{payload:{ok:false,error:'workshop_unavailable'}});
});
