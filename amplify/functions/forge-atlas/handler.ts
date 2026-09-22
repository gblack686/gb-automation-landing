import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { makeHandler, TENANT, EXPERT } from './contract.mjs';

let secret: {url:string;key:string}|undefined;
async function rpc(body:unknown) {
 if (!secret) {
  const result = await new SecretsManagerClient({}).send(new GetSecretValueCommand({SecretId:process.env.SUPABASE_SECRET_ID}));
  const value = JSON.parse(result.SecretString || '{}');
  const url = String(value.url || value.supabase_url || '').replace(/\/$/,'');
  const key = String(value.service_key || value.service_role_key || '');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key) throw Error('Configuration unavailable');
  secret = {url,key};
 }
 const response = await fetch(`${secret.url}/rest/v1/rpc/agent_forge_atlas_read`,{
  method:'POST',headers:{apikey:secret.key,Authorization:`Bearer ${secret.key}`,'Content-Type':'application/json'},
  body:JSON.stringify(body),signal:AbortSignal.timeout(15000),
 });
 if (!response.ok) throw Error('Read unavailable');
 const raw = await response.text();
 if (raw.length > 1000000) throw Error('Response too large');
 return JSON.parse(raw);
}
async function document() {
 const client = new S3Client({});
 const location = {Bucket:process.env.DOCUMENT_BUCKET,Key:`${TENANT}/${EXPERT}/index.html`};
 const head = await client.send(new HeadObjectCommand(location));
 const sha256 = head.Metadata?.sha256;
 if (!sha256 || !/^[a-f0-9]{64}$/.test(sha256) || !head.ContentLength || head.ContentLength > 16000000) throw Error('Document unavailable');
 const url = await getSignedUrl(client,new GetObjectCommand({...location,ResponseCacheControl:'private, no-store'}),{expiresIn:60});
 return {url,sha256,bytes:head.ContentLength,agent_id:EXPERT,tenant_id:TENANT};
}
export const handler = makeHandler({issuer:process.env.COGNITO_ISSUER,rpc,document});
