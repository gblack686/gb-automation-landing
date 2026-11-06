import { useEffect, useRef, useState } from 'react';
import { readResourceCatalog, readResourceArtifact, resourceDocument } from '../lib/forgeResourceClient';
import './ForgeResourceGallery.css';
import ForgePiActions from './ForgePiActions';
import ForgeLiveBenchmark from './ForgeLiveBenchmark';

export default function ForgeResourceGallery({agentId,onClose,initialKind='ui',initialOwner=''}) {
 const dialog=useRef(null),artifactAbort=useRef(null),returnFocus=useRef(null);
 const [kind,setKind]=useState(initialKind),[owner,setOwner]=useState(initialOwner),[search,setSearch]=useState('');
 const [query,setQuery]=useState(''),[offset,setOffset]=useState(0),[attempt,setAttempt]=useState(0);
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [opened,setOpened]=useState(null),[artifact,setArtifact]=useState(null),[artifactError,setArtifactError]=useState('');
 useEffect(()=>{dialog.current.showModal();return()=>{artifactAbort.current?.abort();};},[]);
 useEffect(()=>{
  let active=true;setLoading(true);setError('');
  readResourceCatalog({kind,...(owner?{owner}:{}),...(query?{search:query}:{}),offset},agentId)
   .then(value=>{if(active)setData(value);})
   .catch(()=>{if(active)setError('The catalog could not refresh. Any visible results are from the last successful read.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[agentId,kind,owner,query,offset,attempt]);
 const change=update=>{setData(null);setOffset(0);update();};
 const back=()=>{artifactAbort.current?.abort();setOpened(null);setArtifact(null);setArtifactError('');
  requestAnimationFrame(()=>returnFocus.current?.focus());};
 const open=async(row,event)=>{
  returnFocus.current=event.currentTarget;artifactAbort.current?.abort();
  const controller=new AbortController();artifactAbort.current=controller;
  setOpened(row);setArtifact(null);setArtifactError('');
  if(row.availability==='live_read')return;
  try {
   const result=await readResourceArtifact(row.id,data.catalog_sha256,agentId,controller.signal);
   if(!controller.signal.aborted)setArtifact({html:resourceDocument(result.bytes,result.asset.media_type),...result.asset});
  }catch(reason){if(!controller.signal.aborted)setArtifactError(reason.message||'The saved result could not open.');}
 };
 return <dialog ref={dialog} className="forge-resource-dialog" aria-labelledby="resource-gallery-title" onCancel={event=>{event.preventDefault();onClose();}}>
  <header className="resource-heading"><div><p>Character Forge</p><h2 id="resource-gallery-title">{opened?opened.title:'Expert resources'}</h2></div>
   <button type="button" onClick={onClose} aria-label="Close expert resources">Close</button></header>
  {opened?<section className="resource-viewer">
   <div className="resource-viewer-tools"><button type="button" onClick={back}>Back to gallery</button>
    <span>{opened.owner_expert||'Unassigned'} · {opened.availability==='live_read'?'Read-only Mini view':artifact?.freshness==='stale'?'Saved result is stale':opened.freshness==='stale'?'Saved result is stale':'Saved result'}</span></div>
   {opened.availability==='live_read'?<ForgeLiveBenchmark row={opened} catalogSha={data.catalog_sha256} agentId={agentId}/>:artifact?<><p className="resource-evidence">Captured {new Date(artifact.observed_at).toLocaleString()} · SHA-256 {artifact.sha256.slice(0,12)}</p>
    <iframe title={`${opened.title} saved result`} srcDoc={artifact.html} sandbox="allow-scripts" referrerPolicy="no-referrer" /></>
    :<p role={artifactError?'alert':'status'}>{artifactError||'Verifying saved result…'}</p>}
  </section>:<>
   <p className="resource-intro">Private UIs and knowledge, organized by expert. Saved results remain available when a Mini is offline.</p>
   <div className="resource-filters">
    <label>Resource type<select value={kind} onChange={e=>change(()=>setKind(e.target.value))}>
     <option value="ui">UI gallery</option><option value="kb">Knowledge documents</option><option value="process">Processes</option></select></label>
    <label>Expert owner<select value={owner} onChange={e=>change(()=>setOwner(e.target.value))}>
     <option value="">All experts</option>{[...new Set([...(data?.owners||[]),...(owner?[owner]:[])])].sort().map(name=><option key={name} value={name}>{name}</option>)}</select></label>
    <form onSubmit={e=>{e.preventDefault();change(()=>setQuery(search.trim()));}}><label>Find a resource<input value={search} maxLength={120} onChange={e=>setSearch(e.target.value)} type="search" /></label><button type="submit">Search</button></form>
    <button type="button" onClick={()=>setAttempt(n=>n+1)} disabled={loading}>Refresh</button>
   </div>
   {error&&<p role="alert" className="resource-warning">{error}</p>}
   <p role="status" aria-live="polite">{loading?'Loading resources…':data?`${data.total} resources${data.captured_at?' · Catalog captured '+new Date(data.captured_at).toLocaleString():''}`:'Resources unavailable.'}</p>
   {data&&!data.rows.length&&!loading&&<p>No resources match these filters.</p>}
   {owner&&data&&<ForgePiActions key={owner} agentId={owner} rows={data.rows} catalogSha={data.catalog_sha256} onPublished={()=>setAttempt(n=>n+1)} />}
   <ul className="resource-grid">{data?.rows.map(row=><li key={row.id}>
    <p className="resource-owner">{row.owner_expert||'Unassigned'}</p><h3>{row.title}</h3>{row.description&&<p>{row.description}</p>}
    <p className="resource-meta">{row.freshness==='stale'?'Stale capture':'Captured'} · {new Date(row.observed_at).toLocaleString()}</p>
    <p className="resource-meta">Source {row.source_commit.slice(0,10)}{row.content_sha256?' · SHA '+row.content_sha256.slice(0,10):''}</p>
    {row.availability==='saved_result'?<button type="button" onClick={event=>open(row,event)}>Open saved result</button>
     :row.availability==='live_read'?<button type="button" onClick={event=>open(row,event)}>Open live view</button>
     :<p className="resource-unavailable">{row.delivery_mode==='live_app'?'Live access is not enabled.':'No hosted result is available yet.'}</p>}
   </li>)}</ul>
   {data&&data.total>50&&<nav aria-label="Resource pages" className="resource-pages">
    <button disabled={!offset||loading} onClick={()=>{setData(null);setOffset(Math.max(0,offset-50));}}>Previous</button>
    <span>{offset+1}–{Math.min(offset+50,data.total)} of {data.total}</span>
    <button disabled={data.next===null||loading} onClick={()=>{setOffset(data.next);setData(null);}}>Next</button></nav>}
  </>}
 </dialog>;
}
