import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {makeSystemHomeHandler,validateSystemSnapshot,systemTTL} from './system-home.mjs';
import {makeSystemHomeStorage,SYSTEM_HOME_ROOT} from './system-home-storage.mjs';
import {systemFixture} from './fixtures/system-home.mjs';
const now=Date.parse('2026-11-18T12:00:00Z'),sub='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',issuer='https://cognito-idp.us-east-1.amazonaws.com/fixture';
const row={tenant_id:'gbautomation',agent_id:'fixture-expert',config_sha256:'a'.repeat(64),status:'active',subjects:[sub]};
const event=(view='snapshot',claims={})=>({typeName:'Query',fieldName:'forgeSystemHomeRead',identity:{claims:{iss:issuer,sub,exp:now/1000+60,'cognito:groups':['tenant-gbautomation'],...claims}},arguments:{input:{view}}});
function setup(options={}){let reads=0,registries=0;return {run:makeSystemHomeHandler({issuer,operatorSubject:sub,enabled:true,clock:()=>now,registry:async()=>{registries++;return [row];},load:async()=>{reads++;return systemFixture(now);},...options}),reads:()=>reads,registries:()=>registries};}
test('access descriptor reads no snapshot; exact operator and active expert select System Home',async()=>{
 const h=setup(),r=await h.run(event('access'));assert.deepEqual(r.payload.data,{schema_version:'forge-system-access.v1',admin:true,destination:'/system',agent_id:'fixture-expert'});assert.equal(h.reads(),0);
 const result=await h.run(event());assert.equal(result.payload.data.freshness,'fresh');assert.equal(result.payload.data.operations.counts.reports,null);assert.equal(h.reads(),1);
});
test('same-tenant non-admin, pending, removed and foreign registry never read system data',async()=>{
 for(const registration of [[{...row,subjects:[other]}],[{...row,status:'pending'}],[],[{...row,tenant_id:'foreign'}]]){
  const h=setup({registry:async()=>registration});assert.equal((await h.run(event())).payload.error,'system_access_required');assert.equal(h.reads(),0);
 }
 const h=setup({registry:async()=>[{...row,subjects:[other]}]});const a=await h.run(event('access',{sub:other}));assert.equal(a.payload.data.admin,false);assert.equal(a.payload.data.destination,'/atlas/fixture-expert');assert.equal((await h.run(event('snapshot',{sub:other}))).payload.error,'system_access_required');assert.equal(h.reads(),0);
});
test('ordinary tenants get only their portal without any registry or snapshot call',async()=>{
 for(const tenant of ['jid5274','smoke-client']){const h=setup(),e=event('access',{'cognito:groups':[`tenant-${tenant}`]});assert.equal((await h.run(e)).payload.data.destination,`/clients/${tenant}`);e.arguments.input.view='snapshot';assert.equal((await h.run(e)).payload.error,'system_access_required');assert.equal(h.reads(),0);assert.equal(h.registries(),0);}
 const h=setup();assert.equal((await h.run(event('access',{'cognito:groups':[]}))).payload.data.destination,null);
 // YouTube Intel clients: exactly one tenant-cz group plus the client group; never the system snapshot.
 const cz=event('access',{'cognito:groups':['youtube-intel-client','tenant-cz-0123456789']});assert.equal((await h.run(cz)).payload.data.destination,'/workspace');
 cz.arguments.input.view='snapshot';assert.equal((await h.run(cz)).payload.error,'system_access_required');
 assert.equal((await h.run(event('access',{'cognito:groups':['youtube-intel-client']}))).payload.data.destination,null);
 assert.equal((await h.run(event('access',{'cognito:groups':['youtube-intel-client','tenant-cz-0123456789','tenant-cz-abcdef0123']}))).payload.data.destination,null);
 assert.equal((await h.run(event('access',{'cognito:groups':['tenant-cz-0123456789']}))).payload.data.destination,null);
});
test('anonymous, API-key, invalid issuer, expiry, future token and malicious inputs stop before registry/storage',async()=>{
 const bad=[{...event(),identity:null},event('snapshot',{iss:'foreign'}),event('snapshot',{sub:'invalid'}),event('snapshot',{exp:now/1000}),event('snapshot',{nbf:now/1000+61}),{...event(),typeName:'Mutation'}, {...event(),fieldName:'forgeAtlasRead'}];
 for(const input of [{view:'snapshot',url:'https://private.invalid'}, {view:'snapshot',tenant_id:'foreign'},{view:'snapshot',agent_id:'foreign'},{view:'delete'},{view:'access',query:{}},'not-json'])bad.push({...event(),arguments:{input}});
 for(const e of bad){const h=setup();assert.equal((await h.run(e)).payload.ok,false);assert.equal(h.reads(),0);assert.equal(h.registries(),0);}
});
test('default off and failed registry/storage are safe and cannot reveal provider errors',async()=>{
 for(const enabled of [false,undefined]){const disabled=setup({enabled});assert.equal((await disabled.run(event())).payload.error,'system_unavailable');assert.equal(disabled.reads(),0);}
 for(const options of [{registry:async()=>{throw Error('private provider detail');}},{load:async()=>{throw Error('private provider detail');}}]){const r=await setup(options).run(event());assert.equal(r.payload.ok,false);assert(!JSON.stringify(r).includes('private'));}
});
test('token expiring during storage read cannot receive a private snapshot',async()=>{
 let time=now;const h=setup({clock:()=>time,load:async()=>{time=now+61000;return systemFixture(now);}});
 assert.equal((await h.run(event())).payload.error,'authentication_required');
});
test('strict schema retains old source times and stale capture; all null metrics and bounded path IDs accepted',()=>{
 const x=systemFixture(now);x.captured_at='2020-01-01T00:00:00Z';x.docs.rows[0].id='docs/'+ 'x'.repeat(295);x.docs.rows[0].title='x'.repeat(200);x.docs.rows[0].path='docs/'+ 'x'.repeat(495);
 const r=validateSystemSnapshot(x,now);assert.equal(r.freshness,'stale');assert.equal(r.observability.latest_event_at,'2020-01-01T00:00:00Z');assert.equal(r.retrieved_at,new Date(now).toISOString());
 for(const ttl of [0,29,3601,1.5,'NaN'])assert.throws(()=>systemTTL(ttl));assert.equal(systemTTL(),180);
});
test('pinned GitHub sources allow only approved repositories and optional bounded line fragments',()=>{
 const url=`https://github.com/gbauto/gbauto-pi-host/blob/${'a'.repeat(40)}/src/example.py`;
 for(const fragment of ['', '#L1','#L1-L38']){const x=systemFixture(now);x.topology.nodes[0].source_url=url+fragment;assert.doesNotThrow(()=>validateSystemSnapshot(x,now));}
 for(const suffix of ['#L0','#L1-L0','#anything','?token=value','/%2e%2e/x','/%2Fprivate']){const x=systemFixture(now);x.topology.nodes[0].source_url=url+suffix;assert.throws(()=>validateSystemSnapshot(x,now));}
 const x=systemFixture(now);x.topology.nodes[0].source_url=url.replace('/gbauto/','/gbauto-tac/');assert.throws(()=>validateSystemSnapshot(x,now));
});
test('reject wrong schema/tenant, extras, invalid/future timestamps, metrics, URL/path injection and oversize lists',()=>{
 const changes=[x=>x.schema_version='wrong',x=>x.tenant_id='foreign',x=>x.token='secret',x=>x.operations.counts.runs=-1,x=>x.operations.counts.runs='0',x=>x.operations.counts.runs=1.1,x=>x.operations.reason='raw_error',x=>x.captured_at='2026-11-18T12:01:01Z',x=>x.operations.generated_at='2026-02-30T00:00:00Z',x=>x.docs.indexed_at='2020-01-01T00:00:00+00:00',x=>x.observability.coverage_complete=true,x=>x.observability.sessions[0].prompt='private',x=>x.docs.rows[0].path='../private',x=>x.docs.rows[0].path='https://private.invalid',x=>x.docs.rows[0].path='a/%2e%2e/b',x=>x.docs.rows[0].id='a'.repeat(301),x=>x.docs.rows[0].title='a'.repeat(201),x=>x.docs.rows[0].path='a'.repeat(501),x=>x.topology.nodes[0].source_url='https://evil.invalid',x=>x.topology.edges[0].to='missing',x=>x.topology.nodes[0].description='Bearer private',x=>x.operations.runs=Array(51).fill({}),x=>x.docs.rows=Array(101).fill(x.docs.rows[0]),x=>x.observability.focus_session.event_count=NaN];
 for(const change of changes){const x=systemFixture(now);change(x);assert.throws(()=>validateSystemSnapshot(x,now),change.toString());}
});
const hash=b=>createHash('sha256').update(b).digest('hex');
function storageHarness(mutate=()=>{}) {
 const bytes=Buffer.from(JSON.stringify(systemFixture(now))),pointer=Buffer.from(JSON.stringify({schema_version:'forge-system-home-pointer.v1',snapshot_sha256:hash(bytes),snapshot_version_id:'snapshot-version'})),calls=[];
 const client={send:async command=>{calls.push(command.input);const first=calls.length===1,b=first?pointer:bytes,r={VersionId:first?'pointer-version':'snapshot-version',ContentLength:b.length,Metadata:{sha256:hash(b)},Body:Readable.from([b])};mutate(r,first);return r;}};
 return {calls,load:makeSystemHomeStorage({client,bucket:'fixture-private'})};
}
test('private S3 pins exact derived key and version, validates pointer and stream bytes',async()=>{
 const h=storageHarness();assert.equal((await h.load()).schema_version,'forge-system-home.v1');assert.equal(h.calls[0].Key,`${SYSTEM_HOME_ROOT}/active.json`);assert.match(h.calls[1].Key,/system-home\/snapshots\/[a-f0-9]{64}\.json$/);assert.equal(h.calls[1].VersionId,'snapshot-version');
});
test('S3 missing/wrong versions, digest mismatch, malformed pointer, short/oversize streams fail closed',async()=>{
 for(const mutate of [r=>r.VersionId='null',(r,first)=>{if(!first)r.VersionId='other';},r=>r.Metadata.sha256='c'.repeat(64),r=>r.ContentLength++,r=>r.ContentLength=9999999,r=>r.Body=Readable.from([Buffer.alloc(750001)]),(r,first)=>{if(first){const b=Buffer.from(JSON.stringify({schema_version:'forge-system-home-pointer.v1',snapshot_sha256:'a'.repeat(64),snapshot_version_id:'v',key:'foreign'}));r.Body=Readable.from([b]);r.ContentLength=b.length;r.Metadata.sha256=hash(b);}}])await assert.rejects(storageHarness(mutate).load());
});
test('S3 transport errors and stalled body time out without fallback',async()=>{
 await assert.rejects(makeSystemHomeStorage({bucket:'fixture',client:{send:async()=>{throw Error('unavailable');}}})());
 const body=new Readable({read(){}});await assert.rejects(makeSystemHomeStorage({bucket:'fixture',timeoutMs:10,client:{send:async()=>({VersionId:'v',ContentLength:1,Metadata:{sha256:'a'.repeat(64)},Body:body})}})());assert(body.destroyed);
});
