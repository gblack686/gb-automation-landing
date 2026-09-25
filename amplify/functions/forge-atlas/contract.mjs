export const EXPERT = 'artist-packet-expert';
export const TENANT = 'gbautomation';
export const CONFIG_SHA = 'bf142e4e937a53701b4a27b02d90068ee0c8f73636f123dd97a56a661e3040e5';
// Cognito subjects use the UUID-shaped hex layout but do not promise RFC variant bits.
// The verified deployment issuer and tenant group provide authorization.
const cognitoSubject = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
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
 authenticate(event, issuer);
 // Amplify's FunctionDirectiveStack forwards typeName/fieldName at the top level.
 if (event.typeName !== 'Query' || event.fieldName !== 'forgeAtlasRead' || Object.keys(event.arguments || {}).join() !== 'input') deny('invalid_request');
 let input = event.arguments.input;
 if (typeof input === 'string') { try { input = JSON.parse(input); } catch { deny('invalid_request'); } }
 if (!object(input) || JSON.stringify(input).length > 4096 || Object.keys(input).some(k => !['view','query'].includes(k))
     || !['document','atlas','planning','history','approvalSnapshot','proposals','proposal'].includes(input.view)) deny('invalid_request');
 const query = input.query || {};
 if (!object(query)) deny('invalid_request');
 if (!['history','proposals','proposal'].includes(input.view) && Object.keys(query).length) deny('invalid_request');
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
 return {view:input.view,query};
}

export function traceURL(url,id) {
 return typeof url === 'string' && /^https:\/\/(us\.cloud\.langfuse\.com|cloud\.langfuse\.com|eu\.cloud\.langfuse\.com)\/project\/[A-Za-z0-9_-]+\/traces\/[A-Za-z0-9_-]+$/.test(url)
  && url.split('/').at(-1) === id ? url : null;
}
const rows = (value, limit) => { if (!Array.isArray(value) || value.length > limit) throw Error('Invalid read'); return value; };
export function project(request, raw, now = new Date().toISOString()) {
 if (request.view === 'history') {
  const q = request.query, key = {sessions:'session_key',messages:'message_key',traces:'trace_id'}[q.view];
  const page = rows(raw,51).slice(0,50).map(row => q.view === 'traces' ? {...row,langfuse_url:traceURL(row.langfuse_url,row.trace_id)} : row);
  if (page.some(row => !identity(row[key]))) throw Error('Invalid identity');
  return {schema_version:'forge-history-page.v1',source:'supabase',tenant_id:TENANT,agent_id:EXPERT,
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
  return {schema_version:'forge-atlas-snapshot.v1',source:'supabase',agent_id:EXPERT,captured_at:now,days:90,limit_per_dataset:200,datasets};
 }
 const prds = rows(raw.prds,100).map(p => {
  const claims = [p.owner_expert,p.frontmatter?.owner_expert,p.metadata?.master_sheet_projection?.owner_expert,p.source_refs?.forge?.agent_id].filter(Boolean);
  if (p.client !== TENANT || !claims.length || claims.some(v => v !== EXPERT)) throw Error('Invalid owner');
  const digest = p.source_refs?.forge?.config_sha256 || null;
  if (digest && !/^[a-f0-9]{64}$/.test(digest)) throw Error('Invalid lineage');
  const updated = [p.updated_at,p.file_mtime,p.indexed_at].find(v => v && Number.isFinite(Date.parse(v)));
  return {prd_id:p.prd_id,title:p.title,status:p.status || 'unknown',path:p.path,updated_at:updated ? new Date(updated).toISOString() : null,
   config_sha256:digest,source:'prd_artifacts',body_sha256:p.body_sha256};
 });
 const cards = rows(raw.cards,200);
 if (cards.some(c => !Array.isArray(c.prd_ids) || c.prd_ids.some(id => !prds.some(p => p.prd_id === id)))) throw Error('Invalid link');
 return {schema_version:'forge-planning-snapshot.v1',tenant_id:TENANT,agent_id:EXPERT,board_slug:'gbautomation',config_sha256:CONFIG_SHA,
  captured_at:now,source:'supabase',prds,cards,artifacts:[]};
}

export function makeHandler({issuer,rpc,document,proposals}) {
 return async event => {
  try {
   const request = requestFor(event,issuer);
   if (request.view === 'document') return {payload:{ok:true,data:await document()}};
   if (request.view === 'approvalSnapshot') return {payload:{ok:true,data:{mode:'live_read_only',workflows:[],engineering:null,recipient_options:[],
    connection:{source:'supabase',tenant:TENANT,agent:EXPERT,writes_enabled:false,email_enabled:false,execution_enabled:false,review_host:'web'}}}};
   if (['proposals','proposal'].includes(request.view)) return {payload:{ok:true,data:await proposals(request)}};
   const q = request.query;
   const raw = await rpc({p_tenant:TENANT,p_expert:EXPERT,p_view:request.view === 'history' ? q.view : request.view,
    p_session_key:q.session_key || null,p_message_key:q.message_key || null,p_after:q.after || null});
   return {payload:{ok:true,data:project(request,raw)}};
  } catch(error) {
   return {payload:{ok:false,error:error instanceof ReadError ? error.message : 'atlas_unavailable'}};
  }
 };
}
