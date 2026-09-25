import {generateClient} from 'aws-amplify/data';
let client;
const messages={operator_access_required:'An avatar operator role is required to generate or approve assets.',stale_revision:'This job changed. Refresh before continuing.',wrong_expert_or_revision:'This brief belongs to another expert or configuration.',credit_cap_too_small:'This pipeline needs the 35-credit Meshy forecast.',visual_unavailable:'The generation service is unavailable. Refresh to check whether your action was saved.'};
export async function visualRequest(input,write=false){
 client ||= generateClient();
 const result=await (write?client.mutations.forgeVisualCommand:client.queries.forgeVisualRead)({input:JSON.stringify(input)},{authMode:'userPool'});
 let payload=result.data?.payload;if(typeof payload==='string')payload=JSON.parse(payload);
 if(result.errors?.length||!payload?.ok)throw Error(messages[payload?.error]||'This action is not available for the current job. Refresh and check its status.');
 return payload.data;
}
export async function visualAsset(id,stage,signal){
 const asset=await visualRequest({action:'asset',id,stage}),url=new URL(asset.url);
 if(url.protocol!=='https:'||!/^[a-z0-9.-]+\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname)
  ||decodeURIComponent(url.pathname)!==`/gbautomation/artist-packet-expert/visuals/runs/${id}/${stage}.${['web','master'].includes(stage)?'glb':['card','source_card'].includes(stage)?'jpg':'png'}`
  ||asset.bytes>(stage==='master'?200000000:15000000)||!/^[a-f0-9]{64}$/.test(asset.sha256))throw Error('Invalid asset');
 const response=await fetch(url,{credentials:'omit',cache:'no-store',signal});if(!response.ok)throw Error('Asset unavailable');
 const reader=response.body.getReader(),chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>asset.bytes)throw Error('Oversize asset');chunks.push(value);}}
 finally{await reader.cancel();}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
 if(hash!==asset.sha256||length!==asset.bytes)throw Error('Asset hash changed');
 return {bytes,asset};
}
