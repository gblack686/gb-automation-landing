import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectOperatorData } from './operator-data.mjs';
import { makeHandler } from './contract.mjs';

const issuer='https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const event=(subject,query)=>({identity:{claims:{iss:issuer,sub:subject,'cognito:groups':['tenant-gbautomation']}},
 typeName:'Query',fieldName:'forgeAtlasRead',arguments:{input:{view:'operatorData',agent_id:'artist-packet-expert',query}}});

test('operator sources require exact operator identity and allowlisted read shape',async()=>{
 let calls=0;
 const handler=makeHandler({issuer,operatorSubject:owner,operatorData:async()=>{calls++;return {schema_version:'forge-operator-data.v1'};}});
 assert.equal((await handler(event('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',{surface:'summary'}))).payload.error,'operator_access_required');
 assert.equal((await handler(event(owner,{surface:'docs'}))).payload.error,'invalid_request');
 assert.equal((await handler(event(owner,{surface:'search',q:'x'}))).payload.error,'invalid_request');
 assert.equal((await handler(event(owner,{surface:'summary',q:'unused'}))).payload.error,'invalid_request');
 assert.equal((await handler(event(owner,{surface:'fleetSchedule'}))).payload.error,'invalid_request');
 assert.equal((await handler(event(owner,{surface:'fleetSchedule',date:'2026-10-05'}))).payload.ok,true);
 assert.equal((await handler(event(owner,{surface:'summary'}))).payload.ok,true);
 assert.equal(calls,2);
});

test('retained Mini source is projected to bounded display fields',()=>{
 const projected=projectOperatorData('summary',{endpoint:'summary',tenant:'gbautomation',connected:true,
  data:{host_jobs:[{run_id:'run-1',task_name:'Nightly transcript',status:'success',secret_key:'must-not-leak'}]}},'youtube-intel');
 assert.equal(projected.lanes[0].rows[0].title,'Nightly transcript');
 assert.equal(JSON.stringify(projected).includes('must-not-leak'),false);
 assert.equal(projected.connected,true);
 assert.throws(()=>projectOperatorData('summary',{endpoint:'summary',tenant:'other',data:{}},'youtube-intel'));
});
