import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeHandler,requestFor} from './contract.mjs';
import {proposalPath,projectProposals} from './proposals.mjs';
const issuer='https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test';
const event=(view,query={})=>({identity:{claims:{iss:issuer,sub:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cognito:groups':['tenant-gbautomation']}},typeName:'Query',fieldName:'forgeAtlasRead',arguments:{input:{view,query}}});
const row={tenant:'gbautomation',proposal_id:'prop_one',card_title:'A proposal',payload:{summary:'<script>text only</script>',action_items:['Review'],private_provider_detail:'not projected'}};

test('proposal reads require deployment issuer and tenant membership before any query',async()=>{
 let calls=0;const handler=makeHandler({issuer,proposals:async()=>{calls++;return {};}});
 for(const view of ['proposals','proposal','approvalSnapshot']) {
  for(const change of [e=>delete e.identity,e=>e.identity.claims.iss='foreign',e=>e.identity.claims['cognito:groups']=[]]) {
   const e=event(view,view==='proposal'?{proposal_id:'prop_one'}:{});change(e);
   assert.equal((await handler(e)).payload.ok,false);
  }
 }
 assert.equal(calls,0);
 assert.equal((await handler(event('proposals'))).payload.ok,true);
 assert.equal(calls,1);
});
test('only bounded read filters are accepted; caller cannot add ownership or a command',()=>{
 for(const query of [{tenant:'other'},{command:'approve'},{offset:-1},{offset:0.5},{offset:100001},{search:'x'.repeat(121)},{search:[]},{search:'a\nb'},{state:'declined'}])assert.throws(()=>requestFor(event('proposals',query),issuer));
 for(const query of [{},{proposal_id:'prop_one',tenant:'other'},{proposal_id:'prop_one,tenant.eq.other'}])assert.throws(()=>requestFor(event('proposal',query),issuer));
 for(const view of ['approve','forge.command','forge.decide'])assert.throws(()=>requestFor(event(view),issuer));
 assert.equal(requestFor(event('proposals',{state:'gated',offset:50,search:'Inbox'}),issuer).query.offset,50);
});
test('PostgREST query pins tenant and columns on every list and detail request',()=>{
 const list=new URL('https://example.invalid'+proposalPath({view:'proposals',query:{offset:50,search:'x*,tenant.eq.other%_',state:'gated'}}));
 assert.equal(list.searchParams.get('tenant'),'eq.gbautomation');
 assert.equal(list.searchParams.get('limit'),'50');
 assert.equal(list.searchParams.get('offset'),'50');
 assert.equal(list.searchParams.get('state'),'eq.gated');
 assert.equal(list.searchParams.get('card_title'),'ilike.*x\\*,tenant.eq.other\\%\\_*');
 assert.equal(list.searchParams.has('or'),false);
 assert.equal(list.searchParams.get('select').includes('payload'),false);
 const detail=new URL('https://example.invalid'+proposalPath({view:'proposal',query:{proposal_id:'prop_one'}}));
 assert.equal(detail.searchParams.get('tenant'),'eq.gbautomation');assert.equal(detail.searchParams.get('proposal_id'),'eq.prop_one');assert.equal(detail.searchParams.get('limit'),'1');
});
test('responses verify tenant and identity and expose only review fields',()=>{
 const request={view:'proposal',query:{proposal_id:'prop_one'}};
 const result=projectProposals(request,[row],null);
 assert.equal(result.summary,'<script>text only</script>');assert.deepEqual(result.action_items,['Review']);
 assert.equal(result.payload,undefined);assert.equal(result.tenant,undefined);assert.equal(result.private_provider_detail,undefined);
 assert.throws(()=>projectProposals(request,[{...row,tenant:'other'}],null));
 assert.throws(()=>projectProposals(request,[{...row,proposal_id:'prop_other'}],null));
 assert.equal(projectProposals(request,[],null),null);
 assert.equal(projectProposals({view:'proposals',query:{offset:50}},[row],'50-50/51').total,51);
 assert.throws(()=>projectProposals({view:'proposals',query:{}},[row],null));
});
test('hosted snapshot labels activation state and exposes no decision capability',async()=>{
 const result=(await makeHandler({issuer})(event('approvalSnapshot'))).payload;
 assert.equal(result.ok,true);assert.equal(result.data.mode,'live_read_only');
 assert.equal(result.data.connection.writes_enabled,false);assert.equal(result.data.connection.email_enabled,false);assert.equal(result.data.connection.execution_enabled,false);
});
