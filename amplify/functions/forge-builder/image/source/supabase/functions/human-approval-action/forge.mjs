// Shared by the existing Edge Function and the isolated local PostgreSQL pilot.
// No secrets, provider calls or runtime activation occur at module load.
export const ACTIONS = Object.freeze(['revise', 'decline', 'snooze', 'approve', 'auto_approve']);
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async value => hex(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value));
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unb64 = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key = secret => {
  if (typeof secret !== 'string' || secret.length < 32) throw Error('signing_secret_not_configured');
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
};
export async function signCapability(claims, secret) {
  const payload = b64(encoder.encode(JSON.stringify(claims)));
  return payload+'.'+b64(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(payload)));
}
export async function verifyCapability(token, secret) {
  if (typeof token !== 'string' || token.length > 10000) throw Error('invalid_capability');
  const parts=token.split('.');
  if (parts.length !== 2 || !parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p))) throw Error('invalid_capability');
  if (!await crypto.subtle.verify('HMAC',await key(secret),unb64(parts[1]),encoder.encode(parts[0]))) throw Error('invalid_signature');
  const claims=JSON.parse(new TextDecoder().decode(unb64(parts[0])));
  if (claims.aud!=='forge-approval.v1' || !claims.jti || !claims.tenant || !['operator','client'].includes(claims.role) || !Number.isInteger(claims.exp)) throw Error('invalid_claims');
  // The transaction checks expiry/revocation for new decisions, while permitting
  // exact consumed retries to read their previous result after an expiry.
  return claims;
}

export function reviewEmail({title,gate,role,url,token,allowAutoApprove=true}) {
  const base=new URL(url);
  if (base.protocol!=='https:' && !(base.protocol==='http:' && ['127.0.0.1','localhost'].includes(base.hostname))) throw Error('unsafe_review_url');
  const labels={revise:'Revise',decline:'Decline',snooze:'Snooze',approve:'Approve',auto_approve:'Auto-approve implementation'};
  const actions=ACTIONS.filter(a=>a!=='auto_approve' || (allowAutoApprove && role==='operator' && gate==='scope'));
  const links=actions.map(action=>{
    const link=new URL(base);link.hash=new URLSearchParams({capability:token,action}).toString();
    return {action,label:labels[action],url:link.href};
  });
  return {subject:`${role==='client'?'Feedback requested':'Approval requested'}: ${title}`,
    html:`<h1>${escape(title)}</h1><p>${role==='client'?'Your response is client feedback. Greg authorizes the work.':'Review the exact document version and confirm your decision.'}</p><p>${links.map(l=>`<a style="display:inline-block;padding:12px;margin:4px;border:1px solid #D6D4C8;border-radius:8px;color:#191919" href="${escape(l.url)}">${l.label}</a>`).join('')}</p><p>Opening a link does not record a decision. This link expires and is specific to your role.</p>`,links};
}

