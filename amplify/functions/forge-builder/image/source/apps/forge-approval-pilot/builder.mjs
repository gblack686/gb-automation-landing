// Local operator adapter. Reuses the canonical approval service; no second gate machine.
import {readFile, writeFile, mkdir, realpath} from 'node:fs/promises';
import {join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {python} from './adapters.mjs';
import {validateRoutes} from '../../supabase/functions/human-approval-action/forge.mjs';
import {createVoice} from './voice.mjs';

const repo=fileURLToPath(new URL('../../',import.meta.url));
export const fields=['problem','audience','data_access','output','success'];
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const clone=x=>structuredClone(x);
const secret=/(?:sk-[A-Za-z0-9_-]{16,}|msy_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN .*PRIVATE KEY-----|(?:api[_ -]?key|password|access[_ -]?token)\s*[:=]\s*\S{8,})/i;
export function validateAnswers(answers) {
  if(!answers||Object.keys(answers).sort().join()!==[...fields].sort().join())throw Error('invalid_intake_fields');
  const clean={};
  for(const field of fields){
    const a=answers[field];
    if(!a||Object.keys(a).some(k=>!['value','status','source'].includes(k))||typeof a.value!=='string'||a.value.length>3000||
       !['not_covered','in_progress','captured','needs_clarification','skipped'].includes(a.status)||!['written','voice','existing_profile'].includes(a.source))throw Error('invalid_intake_answer');
    if(a.status==='captured'&&(!a.value.trim()||/^(?:i.?m not sure|unknown|not sure|skip)$/i.test(a.value.trim())))throw Error('answer_needs_clarification');
    if(secret.test(a.value))throw Error('credential_shaped_answer');
    clean[field]={value:a.value.trim(),status:a.status,source:a.source};
  }
  return clean;
}

export async function createBuilder({store,service,adapters,config,dataRoot,profilePath,visualsPath,voiceOptions={},
  voiceFactory=createVoice,principal={role:'operator',actor:'greg'},runPython=python,approvalContext='local_pilot_only'}) {
  if(principal?.role!=='operator'||typeof principal.actor!=='string'||!principal.actor||principal.actor.length>200)throw Error('builder_operator_required');
  if(!config.pilot||config.agent!=='artist-packet-expert')throw Error('builder_requires_local_artist_pilot');
  if(!['local_pilot_only','hosted_worker'].includes(approvalContext))throw Error('approval_context_invalid');
  const profile=JSON.parse(await readFile(profilePath,'utf8'));
  if(profile.config.agent_id!==config.agent||profile.planning?.tenant_id!==config.tenant)throw Error('builder_profile_scope_mismatch');
  const metadata=JSON.parse(await runPython(join(repo,'apps/forge-approval-pilot/builder_profile.py'),[profilePath]));
  const binding=metadata.scope,id='draft_'+hash(binding).slice(0,24);
  const root=join(dataRoot,'builder');await mkdir(root,{recursive:true});await writeFile(join(root,'.forge-builder'),'local-review-only');
  const visuals=visualsPath?JSON.parse(await readFile(visualsPath,'utf8')):null;
  if(visuals&&(visuals.tenant_id!==binding.tenant_id||visuals.agent_id!==binding.agent_id))throw Error('visual_owner_mismatch');
  await store.db.exec(`create table if not exists pilot_builder_drafts(id text primary key,version integer not null,body jsonb not null);
    create table if not exists pilot_builder_packets(id text primary key,draft_id text not null,draft_version integer not null,body jsonb not null);
    create table if not exists pilot_builder_voice(id text primary key,draft_id text not null,created_at timestamptz not null default now());`);
  const initial={id,version:1,binding,answers:Object.fromEntries(fields.map(k=>[k,{value:'',status:'not_covered',source:'written'}])),workflow_id:null,packet:null};
  // Reuse sourced profile assertions without inventing answers to missing questions.
  initial.answers.problem={value:profile.config.purpose,status:'captured',source:'existing_profile'};
  if(profile.audience)initial.answers.audience={value:profile.audience,status:'captured',source:'existing_profile'};
  await store.db.query('insert into pilot_builder_drafts values($1,$2,$3) on conflict do nothing',[id,1,JSON.stringify(initial)]);
  const voice=voiceFactory({store,draftId:id,...voiceOptions});
  const draft=async()=>clone((await store.db.query('select body from pilot_builder_drafts where id=$1',[id])).rows[0].body);
  async function persist(d,previous){
    const r=await store.db.query('update pilot_builder_drafts set version=$1,body=$2 where id=$3 and version=$4 returning id',[d.version,JSON.stringify(d),id,previous]);
    if(!r.rows.length)throw Error('version_conflict');
  }
  async function read(){
    const d=await draft(),w=d.workflow_id?await service.workflow(d.workflow_id):null;
    return {draft:d,voice:voice.status(),visuals:visuals?Object.fromEntries(['card','model'].filter(k=>visuals[k]).map(k=>[k,'/api/forge/builder/visual/'+k])):{},
      workflow:w?{workflow_id:w.workflow_id,gate:w.gate,state:w.state,revision:w.revision,
        documents:w.documents,scope_version:w.scope_version,plan_version:w.plan_version}:null,
      mode:'local_pilot',name:profile.config.display_name};
  }
  const command=(name,input)=>service.handle({mode:'forge.command',command:name,input},principal);
  async function handle(body){
    if(!body||JSON.stringify(body).length>25000||!body.binding||Object.keys(body.binding).length!==Object.keys(binding).length||
      Object.entries(binding).some(([key,value])=>body.binding[key]!==value))throw Error('builder_scope_mismatch');
    if(body.action==='read')return read();
    const d=await draft();
    if(body.version!==d.version)throw Error('version_conflict');
    if(body.action==='save'){
      const answers=validateAnswers(body.answers);
      if(JSON.stringify(answers)===JSON.stringify(d.answers))return read();
      // An edited brief cannot inherit an old gate or package. Preserve its old audit.
      const previous=d.version;d.answers=answers;d.version++;d.workflow_id=null;d.packet=null;
      await persist(d,previous);return read();
    }
    if(body.action==='voice')return voice.start(body.confirmed===true);
    if(body.action==='propose'){
      if(body.confirmed!==true||fields.some(k=>d.answers[k].status!=='captured'))throw Error('complete_reviewed_intake_required');
      if(!d.workflow_id){
        const proposal='prop_builder_'+hash({id,version:d.version,answers:d.answers}).slice(0,24);
        await store.seed(proposal,config.tenant);
        await store.db.query('update agent_os_proposals set card_title=$1 where proposal_id=$2',[profile.config.display_name+' configuration',proposal]);
        await command('register',{proposal_id:proposal,client_id:'Internal review',project_id:config.agent});
        d.workflow_id='fw_'+proposal;await persist(d,d.version);
      }
      return read();
    }
    if(!d.workflow_id)throw Error('proposal_required');
    const w=await service.workflow(d.workflow_id),doc=service.activeDocument(w);
    if(body.workflow_id!==w.workflow_id||body.workflow_revision!==w.revision)throw Error('workflow_version_conflict');
    if(body.action==='accept'){
      await command('accept',{workflow_id:w.workflow_id});
      const after=await service.workflow(w.workflow_id);
      if(after.gate==='scope'&&after.state==='draft')await command('scope',{workflow_id:w.workflow_id,document:{
        outcome:d.answers.problem.value,deliverables:[{id:'expert-package',title:d.answers.output.value}],
        acceptance:[{id:'reviewed-result',title:d.answers.success.value}],
        exclusions:['production activation','external publication','client email','new repository creation'],
        repositories:['gbautomation'],environment:'local',reviewer:'greg',client_recipient:'client',
        dependencies:[{id:d.id,version:d.version,sha256:hash(d.answers),audience:d.answers.audience.value,data_access:d.answers.data_access.value}]}});
      await adapters.drain(service);return read();
    }
    if(body.action==='decide'){
      if(body.confirmed!==true||!doc||body.document_sha256!==doc.sha256)throw Error('exact_document_confirmation_required');
      if(!['approve','revise','decline','snooze'].includes(body.decision))throw Error('unknown_decision');
      const token=await service.mint(w.workflow_id,'operator');
      await service.handle({mode:'forge.decide',capability:token.capability,action:body.decision,
        confirmed:true,note:'Expert Config Builder local walkthrough',snooze_until:body.snooze_until});
      await adapters.drain(service);return read();
    }
    if(body.action==='generate'){
      if(w.gate!=='plan'||w.state!=='approved')throw Error('approved_plan_required');
      const scope=w.documents.find(x=>x.gate==='scope'&&x.version===w.scope_version);
      const lineage=scope?.body.dependencies?.find(x=>x.id===d.id);
      if(lineage?.version!==d.version||lineage.sha256!==hash(d.answers))throw Error('intake_approval_mismatch');
      validateRoutes(doc,await adapters.readArtifacts(doc));
      const release=await service.handle({mode:'forge.command',command:'release',input:{workflow_id:w.workflow_id,binding:doc.body.binding}},{role:'coordinator',actor:'pilot-coordinator'});
      const output=JSON.parse(await runPython(join(repo,'apps/forge-approval-pilot/generate_packet.py'),[],{
        root,profile:profilePath,draft:{...d,packet:null},release,visuals,approval_context:approvalContext,
        prior_archive_sha256:d.packet?.archive_sha256}));
      const packet={packet_id:output.packet_id,files:output.manifest.files.length,archive_sha256:output.archive_sha256,
        url:'/api/forge/builder/packets/'+output.packet_id+'/index.html',download:'/api/forge/builder/packets/'+output.packet_id+'.zip'};
      await store.db.query('insert into pilot_builder_packets values($1,$2,$3,$4) on conflict do nothing',[packet.packet_id,id,d.version,JSON.stringify(output)]);
      d.packet=packet;await persist(d,d.version);return read();
    }
    throw Error('unknown_builder_action');
  }
  async function file(path){
    const match=/^\/api\/forge\/builder\/packets\/([a-f0-9]{64})(?:\.zip|\/(.+))$/.exec(path);
    if(!match)throw Error('packet_path_denied');
    const result=await store.db.query('select body from pilot_builder_packets where id=$1 and draft_id=$2',[match[1],id]);
    const record=result.rows[0]?.body;if(!record)throw Error('packet_not_found');
    const name=match[2],row=name==='packet-manifest.json'?null:record.manifest.files.find(f=>f.path===name);
    if(name&&!row&&name!=='packet-manifest.json')throw Error('packet_path_denied');
    const base=await realpath(join(root,'packets')),target=await realpath(name?join(base,match[1],name):join(base,match[1]+'.zip'));
    if(!target.startsWith(base+sep))throw Error('packet_path_denied');
    const bytes=await readFile(target);
    if((!name&&hash(bytes)!==record.archive_sha256)||(row&&hash(bytes)!==row.sha256)||
      (name==='packet-manifest.json'&&!isDeepStrictEqual(JSON.parse(bytes),record.manifest)))throw Error('packet_bytes_changed');
    return {bytes,name:name||'expert-package.zip'};
  }
  async function visual(name){
    if(!['card','model'].includes(name)||!visuals?.[name])throw Error('visual_unavailable');
    const bytes=await readFile(resolve(visuals[name].path));if(hash(bytes)!==visuals[name].sha256)throw Error('visual_bytes_changed');
    return {bytes,name:name==='card'?'card.png':'model.glb'};
  }
  return {handle,file,visual,binding,read};
}
