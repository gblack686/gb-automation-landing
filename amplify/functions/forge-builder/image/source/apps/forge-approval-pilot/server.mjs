import http from 'node:http';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStore} from './store.mjs';
import {createAdapters,python} from './adapters.mjs';
import {createForgeService,sha256} from '../../supabase/functions/human-approval-action/forge.mjs';
import {createBuilder} from './builder.mjs';

const here=fileURLToPath(new URL('./',import.meta.url)),repo=fileURLToPath(new URL('../../',import.meta.url));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readJSON=async req=>{let bytes=0,raw='';for await(const chunk of req){bytes+=chunk.length;if(bytes>500000)throw Error('body_too_large');raw+=chunk;}return JSON.parse(raw);};

export async function createPilot({dataRoot=join(here,'.local'),port=18814,render=true,connected=null,builderProfile=null,builderVisuals=null,voiceOptions={}}={}) {
  if(connected&&builderProfile)throw Error('builder_hosted_adapter_not_enabled');
  dataRoot=resolve(dataRoot);await mkdir(dataRoot,{recursive:true});
  const store=connected?.store||await createStore(join(dataRoot,'postgres'));
  let signingSecret;
  try{signingSecret=await readFile(join(dataRoot,'signing-key'),'utf8');}
  catch{signingSecret=randomBytes(48).toString('base64url');await writeFile(join(dataRoot,'signing-key'),signingSecret,{flag:'wx'});}
  const session=randomBytes(32).toString('base64url');
  const receipt=JSON.parse(await readFile(join(repo,'artifacts/forge-approval-intake-2026-09-24/implementation-approval.json'),'utf8'));
  const config=connected?.config||{tenant:'gbautomation',agent:'expert-forge',operator:'operator@pilot.invalid',client:'client@pilot.invalid',signingSecret,
    reviewURL:`http://127.0.0.1:${port}/review`,pilot:true,
    engineering:{base_commit:receipt.base_commit,profile_sha256:receipt.engineering_profile.hash,map_sha256:receipt.repository_map.hash}};
  if(builderProfile){const p=JSON.parse(await readFile(builderProfile,'utf8'));config.agent=p.config.agent_id;config.tenant=p.planning?.tenant_id;}
  if(connected?.connection.writes_enabled&&Number(new URL(config.reviewURL).port)!==port)throw Error('activated_review_port_mismatch');
  const adapters=connected?.adapters||await createAdapters({store,config,dataRoot});
  const service=createForgeService({rpc:store.rpc,config,readArtifacts:adapters.readArtifacts});
  for(const [id,title,client,project] of connected||builderProfile?[]:[['prop_forge_pilot','Automate the weekly client report','Internal client','Client reporting'],['prop_forge_pilot_2','Turn meeting notes into a project brief','GBAuto','Operations']]) {
    await store.seed(id);await store.db.query('update agent_os_proposals set card_title=$1 where proposal_id=$2',[title,id]);
    await service.handle({mode:'forge.command',command:'register',input:{proposal_id:id,client_id:client,project_id:project}},{role:'operator',actor:'greg'});
  }
  const web=join(dataRoot,'forge');
  if(render&&builderProfile)await python(join(repo,'resources/skills/hermes-prospect-agent-team-lead-magnet/scripts/render_forge_studio_private.py'),['--profile',builderProfile,'--output',web]);
  else if(render)await python(join(repo,'resources/skills/hermes-prospect-agent-team-lead-magnet/scripts/render_expert_profile.py'),[
    '--profile',connected?.profilePath||join(repo,'resources/skills/hermes-prospect-agent-team-lead-magnet/fixtures/single-expert/profile-page.json'),'--workdir',web]);
  const builder=builderProfile?await createBuilder({store,service,adapters,config,dataRoot,profilePath:builderProfile,visualsPath:builderVisuals,voiceOptions}):null;
  let queue=Promise.resolve();
  const server=http.createServer(async(req,res)=>{
    const origin=new URL(config.reviewURL).origin;
    const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: https://api.elevenlabs.io wss://api.elevenlabs.io; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
    const reply=(status,data,type='application/json')=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(req.method==='HEAD'?'':typeof data==='string'||Buffer.isBuffer(data)?data:JSON.stringify(data));};
    const operator=()=>req.headers.cookie?.split(';').some(c=>c.trim()==='forge_pilot='+session);
    try {
      if(req.headers.host!==new URL(origin).host)return reply(403,{ok:false,error:'host_denied'});
      const url=new URL(req.url,origin);
      // An email may navigate to the inert review shell. It receives no operator
      // session and cannot decide anything until a same-origin confirmed POST.
      const emailNavigation=['GET','HEAD'].includes(req.method)&&url.pathname==='/review'&&!url.search&&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document';
      const operatorNavigation=req.method==='GET'&&url.pathname==='/'&&!url.search&&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document'&&req.headers['sec-fetch-user']==='?1';
      if(req.headers['sec-fetch-site']==='cross-site'&&!emailNavigation&&!operatorNavigation)return reply(403,{ok:false,error:'cross_site_denied'});
      if(req.method==='POST') {
        if(url.pathname==='/api/forge/builder'&&builder){
          if(req.headers.origin!==origin||req.headers['x-forge-request']!=='builder.v1'||!req.headers['content-type']?.startsWith('application/json'))return reply(403,{ok:false,error:'origin_or_csrf_denied'});
          if(!operator())return reply(401,{ok:false,error:'local_session_required'});
          const body=await readJSON(req),pending=queue.then(()=>builder.handle(body));queue=pending.catch(()=>{});
          return reply(200,{ok:true,result:await pending});
        }
        if(url.pathname!=='/api/forge/approvals')return reply(404,{ok:false,error:'not_found'});
        if(req.headers.origin!==origin||req.headers['x-forge-request']!=='approval.v1'||!req.headers['content-type']?.startsWith('application/json'))return reply(403,{ok:false,error:'origin_or_csrf_denied'});
        const body=await readJSON(req),review=['forge.review','forge.decide'].includes(body.mode);
        if(!review&&!operator())return reply(401,{ok:false,error:'local_session_required'});
        if(connected&&body.mode?.startsWith('pilot.'))return reply(403,{ok:false,error:'fixture_mode_denied'});
        // One local worker drains durable intent. Database locks remain the source
        // of correctness; the queue also avoids overlapping fixture file writes.
        const work=async()=>{
          let result;
          if(connected)await connected.validateRequest(body);
          if(body.mode==='forge.catalog'&&connected)result=await connected.catalog(body.input||{});
          else if(body.mode==='forge.connection'&&connected)result=connected.connection;
          else if(body.mode==='pilot.work')result={outcomes:await adapters.drain(service)};
          else if(body.mode==='pilot.plan')result=await adapters.plan(service,body.workflow_id);
          else result=await service.handle(body,review?null:{role:'operator',actor:'greg'});
          if(body.mode==='forge.snapshot'&&connected)result={...result,mode:connected.connection.mode,connection:connected.connection};
          if(!['forge.review','forge.snapshot','forge.catalog','forge.connection'].includes(body.mode))await adapters.drain(service);
          return result;
        };
        const pending=queue.then(work);queue=pending.catch(()=>{});
        return reply(200,{ok:true,result:await pending});
      }
      if(!['GET','HEAD'].includes(req.method))return reply(405,{ok:false,error:'method_not_allowed'});
      if(url.pathname==='/api/forge/approvals')return reply(405,{ok:false,error:'post_required'});
      if(url.pathname==='/health')return reply(200,connected?{ok:true,...connected.connection}:{ok:true,mode:'local_fixture',email_sent:false,execution_performed:false});
      if(url.pathname==='/review')return reply(200,await readFile(join(here,'review.html')),'text/html; charset=utf-8');
      if(url.pathname==='/review.js'||url.pathname==='/review.css')return reply(200,await readFile(join(here,url.pathname.slice(1))),url.pathname.endsWith('.js')?'text/javascript':'text/css');
      if(url.pathname==='/') {
        if(req.method==='GET')res.setHeader('Set-Cookie',`forge_pilot=${session}; HttpOnly; SameSite=Strict; Path=/`);
        return reply(200,render?await readFile(join(web,'index.html')):'<html><body>Forge fixture</body></html>','text/html; charset=utf-8');
      }
      if(!operator())return reply(401,{ok:false,error:'local_session_required'});
      if(builder&&url.pathname==='/forge-voice-client.js')return reply(200,await readFile(join(here,'.local-assets/voice-client.js')),'text/javascript');
      if(builder&&url.pathname==='/forge-turntable.js')return reply(200,await readFile(join(here,'.local-assets/turntable.js')),'text/javascript');
      if(builder&&url.pathname.startsWith('/api/forge/builder/')){
        const item=url.pathname.startsWith('/api/forge/builder/visual/')?await builder.visual(url.pathname.split('/').pop()):await builder.file(url.pathname);
        const extension=item.name.split('.').pop();
        const type={html:'text/html; charset=utf-8',js:'text/javascript',json:'application/json',yaml:'application/yaml',png:'image/png',glb:'model/gltf-binary',zip:'application/zip'}[extension]||'text/plain; charset=utf-8';
        if(extension==='zip')res.setHeader('Content-Disposition','attachment; filename="expert-package.zip"');
        return reply(200,item.bytes,type);
      }
      if(url.pathname==='/mailbox') {
        if(connected)return reply(404,{ok:false,error:'email_previews_are_fixture_only'});
        const messages=await adapters.mailbox();
        const page=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Forge · Email previews</title><link rel="stylesheet" href="/review.css"><main><a href="/">← Agent Forge</a><p class="eyebrow">LOCAL PILOT · EMAIL PREVIEWS</p><h1>Review from your inbox</h1><p>These messages are saved locally. No email has been sent.</p>${messages.reverse().map(m=>`<article><small>${escape(m.to)} · ${escape(m.created_at)}</small>${m.html}</article>`).join('')||'<p>Accept a proposal and complete its scope to create the first messages.</p>'}</main></html>`;
        return reply(200,page,'text/html; charset=utf-8');
      }
      if(url.pathname==='/artifact') {
        if(connected)return reply(409,{ok:false,error:'canonical_artifact_host_not_connected'});
        const path=url.searchParams.get('path');
        const row=await store.db.query("select record from pilot_artifact_index where record->>'path'=$1",[path]);
        if(!row.rows.length)return reply(404,{ok:false,error:'artifact_not_indexed'});
        const bytes=await readFile(adapters.fileFor(path));
        if(await sha256(bytes)!==row.rows[0].record.file_sha256)return reply(409,{ok:false,error:'artifact_bytes_changed'});
        return reply(200,bytes,path.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8');
      }
      return reply(404,{ok:false,error:'not_found'});
    }catch(e){return reply(409,{ok:false,error:/^[a-z_]+$/.test(e.message)?e.message:'approval_request_rejected'});}
  });
  await new Promise((done,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',done);});
  config.reviewURL=`http://127.0.0.1:${server.address().port}/review`;
  const worker=connected?null:setInterval(()=>{queue=queue.then(()=>adapters.drain(service)).catch(()=>{});},5000);
  worker?.unref();
  return {server,store,service,adapters,config,builder,close:async()=>{if(worker)clearInterval(worker);await new Promise(r=>server.close(r));await queue;await store.close();}};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const dataRoot=process.env.FORGE_PILOT_DATA_ROOT||join(here,'.local');
  const settings=process.env.FORGE_CONNECTION_CONFIG?JSON.parse(await readFile(process.env.FORGE_CONNECTION_CONFIG,'utf8')):null;
  const connected=settings?await(await import('./connected.mjs')).createConnected({settings,dataRoot}):null;
  const pilot=await createPilot({port:Number(process.env.FORGE_PILOT_PORT||18814),dataRoot,connected,builderProfile:process.env.FORGE_BUILDER_PROFILE,builderVisuals:process.env.FORGE_BUILDER_VISUALS});
  process.stdout.write(`Forge local pilot: ${new URL(pilot.config.reviewURL).origin}/\n`);
}
