// Private, non-executing hosted pilot. Reuses the local SQL, gates and generator.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createStore} from '../forge-approval-pilot/store.mjs';
import {createAdapters,python} from '../forge-approval-pilot/adapters.mjs';
import {createBuilder} from '../forge-approval-pilot/builder.mjs';
import {reserveVoice,MAX_VOICE_SECONDS} from '../forge-approval-pilot/voice.mjs';
import {createForgeService} from '../../supabase/functions/human-approval-action/forge.mjs';

const repo=fileURLToPath(new URL('../../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export async function openRuntime({dataRoot,bootstrapRoot,actor}) {
  if(!uuid.test(actor))throw Error('hosted_operator_required');
  dataRoot=resolve(dataRoot);bootstrapRoot=resolve(bootstrapRoot);
  if(dataRoot===repo||bootstrapRoot===dataRoot)throw Error('isolated_runtime_required');
  const settings=JSON.parse(await readFile(join(bootstrapRoot,'settings.json'),'utf8'));
  if(settings.tenant_id!=='gbautomation'||settings.agent_id!=='artist-packet-expert'||
    !Array.isArray(settings.voice_usage)||settings.voice_usage.length>100||
    !settings.voice_usage_reviewed)throw Error('hosted_bootstrap_invalid');
  const profilePath=join(bootstrapRoot,'profile.json');
  const profile=JSON.parse(await readFile(profilePath,'utf8'));
  if(profile.avatar?.image_path!=='assets/portrait.png')throw Error('hosted_portrait_route_invalid');
  const visuals={tenant_id:settings.tenant_id,agent_id:settings.agent_id};
  for(const [role,name] of Object.entries({card:'card.png',model:'model.glb',receipts:'receipts.json'})) {
    const a=settings.visuals?.[role];if(!a)continue;
    if(!/^[a-f0-9]{64}$/.test(a.sha256))throw Error('visual_hash_invalid');
    const path=join(bootstrapRoot,'assets',name);
    if(hash(await readFile(path))!==a.sha256)throw Error('visual_hash_mismatch');
    visuals[role]={path,sha256:a.sha256};
  }
  await mkdir(dataRoot,{recursive:true});
  // The canonical policy validates its context pointers. Private operator
  // preferences arrive with bootstrap, never in website source or the image.
  const pythonRoot=join(dataRoot,'python-source');
  const source=JSON.parse(await readFile(join(repo,'host-source-manifest.json'),'utf8'));
  if(!Array.isArray(source.files)||source.files.length>1000)throw Error('source_manifest_invalid');
  for(const file of source.files){
    if(typeof file.path!=='string'||!/^[-a-zA-Z0-9_./]+$/.test(file.path)||file.path.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('source_manifest_invalid');
    const raw=await readFile(join(repo,file.path));if(hash(raw)!==file.sha256)throw Error('source_manifest_changed');
    const target=join(pythonRoot,file.path);await mkdir(resolve(target,'..'),{recursive:true});await writeFile(target,raw);
  }
  const preferences=join(pythonRoot,'second-brain/os/USER.md');await mkdir(resolve(preferences,'..'),{recursive:true});
  await writeFile(preferences,await readFile(join(bootstrapRoot,'operator-preferences.md')));
  const runPython=(script,args,input)=>{const name=relative(repo,script);if(name.startsWith('..'))throw Error('python_route_invalid');return python(join(pythonRoot,name),args,input);};
  const visualsPath=join(dataRoot,'visuals.json');await writeFile(visualsPath,JSON.stringify(visuals));
  let signingSecret;
  try{signingSecret=await readFile(join(dataRoot,'signing-key'),'utf8');}
  catch(e){if(e.code!=='ENOENT')throw e;signingSecret=randomBytes(48).toString('base64url');await writeFile(join(dataRoot,'signing-key'),signingSecret,{flag:'wx'});}
  const receipt=JSON.parse(await readFile(join(repo,'artifacts/forge-approval-intake-2026-09-24/implementation-approval.json'),'utf8'));
  const config={tenant:settings.tenant_id,agent:settings.agent_id,operator:'operator@pilot.invalid',client:'client@pilot.invalid',
    signingSecret,reviewURL:'https://gbautomation.xyz/atlas/artist-packet-expert',pilot:true,
    engineering:{base_commit:receipt.base_commit,profile_sha256:receipt.engineering_profile.hash,map_sha256:receipt.repository_map.hash}};
  const store=await createStore(join(dataRoot,'postgres'));
  try {
    const adapters=await createAdapters({store,config,dataRoot,runPython});
    const service=createForgeService({rpc:store.rpc,config,readArtifacts:adapters.readArtifacts});
    const builder=await createBuilder({store,service,adapters,config,dataRoot,profilePath,visualsPath,runPython,
      approvalContext:'hosted_worker',principal:{role:'operator',actor},
      voiceFactory:({store,draftId})=>({status:()=>({provider:'elevenlabs',configured:settings.voice_enabled===true,max_seconds:MAX_VOICE_SECONDS,max_sessions_per_day:3,
        reason:settings.voice_enabled?null:'Voice connection is awaiting release setup',audio_stored_by_forge:false}),
        start:confirmed=>{if(!settings.voice_enabled)throw Error('voice_not_configured');return reserveVoice({store,draftId,confirmed});}})});
    if(Object.entries(builder.binding).some(([k,v])=>settings[k]!==v))throw Error('hosted_bootstrap_binding_mismatch');
    await store.db.exec(`create table if not exists hosted_processed_commands(id text primary key,actor text not null,input_sha256 text not null,result jsonb not null);
      create table if not exists hosted_bootstrap_receipt(id text primary key);`);
    if(!(await store.db.query("select id from hosted_bootstrap_receipt where id='voice_usage'")).rows.length) {
      for(const usage of settings.voice_usage){
        if(typeof usage.id!=='string'||usage.id.length>150||!Number.isFinite(Date.parse(usage.created_at))||Date.parse(usage.created_at)>Date.now())throw Error('voice_usage_seed_invalid');
        await store.db.query('insert into pilot_builder_voice(id,draft_id,created_at) values($1,$2,$3) on conflict do nothing',[usage.id,(await builder.read()).draft.id,usage.created_at]);
      }
      await store.db.query("insert into hosted_bootstrap_receipt values('voice_usage')");
    }
    const project=state=>({...state,mode:'hosted_internal_pilot',visuals:{},draft:{...state.draft,
      packet:state.draft.packet?{...state.draft.packet,url:null,download:null}:null}});
    async function execute(command) {
      if(!uuid.test(command.id)||command.actor!==actor||!/^[a-f0-9]{64}$/.test(command.input_sha256))throw Error('hosted_command_invalid');
      const prior=(await store.db.query('select * from hosted_processed_commands where id=$1',[command.id])).rows[0];
      if(prior){if(prior.actor!==actor||prior.input_sha256!==command.input_sha256)throw Error('idempotency_conflict');return {result:prior.result,replayed:true};}
      const body=command.body;
      if(!body||!['initialize','save','propose','accept','decide','generate','voice'].includes(body.action))throw Error('unknown_builder_action');
      if(JSON.stringify(body.binding)!==JSON.stringify(builder.binding)) {
        // Key order is irrelevant, but extra keys and every identity value matter.
        if(!body.binding||Object.keys(body.binding).length!==Object.keys(builder.binding).length||Object.entries(builder.binding).some(([k,v])=>body.binding[k]!==v))throw Error('builder_scope_mismatch');
      }
      const value=body.action==='initialize'?await builder.read():await builder.handle(body);
      const result=body.action==='voice'?{voice_reservation:value}:project(value);
      await store.db.query('insert into hosted_processed_commands values($1,$2,$3,$4)',[command.id,actor,command.input_sha256,JSON.stringify(result)]);
      return {result,replayed:false};
    }
    async function packet(id) {
      if(!/^[a-f0-9]{64}$/.test(id))throw Error('packet_path_denied');
      const row=(await store.db.query('select body from pilot_builder_packets where id=$1',[id])).rows[0];
      if(!row)throw Error('packet_not_found');
      return {manifest:row.body.manifest,archive_sha256:row.body.archive_sha256,
        directory:join(dataRoot,'builder/packets',id),archive:join(dataRoot,'builder/packets',id+'.zip')};
    }
    return {execute,packet,binding:builder.binding,payload:{scope:builder.binding,config:{display_name:profile.config.display_name}},
      read:async()=>project(await builder.read()),close:()=>store.close()};
  } catch(e){await store.close();throw e;}
}
