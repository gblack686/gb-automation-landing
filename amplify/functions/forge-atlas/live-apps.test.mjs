import {test} from 'node:test';import assert from 'node:assert/strict';import {randomBytes,createHash} from 'node:crypto';
import {makeLiveAppHandler,validateAppConfig} from './live-apps.mjs';
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',issuer='https://issuer.test',agent='youtube-intel';
const row={id:'ui.pi.experts',title:'Benchmark',kind:'ui',owner_expert:'pi',delivery_mode:'live_app',app_id:'benchmark-comparison',source_commit:'a'.repeat(40),observed_at:'2026-11-01T00:00:00Z',expires_at:'2026-12-01T00:00:00Z'};
const raw=Buffer.from(JSON.stringify({schema_version:'hosted-resource-delivery.v1',tenant_id:'gbautomation',source_commit:'a'.repeat(40),captured_at:row.observed_at,resources:[row]}));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const config={enabled:true,origin:'https://fixture.tail000000.ts.net',sourceCommit:'a'.repeat(40),receiptSha256:'b'.repeat(64),resourceId:row.id,catalogSha256:hash(raw)};
const event=()=>({typeName:'Query',fieldName:'forgeAppRead',identity:{claims:{iss:issuer,sub:actor,'cognito:groups':['tenant-gbautomation']}},arguments:{input:{agent_id:agent,resource_id:row.id,catalog_sha256:config.catalogSha256}}});
function setup(options={}){
 const calls=[];const key=randomBytes(32).toString('hex');const h=makeLiveAppHandler({issuer,operatorSubject:actor,config,
  registry:async()=>[{tenant_id:'gbautomation',agent_id:agent,status:'active',subjects:[actor]}],loadManifest:async()=>({bytes:raw,sha256:hash(raw)}),credential:async()=>key,
  fetcher:async(url,init)=>{calls.push({url,init});const input=JSON.parse(init.body);const value={schema_version:'hosted-benchmark.v1',app_id:'benchmark-comparison',owner_expert:'pi',source_commit:config.sourceCommit,
   receipt_sha256:config.receiptSha256,catalog_sha256:config.catalogSha256,resource_id:row.id,nonce:input.nonce,retrieved_at:new Date().toISOString(),attempts:[]};
   const bytes=JSON.stringify(value);return new Response(bytes,{headers:{'Content-Type':'application/json','X-Content-Sha256':hash(bytes)}});},...options});return {...h,calls,key};
}
test('only a configured exact app binding opens and server transport carries no browser tokens or URLs',async()=>{
 const h=setup();assert(h.available(row,hash(raw)));const r=(await h.handle(event())).payload;assert(r.ok);assert.equal(r.data.agent_id,agent);
 const {url,init}=h.calls[0];assert.equal(url,config.origin+'/hosted-apps/read');assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');
 assert.deepEqual(Object.keys(init.headers).sort(),['Content-Type','X-Gbauto-App-Signature']);assert(!JSON.stringify(r).includes(h.key));assert(!('nonce' in r.data));
 assert(!h.available({...row,app_id:'infinite-ui'},hash(raw)));
});
test('disabled, anonymous, foreign tenant, wrong operator, registry and stale catalog stop before transport',async()=>{
 const disabled=setup({config:undefined});assert.equal((await disabled.handle(event())).payload.error,'app_disabled');assert.equal(disabled.calls.length,0);
 const h=setup();const inputs=[event(),event(),event(),event(),event(),event()];delete inputs[0].identity;
 inputs[1].identity.claims['cognito:groups']=[];inputs[2].identity.claims.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';inputs[3].arguments.input.agent_id='not-registered';
 inputs[4].arguments.input.catalog_sha256='0'.repeat(64);inputs[5].arguments.input.url='http://127.0.0.1';
 for(const input of inputs)assert.equal((await h.handle(input)).payload.ok,false);assert.equal(h.calls.length,0);
});
test('redirect, cookie, wrong digest, oversized response and endpoint failures are bounded and private',async()=>{
 for(const response of [new Response('',{status:302,headers:{location:'http://127.0.0.1'}}),new Response('{}',{headers:{'set-cookie':'private','content-type':'application/json'}}),
  new Response('{}',{headers:{'content-type':'application/json','x-content-sha256':'0'.repeat(64)}}),new Response('x'.repeat(200001),{headers:{'content-type':'application/json'}})]){
  const h=setup({fetcher:async()=>response});assert.equal((await h.handle(event())).payload.error,'app_unavailable');
 }
 const h=setup({fetcher:async()=>{throw Error('private endpoint or key');}});assert.equal((await h.handle(event())).payload.error,'app_unavailable');
});
test('configuration refuses private hosts, paths, credentials, ports and unknown routes',()=>{
 for(const origin of ['http://127.0.0.1','https://localhost','https://fixture.tail000000.ts.net/path','https://user:pass@fixture.tail000000.ts.net','https://fixture.tail000000.ts.net:8443'])assert.throws(()=>validateAppConfig({...config,origin}));
 assert.throws(()=>validateAppConfig({...config,websocket:true}));
});
