// Atlas presentation is retained. These adapters add exact expert-owned reads;
// account credentials and signed object URLs never cross the document channel.
export const WORKSPACE_WINDOWS = Object.freeze([
 'skills','commands','presence','chat','canvas','proposals','checks','config',
 'knowledge','prds','kanban','artifacts','console','changes','atlas','history',
 'table','schedule','resources',
]);
const slug=/^[a-z][a-z0-9-]{1,62}$/;
const resource=/^[a-z][a-z0-9._-]{2,159}$/;
const sha=/^[a-f0-9]{64}$/;
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
const deny=()=>{throw Error('Workspace resource unavailable');};

export function workspaceLocation(pathname,search='') {
 const match=/^\/(bench|atlas)\/([a-z][a-z0-9-]{1,62})\/?$/.exec(pathname);
 if(!match)return null;
 const params=new URLSearchParams(search);
 const windowId=params.get('window');
 const resourceId=params.get('resource');
 return {mode:match[1],agentId:match[2],windowId:WORKSPACE_WINDOWS.includes(windowId)?windowId:null,
  resourceId:resource.test(resourceId||'')?resourceId:null};
}
export function workspaceHref(agentId,{mode='bench',windowId='resources',resourceId}={}) {
 if(!slug.test(agentId)||!['bench','atlas'].includes(mode)||!WORKSPACE_WINDOWS.includes(windowId)
  ||resourceId!==undefined&&!resource.test(resourceId))deny();
 const query=new URLSearchParams({window:windowId});if(resourceId)query.set('resource',resourceId);
 return `/${mode}/${agentId}?${query}`;
}

export function makeWorkspaceReader({readCatalog,readArtifact,documentFor,signal}) {
 return async (view,input,agentId)=>{
  if(!slug.test(agentId)||!plain(input))deny();
  if(view==='workspaceLookup'){
   if(Object.keys(input).join()!=='resource_id'||!resource.test(input.resource_id))deny();
   const result=await readCatalog({search:input.resource_id,owner:agentId},agentId);
   if(signal?.aborted||result.agent_id!==agentId||result.rows.some(row=>row.owner_expert!==agentId))deny();
   return {...result,rows:result.rows.filter(row=>row.id===input.resource_id),next:null};
  }
  if(view==='workspaceCatalog'){
   if(Object.keys(input).some(k=>!['kind','search','offset'].includes(k))
    ||!['ui','kb','process'].includes(input.kind)
    ||input.search!==undefined&&(typeof input.search!=='string'||input.search.length>120||/[\x00-\x1f\x7f]/.test(input.search))
    ||input.offset!==undefined&&(!Number.isSafeInteger(input.offset)||input.offset<0||input.offset>1500))deny();
   const result=await readCatalog({...input,owner:agentId},agentId);
   if(signal?.aborted||result.agent_id!==agentId||result.rows.some(row=>row.owner_expert!==agentId))deny();
   return result;
  }
  if(view==='workspaceArtifact'){
   if(Object.keys(input).sort().join()!=='catalog_sha256,resource_id'
    ||!resource.test(input.resource_id)||!sha.test(input.catalog_sha256))deny();
   const {asset,bytes}=await readArtifact(input.resource_id,input.catalog_sha256,agentId,signal);
   // The fleet gallery can read another owner's item; an expert window cannot.
   if(signal?.aborted||asset.owner_expert!==agentId||asset.agent_id!==agentId)deny();
   return {schema_version:'forge-workspace-artifact.v1',agent_id:agentId,resource_id:asset.resource_id,
    catalog_sha256:asset.catalog_sha256,sha256:asset.sha256,observed_at:asset.observed_at,
    freshness:asset.freshness,html:documentFor(bytes,asset.media_type)};
  }
  deny();
 };
}
