import {authenticate, TENANT} from './contract.mjs';
import {randomUUID} from 'node:crypto';

const PROFILES = Object.freeze({
 'youtube-intel': 'expert-gbautomation-youtube-intel',
 'artist-packet-expert': 'artist-packet-expert',
});
const SOURCE_ROOTS = Object.freeze({
 'youtube-intel': 'experts/gbautomation/youtube-intel/',
 'artist-packet-expert': 'resources/deployments/artist-packet-expert/',
});
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const sourceFor = (source, agent) => {
 if(source === null || source === undefined)return null;
 if(!object(source) || Object.keys(source).sort().join() !== 'path,sha256'
    || typeof source.path !== 'string' || !source.path.startsWith(SOURCE_ROOTS[agent])
    || !/^[a-zA-Z0-9_./-]+\.md$/.test(source.path) || source.path.split('/').includes('..')
    || !sha(source.sha256))throw Error('invalid_request');
 return source;
};

export function makeChatHandler({issuer, registry, db}) {
 return async event => {
  try {
   const claims=authenticate(event,issuer);
   const field=event.fieldName || event.info?.fieldName;
   if(!['forgeChatRead','forgeChatCommand'].includes(field)
      || event.typeName !== (field==='forgeChatRead'?'Query':'Mutation')
      || Object.keys(event.arguments || {}).join()!=='input')throw Error('invalid_request');
   let input=event.arguments.input;
   if(typeof input==='string')input=JSON.parse(input);
   if(!object(input) || JSON.stringify(input).length>10500
      || Object.keys(input).some(key=>!['action','agent_id','session_id','content','source'].includes(key))
      || !['capability','start','send','poll'].includes(input.action)
      || typeof input.agent_id!=='string' || !Object.hasOwn(PROFILES,input.agent_id)
      || (field==='forgeChatRead')!==['capability','poll'].includes(input.action))throw Error('invalid_request');
   const registered=await registry(claims);
   const entries=Array.isArray(registered)?registered:registered?.agents;
   if(!Array.isArray(entries) || !entries.some(row=>row?.tenant_id===TENANT
      && row.agent_id===input.agent_id && row.status==='active'
      && Array.isArray(row.subjects) && row.subjects.includes(claims.sub)))throw Error('agent_access_required');
   if(input.action==='capability') {
    if(Object.keys(input).sort().join()!=='action,agent_id')throw Error('invalid_request');
    const rows=await db('forge_chat_capability',{});
    return {payload:{ok:true,data:{schema_version:'forge-chat-capability.v1',enabled:rows?.enabled===true,tenant_id:TENANT,agent_id:input.agent_id}}};
   }
   if(input.action==='start') {
    if(Object.keys(input).sort().join()!=='action,agent_id')throw Error('invalid_request');
    const id=randomUUID();
    await db('forge_chat_sessions',{method:'POST',body:{id,tenant_id:TENANT,owner_sub:claims.sub,
      agent_id:input.agent_id,profile:PROFILES[input.agent_id],status:'ready'}});
    return {payload:{ok:true,data:{tenant_id:TENANT,agent_id:input.agent_id,session_id:id,status:'ready'}}};
   }
   if(!uuid(input.session_id))throw Error('invalid_request');
   const sessions=await db('forge_chat_sessions',{query:{id:`eq.${input.session_id}`,tenant_id:`eq.${TENANT}`,
     owner_sub:`eq.${claims.sub}`,agent_id:`eq.${input.agent_id}`,profile:`eq.${PROFILES[input.agent_id]}`,select:'id,status',limit:'1'}});
   if(!Array.isArray(sessions)||sessions.length!==1)throw Error('session_access_required');
   if(input.action==='send') {
    if(Object.keys(input).some(k=>!['action','agent_id','session_id','content','source'].includes(k))
      || typeof input.content!=='string' || !input.content.trim() || input.content.length>8000
      || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(input.content))throw Error('invalid_request');
    const source=sourceFor(input.source,input.agent_id);
    await db('forge_chat_turns',{method:'POST',body:{id:randomUUID(),session_id:input.session_id,
      tenant_id:TENANT,owner_sub:claims.sub,agent_id:input.agent_id,profile:PROFILES[input.agent_id],
      content:input.content.trim(),source_path:source?.path||null,source_sha256:source?.sha256||null,status:'pending'}});
   } else if(Object.keys(input).sort().join()!=='action,agent_id,session_id')throw Error('invalid_request');
   const turns=await db('forge_chat_turns',{query:{session_id:`eq.${input.session_id}`,tenant_id:`eq.${TENANT}`,
     owner_sub:`eq.${claims.sub}`,agent_id:`eq.${input.agent_id}`,select:'content,reply,status,created_at',
     order:'created_at.asc',limit:'50'}});
   if(!Array.isArray(turns)||turns.length>50)throw Error('chat_unavailable');
   const messages=[];
   for(const turn of turns){messages.push({role:'user',content:turn.content});if(turn.reply)messages.push({role:'assistant',content:turn.reply});}
   return {payload:{ok:true,data:{tenant_id:TENANT,agent_id:input.agent_id,session_id:input.session_id,
     status:turns.some(turn=>['pending','running'].includes(turn.status))?'running':'ready',messages}}};
  }catch(error){
   return {payload:{ok:false,error:['invalid_request','agent_access_required','session_access_required'].includes(error.message)
     ?error.message:'chat_unavailable'}};
  }
 };
}
