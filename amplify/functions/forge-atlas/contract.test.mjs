import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler, project, traceURL } from './contract.mjs';
const issuer = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test';
const event = input => ({identity:{claims:{iss:issuer,sub:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cognito:groups':['tenant-gbautomation']}},info:{fieldName:'forgeAtlasRead'},arguments:{input}});

test('Cognito hex subjects do not require RFC UUID version or variant bits',async () => {
 let reads=0;const handler=makeHandler({issuer,document:async()=>{reads++;return {};}});
 const actualShape=event({view:'document'});
 actualShape.identity.claims.sub='aaaaaaaa-aaaa-7aaa-caaa-aaaaaaaaaaaa';
 actualShape.identity.claims['cognito:groups']=[];
 assert.equal((await handler(actualShape)).payload.error,'tenant_access_required');
 actualShape.identity.claims['cognito:groups']=['tenant-gbautomation'];
 assert.equal((await handler(actualShape)).payload.ok,true);
 for(const sub of ['',null,'not-a-cognito-subject','a'.repeat(100)]) {
  actualShape.identity.claims.sub=sub;
  assert.equal((await handler(actualShape)).payload.error,'authentication_required');
 }
 assert.equal(reads,1);
});
test('anonymous, foreign issuer, foreign tenant and argument ownership are denied',async () => {
 let reads=0;
 const handler=makeHandler({issuer,rpc:async()=>{reads++;return [];},document:async()=>{reads++;return {};}});
 const anon=event({view:'history',query:{view:'sessions'}}); delete anon.identity;
 const foreign=event({view:'document'}); foreign.identity.claims.iss='https://attacker.example';
 const tenant=event({view:'document'}); tenant.identity.claims['cognito:groups']=['tenant-customer'];
 for (const invalid of [anon,foreign,tenant,event({view:'document',tenant:'customer'}),event({view:'history',query:{view:'sessions',session_key:'other'}})])
  assert.equal((await handler(invalid)).payload.ok,false);
 assert.equal(reads,0);
});
test('backend pins tenant and expert and preserves page cursor',async () => {
 let body;
 const handler=makeHandler({issuer,rpc:async input=>{body=input;return Array.from({length:51},(_,i)=>({session_key:`session-${i}`}));}});
 const result=(await handler(event({view:'history',query:{view:'sessions'}}))).payload;
 assert.equal(body.p_tenant,'gbautomation');assert.equal(body.p_expert,'artist-packet-expert');
 assert.equal(result.data.rows.length,50);assert.equal(result.data.next,'session-49');
});
test('private storage is never called for unapproved operations',async () => {
 let calls=0;const handler=makeHandler({issuer,document:async()=>{calls++;return {sha256:'abc'};}});
 assert.equal((await handler(event({view:'run',command:'terminal'}))).payload.ok,false);
 assert.equal((await handler(event({view:'document'}))).payload.ok,true);assert.equal(calls,1);
});
test('errors hide database/provider details',async () => {
 const handler=makeHandler({issuer,rpc:async()=>{throw Error('password=private');}});
 assert.deepEqual((await handler(event({view:'history',query:{view:'sessions'}}))).payload,{ok:false,error:'atlas_unavailable'});
});
test('trace links require exact project path and trace identity',() => {
 assert.equal(traceURL('https://us.cloud.langfuse.com/project/p/traces/a','a'),'https://us.cloud.langfuse.com/project/p/traces/a');
 for (const url of ['https://evil.example/project/p/traces/a','https://us.cloud.langfuse.com/project/p/traces/b','https://us.cloud.langfuse.com/project/p/traces/a?x=1'])assert.equal(traceURL(url,'a'),null);
});
test('numeric metrics are bounded and unusable values remain unknown',() => {
 const result=project({view:'atlas'},{traces:[{row_key:'a',observed_at:'2026-09-22T00:00:00Z',tokens:'20',cost:-1,duration:'Infinity',events:null}],runs:[],sessions:[]});
 assert.equal(result.datasets.traces[0].row_key,'traces-1');assert.equal(result.datasets.traces[0].tokens,20);assert.equal(result.datasets.traces[0].cost,null);assert.equal(result.datasets.traces[0].duration,null);
 assert.throws(()=>project({view:'atlas'},{traces:Array(201),runs:[],sessions:[]}));
});
