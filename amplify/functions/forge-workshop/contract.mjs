import { createHash } from 'node:crypto';

export const EXPERT = 'gbautomation/youtube-intel';
export const TENANT = 'gbautomation';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class WorkshopError extends Error { constructor(code) { super(code); this.code=code; } }
const deny = code => { throw new WorkshopError(code); };
export function exact(value, keys) {
  return value && typeof value==='object' && !Array.isArray(value)
    && Object.keys(value).length===keys.length && keys.every(k=>Object.hasOwn(value,k));
}
export function principal(event, issuer) {
  // This handler is invoked only by a Cognito-authorized AppSync operation.
  // Never accept identity, tenant, owner, or email from GraphQL arguments.
  const claims=event?.identity?.claims;
  if(!issuer || !claims || claims.iss!==issuer || !UUID.test(claims.sub||'')) deny('authentication_required');
  const groups=claims['cognito:groups'];
  if(!Array.isArray(groups) || !groups.includes('tenant-gbautomation')) deny('tenant_access_required');
  return {issuer,subject:claims.sub,tenant:TENANT};
}
export function inputFor(event) {
  const a=event.arguments||{};
  if(!exact(a,['input'])) deny('invalid_request');
  let input=a.input;
  if(typeof input==='string') { try { input=JSON.parse(input); } catch { deny('invalid_request'); } }
  if(!input || JSON.stringify(input).length>8192) deny('invalid_request');
  const keys={read:['expert_id'],save:['expert_id','config','expected_version','request_id'],run:['expert_id','recipe','request_id'],status:['expert_id','run_id']};
  const command={forgeWorkshopRead:'read',forgeWorkshopSave:'save',forgeWorkshopRun:'run',forgeWorkshopStatus:'status'}[event.info?.fieldName];
  if(!command || !exact(input,keys[command])) deny('invalid_request');
  if(input.expert_id!==EXPERT) deny('expert_not_allowed');
  if(['save','run'].includes(command) && !UUID.test(input.request_id||'')) deny('invalid_request_id');
  if(command==='status' && !UUID.test(input.run_id||'')) deny('invalid_run_id');
  if(command==='run' && input.recipe!=='health') deny('recipe_not_allowed');
  if(command==='save') {
    if(!Number.isInteger(input.expected_version)||input.expected_version<0) deny('invalid_version');
    const c=input.config;
    if(!exact(c,['name','purpose','model','scan_cap','approvals'])
      || typeof c.name!=='string'||c.name.trim().length<1||c.name.length>100
      || typeof c.purpose!=='string'||c.purpose.trim().length<1||c.purpose.length>2000
      || c.model!=='gpt-5.6-sol'||c.approvals!=='manual'
      || !Number.isInteger(c.scan_cap)||c.scan_cap<1||c.scan_cap>50) deny('invalid_configuration');
    if(/(?:sk-[\w-]{16,}|gh[pousr]_[\w]{20,}|-----BEGIN .*PRIVATE KEY|(?:password|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=])/i.test(JSON.stringify(c))) deny('secret_like_configuration');
  }
  return {command,input};
}
export function canonical(value) {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');

export function makeHandler({issuer,enabled,rpc,catalog}) {
  return async event=>{
    try {
      const actor=principal(event,issuer);
      const {command,input}=inputFor(event);
      if(!enabled) deny('workshop_not_enabled');
      const result=await rpc('agent_forge_workshop_command',{
        p_issuer:actor.issuer,p_subject:actor.subject,p_command:command,
        p_input:input,p_request_sha256:digest({command,input}),
      });
      if(!result?.ok) return {payload:{ok:false,error:result?.error||'workshop_unavailable'}};
      return {payload:{...result,...(command==='read'?{catalog}:{})}};
    } catch(error) {
      // Never return database errors, environment, raw tokens, or provider output.
      return {payload:{ok:false,error:error instanceof WorkshopError?error.code:'workshop_unavailable'}};
    }
  };
}
