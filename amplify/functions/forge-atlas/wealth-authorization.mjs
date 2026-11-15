import {createHash} from 'node:crypto';
import {authenticate,operatorBootstrap,TENANT} from './contract.mjs';
import {validateResourceManifest} from './resources.mjs';
const sha=/^[a-f0-9]{64}$/;
// No browser claim, owner or URL participates in the server's resource selection.
export function makeWealthAuthority({issuer,operatorSubject,registry,loadManifest,binding,tenantBindings}) {
 const available=(row,catalog)=>!!binding&&row?.app_id==='wealth-platform'&&row.kind==='ui'
  &&row.delivery_mode==='live_app'&&row.id===binding.resource_id&&row.owner_expert===binding.expert_id
  &&row.source_commit===binding.source_commit&&catalog===binding.catalog_sha256;
 return {
  available,
  verifyIdentity:event=>authenticate(event,issuer),
  tenantFor:async(sub,expert)=>{
   if(!binding||expert!==binding.expert_id)return null;
   return tenantBindings?.[createHash('sha256').update(sub.toLowerCase()).digest('hex')]??null;
  },
  async authorize({claims,expertId,resourceId,catalogSha256}) {
   if(!binding||claims.iss!==issuer||!operatorBootstrap(claims.sub,operatorSubject)
    ||expertId!==binding.expert_id||resourceId!==binding.resource_id||catalogSha256!==binding.catalog_sha256)return false;
   const registered=await registry(claims),entries=Array.isArray(registered)?registered:registered?.agents;
   if(!Array.isArray(entries)||entries.length>100||!entries.some(row=>row?.tenant_id===TENANT
    &&row.agent_id===expertId&&row.status==='active'&&sha.test(row.config_sha256)
    &&typeof row.display_name==='string'&&row.display_name.length>0&&row.display_name.length<=120
    &&Array.isArray(row.subjects)&&row.subjects.includes(claims.sub)))return false;
   const manifest=await loadManifest();
   if(manifest.sha256!==catalogSha256)return false;
   const data=validateResourceManifest(manifest.bytes,manifest.sha256);
   return data.resources.some(row=>available(row,manifest.sha256));
  },
 };
}