export function validateRoutes(document, readbacks) {
  const routes={intake:['second-brain/intelligence/planning-intakes/','.json'],plan:['second-brain/plans/','.html'],architecture:['second-brain/plans/','.architecture.yaml']};
  if (!Array.isArray(document.body.artifacts) || document.body.artifacts.length!==3) throw Error('three_canonical_artifacts_required');
  if (!Array.isArray(readbacks) || readbacks.length!==3) throw Error('artifact_readback_required');
  const seen=new Set();
  for (const artifact of document.body.artifacts) {
    const route=routes[artifact.kind];
    if (!route || seen.has(artifact.kind) || typeof artifact.path!=='string' || !artifact.path.startsWith(route[0]) ||
        !artifact.path.endsWith(route[1]) || /[\\:%?#\x00-\x1f]/.test(artifact.path) || artifact.path.split('/').some(p=>p==='..'||p==='.'||p==='') ||
        !/^[a-f0-9]{64}$/.test(artifact.sha256) || artifact.workflow_id!==document.workflow_id || artifact.scope_sha256!==document.body.scope_sha256 ||
        artifact.tenant!==document.body.tenant || !artifact.artifact_id) throw Error('artifact_destination_mismatch');
    const readback=readbacks.find(r=>r.kind===artifact.kind);
    if (!readback || readback.path!==artifact.path || readback.sha256!==artifact.sha256 || readback.artifact_id!==artifact.artifact_id ||
        readback.tenant!==artifact.tenant || readback.workflow_id!==artifact.workflow_id || readback.scope_sha256!==artifact.scope_sha256 || readback.index_readback!==true) throw Error('artifact_readback_mismatch');
    if (artifact.kind!=='intake' && artifact.sha256!==document.body.binding[`${artifact.kind}_sha256`]) throw Error('artifact_binding_mismatch');
    seen.add(artifact.kind);
  }
  return {schema_version:'forge-artifact-routing.v1',status:'pass',document_sha256:document.sha256,artifacts:readbacks};
}

// An independent validator attests semantic scope conformance separately. This
// deterministic check is necessary but does not pretend to understand arbitrary
// generated prose. Missing/ambiguous conformance leaves approval with Greg.
export function boundedPlan(scope, plan, grant) {
  if (!grant) return {within:false,reason:'manual_approval'};
  const limits=plan.limits || {}, binding=plan.binding || {};
  const subset=(a,b)=>Array.isArray(a)&&a.length>0&&Array.isArray(b)&&a.every(x=>b.includes(x));
  const ok=Date.parse(grant.expires_at)>Date.now() && grant.scope_sha256===scope.sha256 && plan.scope_sha256===scope.sha256 &&
    subset(limits.repositories,grant.repositories) && subset(limits.environments,grant.environments) && subset(limits.operations,grant.operations) &&
    subset(binding.phases,grant.phases) && Number.isFinite(limits.cost)&&limits.cost>=0&&limits.cost<=grant.max_cost &&
    subset(grant.excluded_actions,binding.excluded_actions) &&
    ['base_commit','profile_sha256','map_sha256'].every(k=>binding[k]===grant[k]) &&
    subset(plan.deliverable_ids,scope.body.deliverables.map(d=>typeof d==='string'?d:d.id)) &&
    subset(plan.acceptance_ids,scope.body.acceptance.map(d=>typeof d==='string'?d:d.id));
  return {within:ok,reason:ok?'bounded_checks_pass':'outside_grant_or_missing_bounds'};
}

export function createForgeService({rpc,config,readArtifacts}) {
  const {tenant,agent,operator,client,signingSecret,reviewURL}=config;
  const recipients=config.recipients||[{id:'client',client_id:'*',label:'Client feedback',recipient:client}];
  const recipientFor=(role,w)=>{
    if(role==='operator')return operator;
    const scope=w.documents.find(d=>d.gate==='scope'&&d.version===w.scope_version);
    const id=scope?.body.client_recipient;
    return recipients.find(r=>r.id===id&&(r.client_id==='*'||r.client_id===w.client_id))?.recipient;
  };
  if (![tenant,agent,operator].every(v=>typeof v==='string'&&v.length>0)) throw Error('scope_configuration_required');
  const command=(role,actor,name,input)=>rpc('forge_approval_command',{p_tenant:tenant,p_actor:actor,p_role:role,p_command:name,p_input:input});
  const snapshot=()=>rpc('forge_approval_snapshot',{p_tenant:tenant,p_agent:agent});
  const contextForGrant=grant=>{
    if(config.engineering && !['base_commit','profile_sha256','map_sha256'].every(k=>grant?.[k]===config.engineering[k]))throw Error('engineering_context_changed');
  };
  const workflow=async id=>{
    const w=(await snapshot()).find(w=>w.workflow_id===id);
    if (!w) throw Error('workflow_not_found_in_agent_scope');
    return w;
  };
  const activeDocument=w=>w.documents.find(d=>d.gate===w.gate && d.version===(w.gate==='scope'?w.scope_version:w.plan_version));
  async function mint(id,role) {
    if (!['operator','client'].includes(role)) throw Error('invalid_recipient_role');
    const w=await workflow(id),d=activeDocument(w),recipient=recipientFor(role,w);
    if (!recipient || !d) throw Error('review_recipient_required');
    const claims={aud:'forge-approval.v1',jti:crypto.randomUUID(),tenant,agent,workflow_id:id,gate:w.gate,document_version:d.version,document_sha256:d.sha256,role,recipient,exp:Math.floor(Date.now()/1000)+3600};
    const token=await signCapability(claims,signingSecret);
    await command('operator',operator,'mint',{...claims,expires_at:new Date(claims.exp*1000).toISOString(),token_sha256:await sha256(token)});
    return {capability:token,expires_at:claims.exp,role,document_sha256:d.sha256,version:d.version};
  }
  async function handle(body,principal=null) {
    if (!body || typeof body!=='object' || Array.isArray(body) || JSON.stringify(body).length>500000) throw Error('invalid_request');
    const mode=body.mode;
    if (mode==='forge.review' || mode==='forge.decide') {
      const claims=await verifyCapability(body.capability,signingSecret);
      if(claims.tenant!==tenant || claims.agent!==agent) throw Error('capability_scope_mismatch');
      const input={jti:claims.jti,token_sha256:await sha256(body.capability)};
      if(mode==='forge.decide') {
        if(body.confirmed!==true) throw Error('confirmation_required');
        if(!ACTIONS.includes(body.action)) throw Error('unknown_action');
        if(body.action==='auto_approve')contextForGrant(body.grant);
        Object.assign(input,{action:body.action,note:body.note||'',snooze_until:body.snooze_until??null,grant:body.grant??null});
      }
      const result=await command(claims.role,claims.recipient,mode==='forge.review'?'review':'decide',input);
      if(mode==='forge.review'&&claims.role==='operator')result.engineering=config.engineering||null;
      return result;
    }
    if(!principal || !['operator','builder','validator','coordinator'].includes(principal.role)) throw Error('authentication_required');
    if(mode==='forge.snapshot') {
      if(principal.role!=='operator') throw Error('operator_required');
      return {schema_version:'forge-approval-snapshot.v1',tenant,agent,workflows:await snapshot(),mode:config.pilot?'local_pilot':'private_service',engineering:config.engineering||null,recipient_options:recipients.map(({id,client_id,label})=>({id,client_id,label})),reviewer:'greg'};
    }
    if(mode==='forge.mint') {
      if(principal.role!=='operator') throw Error('operator_required');
      return mint(body.workflow_id,body.recipient_role||'operator');
    }
    if(mode==='forge.command') {
      const input=structuredClone(body.input||{}), allowed={operator:['register','accept','scope','revise','revoke_grant'],builder:['plan'],coordinator:['delegate','release'],validator:[]};
      if(!allowed[principal.role].includes(body.command)) throw Error('role_command_denied');
      if(body.command==='register') input.agent_id=agent;
      else await workflow(input.workflow_id);
      if(body.command==='plan' && input.document?.tenant!==tenant) throw Error('document_tenant_mismatch');
      if(body.command==='scope') {
        const w=await workflow(input.workflow_id),d=input.document;
        const ids=a=>Array.isArray(a)&&a.length>0&&a.every(x=>typeof x==='string'?x.trim().length>0:x&&typeof x.id==='string'&&x.id.trim().length>0);
        const strings=a=>Array.isArray(a)&&a.every(x=>typeof x==='string'&&x.trim().length>0);
        if(!d||typeof d.outcome!=='string'||!d.outcome.trim()||!ids(d.deliverables)||!ids(d.acceptance)||!strings(d.repositories)||!d.repositories.length||!strings(d.exclusions)||typeof d.environment!=='string'||!d.environment.trim())throw Error('scope_intake_incomplete');
        if(d?.reviewer!=='greg'||!Array.isArray(d.dependencies)||!recipients.some(r=>r.id===d.client_recipient&&(r.client_id==='*'||r.client_id===w.client_id)))throw Error('scope_review_context_required');
      }
      if(body.command==='delegate') {
        const w=await workflow(input.workflow_id),d=activeDocument(w),s=w.documents.find(d=>d.gate==='scope'&&d.version===w.scope_version);
        if(!boundedPlan(s,d.body,w.grant_data).within) throw Error('plan_outside_scope_grant');
      }
      if(body.command==='release') {
        const w=await workflow(input.workflow_id),d=activeDocument(w);
        if(!readArtifacts)throw Error('artifact_readback_required');
        validateRoutes(d,await readArtifacts(d));
        if(config.engineering&&!['base_commit','profile_sha256','map_sha256'].every(k=>d.body.binding[k]===config.engineering[k]))throw Error('engineering_context_changed');
      }
      return command(principal.role,principal.actor,body.command,input);
    }
    if(mode==='forge.validate') {
      if(principal.role!=='validator' || !readArtifacts) throw Error('independent_validator_required');
      const w=await workflow(body.workflow_id),d=activeDocument(w);
      const readbacks=await readArtifacts(d); // Supplied by the private validator adapter, never browser JSON.
      const routing=validateRoutes(d,readbacks);
      const s=w.documents.find(d=>d.gate==='scope'&&d.version===w.scope_version);
      const bounded=boundedPlan(s,d.body,w.grant_data);
      return command('validator',principal.actor,'validate_plan',{workflow_id:w.workflow_id,document_sha256:d.sha256,routing,passed:body.passed===true,scope_conforms:body.scope_conforms===true&&bounded.within});
    }
    if(mode==='forge.retry') {
      if(principal.role!=='operator')throw Error('operator_required');
      const w=await workflow(body.workflow_id);
      if(!w.deliveries.some(o=>o.outbox_id===body.outbox_id))throw Error('job_not_found_in_workflow');
      return rpc('forge_approval_job',{p_tenant:tenant,p_command:'retry',p_input:{outbox_id:body.outbox_id,agent_id:agent}});
    }
    if(mode==='forge.job') {
      if(principal.role!=='coordinator' || !['claim','finish','wake','reconcile'].includes(body.command)) throw Error('coordinator_required');
      return rpc('forge_approval_job',{p_tenant:tenant,p_command:body.command,p_input:{...body.input,agent_id:agent}});
    }
    throw Error('unsupported_mode');
  }
  return {handle,mint,workflow,snapshot,activeDocument,reviewEmail,recipientFor};
}

export async function deliverReview(service, job, {transport,allowlist,reviewURL,operator,client,allowAutoApprove=true}) {
  if(job.kind!=='review_email' || job.state!=='claimed') throw Error('claimed_email_job_required');
  const w=await service.workflow(job.workflow_id);
  if(w.state!=='review'||w.gate!==job.gate||(w.gate==='scope'?w.scope_version:w.plan_version)!==job.document_version) throw Error('stale_delivery');
  const recipient=service.recipientFor(job.recipient_role,w);
  if(!Array.isArray(allowlist)||!allowlist.includes(recipient)) throw Error('recipient_not_allowlisted');
  const minted=await service.mint(w.workflow_id,job.recipient_role);
  const message=reviewEmail({title:w.title,gate:w.gate,role:job.recipient_role,url:reviewURL,token:minted.capability,allowAutoApprove});
  // Provider timeout is ambiguous. Caller must finish the job as ambiguous and
  // reconcile before another send. Transport acceptance is not inbox proof.
  const result=await transport({to:recipient,from:'greg@gbautomation.xyz',...message,correlation_id:job.outbox_id});
  if(!result?.message_id||!['fixture','gmail'].includes(result.channel)) throw Error('delivery_receipt_required');
  return {schema_version:'forge-approval-delivery.v1',message_id:result.message_id,channel:result.channel,inbox_verified:false,recipient_role:job.recipient_role,
    sent_at:new Date().toISOString(),correlation_id:job.outbox_id,template_sha256:await sha256(message.html)};
}

// Supply the existing Gmail adapter only after an operational pilot receipt has
// named its environment, allowlist and sender. No provider dependency is loaded
// or called by this factory before those checks succeed.
export function createGmailTransport({send,activation}) {
  if(activation?.runtime_activation_authorized!==true||activation.environment!=='internal-pilot'||
    !activation.approval_receipt||!Array.isArray(activation.allowed_recipients)||!activation.allowed_recipients.length||
    activation.sender!=='greg@gbautomation.xyz')throw Error('internal_pilot_activation_required');
  return async message=>{
    if(!activation.allowed_recipients.includes(message.to))throw Error('recipient_not_allowlisted');
    const id=await send({to:message.to,subject:message.subject,body_html:message.html,
      body_text:message.links.map(l=>l.label+': '+l.url).join('\n'),correlation_id:message.correlation_id});
    if(!id)throw Error('delivery_receipt_required');
    return {message_id:String(id),channel:'gmail'};
  };
}
