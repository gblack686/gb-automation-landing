import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {visualRequest,visualAsset} from '../lib/forgeVisualClient';
import {downloadVisualPacket} from '../lib/forgeVisualPacket';
import './ForgeVisualStudio.css';
import ForgeCardDraft from './ForgeCardDraft';
import ForgeOutputPacket from './ForgeOutputPacket';
import {packetItems} from '../lib/forgePacketItems';
const ModelViewer=lazy(()=>import('./ForgeModelViewer'));
const stages=[['portrait','◉','Portrait'],['agent_card','▣','Agent card'],['character','♟','Full character'],['master','◇','3D master'],['web','⬡','Web model']];
const statusText={draft:'Ready to generate',queued:'Queued',working:'Working',running:'Generating',review:'Ready for review',ready:'Ready to use',rejected:'Revision requested',failed:'Generation failed',outcome_unknown:'Needs reconciliation',poll_error:'Check paused',preflight_failed:'Connection needs attention',needs_optimization:'Needs more optimization'};
const stageCost={agent_card:'One Flare image edit, low quality, 1024 × 1536, using the full source card and approved portrait. Billed separately by actual OpenAI token usage.',portrait:'One Flare image edit, low quality, 1024 × 1024. Billed separately by OpenAI using actual token usage.',character:'One Flare image edit, low quality, 1024 × 1536. Billed separately by OpenAI using actual token usage.',master:'30 Meshy credits. One textured 4K master from the approved full character.',web:'5 Meshy credits. One remesh, then texture compression. No additional Meshy calls.'};
export default function ForgeVisualStudio({brief,onClose,onAdopt}){
 const dialog=useRef(null),createId=useRef(crypto.randomUUID());
 const [jobs,setJobs]=useState([]),[job,setJob]=useState(null),[operator,setOperator]=useState(false),[quotes,setQuotes]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false),[view,setView]=useState('portrait'),[preview,setPreview]=useState(null),[viewed,setViewed]=useState(''),[loading,setLoading]=useState(false),[notice,setNotice]=useState(''),[cardText,setCardText]=useState(null),[packetOpen,setPacketOpen]=useState(true);
 const refresh=useCallback(async()=>{const r=await visualRequest({action:'list'});setJobs(r.jobs);setOperator(r.operator);setQuotes(r.quotes);setJob(current=>r.jobs.find(j=>j.id===current?.id)||(!brief?r.jobs.find(j=>j.id===r.active_id)||r.jobs[0]:current)||null);},[brief]);
 useEffect(()=>{dialog.current.showModal();const previous=document.activeElement;return()=>previous?.focus?.();},[]);
 useEffect(()=>{let active=true;refresh().catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[refresh]);
 const jobId=job?.id,jobStatus=job?.status,jobStage=job?.stage;
 const preferredView=job?.assets[jobStage]?jobStage:job?.assets.character?'character':'portrait';
 useEffect(()=>{
  if(!jobId||!['queued','working','running'].includes(jobStatus))return;
  let active=true;const timer=setInterval(()=>visualRequest({action:'get',id:jobId}).then(v=>{if(active)setJob(v);}).catch(e=>{if(active)setError(e.message);}),6000);
  return()=>{active=false;clearInterval(timer);};
 },[jobId,jobStatus]); // Polling never submits provider work.
 const asset=job?.assets[view],assetHash=asset?.sha256;
 useEffect(()=>{setConfirm(false);setError('');setView(preferredView);},[jobId,jobStage,preferredView]);
 useEffect(()=>{
  const abort=new AbortController();let blobURL;
  setPreview(null);setViewed('');setLoading(false);
  // Huge masters are deliberately loaded only after a separate preview click.
  if(!job?.id||!assetHash||view==='master')return()=>abort.abort();
  setLoading(true);visualAsset(job.id,view,abort.signal).then(r=>{if(abort.signal.aborted)return;
   if(view==='web')setPreview(r.bytes);else{blobURL=URL.createObjectURL(new Blob([r.bytes],{type:r.asset.mime}));setPreview(blobURL);}
  }).catch(e=>{if(!abort.signal.aborted)setError(e.message);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>{abort.abort();if(blobURL)URL.revokeObjectURL(blobURL);};
 },[job?.id,view,assetHash]);
 const previewVisible=!packetOpen&&!(jobStage==='agent_card'&&jobStatus==='draft'&&view==='portrait');
 useEffect(()=>{if(!previewVisible)setViewed('');},[previewVisible]);
 const ready=useCallback(()=>{if(previewVisible)setViewed(assetHash||'');},[assetHash,previewVisible]);
 async function act(input){setBusy(true);setError('');try{const result=await visualRequest(input,true);if(input.action==='start')setPacketOpen(false);if(input.action==='adopt'){setNotice('Approved visuals are now used in Forge.');onAdopt();}else{setJob(result);setJobs(list=>[result,...list.filter(x=>x.id!==result.id)]);}setConfirm(false);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function loadMaster(){setLoading(true);setError('');try{const r=await visualAsset(job.id,'master');setPreview(r.bytes);}catch(e){setError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{setCardText(job?.card_text||null);},[job?.id,job?.card_text]);
 const cardDirty=JSON.stringify(cardText)!==JSON.stringify(job?.card_text||null);
 const current=job?.stages[job.stage],canReview=job?.status==='review'&&view===job.stage&&viewed===assetHash&&!packetOpen;
 return <dialog ref={dialog} className="forge-visual-dialog" aria-labelledby="visual-title" onCancel={onClose}>
  <header><div><small>AGENT FORGE / CHARACTER STUDIO</small><h1 id="visual-title">Build your expert’s character</h1></div><button onClick={onClose} aria-label="Close character studio">×</button></header>
  <div className="visual-layout"><aside>
   <h2>Artist Packet Expert</h2><p className="visual-muted">Portrait → agent card → full character → 3D</p>
   {brief&&<div className="visual-new"><strong>{brief.card?.face_name||brief.card?.name||'Selected card'}</strong><p>{brief.direction?.finish} · {brief.direction?.pose} pose</p><button className="visual-primary" disabled={busy||!operator} onClick={()=>act({action:'create',id:createId.current,brief})}>Save generation job</button><small>Saves your inputs. No generation charge.</small></div>}
   <label>Saved jobs<select aria-label="Saved avatar jobs" value={job?.id||''} onChange={e=>{setJob(jobs.find(j=>j.id===e.target.value)||null);setNotice('');}}><option value="">Choose a job</option>{jobs.map(j=><option key={j.id} value={j.id}>{new Date(j.created_at).toLocaleString()} · {statusText[j.status]||j.status}</option>)}</select></label>
   {!operator&&<p className="visual-muted">Review access. Generating and approving assets requires the avatar operator role.</p>}
   <ol className="visual-stages">{stages.filter(([key])=>key!=='agent_card'||!job||job.pipeline_version===2).map(([key,icon,label])=><li key={key}><button className={view===key?'selected':''} disabled={!job?.assets[key]} onClick={()=>{setView(key);setPacketOpen(false);}}><span>{icon}</span><span>{label}<small>{job?.stages[key]?.status?.replaceAll('_',' ')||'Pending'}</small></span>{job?.stages[key]?.review?.decision==='approve'?'✓':''}</button></li>)}</ol>
   {job?.assets.source_card&&<button onClick={()=>{setView('source_card');setPacketOpen(false);}}>▣ Compare full source card</button>}
   {job?.assets.card&&<button onClick={()=>{setView('card');setPacketOpen(false);}}>▧ Compare source artwork</button>}
   {job&&<details><summary>Generation receipt</summary><dl><dt>Run</dt><dd>{job.id}</dd><dt>Card printing</dt><dd>{job.assets.card?.printing?.name||job.brief.card.scryfall_id}</dd><dt>Meshy cap</dt><dd>35 credits · one master + one remesh</dd><dt>Actual Meshy usage</dt><dd>{Object.values(job.stages).filter(s=>s.actual_credits!=null).reduce((n,s)=>n+s.actual_credits,0)} credits reported</dd><dt>Image usage</dt><dd>{Object.values(job.stages).filter(s=>s.receipt?.usage).length} image usage receipts</dd><dt>Task</dt><dd>{current?.task_id||'No provider task ID'}</dd></dl>{job.stages.web?.metrics&&<pre>{JSON.stringify(job.stages.web.metrics,null,2)}</pre>}<button onClick={()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(job,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=`${job.id}-visual-receipt.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}}>Download receipt</button></details>}
   <div className="visual-packet"><button onClick={()=>setPacketOpen(true)}>View full output package</button><small>10 assets + 5 records for new jobs</small>{job&&<button disabled={busy||job.status!=='ready'} onClick={async()=>{setBusy(true);setError('');try{await downloadVisualPacket(job.id,setNotice);setNotice('Complete approved packet downloaded.');}catch(e){setError(e.message);}finally{setBusy(false);}}}>Download approved packet · ZIP</button>}</div>
  </aside><main>
   {packetOpen&&<ForgeOutputPacket job={job} onView={role=>{setView(role);setPacketOpen(false);}}/>}
   {previewVisible&&<div className="visual-preview">
    {loading?<p role="status">Loading verified artwork…</p>:preview?(typeof preview==='string'?<img src={preview} alt={`${view} for Artist Packet Expert`} onLoad={ready}/>:<Suspense fallback={<p>Opening 3D viewer…</p>}><ModelViewer bytes={preview} onReady={ready}/></Suspense>):<div className="visual-empty"><span>◇</span><h2>{job?statusText[job.status]||job.status:'Your character starts with a card'}</h2><p>{job?'Each approved image becomes the input for the next stage.':'Save your chosen card and direction, then generate the portrait.'}</p>{view==='master'&&asset&&<button onClick={loadMaster}>Load master · {(asset.bytes/1000000).toFixed(1)} MB</button>}</div>}
   </div>}
   {job&&<section className="visual-decision"><div className="visual-status"><strong>{statusText[job.status]||job.status}</strong><span>{stages.find(s=>s[0]===job.stage)?.[2]}</span>{current?.progress!=null&&<progress max="100" value={current.progress}/>}</div>
    {current?.error&&<p role="status">{current.error}</p>}
    {job.stage==='agent_card'&&cardText&&<section className="visual-card-editor"><h3>Make this your agent’s card</h3><p className="visual-muted">Choose a writing treatment, mix individual fields, then save your final text.</p><ForgeCardDraft job={job} text={cardText} disabled={busy||!operator||job.status!=='draft'} onChange={value=>{setCardText(value);setConfirm(false);}}/><fieldset disabled={busy||!operator||job.status!=='draft'}><div className="visual-card-fields">{[['title','Card title',100],['mana_cost','Mana cost',80],['creature_type','Creature type',180],['power','Power',16],['toughness','Toughness',16]].map(([key,label,max])=><label key={key}>{label}<input value={cardText[key]} maxLength={max} onChange={e=>{setCardText({...cardText,[key]:e.target.value});setConfirm(false);}}/></label>)}</div><label>Abilities<textarea aria-label="Abilities" rows={4} maxLength={1200} value={cardText.abilities} onChange={e=>{setCardText({...cardText,abilities:e.target.value});setConfirm(false);}}/></label><label>Flavor quote<textarea aria-label="Flavor quote" rows={2} maxLength={300} value={cardText.quote} onChange={e=>{setCardText({...cardText,quote:e.target.value});setConfirm(false);}}/></label>{job.status==='draft'&&<button disabled={!cardDirty&&!!job.card_text_confirmed} onClick={()=>act({action:'card_text',id:job.id,revision:job.revision,card_text:cardText})}>Save card text</button>}</fieldset></section>}
    {job.status==='draft'&&(confirm?<div className="visual-consent"><h3>Approve this generation</h3><p>{stageCost[job.stage]}</p><p>One attempt. Your reference image is sent to {['portrait','agent_card','character'].includes(job.stage)?'OpenAI':'Meshy'}. No paid automatic retries.</p><button className="visual-primary" disabled={busy||!operator} onClick={()=>act({action:'start',id:job.id,revision:job.revision,stage:job.stage,sha256:job.next_input_sha256,quote:quotes[job.stage]})}>{busy?'Saving approval…':'Approve charge & generate'}</button><button disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button></div>:<button className="visual-primary" disabled={busy||!operator||job.stage==='agent_card'&&(cardDirty||!job.card_text_confirmed)} onClick={()=>setConfirm(true)}>Generate {stages.find(s=>s[0]===job.stage)?.[2].toLowerCase()} →</button>)}
    {job.status==='review'&&<>{job.stage==='portrait'&&<div className="portrait-icon-review"><p>Check the small avatars too. They share this portrait’s approval.</p>{packetItems.filter(([role])=>role.startsWith('avatar')&&job.assets[role]).map(([role,label])=><button key={role} onClick={()=>{setView(role);setPacketOpen(false);}}>{label}</button>)}{view.startsWith('avatar')&&<button onClick={()=>setView('portrait')}>Back to portrait review</button>}</div>}<p>{canReview?(job.stage==='agent_card'?'Compare the full source card. Check frame colors, title, mana, creature type, every ability, quote and bottom-right power/toughness. Image-rendered text requires your visual review.':'Check identity, palette, complete limbs and detail before continuing.'):'Open and inspect this stage’s output before approving it.'}</p><div className="visual-actions"><button className="visual-primary" disabled={busy||!operator||!canReview} onClick={()=>act({action:'review',id:job.id,revision:job.revision,stage:job.stage,sha256:job.assets[job.stage].sha256,decision:'approve'})}>Approve & continue</button><button disabled={busy||!operator} onClick={()=>act({action:'review',id:job.id,revision:job.revision,stage:job.stage,sha256:job.assets[job.stage].sha256,decision:'reject'})}>Needs revision</button></div></>}
    {job.status==='ready'&&<button className="visual-primary" disabled={busy||!operator} onClick={()=>act({action:'adopt',id:job.id,revision:job.revision,sha256:job.assets.web.sha256})}>Use approved character in Forge</button>}
    {['queued','working','running','preflight_failed','poll_error','outcome_unknown','needs_optimization'].includes(job.status)&&<button disabled={busy||!operator} onClick={()=>act({action:'resume',id:job.id,revision:job.revision})}>Resume checks · no new charge</button>}
    {job.status==='rejected'&&<p>Choose a revised brief to start a new job. This job and its outputs stay saved.</p>}
   </section>}
   {notice&&<p role="status">{notice}</p>}{error&&<p className="visual-error" role="alert">{error}</p>}<button className="visual-refresh" disabled={busy} onClick={()=>refresh().catch(e=>setError(e.message))}>Refresh saved status</button>
  </main></div>
 </dialog>;
}
