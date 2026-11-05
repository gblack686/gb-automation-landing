import {createHash} from 'node:crypto';
import {authenticate,TENANT,operatorBootstrap} from './contract.mjs';

const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const slug=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{1,62}$/.test(value);
const id=value=>typeof value==='string'&&/^[a-z][a-z0-9._-]{2,159}$/.test(value);
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export const PI_ACTIONS=Object.freeze(['catalog.refresh','projection.refresh','expert.report']);
export const piInputDigest=(actor,expert,action,resource,catalog)=>createHash('sha256')
 .update([TENANT,actor,expert,action,resource,catalog].join('\n')).digest('hex');
const keys=(value,expected)=>Object.keys(value).sort().join()===expected.sort().join();
const fail=code=>{throw Error(code);};

function projection(job,actor,expert,key) {
 if(!object(job)||!uuid(job.id)||job.tenant_id!==TENANT||job.actor_sub!==actor||job.expert!==expert
   ||job.idempotency_key!==key||!PI_ACTIONS.includes(job.action)||!id(job.resource_id)||!sha(job.catalog_sha256)
   ||job.input_sha256!==piInputDigest(actor,expert,job.action,job.resource_id,job.catalog_sha256)
   ||!['pending','leased','accepted','complete','failed','uncertain','expired'].includes(job.state)
   ||![job.created_at,job.expires_at].every(value=>typeof value==='string'&&Number.isFinite(Date.parse(value))))fail('job_unavailable');
 let result=null;
 if(job.result_ref!==null && job.result_ref!==undefined){
  const value=job.result_ref;
  if(!object(value))fail('job_unavailable');
  if(job.state==='complete'&&value.kind==='publication'&&keys(value,['kind','manifest_sha256'])&&sha(value.manifest_sha256))result=value;
  else if(job.state==='accepted'&&value.kind==='native-run'&&keys(value,['kind','run_id'])&&typeof value.run_id==='string'&&/^[A-Za-z0-9._:-]{1,160}$/.test(value.run_id))result=value;
  else if(['failed','uncertain'].includes(job.state)&&value.kind==='refused'&&keys(value,['kind','code'])&&typeof value.code==='string'&&/^[a-z_]{1,80}$/.test(value.code))result=value;
  else fail('job_unavailable');
 }
 return {schema_version:'forge-pi-job.v1',job_id:job.id,idempotency_key:key,tenant_id:TENANT,agent_id:expert,
  action:job.action,resource_id:job.resource_id,state:job.state,created_at:job.created_at,expires_at:job.expires_at,result};
}

/** Browser requests receive only a private display projection, never leases or service keys. */
export function makePiJobHandler({issuer,operatorSubject='',enabled=false,registry,rpc,authorizeResource}) {
 return async event=>{
  try{
   const claims=authenticate(event,issuer);
   if(!operatorBootstrap(claims.sub,operatorSubject)||!uuid(claims.sub))fail('operator_access_required');
   const field=event.fieldName||event.info?.fieldName;
   if(!['forgePiRead','forgePiCommand'].includes(field)||event.typeName!==(field==='forgePiRead'?'Query':'Mutation')
     ||!keys(event.arguments||{},['input']))fail('invalid_request');
   const input=typeof event.arguments.input==='string'?JSON.parse(event.arguments.input):event.arguments.input;
   if(!object(input)||JSON.stringify(input).length>2048||!slug(input.agent_id))fail('invalid_request');
   const registered=await registry(claims);const entries=Array.isArray(registered)?registered:registered?.agents;
   if(!Array.isArray(entries)||!entries.some(row=>row?.tenant_id===TENANT&&row.agent_id===input.agent_id&&row.status==='active'
      &&Array.isArray(row.subjects)&&row.subjects.includes(claims.sub)))fail('agent_access_required');
   if(field==='forgePiRead'&&input.action==='capability'){
    if(!keys(input,['agent_id','action']))fail('invalid_request');
    const value=enabled?await rpc('forge_pi_capability',{p_actor:claims.sub,p_expert:input.agent_id}):{enabled:false};
    return {payload:{ok:true,data:{schema_version:'forge-pi-capability.v1',tenant_id:TENANT,agent_id:input.agent_id,
      enabled:value?.enabled===true,actions:Array.isArray(value?.actions)?value.actions.filter(v=>PI_ACTIONS.includes(v)&&(v!=='expert.report'||input.agent_id==='youtube-intel')):[],
      worker_seen_at:typeof value?.worker_seen_at==='string'&&Number.isFinite(Date.parse(value.worker_seen_at))?value.worker_seen_at:null}}};
   }
   if(!enabled)fail('jobs_disabled');
   if(field==='forgePiRead'&&input.action==='status'){
    if(!keys(input,['action','agent_id','idempotency_key'])||!uuid(input.idempotency_key))fail('invalid_request');
    const job=await rpc('forge_pi_read',{p_actor:claims.sub,p_expert:input.agent_id,p_key:input.idempotency_key});
    return {payload:{ok:true,data:job===null?null:projection(job,claims.sub,input.agent_id,input.idempotency_key)}};
   }
   if(field!=='forgePiCommand'||!PI_ACTIONS.includes(input.action)
     ||input.action==='expert.report'&&input.agent_id!=='youtube-intel'
     ||!keys(input,['action','agent_id','resource_id','catalog_sha256','idempotency_key'])
     ||!id(input.resource_id)||!sha(input.catalog_sha256)||!uuid(input.idempotency_key))fail('invalid_request');
   if(!await authorizeResource(input.agent_id,input.action,input.resource_id,input.catalog_sha256))fail('resource_access_required');
   const job=await rpc('forge_pi_submit',{p_actor:claims.sub,p_expert:input.agent_id,p_action:input.action,
     p_resource:input.resource_id,p_catalog:input.catalog_sha256,
     p_digest:piInputDigest(claims.sub,input.agent_id,input.action,input.resource_id,input.catalog_sha256),p_key:input.idempotency_key});
   return {payload:{ok:true,data:projection(job,claims.sub,input.agent_id,input.idempotency_key)}};
  }catch(error){return {payload:{ok:false,error:['invalid_request','operator_access_required','agent_access_required','resource_access_required','jobs_disabled'].includes(error?.message)?error.message:'job_unavailable'}};}
 };
}
