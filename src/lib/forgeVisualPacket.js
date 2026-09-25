import {zipSync,strToU8} from 'fflate';
import {visualRequest,visualAsset} from './forgeVisualClient';

export async function buildVisualPacket(id,onProgress=()=>{}){
 const {manifest,receipt}=await visualRequest({action:'packet',id});
 if(manifest.schema!=='forge-visual-packet.v1'||manifest.run_id!==id||manifest.status!=='approved'||manifest.files.reduce((n,f)=>n+f.bytes,0)>280000000)throw Error('Invalid or oversized packet');
 const files={};
 for(const file of manifest.files){
  if(!/^[a-z0-9-]+\.(png|jpg|glb)$/.test(file.filename)||files[file.filename])throw Error('Invalid packet filename');
  onProgress(`Preparing ${file.filename}`);
  const {asset,bytes}=await visualAsset(id,file.role);
  if(asset.sha256!==file.sha256||asset.key!==file.key||asset.version!==file.version||bytes.length!==file.bytes)throw Error('Packet changed. Refresh and download again.');
  files[file.filename]=bytes;
 }
 for(const [name,value] of Object.entries({'manifest.json':manifest,'generation-receipt.json':receipt,'brief.json':receipt.brief,'card-text.json':manifest.card_text,'source-printing.json':manifest.source}))files[name]=strToU8(JSON.stringify(value,null,2));
 return {bytes:zipSync(files,{level:0}),manifest};
}

export async function downloadVisualPacket(id,onProgress){
 const {bytes,manifest}=await buildVisualPacket(id,onProgress),url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
 const link=document.createElement('a');link.href=url;link.download=`${manifest.expert_id}-${id}-visual-packet.zip`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 return manifest;
}
