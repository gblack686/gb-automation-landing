import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeWealthAuthority} from './wealth-authorization.mjs';
const actor='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',tenant='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const issuer='https://cognito-idp.us-east-1.amazonaws.com/fixture',sha=v=>createHash('sha256').update(v).digest('hex');
const row={id:'ui.wealth.whale-room',title:'Whale Room',kind:'ui',owner_expert:'wealth-expert',delivery_mode:'live_app',app_id:'wealth-platform',source_commit:'a'.repeat(40),observed_at:'2026-11-01T00:00:00Z',expires_at:'2027-01-01T00:00:00Z'};
const raw=Buffer.from(JSON.stringify({schema_version:'hosted-resource-delivery.v1',tenant_id:'gbautomation',source_commit:row.source_commit,captured_at:row.observed_at,resources:[row]}));
const binding={expert_id:row.owner_expert,resource_id:row.id,catalog_sha256:sha(raw),source_commit:row.source_commit};
const claims={iss:issuer,sub:actor,'cognito:groups':['tenant-gbautomation']};
const entry={tenant_id:'gbautomation',agent_id:binding.expert_id,status:'active',subjects:[actor],config_sha256:'c'.repeat(64),display_name:'Wealth'};
const request={claims,expertId:binding.expert_id,resourceId:row.id,catalogSha256:sha(raw)};
function setup(options={}){return makeWealthAuthority({issuer,operatorSubject:actor,binding,tenantBindings:{[sha(actor)]:tenant},registry:async()=>[entry],loadManifest:async()=>({bytes:raw,sha256:sha(raw)}),...options});}
test('trusted Cognito verifier denies anonymous, API-key, foreign issuer and foreign tenant identities',()=>{
 const h=setup();assert.deepEqual(h.verifyIdentity({identity:{claims}}),claims);
 for(const event of [{},{identity:{apiKey:'synthetic'}},{arguments:{input:{claims}}},{identity:{claims:{...claims,iss:'https://foreign.invalid'}}},{identity:{claims:{...claims,'cognito:groups':['foreign']}}}])assert.throws(()=>h.verifyIdentity(event));
});
test('every request rechecks operator, current active registry, manifest, exact owner and source',async()=>{
 let reads=0;const h=setup({registry:async()=>{reads++;return [entry];}});
 assert(await h.authorize(request));assert(await h.authorize(request));assert.equal(reads,2);
 for(const wrong of [{claims:{...claims,sub:tenant}},{claims:{...claims,iss:'https://foreign.invalid'}},{expertId:'foreign'},{resourceId:'ui.foreign'},{catalogSha256:'f'.repeat(64)}])assert.equal(await h.authorize({...request,...wrong}),false);
 for(const wrong of [{status:'pending'},{subjects:[tenant]},{tenant_id:'foreign'},{config_sha256:'bad'}])assert.equal(await setup({registry:async()=>[{...entry,...wrong}]}).authorize(request),false);
 assert.equal(await setup({loadManifest:async()=>({bytes:raw,sha256:'f'.repeat(64)})}).authorize(request),false);
 for(const wrong of [{app_id:'benchmark-comparison'},{owner_expert:'pi'},{source_commit:'b'.repeat(40)},{delivery_mode:'artifact'},{kind:'kb'}])assert.equal(h.available({...row,...wrong},sha(raw)),false);
});
test('tenant lookup is server-owned and unknown subjects or experts have no mapping',async()=>{
 const h=setup();assert.equal(await h.tenantFor(actor,binding.expert_id),tenant);
 assert.equal(await h.tenantFor(tenant,binding.expert_id),null);assert.equal(await h.tenantFor(actor,'foreign'),null);
 assert.equal(setup({binding:undefined}).available(row,sha(raw)),false);
});
