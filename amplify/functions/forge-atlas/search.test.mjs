import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHandler } from './contract.mjs';
import { runSearch } from './search.mjs';

const issuer='https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test';
const event=input=>({identity:{claims:{iss:issuer,sub:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cognito:groups':['tenant-gbautomation']}},typeName:'Query',fieldName:'forgeAtlasRead',arguments:{input}});
test('search is authenticated, exact expert bound, and read only',async()=>{
 let calls=0;
 const handler=makeHandler({issuer,search:async request=>{calls++;assert.equal(request.agent_id,'artist-packet-expert');return {ok:true};}});
 const query={view:'search',query:{query:'proof matrix',source:'all',limit:40}};
 assert.equal((await handler(event(query))).payload.ok,true);
 for(const input of [
  {...query,query:{...query.query,limit:400}},
  {...query,query:{...query.query,tenant:'another'}},
  {...query,query:{...query.query,source:'commands'}},
  {...query,query:{...query.query,query:'*'}},
 ])assert.equal((await handler(event(input))).payload.error,'invalid_request');
 const anonymous=event(query);delete anonymous.identity;
 assert.equal((await handler(anonymous)).payload.error,'authentication_required');
 assert.equal(calls,1);
});
test('partial source failure stays unavailable and cannot become zero matches',async()=>{
 const result=await runSearch({agent_id:'youtube-intel',query:{query:'proof',source:'all',limit:40}}, {
  proposal:async()=>({rows:[{id:'prop_1',title:'Proof proposal',snippet:'review'}]}),
  session:async()=>{throw Error('source down')},
  pr:async()=>({rows:[]}),
  code:async()=>({rows:[{id:'file:L1',title:'Proof code',href:'javascript:alert(1)'}],coverage:'stale'}),
 });
 assert.deepEqual(result.coverage,{proposal:'available',session:'unavailable',pr:'empty',code:'stale'});
 assert.equal(result.results.length,2);
 assert.equal(result.results.find(row=>row.source==='code').href,'');
 assert.equal(result.agent_id,'youtube-intel');
});
test('Jev hint ranks results when present and falls back on provider errors',async()=>{
 const adapters={proposal:async()=>({rows:[{id:'p',title:'Proposal'}]}),session:async()=>({rows:[]}),pr:async()=>({rows:[{id:'r',title:'PR'}]}),code:async()=>({rows:[]}),classify:async()=> 'pr'};
 const request={agent_id:'artist-packet-expert',query:{query:'review changes',source:'all',limit:40}};
 const ranked=await runSearch(request,adapters);
 assert.equal(ranked.classifier,'jev');assert.equal(ranked.intent_source,'pr');assert.equal(ranked.results[0].source,'pr');
 adapters.classify=async()=>{throw Error('provider unavailable')};
 const fallback=await runSearch(request,adapters);
 assert.equal(fallback.classifier,'literal');assert.equal(fallback.results.length,2);
});
test('an explicit source prefix is stripped for the matching selected facet',async()=>{
 let observed='';
 const result=await runSearch({agent_id:'artist-packet-expert',query:{query:'pr: proof',source:'pr',limit:40}},
  {pr:async query=>{observed=query;return {rows:[]}}});
 assert.equal(observed,'proof');assert.equal(result.source,'pr');
});
