import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateFactory,makeFactoryService} from './factory.mjs';
import {makeHandler} from './contract.mjs';
import {makeResourceStorage} from './resource-storage.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const config='a'.repeat(64),request={agent_id:'news-agent',config_sha256:config};
const captured='2026-11-05T00:00:00Z',now=Date.parse('2026-11-06T00:00:00Z');
const fixture=()=>({schema_version:'forge-factory-workspace.v1',tenant_id:'gbautomation',...request,expert_id:'gbautomation/news-agent',captured_at:captured,
 source:{ledger_sha256:config,ledger_file_sha256:config,from_season:'2026-W44',to_season:'2026-W45',inputs:{},targets:{sha256:config,measured_at:captured}},
 seat:{id:'pi',name:'Pi',shared:true,experts:['consulting/pi','gbautomation/news-agent'],season:'2026-W45',xp:2,cumulative_xp:12,level:1,slots:1},
 goals:[],quests:[],receipts:[],targets:[{id:'quality',label:'Quality',gate:'',approved:false,state:'met',acceptance:'proposed',value:100,goal:95,op:'>=',unit:'%',observed_at:null,detail:'Proposed threshold'}],
 coverage:{game:'available',goals:'unavailable',quests:'unavailable',targets:'available'},counts:{goals:0,quests:0,receipts:0,targets:1},truncated:[],limitations:['Snapshot only.']});
const encode=d=>Buffer.from(JSON.stringify(d));

test('bound saved evidence preserves shared-seat attribution, proposed gates and original capture age',()=>{
 const bytes=encode(fixture());const result=validateFactory(bytes,hash(bytes),request,now);
 assert.equal(result.freshness,'stale');assert.equal(result.captured_at,captured);
 assert.equal(result.seat.shared,true);assert.equal(result.targets[0].acceptance,'proposed');assert.equal(result.snapshot_sha256,hash(bytes));
});

test('wrong expert/config/tenant, tampered bytes, future capture and extra fields fail closed',()=>{
 const bytes=encode(fixture());assert.throws(()=>validateFactory(bytes,'0'.repeat(64),request,now));
 for(const edit of [d=>d.agent_id='youtube-intel',d=>d.config_sha256='b'.repeat(64),d=>d.tenant_id='foreign',
  d=>d.captured_at='2027-01-01T00:00:00Z',d=>d.secret='must-not-leak',d=>d.source.credentials='must-not-leak',
  d=>d.targets[0].acceptance='met',d=>d.targets[0].value=null,d=>d.seat.shared=false]){
  const d=fixture();edit(d);const raw=encode(d);assert.throws(()=>validateFactory(raw,hash(raw),request,now));
 }
});

test('disabled read performs no storage access and enabled service retains exact selected identity',async()=>{
 let calls=0;const bytes=encode(fixture()),load=async id=>{calls++;assert.equal(id,'news-agent');return {bytes,sha256:hash(bytes)};};
 await assert.rejects(makeFactoryService({load})(request));assert.equal(calls,0);
 assert.equal((await makeFactoryService({enabled:true,load,now:()=>now})(request)).agent_id,'news-agent');
 await assert.rejects(makeFactoryService({enabled:true,load})( {...request,agent_id:'../../other'}));assert.equal(calls,1);
});

test('contradictory coverage, duplicate identities and hidden truncation cannot claim valid evidence',()=>{
 for(const edit of [d=>d.targets.push({...d.targets[0]}),d=>d.counts.targets=2,d=>d.truncated=['targets'],
  d=>d.coverage.targets='unavailable',d=>delete d.source.targets,d=>d.targets[0].id='',
  d=>d.goals.push({id:'g',title:'Goal',status:'landed',recorded_status:'done',checks_total:2,checks_proven:1,objective_id:''})]){
  const d=fixture();edit(d);const bytes=encode(d);assert.throws(()=>validateFactory(bytes,hash(bytes),request,now));
 }
});

test('factory authorization requires registered active expert and operator before loading private evidence',async()=>{
 const subject='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',issuer='https://issuer.invalid';let calls=0;
 const entry={tenant_id:'gbautomation',agent_id:'news-agent',display_name:'News',config_sha256:config,subjects:[subject],status:'active'};
 const handler=makeHandler({issuer,operatorSubject:subject,registry:async()=>[entry],factory:async r=>{calls++;assert.equal(r.config_sha256,config);return {};}});
 const event=()=>({identity:{claims:{iss:issuer,sub:subject,'cognito:groups':['tenant-gbautomation']}},typeName:'Query',fieldName:'forgeAtlasRead',arguments:{input:{view:'factorySnapshot',agent_id:'news-agent',query:{}}}});
 assert.equal((await handler(event())).payload.ok,true);
 for(const edit of [e=>delete e.identity,e=>e.identity.claims['cognito:groups']=[],e=>e.arguments.input.agent_id='youtube-intel',e=>e.arguments.input.query.owner='foreign',e=>e.identity.claims.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']){
  const e=event();edit(e);assert.equal((await handler(e)).payload.ok,false);
 }
 entry.status='pending';assert.equal((await handler(event())).payload.ok,false);assert.equal(calls,1);
});

test('factory storage uses fixed expert key and verifies object version, byte count and digest',async()=>{
 const bytes=encode(fixture());let input;
 const storage=makeResourceStorage({bucket:'private-fixture',client:{send:async command=>{input=command.input;return {VersionId:'v1',ContentLength:bytes.length,Metadata:{sha256:hash(bytes)},Body:[bytes]};}}});
 const result=await storage.loadFactorySnapshot('news-agent');
 assert.equal(input.Key,'gbautomation/news-agent/factory-workspace.json');assert.equal(result.version_id,'v1');assert.deepEqual(result.bytes,bytes);
 await assert.rejects(storage.loadFactorySnapshot('../foreign'));
 const broken=makeResourceStorage({bucket:'private-fixture',client:{send:async()=>({VersionId:'v1',ContentLength:bytes.length,Metadata:{sha256:'0'.repeat(64)},Body:[bytes]})}});
 await assert.rejects(broken.loadFactorySnapshot('news-agent'));
});
