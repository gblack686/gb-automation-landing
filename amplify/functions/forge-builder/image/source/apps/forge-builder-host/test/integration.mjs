// Runs against the actual packaged runtime, with no network or cloud credentials.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir,cp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {openRuntime} from '../runtime.mjs';
import {makeWorker} from '../worker.mjs';
process.on('uncaughtException',error=>{console.error(JSON.stringify({error:error.message,code:error.code,stack:error.stack?.split('\n').filter(line=>line.length<400).slice(-8)}));process.exitCode=1;});
const run=promisify(execFile),sha=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const root=await mkdtemp(join(tmpdir(),'forge-host-integration-')),bootstrapRoot=join(root,'bootstrap');
await cp(resolve(process.argv[2]),bootstrapRoot,{recursive:true});
const settings=JSON.parse(await readFile(join(bootstrapRoot,'settings.json'),'utf8'));
settings.voice_enabled=true;settings.voice_usage=[1,2].map(n=>({id:'synthetic-'+n,created_at:new Date().toISOString()}));
await writeFile(join(bootstrapRoot,'settings.json'),JSON.stringify(settings));
const actor='11111111-2222-3333-4444-555555555555',intents=new Map(),results=new Map(),snapshots=new Map(),packets=new Map(),ui=[];
let current=null,state;
const store={intent:async id=>intents.get(id),result:async id=>results.get(id),current:async()=>current,
 snapshot:async(id,bytes)=>{const hash=sha(bytes);snapshots.set(hash,bytes);return {hash};},
 commit:async(value,etag)=>{assert.equal(etag,current?.etag);current={value,etag:String(value.revision)};},
 finish:async(id,value)=>results.set(id,value),
 publishPacket:async p=>{
  const zip=await readFile(p.archive);assert.equal(sha(zip),p.archive_sha256);
  const rows=[];for(const row of p.manifest.files){const b=await readFile(join(p.directory,row.path));assert.equal(sha(b),row.sha256);assert.equal(b.length,row.bytes);rows.push(row);}
  for(const role of ['card','model'])if(settings.visuals[role])assert.equal(p.manifest.visual[role].sha256,settings.visuals[role].sha256);
  packets.set(p.manifest.packet_id,{manifest:p.manifest,archive_sha256:p.archive_sha256});
  if(process.argv[3]){await cp(p.directory,join(resolve(process.argv[3]),'package'),{recursive:true});await writeFile(join(resolve(process.argv[3]),'package/package.zip'),zip);}
 }};
const work=makeWorker({store,open:async({current,actor})=>{
 const dir=await mkdtemp(join(root,'job-')),dataRoot=join(dir,'data'),archive=join(dir,'snapshot.tgz');await mkdir(dataRoot);
 const helper=resolve('apps/forge-builder-host/snapshot.py'),python=process.env.PYTHON||'python';
 if(current){await writeFile(archive,snapshots.get(current.value.snapshot.hash));await run(python,[helper,'restore',dataRoot,archive]);}
 const runtime=await openRuntime({dataRoot,bootstrapRoot,actor});
 return {runtime,snapshot:async()=>{await run(python,[helper,'pack',dataRoot,archive]);return readFile(archive);},
  cleanup:async()=>{assert.ok(dir.startsWith(root));await rm(dir,{recursive:true,force:true});}};
}});
const binding={tenant_id:settings.tenant_id,agent_id:settings.agent_id,board_slug:settings.board_slug,config_sha256:settings.config_sha256};
async function command(action,extra={}){
 console.log('Checking '+action);
 const body=JSON.parse(JSON.stringify({action,binding,version:state?.draft.version,workflow_id:state?.workflow?.workflow_id,workflow_revision:state?.workflow?.revision,...extra}));
 const id=randomUUID();intents.set(id,{id,actor,body,input_sha256:sha(canonical(body))});await work(id);
 const result=results.get(id);if(result.status==='failed')throw Error(result.error);
 if(result.data.draft){state=result.data;ui.push({action,state:structuredClone(state)});}
 return {id,result};
}
try{
 await command('initialize');assert.equal(state.mode,'hosted_internal_pilot');
 const voice=await command('voice',{confirmed:true});assert.ok(voice.result.data.voice_reservation.session_id);await work(voice.id);
 await assert.rejects(()=>command('voice',{confirmed:true}),/voice_daily_limit/);
 const answers=Object.fromEntries(['problem','audience','data_access','output','success'].map(k=>[k,{value:'Explicit '+k+' answer',status:'captured',source:'written'}]));
 await command('save',{answers});assert.equal(state.draft.version,2);
 await assert.rejects(()=>command('save',{answers,version:1}),/version_conflict/);
 await command('propose',{confirmed:true});assert.equal(state.workflow.gate,'proposal');
 await command('accept');assert.equal(state.workflow.gate,'scope');
 async function approve(){const w=state.workflow,doc=w.documents.find(d=>d.gate===w.gate&&d.version===(w.gate==='scope'?w.scope_version:w.plan_version));await command('decide',{confirmed:true,decision:'approve',document_sha256:doc.sha256});}
 await approve();assert.equal(state.workflow.gate,'plan');assert.equal(state.workflow.state,'review');await approve();
 const first=await command('generate'),packet=state.draft.packet;assert.ok(packet.files>30);assert.equal(packets.get(packet.packet_id).manifest.provider_calls,0);
 await work(first.id);await command('generate');assert.equal(state.draft.packet.packet_id,packet.packet_id);assert.equal(state.draft.packet.archive_sha256,packet.archive_sha256);
 assert.equal(JSON.stringify(current.value).includes('signed_url'),false);
 if(process.argv[3])await writeFile(join(resolve(process.argv[3]),'ui-states.json'),JSON.stringify({binding,payload:current.value.payload,states:ui,packet:packets.get(packet.packet_id)},null,2));
 console.log(JSON.stringify({pass:true,commands:intents.size,committed_revisions:current.value.revision,files:packet.files,packet_id:packet.packet_id,
  repeated_packet_identical:true,voice_quota_preserved:true,card_and_model_preserved:true,network:'disabled by container runner'}));
}finally{assert.ok(root.startsWith(join(tmpdir(),'forge-host-integration-')));await rm(root,{recursive:true,force:true});}
