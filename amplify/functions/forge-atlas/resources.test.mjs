import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { makeHandler } from './contract.mjs';
import { makeResourceService, RESOURCE_ROOT, validateResourceManifest } from './resources.mjs';
import { makeResourceStorage } from './resource-storage.mjs';

const clock=()=>Date.parse('2026-11-05T04:00:00Z');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const content=Buffer.from('<!doctype html><html><head></head><body>Saved result</body></html>');
const artifact={sha256:digest(content),bytes:content.length,media_type:'text/html',version_id:'v-artifact'};
artifact.key=`${RESOURCE_ROOT}/artifacts/${artifact.sha256}.html`;
const row={id:'ui.youtube-intel',title:'YouTube Intel',owner_expert:'youtube-intel',kind:'ui',
 delivery_mode:'artifact',source_commit:'a'.repeat(40),content_sha256:artifact.sha256,
 observed_at:'2026-11-05T03:00:00Z',expires_at:'2026-11-05T03:15:00Z',artifact};
const fixture=(rows=[row])=>({schema_version:'hosted-resource-delivery.v1',tenant_id:'gbautomation',
 source_commit:'a'.repeat(40),captured_at:'2026-11-05T03:00:00Z',resources:rows});
const packed=value=>{const bytes=Buffer.from(JSON.stringify(value));return {bytes,sha256:digest(bytes)};};
const operator='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const issuer='https://cognito-idp.us-east-1.amazonaws.com/test';
const event=(view='resourceCatalog',query={})=>({typeName:'Query',fieldName:'forgeAtlasRead',
 identity:{claims:{iss:issuer,sub:operator,'cognito:groups':['tenant-gbautomation']}},
 arguments:{input:{view,query,agent_id:'youtube-intel'}}});
const registry=async claims=>[{tenant_id:'gbautomation',agent_id:'youtube-intel',display_name:'YouTube Intel',
 subjects:[claims.sub],status:'active',config_sha256:'b'.repeat(64)}];

test('operator, tenant, issuer and registered expert gates run before storage',async()=>{
 let calls=0;
 const handler=makeHandler({issuer,operatorSubject:operator,registry,resources:async()=>{calls++;return {};}});
 const anonymous=event();delete anonymous.identity;
 const tenant=event();tenant.identity.claims['cognito:groups']=['tenant-foreign'];
 const foreign=event();foreign.identity.claims.iss='https://elsewhere.example';
 const subject=event();subject.identity.claims.sub='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
 const expert=event();expert.arguments.input.agent_id='unregistered';
 for(const denied of [anonymous,tenant,foreign,subject,expert])assert.equal((await handler(denied)).payload.ok,false);
 assert.equal(calls,0);
 assert.equal((await handler(event())).payload.ok,true);assert.equal(calls,1);
});

test('caller URLs, bucket keys, paths, forged tenant and invalid filters cannot reach storage',async()=>{
 let calls=0;const handler=makeHandler({issuer,operatorSubject:operator,registry,resources:async()=>{calls++;}});
 for(const query of [{url:'http://127.0.0.1:8080'}, {key:artifact.key}, {path:'../private'},
  {tenant:'foreign'}, {owner:'*'}, {offset:-1}, {offset:0.5}, {search:'\n'}, {kind:'secrets'}]) {
  assert.equal((await handler(event('resourceCatalog',query))).payload.error,'invalid_request');
 }
 for(const query of [{resource_id:row.id},{resource_id:'../x',catalog_sha256:'a'.repeat(64)},
  {resource_id:row.id,catalog_sha256:'a'.repeat(64),url:'https://elsewhere.example'}]) {
  assert.equal((await handler(event('resourceArtifact',query))).payload.error,'invalid_request');
 }
 assert.equal(calls,0);
});

