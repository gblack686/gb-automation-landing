import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {signOut} from 'aws-amplify/auth';
import {openSystemSession} from '../lib/systemHomeClient';
import {cycleSystemView,SYSTEM_VIEWS,systemSelection} from '../lib/systemHome.mjs';
import SystemTopology from '../components/SystemTopology';
import SystemContextGraph from '../components/SystemContextGraph';
import ForgeResourceGallery from '../components/ForgeResourceGallery';
import './SystemHome.css';
const labels=['Operations Center','Docs / KB','Agent Observability'];
const when=x=>x?new Date(x).toLocaleString():'Unknown';
const metric=x=>x===null||x===undefined?'Unknown':x.toLocaleString();
function Metrics({counts}){return <dl className="system-metrics">{Object.entries(counts).map(([name,value])=>{
 const sampled=name==='sessions_sampled';
 const scope=sampled?'Bounded sample':'Source-reported total';
 const detail=sampled?'Sessions included in the bounded observation sample.':'Total explicitly reported by the source. Coverage is limited to reporting sources.';
 return <div key={name} title={`${name.replaceAll('_',' ')}: ${metric(value)}. ${detail} Unknown values remain unknown.`}><dt>{name.replaceAll('_',' ')}</dt><dd>{metric(value)}<small className="block text-xs text-[#c0cdc4]">{scope}</small></dd></div>;
 })}</dl>;}
