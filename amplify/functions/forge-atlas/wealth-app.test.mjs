import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {whaleFixture,claims,actor,channel,captureId,expert} from '../../../scripts/whale-fixture.mjs';
import {createForgeFetch} from '../../../public/apps/wealth/forge-client.mjs';
import {signWealthRequest} from './wealth-vendor/forge-gateway.mjs';
const base='/api/wealth/v1/whale-room/browser-captures';
function facade(h){const call=field=>async({input},options)=>{assert.equal(options.authMode,'userPool');return {data:await h.app.handle({...h.event(JSON.parse(input).operation),fieldName:field,arguments:{input}})};};
 return createForgeFetch({queries:{forgeWealthRead:call('forgeWealthRead')},mutations:{forgeWealthCommand:call('forgeWealthCommand')}},{enabled:true,expertId:expert,resourceId:h.row.id,catalogSha256:h.config.catalog_sha256});}
const command=(method,body)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('packaged real facade crosses exact authenticated signed gateway for every capture operation and preserves HTTP202',async()=>{
 const h=whaleFixture(),fetch=facade(h);
 for(const path of [base+'/status',base,base+'/'+captureId])assert.equal((await fetch(path)).status,200);
 const args={request_id:'synthetic-request',requested_at:new Date().toISOString(),channel_id:channel};
 const admitted=await fetch(base,command('POST',args));assert.equal(admitted.status,202);assert.equal((await admitted.json()).data.run.state,'pending');
 assert.equal((await fetch(base+'/runs/'+args.request_id)).status,200);
 assert.equal((await fetch(base+'/'+captureId,command('DELETE',{request_id:'delete-one',requested_at:args.requested_at}))).status,200);
 assert.equal((await fetch(base,command('DELETE',{request_id:'delete-all',requested_at:args.requested_at}))).status,200);
 for(const {url,init} of h.calls){assert(url.startsWith(h.config.origin+'/hosted-apps/wealth/'));assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');assert(init.signal);assert.deepEqual(Object.keys(init.headers).sort(),['Content-Type','X-Gbauto-Wealth-Signature']);}
 assert(h.routes.every(r=>r.principal.subject===actor));
});
test('disabled, anonymous, API-key, unrelated operation, raw claims, owner, target and inactive registry fail before dispatch',async()=>{
 for(const patch of [{identity:undefined},{identity:{apiKey:'synthetic'}},{identity:{claims:{...claims,iss:'https://foreign.invalid'}}},{identity:{claims:{...claims,sub:'cccccccc-cccc-cccc-cccc-cccccccccccc'}}},{fieldName:'forgeAppRead'},{typeName:'Mutation'}]){
  const h=whaleFixture();assert.equal((await h.app.handle({...h.event('captureList'),...patch})).payload.status,403);assert.equal(h.calls.length,0);
 }
 for(const patch of [{operation:'portfolios'},{operation:'research',args:{}},{tenant_id:'foreign'},{url:'https://evil.invalid'},{claims},{expert_id:'foreign'},{resource_id:'ui.foreign'},{catalog_sha256:'f'.repeat(64)}]){
  const h=whaleFixture(),event=h.event('captureList');Object.assign(event.arguments.input,patch);assert.notEqual((await h.app.handle(event)).payload.status,200);assert.equal(h.calls.length,0);
 }
 for(const options of [{config:undefined},{resourcesEnabled:false},{registry:async()=>[]},{credentials:async()=>({read:'a'.repeat(64),command:'a'.repeat(64)})}]){
  const h=whaleFixture(options);assert.notEqual((await h.app.handle(h.event('captureList'))).payload.status,200);assert.equal(h.calls.length,0);
 }
});
test('lost admission retries preserve business request identity across fresh signed nonces',async()=>{
 const h=whaleFixture({controls:{loseAdmission:true}}),fetch=facade(h),args={request_id:'stable-request',requested_at:new Date().toISOString(),channel_id:channel};
 assert.equal((await fetch(base,command('POST',args))).status,503);
 assert.equal((await fetch(base,command('POST',args))).status,202);assert.equal(h.runs.size,1);assert.equal(h.commands.size,1);
 const [first,next]=h.calls.map(c=>JSON.parse(c.init.body));assert.notEqual(first.nonce,next.nonce);assert.deepEqual(first.args,next.args);
 // This proves preservation of the backend's business key, not live durable-store acceptance.
});
test('read key cannot command; signed timestamps expire; altered response and destination controls fail closed',async()=>{
 const h=whaleFixture();await h.app.handle(h.event('captureList'));
 const request=h.calls[0],body=JSON.parse(request.init.body),path='/hosted-apps/wealth/command';
 const raw=JSON.stringify({...body,operation:'captureDelete',args:{request_id:'delete-test',requested_at:new Date().toISOString()}});
 assert.equal((await h.receiver.handle({path,method:'POST',headers:{'Content-Type':'application/json','X-Gbauto-Wealth-Signature':signWealthRequest(h.keys.read,path,raw)},body:raw})).status,403);
 const stale=JSON.stringify({...body,timestamp:Date.now()-31000}),readPath='/hosted-apps/wealth/read';
 assert.equal((await h.receiver.handle({path:readPath,method:'POST',headers:{'Content-Type':'application/json','X-Gbauto-Wealth-Signature':signWealthRequest(h.keys.read,readPath,stale)},body:stale})).status,403);
 h.controls.corrupt=true;assert.equal((await h.app.handle(h.event('captureList'))).payload.status,503);
 for(const response of [()=>new Response('{}',{status:302,headers:{location:'https://evil.invalid'}}),()=>new Response('{}',{headers:{'Content-Type':'application/json','Set-Cookie':'private'}}),()=>new Response('x'.repeat(800001),{headers:{'Content-Type':'application/json'}})]){
  const broken=whaleFixture({fetcher:async()=>response()});assert.equal((await broken.app.handle(broken.event('captureList'))).payload.status,503);
 }
 const event=h.event('captureStart',{request_id:'x'.repeat(300001)});assert.equal((await h.app.handle(event)).payload.status,422);
});
test('cloud saved reads remain available when the capture connector is disabled',async()=>{
 const h=whaleFixture({controls:{connector:false}}),fetch=facade(h);
 assert.equal((await (await fetch(base+'/status')).json()).data.enabled,false);
 assert.equal((await (await fetch(base)).json()).data.items.length,1);
 const catalog=await h.catalog({view:'resourceCatalog',query:{kind:'ui'},agent_id:expert});assert.equal(catalog.rows[0].availability,'first_party_app');assert.equal(catalog.rows[0].app_id,'wealth-platform');
});
test('even a correctly signed successful response cannot expose unknown private fields',async()=>{
 const h=whaleFixture({controls:{unsafeFields:true}}),response=await facade(h)(base);
 assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:{code:'invalid_server_response'}});
});
test('AppSync source declares userPool-only fields independently of the public API-key model',()=>{
 const schema=readFileSync(new URL('../../data/resource.ts',import.meta.url),'utf8');
 for(const name of ['forgeWealthRead','forgeWealthCommand'])assert.match(schema,new RegExp(name+':[\\s\\S]*?\\.authorization\\(allow => \\[allow.authenticated\\(\\)\\]\\)\\.handler\\(a.handler.function\\(forgeAtlas\\)\\)'));
});
