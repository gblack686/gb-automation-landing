import { readAtlas } from './forgeAtlasClient';

const MAX_BYTES=8_000_000;
const TYPES={'text/html':'html','text/plain':'txt','text/markdown':'md','application/json':'json','image/png':'png'};
const digest=value=>[...new Uint8Array(value)].map(n=>n.toString(16).padStart(2,'0')).join('');
export async function readResourceCatalog(query,agentId) {
 const data=await readAtlas('resourceCatalog',query,agentId);
 if(data?.schema_version!=='forge-resource-catalog.v1'||data.tenant_id!=='gbautomation'||data.agent_id!==agentId
   || !/^[a-f0-9]{64}$/.test(data.catalog_sha256)||!Array.isArray(data.rows)||data.rows.length>50
   || !Array.isArray(data.owners)||data.owners.length>1500||!Number.isSafeInteger(data.total)
   || data.total<0||data.total>1500)throw Error('The resource catalog could not be verified.');
 return data;
}

export async function readResourceArtifact(resourceId,catalogSha,agentId,signal) {
 const asset=await readAtlas('resourceArtifact',{resource_id:resourceId,catalog_sha256:catalogSha},agentId);
 if(asset?.schema_version!=='forge-resource-artifact.v1'||asset.tenant_id!=='gbautomation'||asset.agent_id!==agentId
   || asset.resource_id!==resourceId||asset.catalog_sha256!==catalogSha||!/^[a-f0-9]{64}$/.test(asset.sha256)
   || !Object.hasOwn(TYPES,asset.media_type)||!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>MAX_BYTES
   || !Number.isFinite(Date.parse(asset.expires_at))||Date.parse(asset.expires_at)<=Date.now()
   || Date.parse(asset.expires_at)>Date.now()+65_000)throw Error('This saved result is unavailable. Refresh the catalog and retry.');
 const url=new URL(asset.url);
 if(url.protocol!=='https:'||url.username||url.password||url.port
   || !/^[a-z0-9.-]+\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname)
   || url.pathname!==`/gbautomation/resources/artifacts/${asset.sha256}.${TYPES[asset.media_type]}`
   || url.searchParams.get('versionId')!==asset.version_id||url.searchParams.get('X-Amz-Expires')!=='60')throw Error('Invalid saved-result location.');
 const response=await fetch(url,{cache:'no-store',credentials:'omit',redirect:'error',signal});
 if(!response.ok||!response.body)throw Error('The saved-result link expired or could not be opened.');
 const reader=response.body.getReader();const chunks=[];let length=0;
 try {
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;
   if(length>asset.bytes||length>MAX_BYTES)throw Error('The saved result exceeds its reviewed size.');chunks.push(value);}
 } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 if(length!==asset.bytes||digest(await crypto.subtle.digest('SHA-256',bytes))!==asset.sha256)throw Error('Saved-result integrity check failed.');
 return {asset,bytes};
}

// The result has no host bridge, account token, same-origin grant, form, or popup capability.
export function resourceDocument(bytes,mediaType) {
 const parser=new DOMParser();
 const doc=parser.parseFromString(mediaType==='text/html'?new TextDecoder().decode(bytes):'<html><head></head><body></body></html>','text/html');
 doc.querySelectorAll('base,meta[http-equiv="refresh" i]').forEach(node=>node.remove());
 const meta=doc.createElement('meta');meta.httpEquiv='Content-Security-Policy';
 meta.content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
 doc.head.prepend(meta);
 const viewport=doc.createElement('meta');viewport.name='viewport';viewport.content='width=device-width, initial-scale=1';doc.head.append(viewport);
 if(mediaType==='image/png'){
  const img=doc.createElement('img');img.alt='Saved result';img.style.maxWidth='100%';
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  img.src='data:image/png;base64,'+btoa(binary);doc.body.append(img);
 }else if(mediaType!=='text/html'){
  const pre=doc.createElement('pre');pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;padding:16px;font:15px/1.6 system-ui';
  pre.textContent=new TextDecoder().decode(bytes);doc.body.append(pre);
 }
 return '<!doctype html>'+doc.documentElement.outerHTML;
}
