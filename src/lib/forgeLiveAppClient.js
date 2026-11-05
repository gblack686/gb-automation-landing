import {generateClient} from 'aws-amplify/data';
let client;
export async function readLiveBenchmark(resourceId,catalogSha,agentId){
 client||=generateClient();const result=await client.queries.forgeAppRead({input:JSON.stringify({agent_id:agentId,resource_id:resourceId,catalog_sha256:catalogSha})},{authMode:'userPool'});
 const payload=typeof result.data?.payload==='string'?JSON.parse(result.data.payload):result.data?.payload;
 if(result.errors?.length||!payload?.ok)throw Error('The Mini live view is unavailable. Saved results remain in the gallery.');
 const d=payload.data;
 if(d?.schema_version!=='hosted-benchmark.v1'||d.tenant_id!=='gbautomation'||d.agent_id!==agentId||d.resource_id!==resourceId
  ||d.catalog_sha256!==catalogSha||!Array.isArray(d.attempts)||d.attempts.length>200)throw Error('Live response identity could not be verified.');
 return d;
}
