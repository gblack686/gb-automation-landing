import {generateClient} from 'aws-amplify/data';
let client;
export async function piRequest(action,input,agentId){
 client||=generateClient();
 const field=['capability','status'].includes(action)?'forgePiRead':'forgePiCommand';
 const response=await client[field==='forgePiRead'?'queries':'mutations'][field]({input:JSON.stringify({action,agent_id:agentId,...input})},{authMode:'userPool'});
 if(response.errors?.length)throw Error('The Pi request could not be confirmed.');
 const payload=typeof response.data?.payload==='string'?JSON.parse(response.data.payload):response.data?.payload;
 if(!payload?.ok)throw Error(payload?.error==='jobs_disabled'?'Remote actions are not enabled.':'The Pi request could not be confirmed.');
 const data=payload.data;
 if(data===null&&action==='status')return null;
 if(!data||data.tenant_id!=='gbautomation'||data.agent_id!==agentId)throw Error('Pi response identity could not be verified.');
 if(action==='capability'){
  if(data.schema_version!=='forge-pi-capability.v1'||typeof data.enabled!=='boolean'||!Array.isArray(data.actions))throw Error('Pi capability is unavailable.');
 }else if(data.schema_version!=='forge-pi-job.v1'||data.idempotency_key!==input.idempotency_key
   ||!['pending','leased','accepted','complete','failed','uncertain','expired'].includes(data.state))throw Error('Pi request identity could not be verified.');
 return data;
}
