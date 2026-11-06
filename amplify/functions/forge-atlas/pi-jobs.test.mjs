import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makePiJobHandler,piInputDigest} from './pi-jobs.mjs';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const key='cccccccc-cccc-4ccc-8ccc-cccccccccccc',jobId='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const issuer='https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test',expert='youtube-intel',catalog='a'.repeat(64);
const registry=async()=>[{tenant_id:'gbautomation',agent_id:expert,status:'active',subjects:[owner,other]}];
const event=(action,extra={})=>({identity:{claims:{iss:issuer,sub:owner,'cognito:groups':['tenant-gbautomation']}},
 fieldName:['capability','status'].includes(action)?'forgePiRead':'forgePiCommand',typeName:['capability','status'].includes(action)?'Query':'Mutation',
 arguments:{input:{action,agent_id:expert,...extra}}});
const command=()=>event('projection.refresh',{resource_id:'ui.youtube',catalog_sha256:catalog,idempotency_key:key});
const job=()=>({id:jobId,tenant_id:'gbautomation',actor_sub:owner,expert,action:'projection.refresh',resource_id:'ui.youtube',
 catalog_sha256:catalog,input_sha256:piInputDigest(owner,expert,'projection.refresh','ui.youtube',catalog),idempotency_key:key,
 state:'pending',created_at:'2026-11-05T00:00:00Z',expires_at:'2026-11-05T00:10:00Z',lease_token:'private-lease',result_ref:null});

test('Pi queue is disabled by default and performs no broker operations',async()=>{
 let calls=0;const h=makePiJobHandler({issuer,operatorSubject:owner,registry,rpc:async()=>{calls++;},authorizeResource:async()=>true});
 assert.equal((await h(event('capability'))).payload.data.enabled,false);
 assert.equal((await h(command())).payload.error,'jobs_disabled');assert.equal(calls,0);
});
test('Pi command binds operator, active expert, action, resource and current catalog',async()=>{
 const calls=[];const h=makePiJobHandler({issuer,operatorSubject:owner,enabled:true,registry,authorizeResource:async(...args)=>{calls.push(args);return true;},
 rpc:async(name,args)=>{calls.push({name,args});return job();}});
 const result=(await h(command())).payload;assert.equal(result.ok,true);assert.equal(result.data.job_id,jobId);
 assert.deepEqual(calls[0],[expert,'projection.refresh','ui.youtube',catalog]);
 assert.equal(calls[1].args.p_actor,owner);assert.equal(calls[1].args.p_digest,job().input_sha256);
 assert.ok(!JSON.stringify(result).includes('lease'));assert.ok(!JSON.stringify(result).includes('actor_sub'));
 const forged=command();forged.identity.claims.sub=other;
 assert.equal((await h(forged)).payload.error,'operator_access_required');assert.equal(calls.length,2);
});
test('anonymous, foreign tenant, wrong issuer, inactive expert and unknown fields cannot enqueue',async()=>{
 let calls=0;const h=makePiJobHandler({issuer,operatorSubject:owner,enabled:true,registry,authorizeResource:async()=>{calls++;return true;},rpc:async()=>{calls++;return job();}});
 const cases=[command(),command(),command(),command(),command()];
 delete cases[0].identity;cases[1].identity.claims['cognito:groups']=['tenant-other'];cases[2].identity.claims.iss='other';
 cases[3].arguments.input.actor=owner;cases[4].arguments.input.agent_id='not-registered';
 for(const input of cases)assert.equal((await h(input)).payload.ok,false);
 assert.equal(calls,0);
});
test('stale catalog or wrong resource owner rejects before broker write; status recovers by stable key',async()=>{
 let calls=0;const h=makePiJobHandler({issuer,operatorSubject:owner,enabled:true,registry,authorizeResource:async()=>false,
 rpc:async(name,args)=>{calls++;assert.equal(name,'forge_pi_read');assert.equal(args.p_key,key);return job();}});
 assert.equal((await h(command())).payload.error,'resource_access_required');assert.equal(calls,0);
 assert.equal((await h(event('status',{idempotency_key:key}))).payload.data.job_id,jobId);assert.equal(calls,1);
});
test('corrupt or cross-subject broker results and private errors are suppressed',async()=>{
 for(const bad of [{...job(),actor_sub:other},{...job(),input_sha256:'0'.repeat(64)},
    {...job(),state:'complete',result_ref:{kind:'publication',manifest_sha256:catalog,url:'http://private'}}]){
  const h=makePiJobHandler({issuer,operatorSubject:owner,enabled:true,registry,authorizeResource:async()=>true,rpc:async()=>bad});
  assert.equal((await h(command())).payload.error,'job_unavailable');
 }
 const h=makePiJobHandler({issuer,operatorSubject:owner,enabled:true,registry,authorizeResource:async()=>true,rpc:async()=>{throw Error('private service credential');}});
 assert.equal((await h(command())).payload.error,'job_unavailable');
});
