// Synthetic transport fixture. Not imported by application source or packaged browser assets.
import {createHash,randomBytes} from 'node:crypto';
import {makeWealthAppHandler} from '../amplify/functions/forge-atlas/wealth-app.mjs';
import {createWealthReceiver,signWealthResponse} from '../amplify/functions/forge-atlas/wealth-vendor/forge-gateway.mjs';
import {makeResourceService} from '../amplify/functions/forge-atlas/resources.mjs';
export const actor='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',tenant='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const issuer='https://cognito-idp.us-east-1.amazonaws.com/fixture',expert='wealth-expert';
export const claims={iss:issuer,sub:actor,'cognito:groups':['tenant-gbautomation']};
const hash=v=>createHash('sha256').update(v).digest('hex');
export const channel='1193836001827770389',captureId='d'.repeat(64);
export function whaleFixture(overrides={}) {
 const keys={read:randomBytes(32).toString('hex'),command:randomBytes(32).toString('hex')};
 const row={id:'ui.wealth.whale-room',title:'Whale Room',kind:'ui',owner_expert:expert,delivery_mode:'live_app',app_id:'wealth-platform',source_commit:'a'.repeat(40),observed_at:'2026-11-01T00:00:00Z',expires_at:'2027-01-01T00:00:00Z'};
 const raw=Buffer.from(JSON.stringify({schema_version:'hosted-resource-delivery.v1',tenant_id:'gbautomation',source_commit:row.source_commit,captured_at:row.observed_at,resources:[row]}));
 const config={enabled:true,origin:'https://fixture.tail000000.ts.net:8443',expert_id:expert,resource_id:row.id,catalog_sha256:hash(raw),source_commit:row.source_commit,tenant_bindings:{[hash(actor)]:tenant}};
 const controls={connector:true,statusFailure:false,corrupt:false,denied:false,loseAdmission:false,detailWait:null,...overrides.controls};
 const calls=[],routes=[],runs=new Map(),commands=new Map();let polls=0;
 let saved=[{id:captureId,guild_id:'100',channel_id:channel,channel_name:'columbus-trades',excerpt:'Synthetic private capture <script>unsafe()</script>',body:'Synthetic private detail <img src=x onerror=unsafe()>',body_bytes:51,first_captured_at:row.observed_at,last_captured_at:row.observed_at,observations:1,url:'https://discord.com/channels/100/'+channel,source_message_id:null,author:null,source_timestamp:null,history:'partial',provenance:'operator_browser_capture',identity:'snapshot_content',body_format:'browser_accessibility_text'}];
 const channels=controls.channels||[{id:channel,name:'columbus-trades'},...Array.from({length:11},(_,i)=>({id:String(20000000+i),name:'synthetic-channel-'+i}))];
 if(controls.multichannel)saved.push({...saved[0],id:'e'.repeat(64),channel_id:channels[1].id,channel_name:channels[1].name,excerpt:'Synthetic second channel capture',body:'Synthetic second channel detail',body_bytes:31,url:'https://discord.com/channels/100/'+channels[1].id});
 if(controls.forumPreview){
  // Explicit visual-review fixtures only. These never enter the application bundle.
  const examples=[
   ['BTC range high — waiting for confirmation','The range high is the area I am watching today. A clean close and a retest would tell me more than the initial move.\n\nFor now, keeping this on the watchlist. If price falls back into the range, the idea needs another look.'],
   ['ETH follow-up: the retest matters','The first move has already happened. Watching how price behaves around the prior breakout area before deciding whether the structure is still intact.'],
   ['A quick note on position sizing','A clear invalidation level should come before choosing a position size. I would rather miss an entry than rush into a setup I cannot explain.'],
   ['Market context for the week ahead','Watching the higher-timeframe range and the next scheduled macro releases. The useful question is where the current idea stops making sense.'],
   ['Keeping a record of the setup','Saving the original reasoning helps when reviewing what happened later. Entry, invalidation and context belong together.'],
   ['What I am waiting to see next','No new entry here. Waiting for price to make the decision easier and keeping the original scenario in view.'],
  ];
  saved=examples.map(([title,text],index)=>{const body=title+'\n\n'+text;return {...saved[0],id:hash('forum-preview-'+index),excerpt:body.slice(0,300),body,body_bytes:Buffer.byteLength(body),last_captured_at:`2026-11-15T${String(19-index).padStart(2,'0')}:24:00Z`};});
 }
 const dispatch=async(principal,route)=>{
  routes.push({principal,route});const path=route.path.replace('/api/wealth/v1/whale-room/browser-captures','');
  if(route.method==='GET'){
   if(path==='/status')return controls.statusFailure?{status:503,body:{error:{code:'service_unavailable'}}}:{status:200,body:{data:{schema_version:1,storage:'supabase',generation:0,revision:1,enabled:controls.connector,busy:false,state:controls.connector?'ready':'capture_disabled',connector:'mm2',deletion_pending:false,limitations:[],channels,channel:{id:channel,name:'columbus-trades'},active_run:null}}};
   if(path===''){
    const filtered=saved.filter(item=>!route.query.channel_id||item.channel_id===route.query.channel_id[0]),offset=Number(route.query.offset?.[0]||0);
    const data={items:offset?[]:filtered.map(({body,...item})=>item),total:controls.paged?41:filtered.length,offset,next_offset:controls.paged&&!offset?40:null,revision:7,limitations:[]};
    if(controls.listWait){controls.listEntered?.();await controls.listWait;}
    return {status:200,body:{data}};
   }
   if(path.startsWith('/runs/')){const run=runs.get(path.slice(6));polls++;return {status:200,body:{data:{run:{...run,state:polls===1?'upload_pending':'complete',added:1,duplicates:0,seen:1,query_complete:true}}}};}
   if(controls.detailWait){controls.detailEntered?.();await controls.detailWait;}
   const {excerpt,...capture}=saved.find(item=>item.id===path.slice(1))||{};
   return {status:200,body:{data:{capture,recent_captures:[],limitations:[]}}};
  }
  const key=route.body.request_id,old=commands.get(key),encoded=JSON.stringify(route);
  if(old&&old!==encoded)return {status:409,body:{error:{code:'capture_request_conflict'}}};commands.set(key,encoded);
  if(route.method==='POST'){
   const run=runs.get(key)||{id:key,state:'pending',channel_id:route.body.channel_id,requested_at:route.body.requested_at,started_at:route.body.requested_at,recorded_at:route.body.requested_at,finished_at:null,captured_at:null,generation:0,error_code:null,seen:0,added:0,duplicates:0,query_complete:null};runs.set(key,run);
   return {status:202,body:{data:{accepted:true,run}}};
  }
  saved=path?saved.filter(item=>item.id!==path.slice(1)):[];return {status:200,body:{data:{deleted:true,generation:1}}};
 };
 const {enabled:_,origin:__,tenant_bindings:___,...receiverConfig}=config;
 const receiver=createWealthReceiver({enabled:true,config:{issuer,...receiverConfig},credentials:async()=>keys,
  principalFor:async sub=>sub===actor?{subject:actor,tenant_id:tenant}:null,dispatch});
 const fetcher=async(url,init)=>{
  calls.push({url,init});const request=JSON.parse(init.body);
  const result=await receiver.handle({path:new URL(url).pathname,method:init.method,headers:init.headers,body:init.body});
  if(controls.unsafeFields){const out=JSON.parse(result.body);out.body.data.owner_id=tenant;result.body=JSON.stringify(out);result.headers['x-gbauto-wealth-signature']=signWealthResponse(keys.read,new URL(url).pathname,result.body);}
  if(controls.loseAdmission&&request.operation==='captureStart'){controls.loseAdmission=false;throw Error('synthetic lost acknowledgement');}
  if(controls.corrupt)result.body+=' ';
  return new Response(result.body,{status:result.status,headers:result.headers});
 };
 const registry=async()=>[{tenant_id:'gbautomation',agent_id:expert,status:'active',subjects:[actor],config_sha256:'c'.repeat(64),display_name:'Wealth'}];
 const loadManifest=async()=>({bytes:raw,sha256:hash(raw),version_id:'synthetic-v1'});
 const app=makeWealthAppHandler({issuer,operatorSubject:actor,config,resourcesEnabled:true,registry,loadManifest,credentials:async()=>keys,fetcher,...overrides});
 const catalog=makeResourceService({enabled:true,loadManifest,firstPartyAppAvailable:app.available});
 const event=(operation,args={})=>({typeName:['captureStart','captureDelete'].includes(operation)?'Mutation':'Query',fieldName:['captureStart','captureDelete'].includes(operation)?'forgeWealthCommand':'forgeWealthRead',identity:{claims},arguments:{input:{expert_id:expert,resource_id:row.id,catalog_sha256:config.catalog_sha256,operation,args}}});
 return {app,config,keys,row,calls,routes,runs,commands,controls,catalog,event,receiver};
}
