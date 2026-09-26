// Private loopback bridge. Database credentials stay in the existing Supabase CLI.
// Reads work before activation; writes require the reviewed operational receipt.
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {join,delimiter} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createGmailTransport,deliverReview} from '../../supabase/functions/human-approval-action/forge.mjs';
import {python} from './adapters.mjs';

const repo=fileURLToPath(new URL('../../',import.meta.url));
const literal=value=>"'"+String(value).replaceAll("'","''")+"'";
const identity=value=>{if(!/^[a-z0-9][a-z0-9_-]{0,119}$/.test(value||''))throw Error('invalid_connection_identity');return value;};

export function proposalSQL(tenant,{offset=0,search='',state=''}={}) {
  identity(tenant);
  if(!Number.isSafeInteger(offset)||offset<0||offset>100000||typeof search!=='string'||search.length>120||!['','gated','approved','declined'].includes(state))throw Error('invalid_proposal_filter');
  const where=`tenant=${literal(tenant)}${state?' and state='+literal(state):''}${search?' and position(lower('+literal(search)+') in lower(card_title))>0':''}`;
  return `select jsonb_build_object('total',(select count(*) from public.agent_os_proposals where ${where}),'offset',${offset},'limit',50,'rows',coalesce((select jsonb_agg(to_jsonb(p)) from (select proposal_id,card_title,source_type,source_synthetic,card_type,state,workflow_route,task_id,created_at,updated_at from public.agent_os_proposals where ${where} order by updated_at desc,proposal_id offset ${offset} limit 50) p),'[]'::jsonb)) as result`;
}

export function rpcSQL(name,args,tenant,agent) {
  if(args.p_tenant!==tenant)throw Error('tenant_mismatch');
  const fields={forge_approval_snapshot:['p_tenant','p_agent'],forge_approval_command:['p_tenant','p_actor','p_role','p_command','p_input'],forge_approval_job:['p_tenant','p_command','p_input']}[name];
  if(!fields||Object.keys(args).some(k=>!fields.includes(k))||fields.some(k=>!(k in args)))throw Error('rpc_not_allowlisted');
  if(name==='forge_approval_snapshot'&&args.p_agent!==agent)throw Error('agent_mismatch');
  const values=fields.map(k=>`${k} => ${literal(k==='p_input'?JSON.stringify(args[k]):args[k])}${k==='p_input'?'::jsonb':''}`);
  return `select public.${name}(${values.join(',')}) as result`;
}

export async function createCLIQuery({project,dataRoot}) {
  identity(project);await mkdir(dataRoot,{recursive:true});
  return async (sql,rpc=null)=>{
    const path=join(dataRoot,`query-${randomUUID()}.sql`);
    // Files are in the ignored, local operator directory, never a public artifact.
    await writeFile(path,rpc?JSON.stringify(rpc.args):sql,{flag:'wx',mode:0o600});
    try {
      return await new Promise((resolve,reject)=>{
        const args=rpc?['forge-rpc',rpc.name,'--input',path]:['query','--mode','pooler-session','--file',path,'--limit','1'];
        const child=spawn('gbauto-supabase',['--project',project,'--json',...args],{windowsHide:true,env:{...process.env,PYTHONPATH:join(repo,'services/gbauto_supabase/src')+(process.env.PYTHONPATH?delimiter+process.env.PYTHONPATH:'')}});
        let output='';const timer=setTimeout(()=>child.kill(),45000);
        child.stdout.on('data',chunk=>{output+=chunk;if(output.length>5000000)child.kill();});
        child.stderr.resume();
        child.on('error',()=>{clearTimeout(timer);reject(Error('supabase_connection_unavailable'));});
        child.on('close',code=>{clearTimeout(timer);try{const rows=JSON.parse(output);if(code!==0){if(/^[a-z_]+$/.test(rows.error||''))return reject(Error(rows.error));throw Error();}if(rpc){if(!rows.ok)throw Error();return resolve(rows.result);}if(!Array.isArray(rows)||rows.length!==1)throw Error();resolve(rows[0].result);}catch{reject(Error('supabase_request_failed'));}});
      });
    } finally {await unlink(path).catch(()=>{});}
  };
}

export function validateActivation(value,settings) {
  if(value?.runtime_activation_authorized!==true||value.environment!=='internal-pilot'||value.project!==settings.project||value.tenant!==settings.tenant||value.agent!==settings.agent||value.review_url!==settings.reviewURL||value.live_execution!==false||value.sender!=='greg@gbautomation.xyz'||!value.approval_receipt||!Array.isArray(value.allowed_recipients)||value.allowed_recipients.length!==1||value.allowed_recipients[0]!==settings.recipient)throw Error('bound_internal_activation_required');
  return value;
}

