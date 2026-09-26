'use strict';
(() => {
const $ = id => document.getElementById(id);
const data = JSON.parse($('planning-data').textContent), S = window.ForgePreview.source;
const planTemplate=window.ForgePlanTemplate.create(data.request);
const expertBuilder=window.ForgeExpertBuilder.create(data);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
const text = (s, n) => typeof s === 'string' && s.length > 0 && s.length <= n;
const date = s => typeof s === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(s) && Number.isFinite(Date.parse(s));
const prdId = s => typeof s === 'string' && /^prd_[a-f0-9]{20}$/.test(s);
const keys = (v, names) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const cacheKey = 'gbauto.forge-planning.v1.' + JSON.stringify(data.scope);
let snapshot = null, refreshError = false, refreshing = false;
function validate(v) {
 if (!data.scope || !keys(v,['schema_version','tenant_id','agent_id','board_slug','config_sha256','captured_at','source','prds','cards','artifacts']) || v.schema_version !== 'forge-planning-snapshot.v1') throw Error('Invalid planning response');
 if (!['tenant_id','agent_id','board_slug','config_sha256'].every(k => v[k] === data.scope[k]) || !date(v.captured_at) || !['supabase','prd-index'].includes(v.source)) throw Error('Planning scope mismatch');
 if (!Array.isArray(v.prds) || v.prds.length > 100 || !Array.isArray(v.cards) || v.cards.length > 200 || !Array.isArray(v.artifacts) || v.artifacts.length > 30) throw Error('Unbounded planning response');
 const ids = new Set();
 for (const p of v.prds) {
  if (!keys(p,['prd_id','title','status','path','updated_at','config_sha256','source','body_sha256']) || !prdId(p.prd_id) || ids.has(p.prd_id) || !text(p.title,300) || !text(p.status,80) || !text(p.path,500) || !/^(?!\/)(?!.*\.\.)(?!.*[\\:])[a-zA-Z0-9_./ -]+$/.test(p.path) || (p.updated_at !== null && !date(p.updated_at)) || (p.config_sha256 !== null && !hash(p.config_sha256)) || !hash(p.body_sha256) || p.source !== 'prd_artifacts') throw Error('Invalid PRD');
  ids.add(p.prd_id);
 }
 const cards = new Set();
 for (const c of v.cards) {
  if (!keys(c,['task_id','title','status','updated_at','prd_ids']) || !text(c.task_id,150) || !/^[a-zA-Z0-9_-]+$/.test(c.task_id) || cards.has(c.task_id) || !text(c.title,300) || !text(c.status,80) || (c.updated_at !== null && !date(c.updated_at)) || !Array.isArray(c.prd_ids) || !c.prd_ids.length || c.prd_ids.length > 100 || new Set(c.prd_ids).size !== c.prd_ids.length || !c.prd_ids.every(id => ids.has(id))) throw Error('Invalid linked card');
  cards.add(c.task_id);
 }
 for (const a of v.artifacts) {
  if (!keys(a,['id','filename','title','mime','bytes','sha256','kind','prd_id']) || !text(a.id,120) || !/^[a-z0-9][a-z0-9_-]*$/.test(a.id) || !text(a.filename,130) || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}\.(html|yaml|json|md|txt)$/.test(a.filename) || !text(a.title,180) || !['text/html','application/yaml','application/json','text/markdown','text/plain'].includes(a.mime) || !Number.isInteger(a.bytes) || a.bytes < 1 || a.bytes > 3000000 || !hash(a.sha256) || a.kind !== 'actual' || (a.prd_id !== null && !ids.has(a.prd_id))) throw Error('Invalid artifact metadata');
 }
 return v;
}
try { if (data.snapshot) snapshot = validate(data.snapshot); } catch { refreshError = true; }
if (data.scope && location.protocol !== 'file:') {
 try { const saved = JSON.parse(localStorage.getItem(cacheKey)); if (saved && (!snapshot || Date.parse(saved.captured_at) > Date.parse(snapshot.captured_at))) snapshot = validate(saved); } catch { /* Ignore invalid storage, retain the embedded snapshot. */ }
}
function stamp(value) { return value ? new Date(value).toLocaleString() : 'Time not recorded'; }
function download(name, content, mime) {
 const url = URL.createObjectURL(new Blob([content], {type:mime})), a = document.createElement('a');
 a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function modal(title, note, body) {
 $('planning-dialog-title').textContent=title; $('planning-dialog-note').textContent=note;
 $('planning-dialog-body').replaceChildren(body); if (!$('planning-dialog').open) $('planning-dialog').showModal();
}
function artifactButtons(a) { return `<div class="planning-actions"><button class="panel-button" data-preview-file="${esc(a.id)}">Preview</button><button class="panel-button" data-download-file="${esc(a.id)}">Download</button></div>`; }
function previewArtifact(id) {
 const a=data.artifacts.find(a=>a.id===id); if(!a) return;
 const box=document.createElement('div'); box.innerHTML=`<button class="panel-button" data-download-file="${esc(a.id)}">Download ${esc(a.filename)}</button>`;
 if (a.mime==='text/html') {
  const frame=document.createElement('iframe'); frame.setAttribute('sandbox',''); frame.setAttribute('referrerpolicy','no-referrer'); frame.title=a.title + ' preview';
  const policy="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'";
  // Apply before srcdoc parsing, including speculative resource loads. Keep
  // the meta policy for engines that do not support the iframe CSP attribute.
  frame.setAttribute('csp',policy);
  frame.srcdoc='<meta http-equiv="Content-Security-Policy" content="'+policy+'">'+a.content; box.append(frame);
 } else { const pre=document.createElement('pre'); pre.textContent=a.content; box.append(pre); }
 modal(a.title, a.kind==='example'?'Example only. Not approved. Not dispatchable.':a.filename, box);
}
const samplePlan=data.artifacts.find(a=>a.filename==='implementation-plan.sample.html');
function openPlan(id) {
 const p=snapshot?.prds.find(p=>p.prd_id===id); if (!p) return;
 const box=document.createElement('div');
 const packaged=data.artifacts.find(a=>a.kind==='actual' && a.prd_id===p.prd_id && a.mime==='text/html' && a.sha256===p.body_sha256);
 if(packaged) { previewArtifact(packaged.id); return; }
 box.innerHTML=`<p>${esc(p.status)} · ${esc(p.source)}</p><p class="tiny">${esc(p.path)}</p><p>${configLabel(p)}</p>${packaged?artifactButtons(packaged):'<p>The plan file is not included in this offline package. Its scoped index record is available below.</p>'}<button class="panel-button" data-download-plan="${esc(p.prd_id)}">Download index record</button>`;
 const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');
 summary.textContent='Index metadata';pre.textContent=JSON.stringify(p,null,2);details.append(summary,pre);box.append(details);
 modal(p.title, 'Updated '+stamp(p.updated_at), box);
}
function configLabel(p) {
 return p.config_sha256 === S.yaml_sha256 ? 'Current config · '+p.config_sha256.slice(0,12) : p.config_sha256 ? 'Previous config · '+p.config_sha256.slice(0,12)+' · review required' : 'Config lineage missing · review required';
}
function snapshotStatus() {
 if (refreshError) return snapshot ? 'Refresh failed. Last good snapshot retained · '+stamp(snapshot.captured_at) : 'Refresh unavailable. No verified record count; examples are illustrative only.';
 if (!snapshot) return 'Not connected. Examples are illustrative only; no verified record count.';
 const freshness=Date.now()-Date.parse(snapshot.captured_at)>60000?'Saved snapshot':'Live snapshot';
 return `${freshness} · ${snapshot.source} · ${stamp(snapshot.captured_at)} · ${snapshot.prds.length} PRDs / ${snapshot.cards.length} linked cards`;
}
function renderRequest() {
 const r=data.request;
 $('planning-request').innerHTML=`<article class="planning-card"><span class="chip">Draft requirements · scope pending</span><h4>${esc(r.title)}</h4><p class="tiny">Config ${esc(r.config_sha256.slice(0,12))}. ${r.tenant_id?'For '+esc(r.tenant_id)+'.':'Tenant confirmation needed.'} Export this draft for the TAC-plan scope review.</p><details><summary>Review ${r.requirements.length} implementation requirements</summary>${r.requirements.map(q=>`<section class="requirement"><h4>${esc(q.id)} · ${esc(q.title)}</h4><p>${esc(q.summary)}</p><ul>${q.criteria.map(c=>`<li>${esc(c)}</li>`).join('')}</ul><p class="tiny">${q.needs_setup?'Bindings need setup.':'Draft values supplied.'}</p><div class="config-links">${q.config_fields.map(f=>`<button class="field-link" data-field="${esc(f)}">${esc(f)}</button>`).join('')}</div></section>`).join('')}</details><div class="planning-actions"><button class="panel-button" id="download-planning-request">Download planning request</button><button class="panel-button" id="download-planning-prompt">Download TAC-plan handoff</button></div><p class="tiny">Scope review → official plan + architecture → separate implementation approval. This export grants no approval.</p></article>`;
 const container=document.createElement('div');container.id='forge-plan-template';
 $('planning-request').prepend(container);planTemplate.mount(container);
 const builder=document.createElement('div');builder.id='forge-expert-builder';$('planning-request').prepend(builder);expertBuilder.mount(builder);
}
function renderPlans() {
 $('planning-status').textContent=snapshotStatus();
 $('prd-list').innerHTML=(snapshot?.prds||[]).map(p=>`<article class="planning-card" data-prd-id="${esc(p.prd_id)}"><span class="chip">${esc(p.status)}</span><h4>${esc(p.title)}</h4><p class="tiny">${esc(configLabel(p))}<br>Updated ${esc(stamp(p.updated_at))} · PRD index</p><div class="planning-actions"><button class="panel-button" data-plan-open="${esc(p.prd_id)}">Open</button><button class="panel-button" data-download-plan="${esc(p.prd_id)}">Download record</button></div></article>`).join('') || `<div class="panel-notice">${snapshot?'No indexed plans in this snapshot.':'No verified plans loaded.'} Your draft requirements are below.</div><article class="planning-card example-card"><span class="chip">Example only</span><h4>See a TAC implementation plan</h4><p class="tiny">A synthetic example of the document produced after scope approval.</p><button class="panel-button" data-preview-file="${samplePlan.id}">Preview sample plan</button></article>`;
}
const groups=['Proposed','Ready','In progress','Blocked','Done'];
const statuses={proposed:'Proposed',draft:'Proposed',backlog:'Proposed',todo:'Proposed',pending:'Proposed',ready:'Ready',queued:'Ready',in_progress:'In progress',running:'In progress',doing:'In progress',active:'In progress',blocked:'Blocked',failed:'Blocked',done:'Done',completed:'Done',merged:'Done',committed_unmerged:'Done',receipt_only:'Done',blocked_with_receipt:'Blocked'};
function column(status) { return statuses[status.toLowerCase().replace(/[- ]/g,'_')] || 'Other'; }
function renderKanban() {
 const real=Boolean(snapshot?.prds.length || snapshot?.cards.length);
 const cards=real?snapshot.cards:[
  {task_id:'example-1',title:'Confirm the packet brief',status:'proposed'},
  {task_id:'example-2',title:'Bind approved skills',status:'ready'},
  {task_id:'example-3',title:'Build the draft workflow',status:'in_progress'},
  {task_id:'example-4',title:'Resolve publishing access',status:'blocked'},
  {task_id:'example-5',title:'Review sample acceptance checks',status:'done'}];
 const columns=[...groups,...(cards.some(c=>column(c.status)==='Other')?['Other']:[])];
 $('kanban-status').textContent=(real?'Read-only · ':'Example board · synthetic cards, no work has run. ')+snapshotStatus();
 $('kanban-board').dataset.mode=real?'records':'example';
 $('kanban-board').innerHTML=columns.map(group=>`<section class="kanban-column"><h4>${group}<span>${cards.filter(c=>column(c.status)===group).length}</span></h4>${cards.filter(c=>column(c.status)===group).map(c=>`<article class="kanban-card"><span class="tiny">${real?esc(c.status):'Example only'}</span><h5>${esc(c.title)}</h5>${real?`<p class="tiny">Updated ${esc(stamp(c.updated_at))}</p>${c.prd_ids.map(id=>`<button class="text-button" data-plan-open="${esc(id)}">${esc(snapshot.prds.find(p=>p.prd_id===id).title)}</button>`).join('')}`:`<button class="text-button" data-preview-file="${samplePlan.id}">Example plan</button>`}</article>`).join('') || '<p class="tiny">No linked cards.</p>'}</section>`).join('');
}
function renderArtifacts() {
 for (const kind of ['actual','example']) {
  const items=data.artifacts.filter(a=>a.kind===kind);
  $(kind+'-artifacts').innerHTML=items.map(a=>`<article class="planning-card ${kind==='example'?'example-card':''}"><h4>${esc(a.title)}</h4><p class="tiny">${esc(a.filename)} · ${(a.bytes/1024).toFixed(1)} KB${kind==='example'?' · Example only':''}</p>${artifactButtons(a)}</article>`).join('') || '<p class="small">No completed outputs have been packaged yet.</p>';
 }
}
function render() { renderPlans(); renderKanban(); }
const local=data.scope && (window.ForgeHost || (location.protocol==='http:' && ['127.0.0.1','localhost'].includes(location.hostname)));
async function refresh() {
 if(!local || refreshing) return;
 refreshing=true;$('planning-refresh').disabled=true;
 try {
  let value;
  if(window.ForgeHost) value=await window.ForgeHost.read('planning');
  else {
   const response=await fetch('/api/forge/planning',{cache:'no-store',signal:AbortSignal.timeout(95000)});
   if(!response.ok) throw Error('Refresh failed');
   const raw=await response.text(); if(raw.length>1000000) throw Error('Response too large');
   value=JSON.parse(raw);
  }
  const next=validate(value);
  if(snapshot && Date.parse(next.captured_at)<Date.parse(snapshot.captured_at)) throw Error('Older snapshot rejected');
  snapshot=next;refreshError=false;
  try { localStorage.setItem(cacheKey,JSON.stringify(snapshot)); } catch { /* Embedded snapshot still works. */ }
 } catch { refreshError=true; }
 finally { refreshing=false;$('planning-refresh').disabled=false;render(); }
}
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.previewFile)previewArtifact(button.dataset.previewFile);
 if(button.dataset.downloadFile){const a=data.artifacts.find(a=>a.id===button.dataset.downloadFile);if(a)download(a.filename,a.content,a.mime);}
 if(button.dataset.planOpen)openPlan(button.dataset.planOpen);
 if(button.dataset.downloadPlan){const p=snapshot?.prds.find(p=>p.prd_id===button.dataset.downloadPlan);if(p)download(p.prd_id+'.json',JSON.stringify(p,null,2)+'\n','application/json');}
 if(button.id==='download-planning-request')download('forge-planning-request.json',JSON.stringify(data.request,null,2)+'\n','application/json');
 if(button.id==='download-planning-prompt')download('forge-tac-plan-handoff.md','/plan '+data.request.title+'\n\n'+data.request.route.instructions+'\n\n```json\n'+JSON.stringify(data.request,null,2)+'\n```\n','text/markdown');
 if(button.id==='planning-refresh')refresh();
 if(button.id==='planning-index'){
  const box=document.createElement('div'), pre=document.createElement('pre'), details=document.createElement('details'), summary=document.createElement('summary');
  box.innerHTML=(snapshot?.prds||[]).map(p=>`<article class="planning-card"><h4>${esc(p.title)}</h4><p class="tiny">${esc(p.status)} · ${esc(configLabel(p))}<br>${esc(p.prd_id)}</p><button class="panel-button" data-plan-open="${esc(p.prd_id)}">Open plan</button></article>`).join('') || '<p>No verified indexed plans in this scope yet. Review the draft requirements in PRDs.</p>';
  pre.textContent=JSON.stringify({scope:data.scope,captured_at:snapshot?.captured_at||null,source:snapshot?.source||null,prds:snapshot?.prds||[]},null,2);box.append(pre);
  summary.textContent='Scoped index metadata';details.append(summary,pre);box.append(details);
  modal('PRD index · '+S.agent_id,snapshotStatus(),box);
 }
});
$('planning-dialog').addEventListener('close',()=>$('planning-dialog-body').replaceChildren());
renderRequest();renderArtifacts();render();
if (!local) {$('planning-refresh').disabled=true;$('planning-refresh').title='Live refresh is available in the scoped local preview.';}
window.ForgePlanning={snapshot:()=>snapshot?structuredClone(snapshot):null,request:()=>structuredClone(data.request),error:()=>refreshError,refreshing:()=>refreshing};
if(local)refresh();
})();
