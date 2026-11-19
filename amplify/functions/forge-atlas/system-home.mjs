import { operatorBootstrap, TENANT } from './contract.mjs';
import { validateContextGraph } from './system-context-graph.mjs';

const object = x => x && typeof x === 'object' && !Array.isArray(x);
const exact = (x, keys) => object(x) && Object.keys(x).sort().join() === keys.split(' ').sort().join();
const secret = /Bearer\s|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{20,}|github_pat_|xox[baprs]-|(?:sk|pk)-lf-|-----BEGIN|eyJ[A-Za-z0-9_-]{16,}\.|\bsk-[A-Za-z0-9_-]{20,}/;
const text = (x, max=160) => typeof x === 'string' && x.length>0 && x.length<=max && !/[\x00-\x1f\x7f]/.test(x) && !secret.test(x);
const id = x => text(x) && /^[A-Za-z0-9_.:-]+$/.test(x);
const count = x => x === null || (Number.isSafeInteger(x) && x>=0);
const nullable = (x, fn) => x===null || fn(x);
const state = x => ['fresh','stale','unavailable'].includes(x);
const commit = x => typeof x==='string' && /^[a-f0-9]{40}$/.test(x);
const list = (x,max,fn) => Array.isArray(x) && x.length<=max && x.every(fn);
const unique = (rows,key='id') => new Set(rows.map(x=>x[key])).size===rows.length;
const counts = (x,keys) => exact(x,keys) && Object.values(x).every(count);
const ensure = yes => { if(!yes)throw Error('system_unavailable'); };
export function systemTTL(value=180) {
 const ttl=Number(value);ensure(Number.isSafeInteger(ttl)&&ttl>=30&&ttl<=3600);return ttl;
}
export function validateSystemSnapshot(raw, now=Date.now(), ttl=180) {
 ttl=systemTTL(ttl);
 const stamp = x => typeof x==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(x)
  && Number.isFinite(Date.parse(x)) && Date.parse(x)<=now+60000
  && new Date(x).toISOString().slice(0,19)===x.slice(0,19);
 const date = x => nullable(x,stamp);
 ensure(exact(raw,'schema_version tenant_id captured_at source_commit operations observability topology docs context_graph')
  && raw.schema_version==='forge-system-home.v1' && raw.tenant_id===TENANT && stamp(raw.captured_at) && commit(raw.source_commit));
 const o=raw.operations;
 ensure(exact(o,'status generated_at latest_event_at reason counts sources runs') && state(o.status)
  && date(o.generated_at) && date(o.latest_event_at) && (o.status!=='fresh'||o.generated_at!==null)
  && [null,'missing_snapshot','export_failed'].includes(o.reason)
  && counts(o.counts,'experts reports plans runs')
  && list(o.sources,8,s=>exact(s,'id status updated_at observed_at') && id(s.id) && (state(s.status)||s.status==='pinned') && date(s.updated_at) && date(s.observed_at))
  && list(o.runs,50,r=>exact(r,'id expert_id status updated_at') && id(r.id) && nullable(r.expert_id,id) && id(r.status) && date(r.updated_at))
  && unique(o.sources) && unique(o.runs));
 const v=raw.observability;
 ensure(exact(v,'status latest_event_at fetched_at reason counts coverage_complete sources sessions focus_session') && state(v.status)
  && date(v.latest_event_at) && date(v.fetched_at) && (v.status!=='fresh'||v.latest_event_at!==null) && nullable(v.reason,id)
  && counts(v.counts,'sessions_total events_total sessions_sampled') && v.coverage_complete===false
  && list(v.sources,3,s=>exact(s,'id status latest_event_at sessions_sampled') && id(s.id) && state(s.status) && date(s.latest_event_at) && count(s.sessions_sampled))
  && list(v.sessions,50,s=>exact(s,'id pool agent latest_event_at event_count status') && id(s.id) && id(s.pool) && nullable(s.agent,id) && date(s.latest_event_at) && count(s.event_count) && state(s.status))
  && unique(v.sources) && new Set(v.sessions.map(s=>`${s.pool}/${s.id}`)).size===v.sessions.length);
 const f=v.focus_session;
 ensure(exact(f,'id status latest_event_at event_count reason') && id(f.id) && state(f.status) && date(f.latest_event_at) && count(f.event_count) && nullable(f.reason,id));
 const t=raw.topology;
 const github = url => text(url,500) && /^https:\/\/github\.com\/gbauto\/(?:gbautomation|gbauto-pi-host)\/blob\/[a-f0-9]{40}\/[A-Za-z0-9_./%() -]+(?:#L[1-9][0-9]*(?:-L[1-9][0-9]*)?)?$/.test(url)
  && !url.includes('..') && !/%(?:2e|2f|5c|00)/i.test(url);
 ensure(exact(t,'reference_commit groups nodes edges') && commit(t.reference_commit)
  && list(t.groups,16,g=>exact(g,'id label') && id(g.id) && text(g.label)) && unique(t.groups)
  && list(t.nodes,128,n=>exact(n,'id label group description source_url') && id(n.id) && text(n.label) && t.groups.some(g=>g.id===n.group) && text(n.description,1200) && github(n.source_url)) && unique(t.nodes)
  && list(t.edges,256,e=>exact(e,'from to label') && t.nodes.some(n=>n.id===e.from) && t.nodes.some(n=>n.id===e.to) && text(e.label)));
 const d=raw.docs;
 const path = x => text(x,500) && !/^[\/\\]|[\\:#?%<>]/.test(x) && !x.split('/').some(p=>!p||p==='.'||p==='..');
 ensure(exact(d,'indexed_at count rows') && date(d.indexed_at) && count(d.count)
  && list(d.rows,100,r=>exact(r,'id title kind path') && text(r.id,300) && text(r.title,200) && id(r.kind) && path(r.path)) && unique(d.rows)
  && (d.count===null||d.count>=d.rows.length));
 validateContextGraph(raw.context_graph,stamp);
 return {...raw,retrieved_at:new Date(now).toISOString(),freshness:now-Date.parse(raw.captured_at)>ttl*1000?'stale':'fresh',ttl_seconds:ttl};
}

class Denied extends Error {}
const deny = code => { throw new Denied(code); };
// AppSync verifies the JWT signature; this boundary additionally pins issuer,
// expiry, exact operator policy and current active registry on every request.
export function makeSystemHomeHandler({issuer,operatorSubject='',registry,load,enabled=false,ttl=180,clock=Date.now}) {
 return async event => {
  try {
   const c=event?.identity?.claims,now=clock();
   if(!issuer||c?.iss!==issuer||typeof c?.sub!=='string'||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(c.sub)
    || !Number.isSafeInteger(c.exp)||c.exp*1000<=now || (c.nbf!==undefined&&(!Number.isSafeInteger(c.nbf)||c.nbf*1000>now+60000)))deny('authentication_required');
   if(event.typeName!=='Query'||event.fieldName!=='forgeSystemHomeRead'||!exact(event.arguments,'input'))deny('invalid_request');
   let input=event.arguments.input;
   if(typeof input==='string'){if(input.length>200)deny('invalid_request');try{input=JSON.parse(input);}catch{deny('invalid_request');}}
   if(!exact(input,'view')||!['access','snapshot'].includes(input.view))deny('invalid_request');
   const groups=Array.isArray(c['cognito:groups'])?c['cognito:groups']:[];
   let agent=null;
   if(groups.includes('tenant-gbautomation')) {
    let registered;try{registered=await registry(c);}catch{deny('access_unavailable');}
    const entries=Array.isArray(registered)?registered:registered?.agents;
    if(!Array.isArray(entries)||entries.length>100)deny('access_unavailable');
    agent=entries.find(r=>r?.tenant_id===TENANT && r.status==='active' && /^[a-z][a-z0-9-]{1,62}$/.test(r.agent_id)
     && /^[a-f0-9]{64}$/.test(r.config_sha256) && Array.isArray(r.subjects) && r.subjects.includes(c.sub));
   }
   if(c.exp*1000<=clock())deny('authentication_required');
   const admin=!!agent && !!operatorBootstrap(c.sub,operatorSubject);
   if(input.view==='access') {
    const portal=['gbautomation','jid5274','smoke-client'].find(t=>groups.includes(`tenant-${t}`));
    return {payload:{ok:true,data:{schema_version:'forge-system-access.v1',admin,destination:admin?'/system':agent?`/atlas/${agent.agent_id}`:portal?`/clients/${portal}`:null,agent_id:agent?.agent_id||null}}};
   }
   if(!groups.includes('tenant-gbautomation')||!admin)deny('system_access_required');
   if(!enabled)deny('system_unavailable');
   const snapshot=await load(),retrieved=clock();
   if(c.exp*1000<=retrieved)deny('authentication_required');
   return {payload:{ok:true,data:validateSystemSnapshot(snapshot,retrieved,ttl)}};
  }catch(error){return {payload:{ok:false,error:error instanceof Denied?error.message:'system_unavailable'}};}
 };
}