function Stamp({label,value}){return <span>{label}: <time dateTime={value||undefined}>{when(value)}</time></span>;}
function State({value}){return <span className={`system-state state-${value}`}>{value}</span>;}
export default function SystemHome(){
 const location=useLocation(),navigate=useNavigate(),{view,sid}=systemSelection(location.hash);
 const [access,setAccess]=useState(null),[snapshot,setSnapshot]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[gallery,setGallery]=useState(false),[query,setQuery]=useState(''),[attempt,setAttempt]=useState(0),[now,setNow]=useState(Date.now());
 const [graphMode,setGraphMode]=useState('context');
 const refresh=useRef(()=>{}),generation=useRef(0);
 function select(next,session=sid){const p=new URLSearchParams(location.hash.slice(1));p.set('view',next);p.set('sid',session);navigate({pathname:'/system',search:location.search,hash:p.toString()},{replace:true});}
 useEffect(()=>{
  const listener=e=>{if(cycleSystemView(e,document)){e.preventDefault();select(SYSTEM_VIEWS[(SYSTEM_VIEWS.indexOf(view)+1)%3]);}};
  window.addEventListener('keydown',listener);return ()=>window.removeEventListener('keydown',listener);
 },[view,sid,location.search,location.hash]);
 useEffect(()=>{
  let active=true,inFlight=false,authorized=false;
  setAccess(null);setSnapshot(null);setError('');setBusy(true);setGallery(false);
  const guard=openSystemSession(()=>{authorized=false;generation.current++;if(active){setSnapshot(null);setAccess(null);setGallery(false);setError('Your private session ended. Sign in again.');setBusy(false);}});
  async function read(){
   if(!active||!authorized||inFlight||document.visibilityState==='hidden')return;
   inFlight=true;const seq=++generation.current;setBusy(true);
   try{const data=await guard.read('snapshot');if(active&&authorized&&seq===generation.current){setSnapshot(data);setNow(Date.now());setError('');}}
   catch(e){if(active&&seq===generation.current){setError(e.code==='system_unavailable'?'Live data is unavailable. Last successful snapshot, if shown, is retained.':'Access could not be verified.');if(e.code!=='system_unavailable'){authorized=false;setAccess(null);setSnapshot(null);setGallery(false);}}}
   finally{inFlight=false;if(active)setBusy(false);}
  }
  refresh.current=read;
  guard.read('access').then(a=>{
   if(!active)return;
   if(!a.admin){setBusy(false);if(a.destination&&a.destination!=='/system')navigate(a.destination,{replace:true});else setError('No workspace is assigned to this account.');return;}
   authorized=true;setAccess(a);void read();
  }).catch(()=>{if(active){setBusy(false);setError('Your workspace access is unavailable. Please retry.');}});
  const tick=setInterval(()=>{setNow(Date.now());void read();},30000);
  const visible=()=>{if(document.visibilityState==='visible'){void guard.check().then(read).catch(()=>{});}};
  document.addEventListener('visibilitychange',visible);
  return ()=>{active=false;authorized=false;generation.current++;clearInterval(tick);document.removeEventListener('visibilitychange',visible);guard.stop();refresh.current=()=>{};};
 },[navigate,attempt]);
 const fresh=snapshot&&(now-Date.parse(snapshot.captured_at)>snapshot.ttl_seconds*1000?'stale':snapshot.freshness);
 const exit=async()=>{generation.current++;setSnapshot(null);setAccess(null);setGallery(false);await signOut();navigate('/login',{replace:true});};
 const docs=snapshot?.docs,observation=snapshot?.observability,ops=snapshot?.operations;
 const matches=observation?.sessions.filter(s=>s.id===sid)||[];
 const focus=observation?.focus_session.id===sid?observation.focus_session:matches.length===1?matches[0]:null;
 return <main className="system-home">
  <header className="system-header"><div><Link className="system-brand" to="/">GB AUTOMATION</Link><h1>System Home</h1></div><div className="system-actions">{access?.agent_id&&<Link to={`/atlas/${access.agent_id}`}>Expert workspace</Link>}<button onClick={()=>access?refresh.current():setAttempt(x=>x+1)} disabled={busy}>{busy?'Checking…':'Refresh'}</button><button onClick={exit}>Sign out</button></div></header>
  <nav className="system-switcher" aria-label="System applications">{SYSTEM_VIEWS.map((v,i)=><button key={v} aria-current={view===v?'page':undefined} onClick={()=>select(v)}>{labels[i]}<small>{['AI OS + system atlas','Indexed knowledge + saved reports','Pi session coverage'][i]}</small></button>)}<span>Shift+Tab cycles views</span></nav>
  <div className="system-freshness" aria-live="polite">{snapshot?<><State value={fresh}/><Stamp label="Captured" value={snapshot.captured_at}/><Stamp label="Retrieved" value={snapshot.retrieved_at}/><span>{error?'Last successful snapshot':'Refreshes every 30 seconds while visible'}</span></>:<span>{busy?'Verifying workspace access…':'System data unavailable'}</span>}</div>
  {error&&<p className="system-error" role="alert">{error} {!access&&<Link to="/login">Sign in</Link>}</p>}
  {snapshot&&access?.admin&&<div className="system-content">
   {view==='operations'&&<><section className="system-summary"><div className="system-section-heading"><h2>Operations Center</h2><State value={ops.status}/></div><div className="system-timestamps"><Stamp label="Source generated" value={ops.generated_at}/><Stamp label="Latest event" value={ops.latest_event_at}/>{ops.reason&&<span>{ops.reason.replaceAll('_',' ')}</span>}</div><Metrics counts={ops.counts}/></section>
    <div className="context-mode" role="group" aria-label="Operations graph views"><button aria-pressed={graphMode==='context'} onClick={()=>setGraphMode('context')}>Operations + knowledge</button><button aria-pressed={graphMode==='architecture'} onClick={()=>setGraphMode('architecture')}>Architecture reference</button></div>
    {graphMode==='context'?<SystemContextGraph graph={snapshot.context_graph} now={now} retained={!!error} onSearch={label=>{setQuery(label);select('docs');}}/>:<SystemTopology topology={snapshot.topology}/>}
    <section className="system-records"><h2>Source coverage</h2><div className="system-source-grid">{ops.sources.map(s=><article key={s.id}><strong>{s.id}</strong><State value={s.status}/><Stamp label="Source updated" value={s.updated_at}/><Stamp label="Observed" value={s.observed_at}/></article>)}</div><details><summary>Recent runs ({ops.runs.length}, bounded sample)</summary>{ops.runs.length?<ul>{ops.runs.map(r=><li key={r.id}>{r.id} · {r.expert_id||'Unknown expert'} · {r.status} · {when(r.updated_at)}</li>)}</ul>:<p>No runs in this snapshot.</p>}</details></section></>}
   {view==='docs'&&<section className="system-records"><div className="system-section-heading"><div><h2>Docs / KB</h2><p>{metric(docs.count)} indexed records · {docs.rows.length} shown · Incomplete coverage</p><Stamp label="Indexed" value={docs.indexed_at}/></div><button onClick={()=>setGallery(true)}>Browse saved reports</button></div><label className="system-search">Find indexed records <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title, kind or path"/></label><div className="system-table-wrap"><table><thead><tr><th>Title</th><th>Kind</th><th>Source path</th></tr></thead><tbody>{docs.rows.filter(r=>`${r.title} ${r.kind} ${r.path}`.toLowerCase().includes(query.toLowerCase())).map(r=><tr key={r.id}><td>{r.title}</td><td>{r.kind}</td><td>{r.path}</td></tr>)}</tbody></table></div>{!docs.rows.length&&<p>No indexed records are available in this snapshot.</p>}<p>Saved previews open through the authenticated resource gallery when published. Indexed paths are references, not download links.</p></section>}
   {view==='observability'&&<section className="system-records"><div className="system-section-heading"><h2>Agent Observability</h2><State value={observation.status}/></div><p>Incomplete coverage. Counts describe only the reported sources and bounded sample.</p><div className="system-timestamps"><Stamp label="Latest event" value={observation.latest_event_at}/><Stamp label="Source fetched" value={observation.fetched_at}/>{observation.reason&&<span>{observation.reason.replaceAll('_',' ')}</span>}</div><Metrics counts={observation.counts}/>
    <label className="system-session">Session <select value={sid} onChange={e=>select(view,e.target.value)}>{[...new Set([sid,'dna-local-1',observation.focus_session.id,...observation.sessions.map(s=>s.id)])].map(id=><option key={id}>{id}</option>)}</select></label><article className="system-focus"><h3>{sid}</h3><State value={focus?.status||'unavailable'}/><p>{focus?`${metric(focus.event_count)} events · Latest event: ${when(focus.latest_event_at)}`:'Session not observed in the bounded sample.'}</p>{focus?.reason&&<p>{focus.reason.replaceAll('_',' ')}</p>}</article>
    <div className="system-source-grid">{observation.sources.map(s=><article key={s.id}><strong>{s.id}</strong><State value={s.status}/><Stamp label="Latest event" value={s.latest_event_at}/><p>{metric(s.sessions_sampled)} sessions sampled</p></article>)}</div><div className="system-table-wrap"><table><thead><tr><th>Session</th><th>Pool</th><th>Agent</th><th>Events</th><th>Latest event</th><th>Status</th></tr></thead><tbody>{observation.sessions.map(s=><tr key={`${s.pool}/${s.id}`}><td><button onClick={()=>select(view,s.id)}>{s.id}</button></td><td>{s.pool}</td><td>{s.agent||'Unknown'}</td><td>{metric(s.event_count)}</td><td>{when(s.latest_event_at)}</td><td><State value={s.status}/></td></tr>)}</tbody></table></div>{!observation.sessions.length&&<p>No sessions in this snapshot.</p>}</section>}
  </div>}
  {gallery&&access?.admin&&access.agent_id&&<ForgeResourceGallery agentId={access.agent_id} initialKind="kb" onClose={()=>setGallery(false)}/>}
 </main>;
}