test('owner filters remain exact, pages are bounded and private transport fields are omitted',async()=>{
 const rows=Array.from({length:70},(_,i)=>({...row,id:`ui.example-${i}`,owner_expert:i<60?'youtube-intel':'news-agent'}));
 const service=makeResourceService({enabled:true,loadManifest:async()=>packed(fixture(rows)),clock});
 const page=await service({view:'resourceCatalog',agent_id:'youtube-intel',query:{owner:'youtube-intel',kind:'ui'}});
 assert.equal(page.total,60);assert.equal(page.rows.length,50);assert.equal(page.next,50);
 assert.deepEqual(page.owners,['news-agent','youtube-intel']);
 assert.equal(page.rows[0].freshness,'stale');
 assert.equal(page.rows[0].observed_at,row.observed_at);
 assert.equal(JSON.stringify(page).includes(artifact.key),false);
 assert.equal(JSON.stringify(page).includes('v-artifact'),false);
 assert.equal((await service({view:'resourceCatalog',agent_id:'youtube-intel',query:{owner:'youtube-intel',offset:50}})).rows.length,10);
 assert.equal((await service({view:'resourceCatalog',agent_id:'youtube-intel',query:{owner:'unknown-owner'}})).total,0);
});

test('disabled capability never loads a manifest; stale saved results remain version-bound',async()=>{
 await assert.rejects(makeResourceService({loadManifest:async()=>{assert.fail('disabled read');}})({view:'resourceCatalog',query:{}}));
 const manifest=packed(fixture());let called=0;
 const service=makeResourceService({enabled:true,loadManifest:async()=>manifest,clock,describeArtifact:async value=>{
  called++;assert.deepEqual(value,artifact);return {url:'https://bucket.s3.us-east-1.amazonaws.com/example'};
 }});
 const req={view:'resourceArtifact',agent_id:'youtube-intel',query:{resource_id:row.id,catalog_sha256:manifest.sha256}};
 const result=await service(req);assert.equal(result.freshness,'stale');assert.equal(result.version_id,'v-artifact');
 assert.equal(result.expires_at,'2026-11-05T04:01:00.000Z');
 await assert.rejects(service({...req,query:{...req.query,catalog_sha256:'b'.repeat(64)}}));
 await assert.rejects(service({...req,query:{...req.query,resource_id:'ui.unknown'}}));
 assert.equal(called,1);
});

test('corrupted manifests, duplicates, future timestamps and mismatched artifact bindings fail closed',()=>{
 const good=packed(fixture());
 assert.throws(()=>validateResourceManifest(good.bytes,'c'.repeat(64),clock()));
 const variants=[fixture([row,row]),{...fixture(),tenant_id:'foreign'},
  {...fixture(),captured_at:'2099-01-01T00:00:00Z'},fixture([{...row,title:'http://127.0.0.1:5177'}]),
  fixture([{...row,artifact:{...artifact,key:'gbautomation/other/private.html'}}]),
  fixture([{...row,content_sha256:'d'.repeat(64)}]),fixture([{...row,artifact:{...artifact,bytes:8_000_001}}]),
  fixture([{...row,artifact:{...artifact,version_id:'null'}}]),fixture([{...row,artifact:{...artifact,media_type:'image/svg+xml'}}])];
 for(const value of variants){const p=packed(value);assert.throws(()=>validateResourceManifest(p.bytes,p.sha256,clock()));}
});

test('short canonical owner slugs remain valid and missing owner identities are rejected',async()=>{
 const p=packed(fixture([{...row,owner_expert:'pi'}]));
 const service=makeResourceService({enabled:true,loadManifest:async()=>p,clock});
 assert.equal((await service({view:'resourceCatalog',agent_id:'youtube-intel',query:{owner:'pi'}})).total,1);
 const missing={...row};delete missing.owner_expert;const invalid=packed(fixture([missing]));
 assert.throws(()=>validateResourceManifest(invalid.bytes,invalid.sha256,clock()));
});

