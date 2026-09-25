import {requestFor,newJob,normalizeBrief,transition,publicJob,assertJob,digest,VisualError,fail,assetKey,QUOTES} from './domain.mjs';
import {packetFor} from './packet.mjs';
export function makeVisualHandler({issuer,store,queue,now=()=>new Date().toISOString()}) {
 return async event=>{
  try {
   const {input,actor,operator}=requestFor(event,issuer);let result;
   if(input.action==='list') result={jobs:(await store.list()).map(publicJob),operator,quotes:QUOTES,active_id:(await store.active())?.id||null};
   else if(input.action==='active') result=await store.active();
   else if(input.action==='create') {
    const value=newJob(input.id,input.brief,actor,now()),existing=await store.get(input.id);
    if(existing){if(existing.value.brief_sha256!==digest(JSON.stringify(normalizeBrief(input.brief))))fail('idempotency_conflict'); result=publicJob(existing.value);}
    else {await store.put(value,null); result=publicJob(value);}
   } else {
    const record=await store.get(input.id);if(!record)fail('job_not_found');const job=assertJob(record.value,input.id);
    if(input.action==='get')result=publicJob(job);
    else if(input.action==='packet')result={manifest:packetFor(job),receipt:publicJob(job)};
    else if(input.action==='asset') {
     if(!['card','source_card','agent_card','portrait','character','web','master','avatar32','avatar64','avatar128'].includes(input.stage))fail('invalid_request');
     const asset=job.assets[input.stage];if(!asset||asset.key!==assetKey(job,input.stage))fail('asset_not_ready');
     result=await store.sign(asset);
    } else if(input.action==='adopt') {
     if(input.revision!==job.revision||job.status!=='ready'||input.sha256!==job.assets.web?.sha256||!job.stages.web?.metrics?.passed||Object.values(job.stages).some(s=>s.review?.decision!=='approve'))fail('release_not_ready');
     packetFor(job);
     const active={schema:'forge-visual-active.v1',id:job.id,tenant_id:job.tenant_id,expert_id:job.expert_id,config_sha256:job.config_sha256,portrait:job.assets.portrait,agent_card:job.assets.agent_card||null,web:job.assets.web,card:job.assets.card?.printing||null,approved_by:actor,approved_at:now()};
     active.avatars=Object.fromEntries(['avatar32','avatar64','avatar128'].filter(role=>job.assets[role]).map(role=>[role,job.assets[role]]));
     await store.activate(active);result=active;
    } else if(input.action==='resume') {
     if(input.revision!==job.revision||!['queued','working','running','poll_error','outcome_unknown','needs_optimization','preflight_failed'].includes(job.status))fail('resume_not_available');
     await queue(input.id);result=publicJob(job);
    } else {
     const value=transition(job,input,actor,now());await store.put(value,record.etag);
     if(['start','resume'].includes(input.action))await queue(input.id);
     result=publicJob(value);
    }
   }
   return {payload:{ok:true,data:result}};
  } catch(error){return {payload:{ok:false,error:error instanceof VisualError||['authentication_required','tenant_access_required'].includes(error?.message)?error.message:'visual_unavailable'}};}
 };
}
