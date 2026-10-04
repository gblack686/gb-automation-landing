import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { makeHandler } from './contract.mjs';
import catalog from './catalog.json';

let secret: {url:string;key:string}|undefined;
async function database() {
  if(!secret) {
    const result=await new SecretsManagerClient({}).send(new GetSecretValueCommand({SecretId:process.env.SUPABASE_SECRET_ID}));
    const value=JSON.parse(result.SecretString||'{}');
    const url=String(value.url||value.supabase_url||'').replace(/\/$/,'');
    const key=String(value.service_key||value.service_role_key||'');
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key) throw new Error('configuration unavailable');
    secret={url,key};
  }
  return secret;
}
async function rpc(name:string,body:unknown) {
  const secret=await database();
  const result=await fetch(`${secret.url}/rest/v1/rpc/${name}`,{
    method:'POST',headers:{apikey:secret.key,Authorization:`Bearer ${secret.key}`,'Content-Type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(12000),
  });
  if(!result.ok){
    console.error('forge_workshop_rpc_http_error', {status:result.status});
    throw new Error('workshop unavailable');
  }
  return result.json();
}
const jobNames=new Set(['expert-nightly','youtube-whitelist-intel','youtube-liked-intel']);
const logNames=new Set(['agent.log','gateway.log','errors.log']);
function timestamp(value:unknown) {
  return typeof value==='string' && value.length<=40 && Number.isFinite(Date.parse(value)) ? value : null;
}
async function pulseRead() {
  const {url,key}=await database();
  const response=await fetch(`${url}/rest/v1/ops_dashboard_snapshots?snapshot_key=eq.mac-mini-telemetry&select=generated_at,snapshot&limit=1`,{
    headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(5000),
  });
  if(!response.ok)throw new Error('pulse unavailable');
  const rows=await response.json();
  const snapshot=rows?.[0]?.snapshot;
  const expert=snapshot?.expert;
  if(expert?.expert_id!=='gbautomation/youtube-intel'||expert?.profile!=='expert-gbautomation-youtube-intel')return null;
  return {
    observed_at:timestamp(rows[0].generated_at),
    gateway_running:expert.gateway_running===true,
    jobs:Array.isArray(expert.jobs)?expert.jobs.filter((item:any)=>jobNames.has(item?.name)).slice(0,3).map((item:any)=>({
      name:item.name,enabled:item.enabled===true,
      schedule:typeof item.schedule==='string'&&/^[A-Za-z0-9 :*/,.+-]{1,80}$/.test(item.schedule)?item.schedule:null,
      last_run_at:timestamp(item.last_run_at),next_run_at:timestamp(item.next_run_at),
      last_status:['ok','error','running'].includes(item.last_status)?item.last_status:null,
      failure_streak:Number.isInteger(item.failure_streak)&&item.failure_streak>=0&&item.failure_streak<=999?item.failure_streak:0,
    })):[],
    logs:Array.isArray(expert.logs)?expert.logs.filter((item:any)=>logNames.has(item?.name)).slice(0,3).map((item:any)=>({
      name:item.name,updated_at:timestamp(item.updated_at),
      bytes:Number.isSafeInteger(item.bytes)&&item.bytes>=0?item.bytes:null,
    })):[],
  };
}
export const handler=makeHandler({issuer:process.env.COGNITO_ISSUER,enabled:process.env.FORGE_WORKSHOP_ENABLED==='true',rpc,catalog,pulseRead});
