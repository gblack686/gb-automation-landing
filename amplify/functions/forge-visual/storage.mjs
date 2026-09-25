import {S3Client,GetObjectCommand,PutObjectCommand,HeadObjectCommand,ListObjectsV2Command} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {SQSClient,SendMessageCommand} from '@aws-sdk/client-sqs';
import {ROOT,stateKey,assetKey,digest,assertJob,fail} from './domain.mjs';
const s3=new S3Client({}),sqs=new SQSClient({});
const location=Key=>({Bucket:process.env.DOCUMENT_BUCKET,Key});
const missing=e=>e?.$metadata?.httpStatusCode===404||['NoSuchKey','NotFound'].includes(e?.name);
async function getJSON(key){
 try{const r=await s3.send(new GetObjectCommand(location(key)));if(r.ContentLength>150000)throw Error('Oversize state');return {value:JSON.parse(await r.Body.transformToString()),etag:r.ETag};}
 catch(e){if(missing(e))return null;throw e;}
}
async function putJSON(key,value,condition={}){
 try{return await s3.send(new PutObjectCommand({...location(key),Body:JSON.stringify(value),ContentType:'application/json',CacheControl:'private, no-store',...condition}));}
 catch(e){if(e?.$metadata?.httpStatusCode===412||e?.$metadata?.httpStatusCode===409)fail('stale_revision');throw e;}
}
export const store={
 async get(id){const r=await getJSON(stateKey(id));if(r)assertJob(r.value,id);return r;},
 async put(job,etag){assertJob(job);await putJSON(stateKey(job.id),job,etag?{IfMatch:etag}:{IfNoneMatch:'*'});},
 async list(){
  const result=await s3.send(new ListObjectsV2Command({...location(`${ROOT}/runs/`),Key:undefined,Prefix:`${ROOT}/runs/`,MaxKeys:1000}));
  // Bound the pilot's inventory. Never silently hide older jobs once pagination is needed.
  if(result.IsTruncated)fail('job_inventory_limit');
  const keys=(result.Contents||[]).filter(x=>x.Key.endsWith('/state.json')).sort((a,b)=>b.LastModified-a.LastModified).slice(0,30);
  return Promise.all(keys.map(async x=>assertJob((await getJSON(x.Key)).value)));
 },
 async active(){return (await getJSON(`${ROOT}/active.json`))?.value||null;},
 async activate(value){await putJSON(`${ROOT}/active.json`,value);},
 async sign(asset){
  const head=await s3.send(new HeadObjectCommand({...location(asset.key),VersionId:asset.version}));
  if(head.Metadata?.sha256!==asset.sha256||head.ContentLength!==asset.bytes)fail('artifact_routing_failed');
  return {...asset,url:await getSignedUrl(s3,new GetObjectCommand({...location(asset.key),VersionId:asset.version,ResponseCacheControl:'private, no-store'}),{expiresIn:120})};
 },
 async bytes(job,role){
  assertJob(job);const asset=job.assets[role];if(!asset)throw Error('Missing input');
  const r=await s3.send(new GetObjectCommand({...location(asset.key),VersionId:asset.version}));
  if(r.ContentLength>200000000)throw Error('Oversize input');const bytes=Buffer.from(await r.Body.transformToByteArray());
  if(digest(bytes)!==asset.sha256)fail('artifact_hash_failed');return bytes;
 },
 async output(job,role,bytes,inputHash,extra={}){
  const key=assetKey(job,role),sha256=digest(bytes),mime=['card','source_card'].includes(role)?'image/jpeg':['master','remesh','web'].includes(role)?'model/gltf-binary':'image/png';
  const metadata={sha256,tenant:job.tenant_id,expert:job.expert_id,run:job.id,role,input:inputHash};
  const r=await s3.send(new PutObjectCommand({...location(key),Body:bytes,ContentType:mime,CacheControl:'private, no-store',Metadata:metadata,IfNoneMatch:'*'}));
  // Exact version + checksum readback is the routing gate; keys are never caller supplied.
  const h=await s3.send(new HeadObjectCommand({...location(key),VersionId:r.VersionId}));
  if(h.Metadata?.sha256!==sha256||h.Metadata?.expert!==job.expert_id||h.Metadata?.run!==job.id||h.ContentLength!==bytes.length)fail('artifact_routing_failed');
  return {key,sha256,bytes:bytes.length,mime,version:r.VersionId,input_sha256:inputHash,...extra};
 },
 async recover(job,role,inputHash){
  try{const key=assetKey(job,role),h=await s3.send(new HeadObjectCommand(location(key)));
   if(h.Metadata?.input!==inputHash||h.Metadata?.expert!==job.expert_id||h.Metadata?.run!==job.id)fail('artifact_routing_failed');
   return {key,sha256:h.Metadata.sha256,bytes:h.ContentLength,mime:h.ContentType,version:h.VersionId,input_sha256:inputHash};
  }catch(e){if(missing(e))return null;throw e;}
 },
 async receipt(job,stage,value){await putJSON(`${ROOT}/runs/${job.id}/${stage}.receipt.json`,value);},
};
export const queue=(id,delay=0)=>sqs.send(new SendMessageCommand({QueueUrl:process.env.VISUAL_QUEUE_URL,MessageBody:JSON.stringify({id}),DelaySeconds:delay}));
