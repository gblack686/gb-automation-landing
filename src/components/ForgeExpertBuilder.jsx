import {useEffect,useRef,useState} from 'react';
import {getCurrentUser} from 'aws-amplify/auth';
import {builderRequest,builderAsset,verifiedBuilderAsset} from '../lib/forgeBuilderClient';
import {createBuilderTransport} from '../lib/forgeBuilderTransport';
import '../lib/forge-builder/expert-builder.js';
import '../lib/forge-builder/expert-builder.css';
import './ForgeExpertBuilder.css';
import ForgeModelViewer from './ForgeModelViewer';

const messages={operator_access_required:'A Forge builder operator role is required to edit this brief.',
 builder_not_deployed:'The hosted builder is awaiting its release.',command_pending:'Your request is still queued. Check its status before starting another step.',
 builder_unavailable:'The builder could not connect. Retry to check your saved request.',
 command_not_found:'This request belongs to another sign-in. Sign back in with its owner.',
 version_conflict:'This brief changed in another tab. Reload to review the saved version.'};
const modelReady=()=>{};

function Packet({id,onClose}){
 const [packet,setPacket]=useState(null),[model,setModel]=useState(null),[card,setCard]=useState(null),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController(),urls=[];let active=true;
  (async()=>{try{
   const p=await builderRequest({action:'packet',packet_id:id});if(!active)return;setPacket(p);
   const m=p.manifest.visual?.model,c=p.manifest.visual?.card;
   if(m){const {bytes}=await builderAsset(id,m.path,controller.signal);if(active)setModel(bytes);}
   if(c){const {bytes}=await builderAsset(id,c.path,controller.signal);if(active){const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));urls.push(url);setCard(url);}}
  }catch{if(active)setError('Package preview could not load. Retry the preview.');}})();
  return()=>{active=false;controller.abort();urls.forEach(url=>URL.revokeObjectURL(url));};
 },[id]);
 async function download(path){try{
  const {bytes,asset}=await builderAsset(id,path);const url=URL.createObjectURL(new Blob([bytes],{type:asset.mime}));
  const a=document.createElement('a');a.href=url;a.download=path.split('/').at(-1);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch{setError('Download did not pass its integrity check. Retry.');}}
 return <section className="forge-builder-packet"><button onClick={onClose}>Back to brief</button><h2>Your expert package</h2>
  <p>Private pilot · Runtime inactive</p><div className="forge-builder-visuals">{model&&<ForgeModelViewer bytes={model} onReady={modelReady}/ >}{card&&<img src={card} alt="Selected agent card"/>}</div>
  {error&&<p role="alert">{error}</p>}{!packet&&!error&&<p role="status">Loading package…</p>}
  {packet&&<><p>{packet.manifest.files.length} files · Config, expert scaffold, card, avatars, Studio and receipts</p>
   <div className="builder-actions">{['package.zip','agent-expert-config.json','expert-config.yaml','packet-manifest.json'].map(path=><button key={path} onClick={()=>download(path)}>{path==='package.zip'?'Download verified ZIP':path}</button>)}</div>
   <details><summary>Generation receipt</summary><pre>{JSON.stringify(packet.manifest,null,2)}</pre></details></>}
 </section>;
}

export default function ForgeExpertBuilder({onClose}){
 const root=useRef(null),[attempt,setAttempt]=useState(0),[error,setError]=useState(''),[pending,setPending]=useState(null),[packet,setPacket]=useState(null),[ready,setReady]=useState(false);
 useEffect(()=>{
  const abort=new AbortController();let builder,cardURL;
  setReady(false);setError('');
  (async()=>{try{
   const {userId}=await getCurrentUser();
   const client=createBuilderTransport({request:builderRequest,actor:userId,signal:abort.signal,onPending:item=>{if(!abort.signal.aborted)setPending(item);}});
   let state=await client.recover();
   if(state.initialized===false){
    if(!state.operator)throw Error('operator_access_required');
    state=await client.transport({action:'initialize',binding:state.payload.scope});
    state=await builderRequest({action:'read'});
   }
   if(abort.signal.aborted)return;
   if(state.visuals?.card_asset){const {bytes}=await verifiedBuilderAsset(state.visuals.card_asset,'bootstrap/assets/card.png',abort.signal);
    if(abort.signal.aborted)return;cardURL=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));state.visuals.card=cardURL;}
   const transport=async body=>{const result=await client.transport(body);if(result.draft&&cardURL)result.visuals.card=cardURL;return result;};
   const onDownload=async id=>{try{const {bytes}=await builderAsset(id,'package.zip',abort.signal);if(abort.signal.aborted)return;
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download='expert-package.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }catch{if(!abort.signal.aborted)setError('Package download failed its integrity check. Retry the download.');}};
   builder=window.ForgeExpertBuilder.create(state.payload,{initialState:state,transport,onDownload,
    readOnly:!state.operator,loadVoice:()=>import('@elevenlabs/client'),onPacket:setPacket});
   builder.mount(root.current);setReady(true);
  }catch(e){if(!abort.signal.aborted)setError(messages[e.message]||'The builder is unavailable. Retry to check your saved brief.');}})();
  return()=>{abort.abort();builder?.destroy();if(cardURL)URL.revokeObjectURL(cardURL);};
 },[attempt]);
 useEffect(()=>{const handler=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler);},[onClose]);
 return <div className="forge-builder-overlay" role="dialog" aria-modal="true" aria-label="Expert Config Builder">
  <header><strong>Expert Config Builder</strong><div><button onClick={()=>setAttempt(n=>n+1)}>Reload saved version</button><button onClick={onClose} autoFocus>Close</button></div></header>
  <p className="forge-builder-notice">Internal pilot · Three approval gates · No client emails or live execution</p>
  {pending&&<p role="status" className="forge-builder-notice">Saving {pending.action} request…</p>}
  {error&&<p role="alert" className="forge-builder-notice">{error} <button onClick={()=>setAttempt(n=>n+1)}>Retry</button></p>}
  {!ready&&!error&&<p role="status" className="forge-builder-notice">Opening your saved brief…</p>}
  <div ref={root} hidden={!!packet||!ready}/>
  {packet&&<Packet id={packet} onClose={()=>setPacket(null)}/>}
 </div>;
}
