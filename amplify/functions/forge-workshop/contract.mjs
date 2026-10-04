import { createHash } from 'node:crypto';

export const EXPERT = 'gbautomation/youtube-intel';
export const TENANT = 'gbautomation';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Cognito subjects use a UUID-shaped hex layout without promising RFC version
// or variant bits. AppSync issuer and tenant claims still bind the actor.
export const COGNITO_SUBJECT = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
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
  if(!issuer || !claims || claims.iss!==issuer || !COGNITO_SUBJECT.test(claims.sub||'')) deny('authentication_required');
  const groups=claims['cognito:groups'];
  if(!Array.isArray(groups) || !groups.includes('tenant-gbautomation')) deny('tenant_access_required');
  return {issuer,subject:claims.sub,tenant:TENANT};
}
export function inputFor(event) {
  const a=event.arguments||{};
  if(!exact(a,['input'])) {
    console.warn('forge_workshop_argument_shape', {count:Object.keys(a).length,hasInput:Object.hasOwn(a,'input')});
    deny('invalid_request');
  }
  let input=a.input;
  // AppSync's AWSJSON argument may arrive as an object, a JSON document, or
  // a JSON-encoded document, depending on the generated client serializer.
  // Bound parsing to two layers and keep the exact command schema below.
  for(let layer=0;layer<2 && typeof input==='string';layer++) {
    if(input.length>8192) deny('invalid_request');
    try { input=JSON.parse(input); } catch { deny('invalid_request'); }
  }
  if(!input || JSON.stringify(input).length>8192) deny('invalid_request');
  const keys={read:['expert_id'],save:['expert_id','config','expected_version','request_id'],run:['expert_id','recipe','request_id'],status:['expert_id','run_id']};
  // Amplify's deployed Lambda resolver sends fieldName at the event root.
  // Keep info.fieldName for direct contract fixtures and reject disagreement.
  if(event.fieldName && event.info?.fieldName && event.fieldName!==event.info.fieldName) deny('invalid_request');
  const fieldName=event.fieldName||event.info?.fieldName;
  const command={forgeWorkshopRead:'read',forgeWorkshopSave:'save',forgeWorkshopRun:'run',forgeWorkshopStatus:'status'}[fieldName];
  if(!command || !exact(input,keys[command])) {
    console.warn('forge_workshop_input_shape', {fieldKnown:Boolean(command),type:typeof input,
      count:input&&typeof input==='object'?Object.keys(input).length:null,
      hasExpert:input&&typeof input==='object'&&Object.hasOwn(input,'expert_id')});
    deny('invalid_request');
  }
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

export function makeHandler({issuer,enabled,rpc,catalog,pulseRead=async()=>null}) {
  return async event=>{
    try {
      const actor=principal(event,issuer);
      const {command,input}=inputFor(event);
      if(!enabled) deny('workshop_not_enabled');
      const result=await rpc('agent_forge_workshop_command',{
        p_issuer:actor.issuer,p_subject:actor.subject,p_command:command,
        p_input:input,p_request_sha256:digest({command,input}),
      });
      if(!result?.ok) {
        const code=typeof result?.error==='string' && /^[a-z][a-z0-9_]{1,63}$/.test(result.error)
          ? result.error : 'workshop_unavailable';
        console.warn('forge_workshop_rejected', {command,code});
        return {payload:{ok:false,error:code}};
      }
      if(command==='read') {
        // Pulse is optional telemetry. A collector outage must not hide drafts
        // or the last health receipt from an authenticated operator.
        const pulse=await Promise.resolve().then(pulseRead).catch(()=>null);
        return {payload:{...result,catalog,pulse}};
      }
      return {payload:result};
    } catch(error) {
      // Never return database errors, environment, raw tokens, or provider output.
      console.warn('forge_workshop_failed', {code:error instanceof WorkshopError?error.code:'workshop_unavailable'});
      return {payload:{ok:false,error:error instanceof WorkshopError?error.code:'workshop_unavailable'}};
    }
  };
}
