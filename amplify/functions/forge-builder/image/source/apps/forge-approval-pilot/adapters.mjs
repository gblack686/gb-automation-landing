import {spawn} from 'node:child_process';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {deliverReview, sha256, boundedPlan} from '../../supabase/functions/human-approval-action/forge.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
export function python(script, args=[], input=null) {
  return new Promise((resolvePromise,reject)=>{
    const child=spawn(process.env.PYTHON||'python',[script,...args],{cwd:root,windowsHide:true,
      env:{...process.env,PYTHONIOENCODING:'utf-8',PLAN_PUBLISH_BACKEND:'off',AGENT_OS_CONTRACT_PERSISTENCE:'off'}});
    let out='',err='';const timer=setTimeout(()=>child.kill(),60000);
    child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
    child.on('error',reject);child.on('close',code=>{clearTimeout(timer);if(code!==0)reject(Error('local_adapter_failed: '+err.slice(-1500)));else resolvePromise(out);});
    child.stdin.end(input===null?'':JSON.stringify(input));
  });
}

export async function createAdapters({store,config,dataRoot,runPython=python}) {
  const mirror=join(dataRoot,'mirror'),mailRoot=join(dataRoot,'mail');
  await mkdir(mirror,{recursive:true});await mkdir(mailRoot,{recursive:true});await writeFile(join(mirror,'.forge-pilot'),'local-only');
  await store.db.exec(`create table if not exists pilot_artifact_index(kind text not null,artifact_id text primary key,record jsonb not null);
    create table if not exists pilot_task_receipts(workflow_id text,plan_version integer,receipt jsonb,primary key(workflow_id,plan_version));`);
  const fileFor=path=>{
    const target=resolve(mirror,path);
    if(!path.startsWith('second-brain/')||path.includes('..')||/[\\:%?#\x00-\x1f]/.test(path))throw Error('artifact_path_denied');
    return target;
  };
  async function readArtifacts(document) {
    const rows=[];
    for(const a of document.body.artifacts) {
      const result=await store.db.query('select record from pilot_artifact_index where artifact_id=$1 and kind=$2',[a.artifact_id,a.kind]);
      const record=result.rows[0]?.record;if(!record)throw Error('artifact_index_missing');
      const bytes=await readFile(fileFor(record.path));
      if(await sha256(bytes)!==record.file_sha256)throw Error('artifact_bytes_changed');
      rows.push({...record,index_readback:true});
    }
    return rows;
  }
  async function plan(service,workflowId) {
    const w=await service.workflow(workflowId),s=w.documents.find(d=>d.gate==='scope'&&d.version===w.scope_version);
    let body=service.activeDocument(w)?.body;
    if(w.gate!=='plan'||w.state==='changes_requested') {
      if(!s)throw Error('approved_scope_required');
      const event=w.events.find(e=>e.gate==='scope'&&e.document_version===s.version&&e.authorizing&&['approve','auto_approve'].includes(e.action));
      if(!event)throw Error('scope_decision_missing');
      const generated=JSON.parse(await runPython(fileURLToPath(new URL('./artifacts.py',import.meta.url)),[],{root:mirror,workflow:w,scope:s,scope_event:event.event_id,
        engineering:config.engineering,intake_record_id:randomUUID(),plan_version:w.plan_version+1}));
      for(const a of generated.artifacts) {
        const native={intake:'agent_os_contract_records',plan:'prd_artifacts',architecture:'architecture_artifacts'}[a.kind];
        await store.db.query(`insert into public.${native} values($1) on conflict do nothing`,[a.artifact_id]);
        await store.db.query('insert into pilot_artifact_index values($1,$2,$3) on conflict(artifact_id) do nothing',[a.kind,a.artifact_id,JSON.stringify(a)]);
      }
      const hash=kind=>generated.artifacts.find(a=>a.kind===kind).sha256;
      body={tenant:config.tenant,scope_sha256:s.sha256,intake_id:generated.intake_id,outcome:s.body.outcome,
        deliverable_ids:s.body.deliverables.map(d=>d.id||d),acceptance_ids:s.body.acceptance.map(d=>d.id||d),
        binding:{...config.engineering,plan_sha256:hash('plan'),architecture_sha256:hash('architecture'),
          architecture_approved_candidate_sha256:generated.architecture_approved_candidate_sha256,
          phases:[0,1],excluded_actions:s.body.exclusions,targets:['pilot-'+w.workflow_id+'-v'+(w.plan_version+1)]},
        limits:{repositories:s.body.repositories,environments:[s.body.environment],operations:['code','test','docs'],cost:0},artifacts:generated.artifacts};
      await service.handle({mode:'forge.command',command:'plan',input:{workflow_id:workflowId,document:body}},{role:'builder',actor:'pilot-builder'});
    }
    const current=await service.workflow(workflowId);
    if(current.state==='validation_pending')await service.handle({mode:'forge.validate',workflow_id:workflowId,passed:true,
      // Fixture semantics: copy only the approved identifiers into a non-executing plan.
      scope_conforms:body.outcome===s.body.outcome&&body.deliverable_ids.length===s.body.deliverables.length&&body.acceptance_ids.length===s.body.acceptance.length},
      {role:'validator',actor:'pilot-validator'});
    const after=await service.workflow(workflowId);
    if(after.state==='review'&&!after.grant_revoked&&boundedPlan(s,body,after.grant_data).within)
      await service.handle({mode:'forge.command',command:'delegate',input:{workflow_id:workflowId}},{role:'coordinator',actor:'pilot-coordinator'});
    return {plan_version:(await service.workflow(workflowId)).plan_version,fixture:true};
  }
  async function transport(message) {
    // Raw capabilities exist only in this private local mail fixture, never in receipts.
    const path=join(mailRoot,message.correlation_id+'.json');
    await writeFile(path,JSON.stringify({...message,channel:'fixture',created_at:new Date().toISOString()}),{flag:'wx'});
    return {channel:'fixture',message_id:'fixture:'+message.correlation_id};
  }
  async function mailbox() {
    return Promise.all((await readdir(mailRoot)).filter(n=>/^[a-f0-9-]+\.json$/.test(n)).map(async n=>JSON.parse(await readFile(join(mailRoot,n),'utf8'))));
  }
  async function drain(service) {
    const principal={role:'coordinator',actor:'pilot-coordinator'};
    const job=(command,input)=>service.handle({mode:'forge.job',command,input},principal);
    const outcomes=[];
    await job('wake',{});
    for(let i=0;i<30;i++) {
      const item=await job('claim',{});if(!item)break;
      let result,state='delivered';
      try {
        if(item.kind==='review_email')result=await deliverReview(service,item,{transport,allowlist:[config.operator,config.client],...config});
        else if(item.kind==='generate_plan')result=await plan(service,item.workflow_id);
        else {
          const w=await service.workflow(item.workflow_id),d=service.activeDocument(w);
          await readArtifacts(d);
          if(d.body.binding.base_commit!==config.engineering.base_commit)throw Error('source_baseline_changed');
          const release=await service.handle({mode:'forge.command',command:'release',input:{workflow_id:w.workflow_id,binding:d.body.binding}},principal);
          result=JSON.parse(await runPython(fileURLToPath(new URL('./resume-fixture.py',import.meta.url)),[],{root:dataRoot,release}));
          await store.db.query('insert into pilot_task_receipts values($1,$2,$3) on conflict do nothing',[w.workflow_id,w.plan_version,JSON.stringify(result)]);
        }
      } catch(e) {
        state=item.kind==='review_email'?'ambiguous':'failed';
        result={error:/^[a-z_]+$/.test(e.message)?e.message:'adapter_failed',fixture:true};
      }
      await job('finish',{outbox_id:item.outbox_id,lease_id:item.lease_id,state,result});
      outcomes.push({kind:item.kind,state,result});
    }
    return outcomes;
  }
  return {readArtifacts,plan,drain,mailbox,fileFor};
}
