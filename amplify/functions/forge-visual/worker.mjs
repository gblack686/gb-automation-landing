import {assertJob,stagesFor,defaultCardText,VisualError} from './domain.mjs';
import {deriveAvatarIcons} from './avatar-icons.mjs';

// Durable state is written BEFORE each billable submission. SQS delivery is at
// least once; a delivery retry may poll/recover, but never repeats a paid POST.
export function makeWorker({store,queue,providers,optimize,deriveIcons=deriveAvatarIcons,now=()=>new Date().toISOString()}) {
 return async id=>{
  let record=await store.get(id);if(!record)return;
  let job=assertJob(record.value,id),stage=job.stage;
  if(!stagesFor(job).includes(stage)||['draft','review','ready','rejected','failed'].includes(job.status))return;
  const save=async()=>{job.revision++;job.updated_at=now();await store.put(job,record.etag);record=await store.get(id);job=record.value;};
  const finish=async(asset,receipt={})=>{
   job.assets[stage]=asset;
   // Recovery also enters here: derivation can resume without another paid POST.
   if(stage==='portrait'&&job.output_version===2){
    for(const icon of await deriveIcons(await store.bytes(job,'portrait'))){
     const found=await store.recover(job,icon.role,asset.sha256);
     job.assets[icon.role]={...(found||await store.output(job,icon.role,icon.bytes,asset.sha256)),width:icon.size,height:icon.size,derivation:'centre-square-lanczos3-v1'};
    }
    receipt={...receipt,derived_avatars:['avatar32','avatar64','avatar128'].map(role=>({role,...job.assets[role]}))};
   }
   job.assets[stage]=asset;job.stages[stage].status='review';job.status='review';job.stages[stage].completed_at=now();
   job.stages[stage].receipt=receipt;delete job.stages[stage].error;
   await store.receipt(job,stage,{schema:'forge-visual-generation-receipt.v1',tenant_id:job.tenant_id,expert_id:job.expert_id,config_sha256:job.config_sha256,run_id:id,stage,input_sha256:job.stages[stage].input_sha256,artifact:asset,...receipt});
   await save();
  };
  try {
   if(job.status==='working'&&Date.parse(now())-Date.parse(job.stages[stage].lease_at)<300000){await queue(id,60);return;}
   if(['queued','preflight_failed'].includes(job.status)){
    job.status='working';job.stages[stage].status='preparing';job.stages[stage].lease_at=now();await save();
    await providers.preflight(stage);
    let input;
    if(stage==='portrait'){
     let card=await store.recover(job,'card',job.brief_sha256);
     let full=job.pipeline_version===2?await store.recover(job,'source_card',job.brief_sha256):null;
     if(!card||!card.printing||job.pipeline_version===2&&!full){
      const source=await providers.card(job.brief);
      if(!card)card=await store.output(job,'card',source.bytes,job.brief_sha256);
      card.printing=source.metadata;
      if(job.pipeline_version===2&&!full)full=await store.output(job,'source_card',source.full,job.brief_sha256);
     }
     job.assets.card=card;if(full)job.assets.source_card=full;
     if(job.pipeline_version===2&&!job.card_text)job.card_text=defaultCardText(job);
     await save();input=await store.bytes(job,'card');
    } else if(stage==='agent_card'){
     input={source_card:await store.bytes(job,'source_card'),portrait:await store.bytes(job,'portrait')};
    } else if(stage==='character'||stage==='master')input=await store.bytes(job,stage==='character'?'portrait':'character');
    else if(!job.stages.master.task_id)throw Error('Missing parent task');
    job.stages[stage].status='submitting';job.stages[stage].submitted_at=now();job.stages[stage].lease_at=now();await save();
    if(['portrait','agent_card','character'].includes(stage)){
     const result=await providers.image(job,stage,input),asset=await store.output(job,stage,result.bytes,job.stages[stage].input_sha256);
     await finish(asset,result.receipt);return;
    }
    const task=await providers.meshSubmit(job,stage,input);
    job.stages[stage].task_id=task;job.stages[stage].status='running';job.status='running';await save();await queue(id,60);return;
   }
   if(!job.stages[stage].task_id){
    if(!job.stages[stage].submitted_at){job.status='preflight_failed';job.stages[stage].status='preflight_failed';await save();return;}
    // Includes process death after S3 upload but before the final state write.
    const asset=await store.recover(job,stage,job.stages[stage].input_sha256);
    if(asset){await finish(asset,{recovered:true,usage:null});return;}
    job.status='outcome_unknown';job.stages[stage].status='outcome_unknown';job.stages[stage].error='Submission outcome unknown. Reconcile the provider task before any new generation.';await save();return;
   }
   job.status='working';job.stages[stage].lease_at=now();await save();
   const task=await providers.meshPoll(stage,job.stages[stage].task_id);
   job.stages[stage].actual_credits=task.credits;
   if(['FAILED','CANCELED','EXPIRED'].includes(task.status)){job.status='failed';job.stages[stage].status='failed';job.stages[stage].error='Provider task ended without a model. No automatic retry.';await save();return;}
   if(task.status!=='SUCCEEDED'){
    if(!['PENDING','IN_PROGRESS'].includes(task.status))throw Error('Unknown task status');
    job.status='running';job.stages[stage].status='running';job.stages[stage].progress=Math.min(100,Math.max(0,Number(task.progress)||0));
    if(Date.parse(now())-Date.parse(job.stages[stage].submitted_at)>7200000){job.status='poll_error';job.stages[stage].error='Polling paused after two hours. Resume checks the same provider task.';await save();return;}
    await save();await queue(id,60);return;
   }
   const role=stage==='master'?'master':'remesh';let asset=await store.recover(job,role,job.stages[stage].input_sha256);
   if(!asset){const bytes=await providers.meshDownload(task.url);asset=await store.output(job,role,bytes,job.stages[stage].input_sha256);}
   job.assets[role]=asset;
   if(stage==='web'){
    const result=await optimize(await store.bytes(job,'remesh'));job.stages.web.metrics=result.metrics;
    let web=await store.recover(job,'web',job.stages.web.input_sha256);
    if(!web)web=await store.output(job,'web',result.bytes,job.stages.web.input_sha256);
    job.assets.web=web;
    if(!result.metrics.passed){job.status='needs_optimization';job.stages.web.status='needs_optimization';job.stages.web.error='Web budget failed. Master retained; no extra provider charge authorized.';await save();return;}
    asset=web;
   }
   await finish(asset,{provider:'meshy',task_id:job.stages[stage].task_id,actual_credits:task.credits,metrics:job.stages[stage].metrics||null});
  }catch(error){
   if(error instanceof VisualError&&error.message==='stale_revision')return;
   const latest=await store.get(id);
   // Do not overwrite a concurrent worker's successful advancement.
   if(latest.etag!==record.etag)return;
   const s=job.stages[stage];
   job.status=s.task_id?'poll_error':s.submitted_at?'outcome_unknown':'preflight_failed';s.status=job.status;
   s.error=job.status==='poll_error'?'Task or download check failed. Resume reads the existing task.':job.status==='outcome_unknown'?'Submission outcome unknown. No automatic resubmission.':'Provider preflight failed. No generation was submitted.';
   await save();
  }
 };
}
