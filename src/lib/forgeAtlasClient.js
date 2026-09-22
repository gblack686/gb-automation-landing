import { generateClient } from 'aws-amplify/data';
let client;
export async function readAtlas(view, query = {}) {
 client ||= generateClient();
 const result = await client.queries.forgeAtlasRead({input:JSON.stringify({view,query})},{authMode:'userPool'});
 if (result.errors?.length) throw Error('Sign in again to open your workspace.');
 let payload = result.data?.payload;
 if (typeof payload === 'string') payload = JSON.parse(payload);
 if (!payload?.ok) throw Error(payload?.error === 'tenant_access_required' ? 'Tenant access is required.' : 'The workspace is unavailable. Please retry.');
 return payload.data;
}
