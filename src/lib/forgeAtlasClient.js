import { generateClient } from 'aws-amplify/data';
let client;
export async function readAtlas(view, query = {}, agentId = null) {
 client ||= generateClient();
 const input = agentId ? {view,query,agent_id:agentId} : {view,query};
 const result = await client.queries.forgeAtlasRead({input:JSON.stringify(input)},{authMode:'userPool'});
 if (result.errors?.length) throw Error('Sign in again to open your workspace.');
 let payload = result.data?.payload;
 if (typeof payload === 'string') payload = JSON.parse(payload);
 if (!payload?.ok) throw Error(payload?.error === 'tenant_access_required' ? 'Tenant access is required.' : 'The workspace is unavailable. Please retry.');
 return payload.data;
}

export async function expertChat(action, input, agentId) {
 client ||= generateClient();
 const field=['capability','poll'].includes(action)?'forgeChatRead':'forgeChatCommand';
 const result=await client[field==='forgeChatRead'?'queries':'mutations'][field]({
  input:JSON.stringify({action,agent_id:agentId,...input}),
 },{authMode:'userPool'});
 if(result.errors?.length)throw Error('Expert chat unavailable');
 let payload=result.data?.payload;
 if(typeof payload==='string')payload=JSON.parse(payload);
 if(!payload?.ok)throw Error('Expert chat unavailable');
 return payload.data;
}
