import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { makeHandler } from './contract.mjs';
import catalog from './catalog.json';

let secret: {url:string;key:string}|undefined;
async function rpc(name:string,body:unknown) {
  if(!secret) {
    const result=await new SecretsManagerClient({}).send(new GetSecretValueCommand({SecretId:process.env.SUPABASE_SECRET_ID}));
    const value=JSON.parse(result.SecretString||'{}');
    const url=String(value.url||value.supabase_url||'').replace(/\/$/,'');
    const key=String(value.service_key||value.service_role_key||'');
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key) throw new Error('configuration unavailable');
    secret={url,key};
  }
  const result=await fetch(`${secret.url}/rest/v1/rpc/${name}`,{
    method:'POST',headers:{apikey:secret.key,Authorization:`Bearer ${secret.key}`,'Content-Type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(12000),
  });
  if(!result.ok)throw new Error('workshop unavailable');
  return result.json();
}
export const handler=makeHandler({issuer:process.env.COGNITO_ISSUER,enabled:process.env.FORGE_WORKSHOP_ENABLED==='true',rpc,catalog});
