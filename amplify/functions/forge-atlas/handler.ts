import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';
import { makeHandler, TENANT, operatorBootstrap, project } from './contract.mjs';
import { proposalPath, projectProposals } from './proposals.mjs';
import { runSearch } from './search.mjs';
import { classifySearch } from './jev-search.mjs';

let secret: {url:string;key:string}|undefined;
let scheduleAuth: string|undefined;
let typesafeKey: string|undefined;
async function typesafeCredentials() {
 if(!process.env.TYPESAFE_SECRET_ID)throw Error('Jev key unavailable');
 if(!typesafeKey){
  const result=await new SecretsManagerClient({}).send(new GetSecretValueCommand({SecretId:process.env.TYPESAFE_SECRET_ID}));
  const raw=result.SecretString||'';
  let key=raw;
  if(raw.trim().startsWith('{')){
   const value=JSON.parse(raw);
   key=value.api_key||value.TYPESAFE_API_KEY;
  }
  if(typeof key!=='string'||key.length<12||key.length>512)throw Error('Jev key unavailable');
  typesafeKey=key;
 }
 return typesafeKey;
}
async function scheduleCredentials() {
 if (!scheduleAuth) {
  const result = await new SecretsManagerClient({}).send(new GetSecretValueCommand({SecretId:process.env.SCHEDULE_SECRET_ID}));
  const value = JSON.parse(result.SecretString || '{}');
  if (typeof value.username !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(value.username)
      || typeof value.password !== 'string' || value.password.length < 1 || value.password.length > 512
      || /[\x00-\x1f\x7f]/.test(value.password)) throw Error('Schedule configuration unavailable');
  scheduleAuth = `Basic ${Buffer.from(`${value.username}:${value.password}`).toString('base64')}`;
 }
 return scheduleAuth;
}
async function schedule(day:string) {
 const auth = await scheduleCredentials();
 const response = await fetch(`https://gregs-mac-mini.tail4e0ac6.ts.net/api/gbauto/schedule?date=${encodeURIComponent(day)}`,{
  headers:{Authorization:auth,Accept:'application/json'},signal:AbortSignal.timeout(12000),
 });
 if (!response.ok) throw Error('Schedule read unavailable');
 const raw = await response.text();
 if (raw.length > 3000000) throw Error('Schedule response too large');
 return JSON.parse(raw);
}
async function credentials() {
 if (!secret) {
  const result = await new SecretsManagerClient({}).send(new GetSecretValueCommand({SecretId:process.env.SUPABASE_SECRET_ID}));
  const value = JSON.parse(result.SecretString || '{}');
  const url = String(value.url || value.supabase_url || '').replace(/\/$/,'');
  const key = String(value.service_key || value.service_role_key || '');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) throw Error('Configuration unavailable');
  secret = {url,key};
 }
 return secret;
}
async function rpc(body:unknown) {
 const secret = await credentials();
 const response = await fetch(`${secret.url}/rest/v1/rpc/agent_forge_atlas_read`,{
  method:'POST',headers:{apikey:secret.key,Authorization:`Bearer ${secret.key}`,'Content-Type':'application/json'},
  body:JSON.stringify(body),signal:AbortSignal.timeout(15000),
 });
 if (!response.ok) throw Error('Read unavailable');
 const raw = await response.text();
 if (raw.length > 1000000) throw Error('Response too large');
 return JSON.parse(raw);
}
async function proposals(request: {view:string;query:Record<string,unknown>;agent_id?:string}) {
 const secret = await credentials();
 const response = await fetch(`${secret.url}${proposalPath(request)}`,{
  headers:{apikey:secret.key,Authorization:`Bearer ${secret.key}`,Prefer:'count=exact'},
  signal:AbortSignal.timeout(15000),
 });
 if (!response.ok) throw Error('Read unavailable');
 const raw = await response.text();
 if (raw.length > 250000) throw Error('Response too large');
 return projectProposals(request,JSON.parse(raw),response.headers.get('content-range'));
}
async function approvalSnapshot(request: {agent_id:string}) {
 const secret = await credentials();
 const response = await fetch(`${secret.url}/rest/v1/rpc/forge_approval_snapshot`,{
  method:'POST',headers:{apikey:secret.key,Authorization:`Bearer ${secret.key}`,'Content-Type':'application/json'},
  body:JSON.stringify({p_tenant:TENANT,p_agent:request.agent_id}),signal:AbortSignal.timeout(15000),
 });
 if (!response.ok) throw Error('Approval read unavailable');
 const raw = await response.text();
 if (raw.length > 1000000) throw Error('Approval response too large');
 return JSON.parse(raw);
}
async function search(request: {agent_id:string;config_sha256?:string;query:{query:string;source:string;limit:number}}) {
 const read = async (url:string, options:RequestInit, max=300000) => {
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Search source unavailable');
  const body=await response.text();
  if(body.length>max)throw Error('Search source too large');
  return JSON.parse(body);
 };
 const adapters={
  classify:async (query:string) => classifySearch(query,await typesafeCredentials()),
  proposal:async (query:string,agent:string) => {
   const [cards,plans]=await Promise.allSettled([
    proposals({view:'proposals',query:{search:query,offset:0},agent_id:agent}),
    rpc({p_tenant:TENANT,p_expert:agent,p_view:'planning',p_session_key:null,p_message_key:null,p_after:null}),
   ]);
   if(cards.status==='rejected'&&plans.status==='rejected')throw Error('Proposal sources unavailable');
   const rows:any[]=[];let truncated=false;
   if(cards.status==='fulfilled'){
    const data:any=cards.value;
    rows.push(...data.rows.map((row:any)=>({id:row.proposal_id,title:row.card_title||row.proposal_id,
     snippet:row.source_type||'',status:row.state||'',updated_at:row.updated_at||''})));
    truncated ||= data.total>data.rows.length;
   }
   if(plans.status==='fulfilled'){
    const data:any=project({view:'planning',agent_id:agent,config_sha256:request.config_sha256},plans.value);
    rows.push(...data.prds.filter((row:any)=>`${row.title} ${row.path}`.toLowerCase().includes(query.toLowerCase())).map((row:any)=>({id:row.prd_id,title:row.title,snippet:'TAC plan · '+row.path,status:row.status,updated_at:row.updated_at||''})));
    truncated ||= data.prds.length===100;
   }
   return {rows:rows.slice(0,41),coverage:cards.status==='rejected'||plans.status==='rejected'?'stale':'available',truncated:truncated||rows.length>40};
  },
  session:async (query:string,agent:string) => {
   const secret=await credentials();
   const data=await read(`${secret.url}/rest/v1/rpc/forge_search_session_intents`,{method:'POST',headers:{apikey:secret.key,Authorization:`Bearer ${secret.key}`,'Content-Type':'application/json'},body:JSON.stringify({p_tenant:TENANT,p_expert:agent,p_query:query,p_limit:40})});
   if(!Array.isArray(data.rows)||data.rows.length>41)throw Error('Invalid summary source');
   return {rows:data.rows.map((row:any)=>({id:row.intent_event_id,title:String(row.intent_summary||'').slice(0,120),snippet:row.intent_summary||'',status:row.intent_type||'',updated_at:row.updated_at||''})),truncated:Boolean(data.truncated)};
  },
  pr:async (query:string) => {
   const terms=`${query} is:pr repo:gbauto/gbautomation repo:gblack686/gb-automation-landing`;
   const data=await read(`https://api.github.com/search/issues?q=${encodeURIComponent(terms)}&per_page=40`,{headers:{Accept:'application/vnd.github+json','User-Agent':'gbautomation-forge-search',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})}});
   if(!Array.isArray(data.items)||data.items.length>40)throw Error('Invalid PR source');
   const allowed=/^https:\/\/github\.com\/(?:gbauto\/gbautomation|gblack686\/gb-automation-landing)\/pull\/[0-9]+$/;
   return {rows:data.items.filter((row:any)=>allowed.test(row.html_url||'')).map((row:any)=>({id:String(row.id),title:row.title||'',snippet:row.repository_url?.split('/').slice(-2).join('/')||'',status:row.state||'',updated_at:row.updated_at||'',href:row.html_url||''})),truncated:data.total_count>40};
  },
  code:async (query:string) => {
   const auth=await scheduleCredentials();
   const data=await read(`https://gregs-mac-mini.tail4e0ac6.ts.net/api/gbauto/forge-graft-search?q=${encodeURIComponent(query)}&limit=40`,{headers:{Authorization:auth,Accept:'application/json'}});
   if(data.schema_version!=='forge-graft-search.v1'||!Array.isArray(data.results)||data.results.length>40)throw Error('Invalid Graft source');
   return {rows:data.results.map((row:any)=>({id:row.id,title:row.title,snippet:row.snippet,href:row.href})),coverage:data.coverage};
  },
 };
 return runSearch(request,adapters);
}
async function registry(claims: {sub:string}) {
 const key = `${TENANT}/forge-agent-registry.v1.json`;
 const client = new S3Client({});
 let response;
 try { response = await client.send(new GetObjectCommand({Bucket:process.env.DOCUMENT_BUCKET,Key:key})); }
 catch (error:unknown) {
  const bootstrap = operatorBootstrap(claims.sub,process.env.FORGE_LEGACY_OPERATOR_SUB);
  if ((error as {name?:string})?.name === 'NoSuchKey' && bootstrap) return bootstrap;
  throw error;
 }
 if (!response.ContentLength || response.ContentLength > 100000 || !/^[a-f0-9]{64}$/.test(response.Metadata?.sha256 || '')) throw Error('Registry unavailable');
 const raw = await response.Body?.transformToString();
 if (!raw || Buffer.byteLength(raw) !== response.ContentLength || createHash('sha256').update(raw).digest('hex') !== response.Metadata?.sha256) throw Error('Registry changed');
 const parsed = JSON.parse(raw);
 if (parsed?.schema_version !== 'forge-agent-registry.v1' || parsed.tenant_id !== TENANT || !Array.isArray(parsed.agents)) throw Error('Registry invalid');
 return {source:'s3',agents:parsed.agents};
}
async function document(agent:string) {
 const client = new S3Client({});
 const location = {Bucket:process.env.DOCUMENT_BUCKET,Key:`${TENANT}/${agent}/index.html`};
 const head = await client.send(new HeadObjectCommand(location));
 const sha256 = head.Metadata?.sha256;
 if (!sha256 || !/^[a-f0-9]{64}$/.test(sha256) || !head.ContentLength || head.ContentLength > 16000000) throw Error('Document unavailable');
 const url = await getSignedUrl(client,new GetObjectCommand({...location,ResponseCacheControl:'private, no-store'}),{expiresIn:60});
 return {url,sha256,bytes:head.ContentLength,agent_id:agent,tenant_id:TENANT};
}
export const handler = makeHandler({issuer:process.env.COGNITO_ISSUER,rpc,document,proposals,search,schedule,approvalSnapshot,registry});
