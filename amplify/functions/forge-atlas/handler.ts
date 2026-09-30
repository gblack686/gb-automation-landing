import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';
import { makeHandler, TENANT, operatorBootstrap } from './contract.mjs';
import { proposalPath, projectProposals } from './proposals.mjs';

let secret: {url:string;key:string}|undefined;
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
async function proposals(request: {view:string;query:Record<string,unknown>}) {
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
export const handler = makeHandler({issuer:process.env.COGNITO_ISSUER,rpc,document,proposals,approvalSnapshot,registry});
