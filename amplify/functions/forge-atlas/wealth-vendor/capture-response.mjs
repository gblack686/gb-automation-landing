/** Strict capture-only successful response shapes. No owner/credential/driver fields cross to browsers. */
import {TransportError} from './forge-contract.mjs';
const bad=()=>{throw new TransportError(503,'invalid_server_response');};
const obj=(v,keys,optional=[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||keys.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!keys.includes(k)&&!optional.includes(k)))bad();};
const text=(v,max)=>{if(typeof v!=='string'||v.length>max)bad();};
const integer=(v,max=2147483647)=>{if(!Number.isSafeInteger(v)||v<0||v>max)bad();};
const bool=v=>{if(typeof v!=='boolean')bad();};
const id=v=>{if(typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v))bad();};
const key=v=>{if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{8,80}$/.test(v))bad();};
const channel=v=>{if(typeof v!=='string'||!/^[1-9][0-9]{0,19}$/.test(v))bad();};
const date=v=>{if(typeof v!=='string'||v.length>40||!Number.isFinite(Date.parse(v)))bad();};
const limitations=v=>{if(!Array.isArray(v)||v.length>8)bad();v.forEach(x=>text(x,512));};
const channelRow=v=>{obj(v,['id','name']);channel(v.id);text(v.name,80);};
function run(v){
  obj(v,['id','channel_id','requested_at','started_at','recorded_at','finished_at','captured_at','generation','state','error_code','seen','added','duplicates','query_complete']);
  key(v.id);channel(v.channel_id);integer(v.generation);integer(v.seen,100);integer(v.added,100);integer(v.duplicates,100);
  if(!['pending','upload_pending','complete','failed'].includes(v.state))bad();
  for(const k of ['requested_at','started_at','recorded_at'])date(v[k]);
  for(const k of ['finished_at','captured_at'])if(v[k]!==null)date(v[k]);
  if(v.error_code!==null&&(!/^capture_[a-z_]+$|^driver_(refused|unavailable)$|^(recording_not_disabled|attachment_not_approved|channel_not_open|ambiguous_channel|source_changed|invalid_snapshot)$/.test(v.error_code)))bad();
  if(v.query_complete!==null)bool(v.query_complete);
}
function capture(v,detail){
  obj(v,['id','guild_id','channel_id','body_bytes','first_captured_at','last_captured_at','observations',detail?'body':'excerpt',
    'channel_name','url','source_message_id','author','source_timestamp','history','provenance','identity','body_format']);
  id(v.id);channel(v.guild_id);channel(v.channel_id);integer(v.body_bytes,16000);integer(v.observations,1000000);
  date(v.first_captured_at);date(v.last_captured_at);text(v.channel_name,80);text(v[detail?'body':'excerpt'],detail?16000:600);
  if(new TextEncoder().encode(v[detail?'body':'excerpt']).length>(detail?16000:1200))bad();
  if(v.url!==`https://discord.com/channels/${v.guild_id}/${v.channel_id}`||v.source_message_id!==null||v.author!==null||v.source_timestamp!==null||v.history!=='partial'||v.provenance!=='operator_browser_capture'||v.identity!=='snapshot_content'||v.body_format!=='browser_accessibility_text')bad();
}
export function validateCaptureResponse(name,status,body){
  if(!name.startsWith('capture')||![200,202].includes(status))return;
  const v=body?.data;if(!v)bad();
  if(status===202&&name!=='captureStart')bad();
  if(name==='captureStatus'){
    obj(v,['schema_version','storage','generation','revision','active_run','enabled','busy','state','connector','deletion_pending','channel','channels','limitations']);
    if(v.schema_version!==1||v.storage!=='supabase'||v.connector!=='mm2'||!['ready','capture_disabled'].includes(v.state))bad();
    integer(v.generation);integer(v.revision);bool(v.enabled);bool(v.busy);bool(v.deletion_pending);
    if(v.active_run!==null)key(v.active_run);if(v.channel!==null)channelRow(v.channel);
    if(!Array.isArray(v.channels)||v.channels.length>12||new Set(v.channels.map(c=>c.id)).size!==v.channels.length)bad();v.channels.forEach(channelRow);limitations(v.limitations);
  }else if(name==='captureList'){
    obj(v,['items','total','offset','revision','next_offset','limitations']);integer(v.total,5000);integer(v.offset,5000);integer(v.revision);
    if(v.next_offset!==null)integer(v.next_offset,5000);if(!Array.isArray(v.items)||v.items.length>40)bad();v.items.forEach(x=>capture(x,false));limitations(v.limitations);
  }else if(name==='captureDetail'){
    obj(v,['capture','recent_captures','limitations']);capture(v.capture,true);limitations(v.limitations);
    if(!Array.isArray(v.recent_captures)||v.recent_captures.length>20)bad();v.recent_captures.forEach(run);
  }else if(name==='captureRun'||name==='captureStart'){
    obj(v,['run'],name==='captureStart'?['accepted']:[]);run(v.run);if(v.accepted!==undefined)bool(v.accepted);if(status===202&&v.accepted!==true)bad();
  }else if(name==='captureDelete'){
    if(v.deletion_pending===true){obj(v,['deleted','deletion_pending']);if(v.deleted!==false)bad();}
    else{obj(v,['deleted','generation']);if(v.deleted!==true)bad();integer(v.generation);}
  }else bad();
}
