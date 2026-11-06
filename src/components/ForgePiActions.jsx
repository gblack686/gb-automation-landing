import {useEffect,useState} from 'react';
import {piRequest} from '../lib/forgePiClient';
const labels={'catalog.refresh':'Publish prepared catalog','projection.refresh':'Publish prepared result','expert.report':'Prepare YouTube daily report'};
const states={pending:'Queued for Pi',leased:'Pi is handling this request',accepted:'Admitted by Pi; the report has its own tracked run',
 complete:'Publication verified',failed:'Request was refused or could not finish',uncertain:'Completion needs reconciliation; no automatic replay',expired:'Request expired before completion'};
const terminal=state=>['accepted','complete','failed','uncertain','expired'].includes(state);
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
function saved(agentId){
 try{const value=JSON.parse(sessionStorage.getItem(`forge.pi.pending.${agentId}`));
  return value&&uuid(value.idempotency_key)&&Object.hasOwn(labels,value.action)&&/^[a-z][a-z0-9._-]{2,159}$/.test(value.resource_id)
   &&/^[a-f0-9]{64}$/.test(value.catalog_sha256)?value:null;
 }catch{return null;}
}
export default function ForgePiActions({agentId,rows,catalogSha,onPublished}){
 const [capability,setCapability]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [action,setAction]=useState('projection.refresh'),[resource,setResource]=useState('');
 const [pending,setPending]=useState(()=>saved(agentId)),[job,setJob]=useState(null);
 const candidates=rows.filter(row=>row.owner_expert===agentId&&(action==='catalog.refresh'||row.delivery_mode==='artifact'));
 const target=candidates.some(row=>row.id===resource)?resource:candidates[0]?.id||'';
 useEffect(()=>{let active=true;piRequest('capability',{},agentId).then(v=>{if(active)setCapability(v);}).catch(()=>{if(active)setCapability({enabled:false,actions:[]});});return()=>{active=false;};},[agentId]);
 useEffect(()=>{try{const key=`forge.pi.pending.${agentId}`;if(pending)sessionStorage.setItem(key,JSON.stringify(pending));else sessionStorage.removeItem(key);}catch{/* request identity remains in memory */}},[agentId,pending]);
 const check=async()=>{
  if(!pending)return;setBusy(true);setError('');
  try{const value=await piRequest('status',{idempotency_key:pending.idempotency_key},agentId);setJob(value);
   if(!value)setError('No receipt was found. Retry the same request to keep its identity.');}
  catch(reason){setError(reason.message);}finally{setBusy(false);}
 };
 const submit=async()=>{
  if(busy||!capability?.enabled)return;
  const request=pending||{action,resource_id:target,catalog_sha256:catalogSha,idempotency_key:crypto.randomUUID()};
  if(!request.resource_id)return;setPending(request);setBusy(true);setError('');
  try{const value=await piRequest(request.action,{resource_id:request.resource_id,catalog_sha256:request.catalog_sha256,idempotency_key:request.idempotency_key},agentId);
   setJob(value);if(value.state==='complete')onPublished?.();}
  catch{setError('The outcome could not be confirmed. Check status or retry this same request; its identity is preserved.');}
  finally{setBusy(false);}
 };
 const allowed=(capability?.actions||[]).filter(name=>Object.hasOwn(labels,name));
 const selected=allowed.includes(action)?action:allowed[0]||'';
 useEffect(()=>{if(selected&&selected!==action)setAction(selected);},[selected,action]);
 return <section className="resource-actions" aria-label="Pi actions">
  <h3>Pi actions · {agentId}</h3>
  {!capability?<p role="status">Checking remote actions…</p>:!capability.enabled?<p>Remote actions are not enabled or Pi is unavailable. Saved results remain readable.</p>:<>
   <p>Publish reviewed, prepared output or ask Pi for its existing daily report. The report uses the current admission budget.</p>
   {!pending&&<div className="resource-filters">
    <label>Action<select aria-label="Pi action" value={selected} onChange={e=>setAction(e.target.value)} disabled={busy}>{allowed.map(name=><option key={name} value={name}>{labels[name]}</option>)}</select></label>
    <label>Target resource<select aria-label="Target resource" value={target} onChange={e=>setResource(e.target.value)} disabled={busy}>{candidates.map(row=><option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
   </div>}
   {(!job||!terminal(job.state))&&<button disabled={busy||!allowed.length||!pending&&!candidates.length} onClick={submit}>{busy?'Waiting…':pending?'Retry same request':'Request from Pi'}</button>}
  </>}
  {pending&&<div><p className="resource-evidence">Request {pending.idempotency_key.slice(0,8)} · {labels[pending.action]}</p>
   {job&&<p role="status">{states[job.state]}{job.result?.kind==='native-run'?` · Run ${job.result.run_id}`:''}</p>}
   <button disabled={busy} onClick={check}>Check request status</button>
   {job&&terminal(job.state)&&<button disabled={busy} onClick={()=>{setPending(null);setJob(null);setError('');}}>Start another request</button>}
  </div>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