export async function drainEmails(service,{transport,config,allowlist}) {
  const job=(command,input)=>service.handle({mode:'forge.job',command,input},{role:'coordinator',actor:'internal-email-worker'});
  const outcomes=[];
  await job('wake',{});
  for(let i=0;i<4;i++) {
    // Never claim generate_plan or resume. They remain visible, pending manual work.
    const item=await job('claim',{kind:'review_email'});if(!item)break;
    let result,state='delivered';
    try {result=await deliverReview(service,item,{transport,allowlist,...config,allowAutoApprove:false});}
    catch {state='ambiguous';result={error:'delivery_requires_reconciliation'};}
    await job('finish',{outbox_id:item.outbox_id,lease_id:item.lease_id,state,result});
    outcomes.push({kind:'review_email',state});
  }
  return outcomes;
}

export async function createConnected({settings,dataRoot,query,send}) {
  for(const k of ['project','tenant','agent'])identity(settings[k]);
  const url=new URL(settings.reviewURL);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.pathname!=='/review'||url.search||url.hash||url.username||url.password)throw Error('loopback_review_required');
  if(!['greg@gbautomation.xyz','gblack686@gmail.com'].includes(settings.recipient))throw Error('internal_recipient_required');
  await mkdir(dataRoot,{recursive:true});
  query ||= await createCLIQuery({project:settings.project,dataRoot});
  const database=await query("select jsonb_build_object('proposal_source',to_regclass('public.agent_os_proposals') is not null,'approvals_ready',to_regprocedure('public.forge_approval_snapshot(text,text)') is not null) as result");
  if(!database.proposal_source)throw Error('native_proposal_source_missing');
  const activation=settings.activation?validateActivation(settings.activation,settings):null;
  if(activation&&!database.approvals_ready)throw Error('approval_migration_required');
  const keyPath=join(dataRoot,'signing-key');let signingSecret;
  try{signingSecret=await readFile(keyPath,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;signingSecret=randomBytes(48).toString('base64url');await writeFile(keyPath,signingSecret,{flag:'wx',mode:0o600});}
  const config={tenant:settings.tenant,agent:settings.agent,operator:settings.recipient,client:settings.recipient,
    recipients:[{id:'internal-feedback',client_id:'*',label:'Internal feedback pilot (Greg)',recipient:settings.recipient}],
    signingSecret,reviewURL:settings.reviewURL,pilot:false,connected:true,engineering:null};
  const connection={mode:activation?'internal_live':'live_read_only',source:'supabase',project:settings.project,tenant:config.tenant,agent:config.agent,approval_ready:database.approvals_ready,writes_enabled:!!activation,email_enabled:!!activation,execution_enabled:false,recipient:settings.recipient,review_host:'this_pc'};
  const rpc=async(name,args)=>{
    if(name!=='forge_approval_snapshot'&&!activation)throw Error('approval_activation_required');
    if(name==='forge_approval_snapshot'&&!database.approvals_ready)return [];
    rpcSQL(name,args,config.tenant,config.agent);
    return query(null,{name,args});
  };
  const transport=activation?createGmailTransport({activation,send:send||(async message=>{
    const path=join(dataRoot,'email-activation.json');await writeFile(path,JSON.stringify(activation),{mode:0o600});
    const receipt=JSON.parse(await python(join(repo,'scripts/forge_approval_email.py'),['--activation',path],message));return receipt.message_id;
  })}):null;
  const validateRequest=async body=>{
    if(body.mode==='forge.decide'&&body.action==='auto_approve')throw Error('implementation_opt_in_not_active_in_internal_connection');
    if(body.mode==='forge.command'&&body.command==='register') {
      if(!activation)throw Error('approval_activation_required');
      const id=body.input?.proposal_id;
      if(typeof id!=='string'||id.length>200)throw Error('invalid_proposal_id');
      const row=await query(`select (select jsonb_build_object('state',state) from public.agent_os_proposals where tenant=${literal(config.tenant)} and proposal_id=${literal(id)}) as result`);
      if(row?.state!=='gated')throw Error('native_proposal_not_pending');
      body.input={proposal_id:id};
    }
  };
  return {config,connection,store:{rpc,close:async()=>{}},profilePath:settings.profile_path,
    validateRequest,
    catalog:input=>query(proposalSQL(config.tenant,input)),
    adapters:{drain:service=>activation?drainEmails(service,{transport,config,allowlist:activation.allowed_recipients}):Promise.resolve([])},
  };
}
