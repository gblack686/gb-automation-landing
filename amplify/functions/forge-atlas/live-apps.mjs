import {createHash,createHmac,randomUUID} from 'node:crypto';
import {authenticate,operatorBootstrap,TENANT} from './contract.mjs';
import {validateResourceManifest} from './resources.mjs';
const sha=/^[a-f0-9]{64}$/;
const PATH='/hosted-apps/read',APP='benchmark-comparison';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,k)=>object(v)&&Object.keys(v).sort().join()===k.split(',').sort().join();
const identity=v=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(v);
const time=v=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v));
const metric=v=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER;
export function validateAppConfig(c){
 if(!keys(c,'enabled,origin,sourceCommit,receiptSha256,resourceId,catalogSha256')||c.enabled!==true
  ||typeof c.origin!=='string'||!/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net$/.test(c.origin)
  ||!/^[a-f0-9]{40}$/.test(c.sourceCommit)||!sha.test(c.receiptSha256)||!sha.test(c.catalogSha256)
  ||!/^ui\.[a-z0-9._-]{2,150}$/.test(c.resourceId))throw Error('app_configuration');
 return c;
}
export function validateBenchmarkProjection(data,binding){
 if(!keys(data,'schema_version,app_id,owner_expert,source_commit,receipt_sha256,catalog_sha256,resource_id,nonce,retrieved_at,attempts')
  ||data.schema_version!=='hosted-benchmark.v1'||data.app_id!==APP||data.owner_expert!=='pi'
  ||data.source_commit!==binding.sourceCommit||data.receipt_sha256!==binding.receiptSha256
  ||data.catalog_sha256!==binding.catalogSha256||data.resource_id!==binding.resourceId||data.nonce!==binding.nonce
  ||!time(data.retrieved_at)||Math.abs(Date.now()-Date.parse(data.retrieved_at))>60000
  ||!Array.isArray(data.attempts)||data.attempts.length>200)throw Error('app_response');
 const seen=new Set();
 for(const a of data.attempts){
  if(!keys(a,'attempt_id,task_id,lane,occurred_at,acceptance,status,tokens,worker_seconds,elapsed_seconds,task_revision,grader_revision,pair_id')
   ||![a.attempt_id,a.task_id,a.lane,a.pair_id].every(identity)||seen.has(a.attempt_id)||!time(a.occurred_at)
   ||!['pass','fail','missing'].includes(a.acceptance)||!['passed','failed','cancelled','infrastructure_error','unavailable'].includes(a.status)
   ||![a.tokens,a.worker_seconds,a.elapsed_seconds].every(metric)||a.tokens!==null&&!Number.isSafeInteger(a.tokens)
   ||!sha.test(a.task_revision)||!sha.test(a.grader_revision))throw Error('app_response');
  seen.add(a.attempt_id);
 }
 return data;
}
export function makeLiveAppHandler({issuer,operatorSubject='',config,registry,loadManifest,credential,fetcher=fetch}){
 const enabled=config?.enabled===true;if(enabled)validateAppConfig(config);
 const available=(row,catalog)=>enabled&&row.app_id===APP&&row.owner_expert==='pi'&&row.delivery_mode==='live_app'
  &&row.id===config.resourceId&&catalog===config.catalogSha256;
 return {available,async handle(event){
  try{
   const claims=authenticate(event,issuer);
   if(!operatorBootstrap(claims.sub,operatorSubject))throw Error('app_denied');
   if(event.typeName!=='Query'||(event.fieldName||event.info?.fieldName)!=='forgeAppRead'||!keys(event.arguments,'input'))throw Error('app_denied');
   const input=typeof event.arguments.input==='string'?JSON.parse(event.arguments.input):event.arguments.input;
   if(!keys(input,'agent_id,resource_id,catalog_sha256')||JSON.stringify(input).length>512||!identity(input.agent_id))throw Error('app_denied');
   const reg=await registry(claims);const entries=Array.isArray(reg)?reg:reg?.agents;
   if(!Array.isArray(entries)||!entries.some(r=>r.tenant_id===TENANT&&r.agent_id===input.agent_id&&r.status==='active'&&r.subjects?.includes(claims.sub)))throw Error('app_denied');
   if(!enabled)throw Error('app_disabled');
   const manifest=await loadManifest();const data=validateResourceManifest(manifest.bytes,manifest.sha256);
   const row=data.resources.find(r=>r.id===input.resource_id);
   if(input.catalog_sha256!==manifest.sha256||!row||!available(row,manifest.sha256))throw Error('app_denied');
   const key=await credential();if(typeof key!=='string'||!sha.test(key))throw Error('app_configuration');
   const nonce=randomUUID();const body=JSON.stringify({actor:claims.sub,expert:'pi',app_id:APP,resource_id:row.id,
    catalog_sha256:manifest.sha256,timestamp:Date.now(),nonce});
   const signature=createHmac('sha256',Buffer.from(key,'hex')).update(`POST\n${PATH}\n${body}`).digest('hex');
   const response=await fetcher(config.origin+PATH,{method:'POST',redirect:'error',credentials:'omit',
    headers:{'Content-Type':'application/json','X-Gbauto-App-Signature':signature},body,signal:AbortSignal.timeout(12000)});
   if(response.status!==200||!response.body||response.headers.has('set-cookie')||response.headers.has('location')
     ||response.headers.get('content-type')?.split(';')[0]!=='application/json')throw Error('app_unavailable');
   const reader=response.body.getReader();let size=0;const chunks=[];
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>200000)throw Error('app_unavailable');chunks.push(value);}}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   const bytes=Buffer.concat(chunks);
   if(createHash('sha256').update(bytes).digest('hex')!==response.headers.get('x-content-sha256'))throw Error('app_unavailable');
   const result=validateBenchmarkProjection(JSON.parse(bytes.toString('utf8')),{...config,nonce});
   const {nonce:_,...projection}=result;
   return {payload:{ok:true,data:{...projection,agent_id:input.agent_id,tenant_id:TENANT}}};
  }catch(error){return {payload:{ok:false,error:['app_disabled','app_denied'].includes(error?.message)?error.message:'app_unavailable'}};}
 }};
}
