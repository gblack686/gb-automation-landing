import {S3Client,GetObjectCommand,PutObjectCommand,HeadObjectCommand} from '@aws-sdk/client-s3';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openRuntime} from './runtime.mjs';
import {makeWorker} from './worker.mjs';
const repo=fileURLToPath(new URL('../../',import.meta.url));
const ROOT='gbautomation/artist-packet-expert/builder-pilot';
const s3=new S3Client({}),location=Key=>({Bucket:process.env.DOCUMENT_BUCKET,Key});
const sha=x=>createHash('sha256').update(x).digest('hex');
const missing=e=>['NoSuchKey','NotFound'].includes(e?.name)||e?.$metadata?.httpStatusCode===404;
async function json(key,max=500000){
 try{const r=await s3.send(new GetObjectCommand(location(key)));if(r.ContentLength>max)throw Error('state_size_limit');return {value:JSON.parse(await r.Body.transformToString()),etag:r.ETag};}
 catch(e){if(missing(e))return null;throw e;}
}
async function putJSON(key,value,condition={}){return s3.send(new PutObjectCommand({...location(key),Body:JSON.stringify(value),ContentType:'application/json',CacheControl:'private, no-store',...condition}));}
async function bytes(asset,expectedKey,max=200000000){
 if(!asset||asset.key!==expectedKey||!asset.version||!/^[a-f0-9]{64}$/.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>max)throw Error('artifact_route_invalid');
 const r=await s3.send(new GetObjectCommand({...location(expectedKey),VersionId:asset.version}));
 if(r.ContentLength!==asset.bytes)throw Error('artifact_size_mismatch');
 const data=Buffer.from(await r.Body.transformToByteArray());
 if(data.length!==asset.bytes||sha(data)!==asset.sha256)throw Error('artifact_hash_mismatch');return data;
}
async function output(key,data,mime){
 const checksum=sha(data);let version;
 try{version=(await s3.send(new PutObjectCommand({...location(key),Body:data,ContentType:mime,CacheControl:'private, no-store',
  Metadata:{sha256:checksum,tenant:'gbautomation',expert:'artist-packet-expert'},IfNoneMatch:'*'}))).VersionId;}
 catch(e){if(![409,412].includes(e?.$metadata?.httpStatusCode))throw e;}
 const h=await s3.send(new HeadObjectCommand({...location(key),...(version?{VersionId:version}:{})}));
 if(h.Metadata?.sha256!==checksum||h.ContentLength!==data.length||h.Metadata?.tenant!=='gbautomation'||h.Metadata?.expert!=='artist-packet-expert'||!h.VersionId)throw Error('artifact_readback_failed');
 const descriptor={key,version:h.VersionId,sha256:checksum,bytes:data.length,mime};
 await bytes(descriptor,key,data.length);
 return descriptor;
}
const MIME={'.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.html':'text/html; charset=utf-8','.js':'text/javascript','.zip':'application/zip'};
const store={
 intent:async id=>(await json(`${ROOT}/commands/${id}/intent.json`,30000))?.value,
 result:async id=>(await json(`${ROOT}/commands/${id}/result.json`))?.value,
 current:()=>json(`${ROOT}/current.json`),
 async finish(id,result){
  try{await putJSON(`${ROOT}/commands/${id}/result.json`,result,{IfNoneMatch:'*'});}
  catch(e){if(![409,412].includes(e?.$metadata?.httpStatusCode))throw e;
   const old=await this.result(id);if(old?.status!==result.status||JSON.stringify(old?.data)!==JSON.stringify(result.data)||old?.error!==result.error)throw Error('command_result_conflict');}
 },
 snapshot:(id,data)=>output(`${ROOT}/snapshots/${id}/${sha(data)}.tgz`,data,'application/gzip'),
 commit:(value,etag)=>putJSON(`${ROOT}/current.json`,value,etag?{IfMatch:etag}:{IfNoneMatch:'*'}),
 async publishPacket(p){
  const id=p.manifest.packet_id;if(!/^[a-f0-9]{64}$/.test(id))throw Error('packet_route_invalid');
  const assets=[];
  for(const row of [...p.manifest.files,{path:'packet-manifest.json',sha256:null}]){
   if(!/^[-a-zA-Z0-9_./]+$/.test(row.path)||row.path.split('/').some(v=>!v||v==='.'||v==='..'))throw Error('packet_route_invalid');
   const target=resolve(p.directory,row.path);if(!target.startsWith(resolve(p.directory)+ (process.platform==='win32'?'\\':'/')))throw Error('packet_route_invalid');
   const data=await readFile(target);if(row.sha256&&(sha(data)!==row.sha256||data.length!==row.bytes))throw Error('packet_bytes_changed');
   const ext='.'+row.path.split('.').at(-1);assets.push({path:row.path,...await output(`${ROOT}/packets/${id}/${row.path}`,data,MIME[ext]||'text/plain; charset=utf-8')});
  }
  const zip=await readFile(p.archive);if(sha(zip)!==p.archive_sha256)throw Error('packet_bytes_changed');
  assets.push({path:'package.zip',...await output(`${ROOT}/packets/${id}/package.zip`,zip,'application/zip')});
  await output(`${ROOT}/packets/${id}/record.json`,Buffer.from(JSON.stringify({packet_id:id,manifest:p.manifest,assets})),'application/json');
 }
};
async function python(action,root,archive){
 await new Promise((done,reject)=>{const p=spawn(process.env.PYTHON||'python3',[join(repo,'apps/forge-builder-host/snapshot.py'),action,root,archive],{stdio:'ignore',windowsHide:true});
  const timer=setTimeout(()=>p.kill(),30000);p.once('error',reject);p.once('close',code=>{clearTimeout(timer);code===0?done():reject(Error('snapshot_failed'));});});
}
async function open({current,actor}){
 const work=resolve(tmpdir(),'forge-builder-host'),dataRoot=join(work,'data'),bootstrapRoot=join(work,'bootstrap');
 if(work!==join(resolve(tmpdir()),'forge-builder-host'))throw Error('temporary_root_invalid');
 await rm(work,{recursive:true,force:true});await mkdir(dataRoot,{recursive:true});await mkdir(bootstrapRoot,{recursive:true});
 const clean=()=>rm(work,{recursive:true,force:true});
 try{
  const bootstrap=(await json(`${ROOT}/bootstrap/manifest.json`))?.value;
  if(!bootstrap||bootstrap.tenant_id!=='gbautomation'||bootstrap.agent_id!=='artist-packet-expert'||!Array.isArray(bootstrap.files)||bootstrap.files.length>8)throw Error('bootstrap_unavailable');
  const allowed=new Set(['profile.json','settings.json','operator-preferences.md','assets/portrait.png','assets/card.png','assets/model.glb','assets/receipts.json']);
  const seen=new Set();for(const file of bootstrap.files){
   if(!allowed.has(file.path)||seen.has(file.path))throw Error('bootstrap_route_invalid');seen.add(file.path);
   const target=join(bootstrapRoot,file.path);await mkdir(resolve(target,'..'),{recursive:true});await writeFile(target,await bytes(file,`${ROOT}/bootstrap/${file.path}`,40000000));
  }
  if(!['profile.json','settings.json','assets/portrait.png','operator-preferences.md'].every(p=>seen.has(p)))throw Error('bootstrap_incomplete');
  const archive=join(work,'snapshot.tgz');
  if(current){
   if(!Number.isInteger(current.value.revision)||current.value.revision<1||!/^[a-f0-9-]{36}$/.test(current.value.last_command))throw Error('snapshot_pointer_invalid');
   await writeFile(archive,await bytes(current.value.snapshot,`${ROOT}/snapshots/${current.value.last_command}/${current.value.snapshot?.sha256}.tgz`));await python('restore',dataRoot,archive);
  }
  const runtime=await openRuntime({dataRoot,bootstrapRoot,actor});
  return {runtime,cleanup:clean,snapshot:async()=>{await python('pack',dataRoot,archive);return readFile(archive);}};
 }catch(e){await clean();throw e;}
}
const work=makeWorker({store,open});
export async function handler(event){
 if(!Array.isArray(event?.Records)||event.Records.length!==1)throw Error('fifo_event_required');
 const row=event.Records[0];
 if(row.eventSource!=='aws:sqs'||row.eventSourceARN!==process.env.BUILDER_QUEUE_ARN)throw Error('queue_binding_required');
 try{const body=JSON.parse(row.body);if(Object.keys(body).join()!=='id')throw Error('invalid_queue_body');await work(body.id);return {batchItemFailures:[]};}
 catch{console.error('Forge builder command needs retry',row.messageId);return {batchItemFailures:[{itemIdentifier:row.messageId}]};}
}