test('storage pins pointer and object versions and issues only 60-second object-scoped URLs',async()=>{
 const manifest=packed(fixture());
 const pointer=packed({schema_version:'hosted-resource-pointer.v1',manifest_sha256:manifest.sha256,manifest_version_id:'v-manifest'});
 const calls=[];
 const client={send:async command=>{
  calls.push(command.input);
  if(command.input.Key===artifact.key)return {VersionId:'v-artifact',ContentLength:content.length,ContentType:'text/html',Metadata:{sha256:artifact.sha256}};
  const selected=command.input.Key.endsWith('/active.json')?pointer:manifest;
  return {VersionId:selected===pointer?'v-pointer':'v-manifest',ContentLength:selected.bytes.length,Metadata:{sha256:selected.sha256},Body:Readable.from([selected.bytes])};
 }};
 const store=makeResourceStorage({client,bucket:'private',sign:async(_client,command,options)=>{
  assert.equal(options.expiresIn,60);assert.equal(command.input.VersionId,'v-artifact');
  assert.equal(command.input.ResponseContentDisposition,'attachment');return 'signed';
 }});
 assert.equal((await store.loadManifest()).sha256,manifest.sha256);
 assert.equal(calls[1].VersionId,'v-manifest');
 assert.equal(calls[1].Key,`${RESOURCE_ROOT}/manifests/${manifest.sha256}.json`);
 assert.equal((await store.describeArtifact(artifact)).url,'signed');
});

test('storage rejects oversized streams, replaced bytes, missing versions and forged artifact metadata',async()=>{
 const input=packed({anything:'pointer'});
 for(const override of [{VersionId:undefined},{VersionId:'null'},{ContentLength:2049},
  {Body:Readable.from([Buffer.from('replaced')])},{Body:Readable.from([Buffer.alloc(2049)])}]){
  const client={send:async()=>({VersionId:'v',ContentLength:input.bytes.length,Metadata:{sha256:input.sha256},Body:Readable.from([input.bytes]),...override})};
  await assert.rejects(makeResourceStorage({client,bucket:'private'}).loadManifest());
 }
 for(const change of [{VersionId:'wrong'},{ContentLength:0},{Metadata:{sha256:'b'.repeat(64)}},{ContentType:'text/javascript'}]){
  const client={send:async()=>({VersionId:'v-artifact',ContentLength:artifact.bytes,ContentType:'text/html',Metadata:{sha256:artifact.sha256},...change})};
  await assert.rejects(makeResourceStorage({client,bucket:'private',sign:async()=>assert.fail('invalid asset signed')}).describeArtifact(artifact));
 }
});

test('archived manifest reads pin its hash/version and do not follow the active pointer',async()=>{
 const manifest={...packed(fixture()),version_id:'old-manifest'};const calls=[];
 const store=makeResourceStorage({bucket:'private',client:{send:async command=>{
  calls.push(command.input);assert.equal(command.input.Key,`${RESOURCE_ROOT}/manifests/${manifest.sha256}.json`);
  assert.equal(command.input.VersionId,'old-manifest');
  return {VersionId:'old-manifest',ContentLength:manifest.bytes.length,Metadata:{sha256:manifest.sha256},Body:Readable.from([manifest.bytes])};
 }}});
 const service=makeResourceService({enabled:true,loadManifest:store.loadManifest,clock,describeArtifact:async()=>({url:'signed'})});
 const req={view:'resourceArtifact',agent_id:'youtube-intel',query:{resource_id:row.id,catalog_sha256:manifest.sha256,catalog_version_id:'old-manifest'}};
 const result=await service(req);assert.equal(result.catalog_version_id,'old-manifest');assert.equal(result.version_id,'v-artifact');assert.equal(calls.length,1);
 for(const catalog_version_id of ['null','../path',''])await assert.rejects(service({...req,query:{...req.query,catalog_version_id}}));
 assert.equal(calls.length,1);
 const wrong=makeResourceService({enabled:true,clock,loadManifest:async()=>({...manifest,version_id:'other-version'}),describeArtifact:()=>assert.fail('wrong catalog signed')});
 await assert.rejects(wrong(req));
});
