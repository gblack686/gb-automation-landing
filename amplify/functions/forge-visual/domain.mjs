import {createHash} from 'node:crypto';
import {authenticate, TENANT, EXPERT, CONFIG_SHA} from '../forge-atlas/contract.mjs';

export const ROOT = `${TENANT}/${EXPERT}/visuals`;
export const STAGES = ['portrait','agent_card','character','master','web'];
export const stagesFor = job => job.pipeline_version===2?STAGES:STAGES.filter(s=>s!=='agent_card');
export const QUOTES = Object.freeze({portrait:'flare-low-portrait-v1',agent_card:'flare-low-full-card-v1',character:'flare-low-character-v1',master:'meshy6-4k-30-v1',web:'meshy-remesh-5-v1'});
export const digest = value => createHash('sha256').update(value).digest('hex');
export class VisualError extends Error {}
export const fail = code => {throw new VisualError(code);};
export const runID = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
export const stateKey = id => {if(!runID(id))fail('invalid_request');return `${ROOT}/runs/${id}/state.json`;};
export const assetKey = (job,role) => `${ROOT}/runs/${job.id}/${role}.${['master','web','remesh'].includes(role)?'glb':role==='manifest'?'json':['card','source_card'].includes(role)?'jpg':'png'}`;
const object = x => x && typeof x==='object' && !Array.isArray(x);
const text = (v,max) => typeof v==='string' && v.trim() && v.length<=max && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v);
export function requestFor(event,issuer) {
 const claims=authenticate(event,issuer);
 const write=event.typeName==='Mutation' && event.fieldName==='forgeVisualCommand';
 if(!write && !(event.typeName==='Query'&&event.fieldName==='forgeVisualRead'))fail('invalid_request');
 if(Object.keys(event.arguments||{}).join()!=='input')fail('invalid_request');
 let input=event.arguments.input;
 if(typeof input==='string'){try{input=JSON.parse(input);}catch{fail('invalid_request');}}
 if(!object(input)||JSON.stringify(input).length>16000||Object.keys(input).some(k=>!['action','id','revision','stage','sha256','quote','brief','decision','card_text'].includes(k)))fail('invalid_request');
 if(!(write?['create','start','review','adopt','resume','card_text']:['list','get','asset','active','packet']).includes(input.action))fail('invalid_request');
 const operator=claims['cognito:groups'].includes('forge-visual-operator');
 if(write&&!operator)fail('operator_access_required');
 if(!['list','active'].includes(input.action)&&!runID(input.id))fail('invalid_request');
 return {input,actor:claims.sub,operator};
}
export function normalizeBrief(brief) {
 if(!object(brief)||brief.kind!=='agent-card-forge.visual-brief'||brief.version!==1
  ||brief.expert?.tenant_id!==TENANT||brief.expert?.expert_id!==EXPERT||brief.intake?.config_sha256!==CONFIG_SHA)fail('wrong_expert_or_revision');
 if(!text(brief.expert.display_name,100)||!text(brief.expert.purpose,1200)||brief.card?.selection?.status!=='selected'||!runID(brief.card.scryfall_id)
  ||!Number.isInteger(brief.card.face_index)||brief.card.face_index<0||brief.card.face_index>1)fail('invalid_brief');
 if(!['action','standing','casting'].includes(brief.direction?.pose)||!['detailed painted tabletop miniature','stylized painterly character','realistic sculpted collectible'].includes(brief.direction?.finish)
  ||brief.direction.operator_notes!=null&&(!text(brief.direction.operator_notes,1200)))fail('invalid_brief');
 if(!Number.isInteger(brief.generation?.proposed_credit_cap)||brief.generation.proposed_credit_cap<35||brief.generation.proposed_credit_cap>1000)fail('credit_cap_too_small');
 // Identity is pinned by the deployed workspace; URLs, paths, approvals and actor claims from the browser are never trusted.
 return {kind:brief.kind,version:1,expert:{tenant_id:TENANT,expert_id:EXPERT,config_sha256:CONFIG_SHA,display_name:'Artist Packet Expert',purpose:'Turn artist briefs and approved media into branded HTML packets.'},
  card:{scryfall_id:brief.card.scryfall_id,face_index:brief.card.face_index},direction:{pose:brief.direction.pose,finish:brief.direction.finish,operator_notes:brief.direction.operator_notes||''},credit_cap:35};
}
export function newJob(id,brief,actor,now) {
 const normalized=normalizeBrief(brief);
 return {schema:'forge-visual-job.v1',pipeline_version:2,id,tenant_id:TENANT,expert_id:EXPERT,config_sha256:CONFIG_SHA,revision:0,created_at:now,updated_at:now,created_by:actor,
  brief:normalized,brief_sha256:digest(JSON.stringify(normalized)),status:'draft',stage:'portrait',assets:{},stages:{},events:[{action:'created',actor,at:now}],release:'not_requested'};
}
export function assertJob(job,id=job?.id){
 if(!job||job.schema!=='forge-visual-job.v1'||job.id!==id||!runID(id)||job.tenant_id!==TENANT||job.expert_id!==EXPERT||job.config_sha256!==CONFIG_SHA)fail('wrong_expert_or_revision');
 for(const [role,a] of Object.entries(job.assets||{}))if(!['card','source_card','agent_card','portrait','character','master','remesh','web'].includes(role)||a.key!==assetKey(job,role)||!/^[a-f0-9]{64}$/.test(a.sha256))fail('artifact_routing_failed');
 return job;
}
export const inputHash = (job,stage) => stage==='agent_card'?digest(JSON.stringify({source_card:job.assets.source_card?.sha256,portrait:job.assets.portrait?.sha256,text:job.card_text})):stage==='portrait'?job.brief_sha256:job.assets[{character:'portrait',master:'character',web:'master'}[stage]]?.sha256;
export function normalizeCardText(value){
 const limits={title:100,mana_cost:80,creature_type:180,abilities:1200,quote:300,power:16,toughness:16};
 if(!object(value)||Object.keys(value).some(k=>!(k in limits)))fail('invalid_card_text');
 const result={};for(const [key,max] of Object.entries(limits)){
  const v=value[key];if(typeof v!=='string'||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))fail('invalid_card_text');result[key]=v.trim();
 }
 if(!result.title||!result.creature_type||!result.abilities||Boolean(result.power)!==Boolean(result.toughness))fail('invalid_card_text');
 return result;
}
export const defaultCardText = job => ({title:job.brief.expert.display_name,mana_cost:job.assets.card?.printing?.mana_cost||'',creature_type:job.assets.card?.printing?.type_line||'Creature — Advisor',abilities:'Curate — Gather an artist’s approved media into a branded packet.\nPresent — Turn a brief into a clear, shareable story.',quote:'Every artist has a story. Give it a worthy frame.',power:job.assets.card?.printing?.power||'',toughness:job.assets.card?.printing?.toughness||''});
export function transition(job,input,actor,now) {
 assertJob(job,input.id);
 if(input.revision!==job.revision)fail('stale_revision');
 const next=structuredClone(job), stage=input.stage, current=next.stages[stage];
 const pipeline=stagesFor(job);
 if(input.action==='card_text'){
  if(job.pipeline_version!==2||job.stage!=='agent_card'||job.status!=='draft'||job.stages.agent_card)fail('stage_not_ready');
  next.card_text=normalizeCardText(input.card_text);next.card_text_confirmed={actor,at:now,sha256:digest(JSON.stringify(next.card_text))};
 } else if(input.action==='start') {
  if(!pipeline.includes(stage)||stage!==job.stage||job.status!=='draft'||current)fail('stage_not_ready');
  const previous=pipeline[pipeline.indexOf(stage)-1];
  if(previous&&job.stages[previous]?.review?.decision!=='approve')fail('review_required');
  if(stage==='agent_card'&&(!job.assets.source_card||!job.assets.portrait||job.card_text_confirmed?.sha256!==digest(JSON.stringify(job.card_text))))fail('card_text_review_required');
  if(input.quote!==QUOTES[stage]||input.sha256!==inputHash(job,stage))fail('approval_binding_changed');
  const credits=stage==='master'?30:stage==='web'?5:0;
  const reserved=Object.values(job.stages).reduce((sum,s)=>sum+Math.max(s.reserved_credits||0,s.actual_credits||0),0);
  if(reserved+credits>job.brief.credit_cap)fail('credit_cap_exceeded');
  next.stages[stage]={status:'queued',attempts:1,input_sha256:input.sha256,reserved_credits:credits,approval:{actor,at:now,quote:input.quote,attempt_limit:1},actual_credits:null};
  next.status='queued';
 } else if(input.action==='review') {
  if(stage!==job.stage||job.status!=='review'||!['approve','reject'].includes(input.decision)||input.sha256!==job.assets[stage]?.sha256)fail('review_binding_changed');
  current.review={decision:input.decision,sha256:input.sha256,actor,at:now};
  if(input.decision==='reject'){next.status='rejected';current.status='rejected';}
  else {current.status='approved'; const following=pipeline[pipeline.indexOf(stage)+1];next.stage=following||stage;next.status=following?'draft':'ready';}
 } else if(input.action==='resume') {
  if(!['queued','working','running','poll_error','outcome_unknown','needs_optimization'].includes(job.status))fail('resume_not_available');
  // Resuming never creates another provider task. A lost submission remains held.
 } else fail('invalid_request');
 next.revision++;next.updated_at=now;next.events.push({action:input.action,stage,decision:input.decision||null,actor,at:now});
 return next;
}
export function publicJob(job){
 assertJob(job);
 return {...structuredClone(job),next_input_sha256:inputHash(job,job.stage)};
}
