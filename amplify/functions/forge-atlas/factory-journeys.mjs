// Optional extension of the private Factory snapshot. No URL or approval is
// inferred from a native task, artifact or collector event identity.
const fail=()=>{throw Error('Factory journey evidence unavailable');};
const sha=/^[a-f0-9]{64}$/;
const text=(v,n=240)=>typeof v==='string'&&v.length>0&&v.length<=n&&!/[\x00-\x1f\x7f]/.test(v);
const integer=v=>typeof v==='string'&&/^[1-9][0-9]{0,15}$/.test(v)&&Number.isSafeInteger(Number(v));
const numeric=v=>v===null||typeof v==='number'&&Number.isFinite(v)&&v>=0;
const stamp=v=>typeof v==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
function only(v,keys,optional=[]){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)&&!optional.includes(k))||keys.some(k=>!(k in v)))fail();}
function rows(v,cap){if(!Array.isArray(v)||v.length>cap||new Set(v.map(r=>r?.id)).size!==v.length)fail();return v;}
export function validateJourneys(data,expert,snapshotAt){
 only(data,['schema_version','expert_id','captured_at','source_sha256','selection','rows'],['output_links_sha256']);
 if('output_links_sha256' in data&&(!Array.isArray(data.output_links_sha256)||!data.output_links_sha256.length||data.output_links_sha256.length>20||data.output_links_sha256.some(v=>!sha.test(v))||new Set(data.output_links_sha256).size!==data.output_links_sha256.length))fail();
 if(data.schema_version!=='forge-workspace-journeys.v1'||data.expert_id!==expert
  ||!['gbautomation/youtube-intel','gbautomation/news-agent'].includes(expert)
  ||!stamp(data.captured_at)||Date.parse(data.captured_at)>Date.parse(snapshotAt)||!sha.test(data.source_sha256)||data.selection!=='explicit_ids')fail();
 const kind=expert==='gbautomation/youtube-intel'?'youtube':'news';
 const labels=kind==='youtube'?['Run','Source commit','Binding']:['Conversation','Sweep','Sweep task','Run entry','Tool task','Generation','Generation task','Provider call'];
 for(const row of rows(data.rows,20)){
  only(row,['id','kind','status','work','outputs','collector_events','generation','complete','delivered','langfuse_trace_id','target_evidence','acceptance']);
  if(!text(row.id)||row.kind!==kind||!text(row.status,40)||row.langfuse_trace_id!==null||row.target_evidence!=='missing'||row.acceptance!=='pending')fail();
  if(!Array.isArray(row.work)||row.work.length!==labels.length)fail();
  for(let i=0;i<labels.length;i++){
   const item=row.work[i];only(item,['label','id']);if(item.label!==labels[i]||!text(item.id))fail();
   if(kind==='news'&&i<labels.length-1&&!integer(item.id))fail();
  }
  if(kind==='youtube'){
   if(!/^yt_[a-f0-9]{24}$/.test(row.id)||row.work[0].id!==row.id||!/^[a-f0-9]{40}$/.test(row.work[1].id)||!sha.test(row.work[2].id)
    ||typeof row.complete!=='boolean'||typeof row.delivered!=='boolean'||row.generation!==null||row.collector_events?.length!==0)fail();
  }else if(!/^news-card-[1-9][0-9]{0,15}$/.test(row.id)||row.complete!==null||row.delivered!==null)fail();
  for(const output of rows(row.outputs,100)){
   only(output,['id','artifact_id','sha256','verification'],['hosted_binding','export_source_commit']);
   if(!text(output.id))fail();
   if(kind==='youtube'){
    if(!text(output.artifact_id)||!['verified','unverified'].includes(output.verification)
     ||output.sha256!==null&&!sha.test(output.sha256)||output.verification==='verified'&&output.sha256===null||'export_source_commit' in output)fail();
   }else{
    if(row.id!=='news-card-'+output.id)fail();
    if(output.verification==='recorded'){
     if(output.artifact_id!==null||output.sha256!==null||'export_source_commit' in output)fail();
    }else if(output.verification!=='verified'||output.artifact_id!==row.id||!sha.test(output.sha256)
     ||typeof output.export_source_commit!=='string'||!/^[a-f0-9]{40}$/.test(output.export_source_commit))fail();
   }
   if('hosted_binding' in output){
    const b=output.hosted_binding;only(b,['resource_id','catalog_sha256','catalog_version_id','content_sha256','version_id']);
    const version=v=>typeof v==='string'&&/^[A-Za-z0-9._~+-]{1,200}$/.test(v)&&v!=='null';
    if(output.verification!=='verified'||!data.output_links_sha256
     ||typeof b.resource_id!=='string'||!/^[a-z][a-z0-9._-]{2,159}$/.test(b.resource_id)||!sha.test(b.catalog_sha256)
     ||b.content_sha256!==output.sha256||!version(b.catalog_version_id)||!version(b.version_id))fail();
   }
  }
  if(kind==='news'&&row.outputs.length!==1)fail();
  let session=null;
  for(const event of rows(row.collector_events,20)){
   only(event,['id','session_id','type','is_error']);
   if(!text(event.id)||event.session_id!=='dna-local-'+row.work[0].id||session!==null&&event.session_id!==session
    ||!['tool_call','tool_result'].includes(event.type)||event.is_error!==null&&typeof event.is_error!=='boolean')fail();
   session=event.session_id;
  }
  if(kind==='news'){
   const g=row.generation;
   only(g,['id','scope','provider','model','input_tokens','output_tokens','cache_read_tokens','total_tokens','cost_usd','duration_ms']);
   if(g.scope!=='generation'||g.id!==row.work[5].id||!text(g.provider,120)||!text(g.model,120)
    ||['input_tokens','output_tokens','cache_read_tokens','total_tokens','cost_usd','duration_ms'].some(k=>!numeric(g[k])))fail();
  }
 }
 return data;
}
