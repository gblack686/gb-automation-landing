import { createHash } from 'node:crypto';

export const EXPERT = 'artist-packet-expert';
// Tenant agent selection is validated against a server-owned registration list.
export const TENANT = 'gbautomation';
export const CONFIG_SHA = 'bf142e4e937a53701b4a27b02d90068ee0c8f73636f123dd97a56a661e3040e5';
export const YOUTUBE_CONFIG_SHA = '4e835524a45dacf2eb509b51809ca09ca2f805a28c57807acaf8a9eaba5389c7';
// The main operator Cognito subject is held as a digest, not an account ID in source.
export const MAIN_OPERATOR_SUBJECT_SHA = '1193744c59425c9c71db9516110593d3d9b697645fe99bf17c06f65abea449b8';
const agentSlug = /^[a-z][a-z0-9-]{2,62}$/;
// Cognito subjects use the UUID-shaped hex layout but do not promise RFC variant bits.
// The verified deployment issuer and tenant group provide authorization.
const cognitoSubject = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function operatorBootstrap(sub, allowedSub, mainSubjectSha = MAIN_OPERATOR_SUBJECT_SHA) {
 if (typeof sub !== 'string' || !cognitoSubject.test(sub) || !allowedSub
     || (sub !== allowedSub && createHash('sha256').update(sub.toLowerCase()).digest('hex') !== mainSubjectSha)) return null;
 return {source:'operator_bootstrap',agents:[
  {tenant_id:TENANT,agent_id:EXPERT,display_name:'Artist Packet Expert',config_sha256:CONFIG_SHA,subjects:[sub],status:'active'},
  {tenant_id:TENANT,agent_id:'youtube-intel',display_name:'YouTube Intelligence',config_sha256:YOUTUBE_CONFIG_SHA,subjects:[sub],status:'active'},
 ]};
}
class ReadError extends Error {}
const deny = code => { throw new ReadError(code); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const identity = value => typeof value === 'string' && value.length > 0 && value.length <= 512 && !/[\x00-\x1f\x7f]/.test(value);

export function authenticate(event, issuer) {
 const claims = event?.identity?.claims;
 if (!issuer || claims?.iss !== issuer || typeof claims?.sub !== 'string' || !cognitoSubject.test(claims.sub)) deny('authentication_required');
 if (!Array.isArray(claims['cognito:groups']) || !claims['cognito:groups'].includes('tenant-gbautomation')) deny('tenant_access_required');
 return claims;
}
export function requestFor(event, issuer) {
 const claims = authenticate(event, issuer);
 // Amplify's FunctionDirectiveStack forwards typeName/fieldName at the top level.
 if (event.typeName !== 'Query' || event.fieldName !== 'forgeAtlasRead' || Object.keys(event.arguments || {}).join() !== 'input') deny('invalid_request');
 let input = event.arguments.input;
 if (typeof input === 'string') { try { input = JSON.parse(input); } catch { deny('invalid_request'); } }
 if (!object(input) || JSON.stringify(input).length > 4096 || Object.keys(input).some(k => !['view','query','agent_id'].includes(k))
     || !['agents','document','atlas','planning','history','schedule','approvalSnapshot','proposals','proposal'].includes(input.view)
     || (input.agent_id !== undefined && !agentSlug.test(input.agent_id))
     || (input.view === 'agents' && input.agent_id !== undefined)) deny('invalid_request');
 const query = input.query || {};
 if (!object(query)) deny('invalid_request');
 if (!['history','schedule','proposals','proposal'].includes(input.view) && Object.keys(query).length) deny('invalid_request');
 if (input.view === 'schedule' && (Object.keys(query).join() !== 'date'
     || typeof query.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(query.date)
     || Number.isNaN(Date.parse(`${query.date}T12:00:00Z`)))) deny('invalid_request');
 if (input.view === 'proposals') {
  if (Object.keys(query).some(k => !['offset','search','state'].includes(k))
      || (query.offset !== undefined && (!Number.isSafeInteger(query.offset) || query.offset < 0 || query.offset > 100000))
      || (query.search !== undefined && (typeof query.search !== 'string' || query.search.length > 120 || /[\x00-\x1f\x7f]/.test(query.search)))
      || (query.state !== undefined && !['','gated','blocked','queued','approved','denied'].includes(query.state))) deny('invalid_request');
 }
 if (input.view === 'proposal' && (Object.keys(query).join() !== 'proposal_id'
     || typeof query.proposal_id !== 'string' || !/^prop_[a-z0-9_]{1,190}$/.test(query.proposal_id))) deny('invalid_request');
 if (input.view === 'history') {
  if (!['sessions','messages','traces'].includes(query.view) || Object.keys(query).some(k => !['view','session_key','message_key','after'].includes(k))) deny('invalid_request');
  for (const key of ['session_key','message_key','after']) if (Object.hasOwn(query,key) && !identity(query[key])) deny('invalid_request');
  if (query.view === 'sessions' && (query.session_key || query.message_key)) deny('invalid_request');
  if (query.view !== 'sessions' && !query.session_key) deny('invalid_request');
  if (query.view !== 'traces' && query.message_key) deny('invalid_request');
 }
 return {view:input.view,query,agent_id:input.agent_id || EXPERT,claims};
}

export function traceURL(url,id) {
 return typeof url === 'string' && /^https:\/\/(us\.cloud\.langfuse\.com|cloud\.langfuse\.com|eu\.cloud\.langfuse\.com)\/project\/[A-Za-z0-9_-]+\/traces\/[A-Za-z0-9_-]+$/.test(url)
  && url.split('/').at(-1) === id ? url : null;
}
const rows = (value, limit) => { if (!Array.isArray(value) || value.length > limit) throw Error('Invalid read'); return value; };
export function projectSchedule(raw, agent, profile, day) {
 if (!agentSlug.test(agent) || !agentSlug.test(profile) || raw?.schema_version !== 'gbauto-schedule.v1'
     || raw.timezone !== 'America/Los_Angeles' || raw.date !== day
     || !Number.isFinite(Date.parse(raw.generated_at)) || !object(raw.source_updated_at)
     || !Object.hasOwn(raw.source_updated_at,profile)) throw Error('Schedule source unavailable');
 const jobs = rows(raw.jobs,2000).filter(row => row?.scheduler === 'Hermes' && row.profile === profile);
 if (jobs.length > 200) throw Error('Schedule row limit exceeded');
 const selected=jobs.map(row => {
  if (!identity(row.id) || row.id.length > 160 || typeof row.name !== 'string' || row.name.length > 240
      || typeof row.schedule !== 'string' || row.schedule.length > 240
      || !['clock','relative'].includes(row.precision) || typeof row.enabled !== 'boolean'
      || !Array.isArray(row.times) || row.times.length > 1440
      || row.times.some(t => typeof t !== 'string' || !Number.isFinite(Date.parse(t)))) throw Error('Invalid schedule row');
  return {
   id:row.id,name:row.name,schedule:row.schedule,kind:String(row.kind||'').slice(0,240),
   precision:row.precision,state:String(row.state||'').slice(0,240),enabled:row.enabled,
   next_run_at:typeof row.next_run_at==='string'?row.next_run_at.slice(0,240):null,
   last_run_at:typeof row.last_run_at==='string'?row.last_run_at.slice(0,240):null,
   last_status:typeof row.last_status==='string'?row.last_status.slice(0,240):null,
   last_error:typeof row.last_error==='string'?row.last_error.slice(0,240):null,
   times:row.times,
  };
 });
 if (selected.reduce((count,row)=>count+row.times.length,0) > 5000) throw Error('Schedule occurrence limit exceeded');
 if (new Set(selected.map(row=>row.id)).size !== selected.length) throw Error('Duplicate schedule identity');
 return {schema_version:'forge-schedule.v1',agent_id:agent,profile,date:day,
  timezone:'America/Los_Angeles',captured_at:raw.generated_at,source:'Hermes profile jobs.json',
  coverage:'Exact expert Hermes profile jobs only; launchd and other schedulers remain in the fleet calendar',jobs:selected};
}
export function projectApprovalSnapshot(raw, agent, now = new Date().toISOString()) {
 const workflows = rows(raw,100).map(w => {
  if (!object(w) || w.tenant !== TENANT || w.agent_id !== agent
      || !identity(w.workflow_id) || !identity(w.title)
      || !['proposal','scope','plan'].includes(w.gate) || !identity(w.state)) throw Error('Invalid approval scope');
  return {
   workflow_id:w.workflow_id,title:w.title,gate:w.gate,state:w.state,
   client_id:typeof w.client_id === 'string' ? w.client_id : null,
   project_id:typeof w.project_id === 'string' ? w.project_id : null,
   proposal_id:typeof w.proposal_id === 'string' ? w.proposal_id : null,
   scope_version:Number.isSafeInteger(w.scope_version) ? w.scope_version : 0,
   plan_version:Number.isSafeInteger(w.plan_version) ? w.plan_version : 0,
   documents:[],artifacts:[],
   events:rows(w.events,200).map(e=>({role:e.role,action:e.action,created_at:e.created_at})),
   deliveries:rows(w.deliveries,100).map(d=>({kind:d.kind,recipient_role:d.recipient_role,state:d.state})),
   reminders:rows(w.reminders,100).map(r=>({recipient_role:r.recipient_role,wake_at:r.wake_at})),
   grant_data:null,grant_revoked:Boolean(w.grant_revoked)
  };
 });
 return {schema_version:'forge-approval-snapshot.v1',mode:'live_read_only',source:'supabase',
  tenant_id:TENANT,agent_id:agent,captured_at:now,workflows,engineering:null,recipient_options:[],
  connection:{source:'supabase',tenant:TENANT,agent,writes_enabled:false,email_enabled:false,execution_enabled:false,review_host:'web'}};
}
export function project(request, raw, now = new Date().toISOString()) {
 const agent = request.agent_id || EXPERT;
 if (request.view === 'history') {
  const q = request.query, key = {sessions:'session_key',messages:'message_key',traces:'trace_id'}[q.view];
  const page = rows(raw,51).slice(0,50).map(row => q.view === 'traces' ? {...row,langfuse_url:traceURL(row.langfuse_url,row.trace_id)} : row);
  if (page.some(row => !identity(row[key]))) throw Error('Invalid identity');
  return {schema_version:'forge-history-page.v1',source:'supabase',tenant_id:TENANT,agent_id:agent,
   view:q.view,session_key:q.session_key || null,message_key:q.message_key || null,rows:page,next:raw.length > 50 ? page.at(-1)[key] : null};
 }
 if (request.view === 'atlas') {
  const datasets = {};
  for (const name of ['traces','runs','sessions']) datasets[name] = rows(raw[name],200).map((row,index) => {
   const output = {row_key:`${name}-${index+1}`,observed_at:new Date(row.observed_at).toISOString()};
   for (const metric of ['tokens','cost','duration','events']) {
    const n = row[metric] === null ? NaN : Number(row[metric]); output[metric] = Number.isFinite(n) && n >= 0 ? n : null;
   }
   return output;
  });
  return {schema_version:'forge-atlas-snapshot.v1',source:'supabase',agent_id:agent,captured_at:now,days:90,limit_per_dataset:200,datasets};
 }
 const prds = rows(raw.prds,100).map(p => {
  const claims = [p.owner_expert,p.frontmatter?.owner_expert,p.metadata?.master_sheet_projection?.owner_expert,p.source_refs?.forge?.agent_id].filter(Boolean);
  if (p.client !== TENANT || !claims.length || claims.some(v => v !== agent)) throw Error('Invalid owner');
  const digest = p.source_refs?.forge?.config_sha256 || null;
  if (digest && !/^[a-f0-9]{64}$/.test(digest)) throw Error('Invalid lineage');
  const updated = [p.updated_at,p.file_mtime,p.indexed_at].find(v => v && Number.isFinite(Date.parse(v)));
  return {prd_id:p.prd_id,title:p.title,status:p.status || 'unknown',path:p.path,updated_at:updated ? new Date(updated).toISOString() : null,
   config_sha256:digest,source:'prd_artifacts',body_sha256:p.body_sha256};
 });
 const cards = rows(raw.cards,200);
 if (cards.some(c => !Array.isArray(c.prd_ids) || c.prd_ids.some(id => !prds.some(p => p.prd_id === id)))) throw Error('Invalid link');
 return {schema_version:'forge-planning-snapshot.v1',tenant_id:TENANT,agent_id:agent,board_slug:'gbautomation',config_sha256:request.config_sha256 || CONFIG_SHA,
  captured_at:now,source:'supabase',prds,cards,artifacts:[]};
}

export function makeHandler({issuer,rpc,document,proposals,schedule=async()=>{throw Error('Schedule source unavailable');},approvalSnapshot=async()=>{throw Error('Approval source unavailable');},registry=async claims=>[{
 tenant_id:TENANT,agent_id:EXPERT,display_name:'Artist Packet Expert',config_sha256:CONFIG_SHA,subjects:[claims.sub],status:'active'
}]}) {
 return async event => {
  try {
   const request = requestFor(event,issuer);
   const registered=await registry(request.claims);
   const entries=Array.isArray(registered)?registered:registered?.agents;
   const source=Array.isArray(registered)?'baseline':registered?.source;
   if(!Array.isArray(entries)||entries.length>100)deny('registry_unavailable');
   const visible=entries.filter(row=>row?.tenant_id===TENANT && agentSlug.test(row.agent_id)
    && typeof row.display_name==='string' && row.display_name.length>0 && row.display_name.length<=120
    && /^[a-f0-9]{64}$/.test(row.config_sha256) && Array.isArray(row.subjects)
    && row.subjects.includes(request.claims.sub) && ['active','pending'].includes(row.status));
   if(request.view==='agents')return {payload:{ok:true,data:{schema_version:'forge-agent-registry.v1',tenant_id:TENANT,source,
    agents:visible.map(({agent_id,display_name,config_sha256,status})=>({agent_id,display_name,config_sha256,status}))}}};
   const selected=visible.find(row=>row.agent_id===request.agent_id);
   if(!selected)deny('agent_access_required');
   request.config_sha256=selected.config_sha256;
   if (request.view === 'document') return {payload:{ok:true,data:await document(request.agent_id)}};
   if (request.view === 'schedule') {
    const profile=request.agent_id==='youtube-intel'?'expert-gbautomation-youtube-intel':request.agent_id;
    return {payload:{ok:true,data:projectSchedule(await schedule(request.query.date),request.agent_id,profile,request.query.date)}};
   }
   if (request.view === 'approvalSnapshot') return {payload:{ok:true,data:projectApprovalSnapshot(await approvalSnapshot(request),request.agent_id)}};
   if (['proposals','proposal'].includes(request.view)) return {payload:{ok:true,data:await proposals(request)}};
   const q = request.query;
   const raw = await rpc({p_tenant:TENANT,p_expert:request.agent_id,p_view:request.view === 'history' ? q.view : request.view,
    p_session_key:q.session_key || null,p_message_key:q.message_key || null,p_after:q.after || null});
   return {payload:{ok:true,data:project(request,raw)}};
  } catch(error) {
   return {payload:{ok:false,error:error instanceof ReadError ? error.message : 'atlas_unavailable'}};
  }
 };
}
