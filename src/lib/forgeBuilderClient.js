import {generateClient} from 'aws-amplify/data';
let client;
export async function builderRequest(input,write=false){
 client ||= generateClient();
 const fn=write?client.mutations.forgeBuilderCommand:client.queries.forgeBuilderRead;
 if(!fn)throw Error('builder_not_deployed');
 const result=await fn({input:JSON.stringify(input)},{authMode:'userPool'});
 let payload=result.data?.payload;if(typeof payload==='string')payload=JSON.parse(payload);
 if(result.errors?.length||!payload?.ok){const error=Error(payload?.error||'builder_unavailable');error.code=payload?.error;throw error;}
 return payload.data;
}
export async function builderAsset(id,path,signal){
 const asset=await builderRequest({action:'asset',packet_id:id,path});
 return verifiedBuilderAsset(asset,`packets/${id}/${path}`,signal);
}
export async function verifiedBuilderAsset(asset,path,signal){
 const url=new URL(asset.url);
 if(url.protocol!=='https:'||!/^[a-z0-9.-]+\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname)||
  decodeURIComponent(url.pathname)!==`/gbautomation/artist-packet-expert/builder-pilot/${path}`||
  !Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>100000000||!/^[a-f0-9]{64}$/.test(asset.sha256))throw Error('artifact_routing_failed');
 const response=await fetch(url,{credentials:'omit',cache:'no-store',signal});if(!response.ok)throw Error('artifact_unavailable');
 const reader=response.body.getReader(),chunks=[];let length=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>asset.bytes)throw Error('artifact_size_mismatch');chunks.push(value);}}
 finally{await reader.cancel();}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
 if(length!==asset.bytes||hash!==asset.sha256)throw Error('artifact_hash_mismatch');
 return {bytes,asset};
}
