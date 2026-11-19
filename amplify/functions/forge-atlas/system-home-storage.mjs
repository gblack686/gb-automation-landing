import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
export const SYSTEM_HOME_ROOT='gbautomation/resources/system-home';
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const version=x=>typeof x==='string'&&x!=='null'&&/^[A-Za-z0-9_./+=-]{1,1024}$/.test(x);
export function makeSystemHomeStorage({client,bucket,timeoutMs=10000}) {
 return async()=>{
  if(!bucket)throw Error('system_unavailable');
  const controller=new AbortController();let body;
  const timer=setTimeout(()=>{controller.abort();body?.destroy?.();},timeoutMs);
  const read=async(key,versionId,max,digest)=>{
   const r=await client.send(new GetObjectCommand({Bucket:bucket,Key:key,...(versionId?{VersionId:versionId}:{})}),{abortSignal:controller.signal});
   body=r.Body;
   try {
    if(!version(r.VersionId)||(versionId&&r.VersionId!==versionId)||!Number.isSafeInteger(r.ContentLength)||r.ContentLength<1||r.ContentLength>max||!sha(r.Metadata?.sha256))throw Error();
    const chunks=[];let size=0;
    for await(const chunk of body){size+=chunk.length;if(size>max||controller.signal.aborted)throw Error();chunks.push(Buffer.from(chunk));}
    const bytes=Buffer.concat(chunks),hash=createHash('sha256').update(bytes).digest('hex');
    if(controller.signal.aborted||size!==r.ContentLength||hash!==r.Metadata.sha256||(digest&&digest!==hash))throw Error();
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   }finally{body?.destroy?.();body=null;}
  };
  try {
   const p=await read(`${SYSTEM_HOME_ROOT}/active.json`,null,2048);
   if(!p||Object.keys(p).sort().join()!=='schema_version,snapshot_sha256,snapshot_version_id'||p.schema_version!=='forge-system-home-pointer.v1'||!sha(p.snapshot_sha256)||!version(p.snapshot_version_id))throw Error();
   return await read(`${SYSTEM_HOME_ROOT}/snapshots/${p.snapshot_sha256}.json`,p.snapshot_version_id,750000,p.snapshot_sha256);
  }finally{clearTimeout(timer);}
 };
}
