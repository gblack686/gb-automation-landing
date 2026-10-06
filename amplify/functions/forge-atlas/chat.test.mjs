import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeChatHandler} from './chat.mjs';

const issuer='https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const agent='youtube-intel';
const sid='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const sha='a'.repeat(64);
const event=(action,fields={},sub=owner)=>({identity:{claims:{iss:issuer,sub,'cognito:groups':['tenant-gbautomation']}},
 typeName:['capability','poll'].includes(action)?'Query':'Mutation',fieldName:['capability','poll'].includes(action)?'forgeChatRead':'forgeChatCommand',
 arguments:{input:{action,agent_id:agent,...fields}}});
const registration=async()=>[{tenant_id:'gbautomation',agent_id:agent,status:'active',subjects:[owner]}];

test('chat capability and sends are bound to registration and Cognito owner',async()=>{
 const calls=[];
 const db=async(table,options={})=>{calls.push({table,options});
  if(table==='forge_chat_capability')return {enabled:true};
  if(table==='forge_chat_sessions'&&options.method==='POST')return [{}];
  if(table==='forge_chat_sessions')return [{id:sid,status:'ready'}];
  if(table==='forge_chat_turns'&&options.method==='POST')return [{}];
  if(table==='forge_chat_turns')return [{content:'What does this say?',reply:'A summary.',status:'complete'}];
 };
 const handler=makeChatHandler({issuer,registry:registration,db});
 assert.equal((await handler(event('capability'))).payload.data.enabled,true);
 assert.equal((await handler(event('send',{session_id:sid,content:'What does this say?',source:{path:'experts/gbautomation/youtube-intel/README.md',sha256:sha}}))).payload.data.messages.length,2);
 const insert=calls.find(call=>call.table==='forge_chat_turns'&&call.options.method==='POST').options.body;
 assert.equal(insert.owner_sub,owner);
 assert.equal(insert.profile,'expert-gbautomation-youtube-intel');
 assert.equal(insert.source_sha256,sha);
 assert.equal((await handler(event('poll',{session_id:sid},other))).payload.error,'agent_access_required');
 assert.equal(calls.length,4);
});

test('chat denies foreign paths, forged profiles and wrong operation envelopes',async()=>{
 let reads=0;
 const handler=makeChatHandler({issuer,registry:registration,db:async table=>{reads++;return table==='forge_chat_sessions'?[{id:sid}]:[];}});
 for(const source of [{path:'experts/gbautomation/other/README.md',sha256:sha},
  {path:'experts/gbautomation/youtube-intel/../other.md',sha256:sha},
  {path:'experts/gbautomation/youtube-intel/README.md',sha256:'bad'}]){
  assert.equal((await handler(event('send',{session_id:sid,content:'hello',source}))).payload.error,'invalid_request');
 }
 const forged=event('send',{session_id:sid,content:'hello',profile:'other'});
 assert.equal((await handler(forged)).payload.error,'invalid_request');
 const wrong=event('send',{session_id:sid,content:'hello'});wrong.typeName='Query';
 assert.equal((await handler(wrong)).payload.error,'invalid_request');
 assert.equal(reads,3);
});

test('a registered second owner cannot poll the first owner session',async()=>{
 let saw;
 const handler=makeChatHandler({issuer,registry:async()=>[{tenant_id:'gbautomation',agent_id:agent,status:'active',subjects:[owner,other]}],
  db:async(table,options)=>{saw={table,options};return [];}});
 assert.equal((await handler(event('poll',{session_id:sid},other))).payload.error,'session_access_required');
 assert.equal(saw.table,'forge_chat_sessions');
 assert.equal(saw.options.query.owner_sub,`eq.${other}`);
 assert.equal(saw.options.query.profile,'eq.expert-gbautomation-youtube-intel');
});
