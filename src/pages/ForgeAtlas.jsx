import { useEffect, useRef, useState } from 'react';
import { Hub } from 'aws-amplify/utils';
import { signOut } from 'aws-amplify/auth';
import { readAtlas } from '../lib/forgeAtlasClient';
import ForgeVisualStudio from '../components/ForgeVisualStudio';
import ForgeExpertBuilder from '../components/ForgeExpertBuilder';
import {visualRequest,visualAsset} from '../lib/forgeVisualClient';

const CSP = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; frame-src 'self' about: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'";
const YOUTUBE_REPORT_ORIGIN = 'https://6ab9d13b0b89b5644e56270a--gbautoxyz.netlify.app';
export default function ForgeAtlas() {
 const frame = useRef(null);
 const [channel] = useState(() => crypto.randomUUID());
 const [html,setHtml] = useState('');
 const [error,setError] = useState('');
 const [attempt,setAttempt] = useState(0);
 const [visual,setVisual]=useState(null);
 const [builder,setBuilder]=useState(()=>new URLSearchParams(window.location.search).get('window')==='tasks');
 const [agents,setAgents]=useState([]);
 const [selectedAgent,setSelectedAgent]=useState(null);
 useEffect(()=>{
  let active=true;
  readAtlas('agents').then(data=>{
   if(!active)return;
   const list=Array.isArray(data?.agents)?data.agents:[];
   setAgents(list);
   const requested=window.location.pathname.split('/').at(-1);
   const selected=list.find(agent=>agent.agent_id===requested)||list[0]||null;
   setSelectedAgent(selected);
   setBuilder(selected?.agent_id==='artist-packet-expert'&&new URLSearchParams(window.location.search).get('window')==='tasks');
   if(selected&&selected.agent_id!==requested)window.history.replaceState(null,'',`/atlas/${selected.agent_id}`);
   if(!selected)setError('No registered agents are available for this account.');
  }).catch(()=>{if(active)setError('Your registered agents could not load. Please sign in again.');});
  return()=>{active=false;};
 },[]);
 useEffect(() => {
  if(!selectedAgent)return;
  let active = true;
  const abort = new AbortController();
  const pending = new Set();
  const receive = async event => {
   const message = event.data;
   if (event.source !== frame.current?.contentWindow || event.origin !== 'null'
       || message?.type !== 'forge-atlas.request.v1' || message.channel !== channel
       || typeof message.id !== 'string' || !/^\d{1,9}$/.test(message.id)
       || !['atlas','planning','history','schedule','approvalSnapshot','proposals','proposal','visualOpen','visualActive','builderOpen'].includes(message.view) || JSON.stringify(message).length > 18000) return;
   if (pending.has(message.view)) return;
   pending.add(message.view);
   let payload,ok = false;
   try {
    if(message.view==='builderOpen'){
     if(selectedAgent.agent_id!=='artist-packet-expert'||message.input&&Object.keys(message.input).length)throw Error('Builder identity is host-owned');
     setBuilder(true);payload={opened:true};
    }else if(message.view==='visualOpen'){
     const brief=message.input?.brief;
     if(selectedAgent.agent_id!=='artist-packet-expert'||brief&&(brief.expert?.tenant_id!=='gbautomation'||brief.expert?.expert_id!==selectedAgent.agent_id))throw Error('Wrong expert');
     setVisual({brief:brief||null});payload={opened:true};
    }else if(message.view==='visualActive'){
     if(selectedAgent.agent_id!=='artist-packet-expert')throw Error('Wrong expert');
     const current=await visualRequest({action:'active'});payload=null;
     if(current){
      const encode=bytes=>{let binary='';for(let p=0;p<bytes.length;p+=8192)binary+=String.fromCharCode(...bytes.subarray(p,p+8192));return 'data:image/png;base64,'+btoa(binary);};
      if(current.tenant_id!=='gbautomation'||current.expert_id!=='artist-packet-expert')throw Error('Wrong visual identity');
      const r=await visualAsset(current.id,'portrait',abort.signal);payload={id:current.id,tenant_id:current.tenant_id,expert_id:current.expert_id,portrait:encode(r.bytes),sha256:r.asset.sha256,credit:current.card||null};
      if(current.avatars?.avatar64){const icon=await visualAsset(current.id,'avatar64',abort.signal);if(icon.asset.sha256!==current.avatars.avatar64.sha256||icon.asset.input_sha256!==r.asset.sha256)throw Error('Wrong avatar lineage');payload.avatar_icon=encode(icon.bytes);payload.avatar_icon_sha256=icon.asset.sha256;}
      if(current.agent_card){const card=await visualAsset(current.id,'agent_card',abort.signal);payload.agent_card=encode(card.bytes);payload.agent_card_sha256=card.asset.sha256;}
     }
    }else payload = await readAtlas(message.view,message.input,selectedAgent.agent_id);
    ok = true;
   } catch { payload = null; }
   finally { pending.delete(message.view); }
   if (active) frame.current?.contentWindow?.postMessage({type:'forge-atlas.response.v1',channel,id:message.id,ok,payload},'*');
  };
  window.addEventListener('message',receive);
  const stopAuth = Hub.listen('auth',({payload}) => {
   if (payload.event === 'signedOut') { active = false; abort.abort(); setHtml(''); setVisual(null);setBuilder(false); window.location.assign('/login?next='+encodeURIComponent('/atlas/'+selectedAgent.agent_id)); }
  });
  (async () => {
   setError(''); setHtml('');
   try {
    const doc = await readAtlas('document',{},selectedAgent.agent_id);
    const url = new URL(doc.url);
    if (url.protocol !== 'https:' || !/^[a-z0-9.-]+\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname)
        || url.pathname !== `/gbautomation/${selectedAgent.agent_id}/index.html`
        || doc.agent_id !== selectedAgent.agent_id || doc.tenant_id !== 'gbautomation'
        || !Number.isSafeInteger(doc.bytes) || doc.bytes <= 0 || doc.bytes > 16000000) throw Error('Invalid document');
    const response = await fetch(url,{cache:'no-store',credentials:'omit',signal:abort.signal});
    if (!response.ok) throw Error('Document unavailable');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength !== doc.bytes) throw Error('Incomplete document');
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v => v.toString(16).padStart(2,'0')).join('');
    if (hash !== doc.sha256) throw Error('Document changed');
    const content = new TextDecoder().decode(bytes);
    if (!content.includes('<head>') || !content.includes('forge-atlas.request.v1')) throw Error('Document needs an update');
    if (content.includes('id="private-studio-data"')) {
     const packaged = JSON.parse(new DOMParser().parseFromString(content,'text/html').getElementById('private-studio-data').textContent);
     if (packaged.scope?.agent_id !== selectedAgent.agent_id || packaged.scope?.tenant_id !== 'gbautomation'
         || packaged.scope?.config_sha256 !== selectedAgent.config_sha256) throw Error('Document binding changed');
    }
    const requestedWindow=new URLSearchParams(window.location.search).get('window');
    const startWindow = ['proposals','presence'].includes(requestedWindow) ? `<meta name="forge-start-window" content="${requestedWindow}">` : '';
    const policy = selectedAgent.agent_id === 'youtube-intel'
      ? CSP.replace("frame-src 'self' about: blob:",`frame-src 'self' about: blob: ${YOUTUBE_REPORT_ORIGIN}`) : CSP;
    if (active) setHtml(content.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="forge-host-channel" content="${channel}">${startWindow}`));
   } catch { if (active) setError('Your workspace could not load. Please retry or sign in again.'); }
  })();
  return () => { active = false; abort.abort(); stopAuth(); window.removeEventListener('message',receive); };
 },[attempt,channel,selectedAgent]);
 if (!html) return <main className="min-h-screen grid place-content-center bg-[#F3F1E7] text-[#191919] p-8 text-center">
  <h1 className="text-3xl font-serif">{selectedAgent?.display_name||'Agent Forge'}</h1>
  <p role="status" className="mt-4">{error || 'Opening your private workspace…'}</p>
  {error && <button onClick={() => setAttempt(v => v+1)} className="mt-5 border border-current rounded-md p-3">Retry</button>}
 </main>;
 return <><header className="forge-host-header" style={{position:'fixed',inset:'0 0 auto',height:40,zIndex:110,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',background:'#191919',color:'#F3F1E7',fontSize:12}}>
  <span className="forge-host-name">Agent Forge · Private workspace</span>
  <nav style={{display:'flex',gap:20,alignItems:'center'}}><select aria-label="Registered agents" value={selectedAgent.agent_id} onChange={event=>{
   const next=agents.find(agent=>agent.agent_id===event.target.value);if(!next)return;
   setHtml('');setBuilder(false);setVisual(null);setSelectedAgent(next);
   window.history.replaceState(null,'',`/atlas/${next.agent_id}`);
  }} style={{color:'#191919',background:'#F3F1E7',padding:'4px 8px',maxWidth:200}}>
   {agents.map(agent=><option key={agent.agent_id} value={agent.agent_id}>{agent.display_name}</option>)}
  </select><a href={`/atlas/${selectedAgent.agent_id}?window=presence`}>Avatar</a>{selectedAgent.agent_id==='artist-packet-expert'&&<button onClick={()=>setVisual({brief:null})}>Avatar jobs</button>}{selectedAgent.agent_id==='artist-packet-expert'&&<button onClick={()=>setBuilder(true)}>Expert Config Builder</button>}{selectedAgent.agent_id==='youtube-intel'&&<a href="/workshop">YouTube health</a>}<a href={`/atlas/${selectedAgent.agent_id}?window=proposals`}>Proposals</a><button onClick={() => signOut()}>Sign out</button></nav>
 </header><iframe ref={frame} name={`forge-atlas:${channel}`} title={`${selectedAgent.display_name} Atlas`} srcDoc={html}
  sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
  referrerPolicy="no-referrer" style={{position:'fixed',inset:'40px 0 0',width:'100%',height:'calc(100dvh - 40px)',border:0,zIndex:100}} />
  {visual&&<ForgeVisualStudio brief={visual.brief} onClose={()=>setVisual(null)} onAdopt={()=>frame.current?.contentWindow?.postMessage({type:'forge-visual.updated.v1',channel},'*')}/>}
  {builder&&<ForgeExpertBuilder onClose={()=>setBuilder(false)}/>}</>;
}
