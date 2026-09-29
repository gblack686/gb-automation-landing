'use strict';
// Window geometry and interaction engine adapted from the selected Nexus/Studio preview.
(() => {
const $ = id => document.getElementById(id);
const S = JSON.parse($('forge-data').textContent);
const yamlText = JSON.parse($('yaml-data').textContent);
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const icons = {
 presence:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M5 21v-3a7 7 0 0 1 14 0v3',
 chat:'M21 11a8 8 0 0 1-8 8H6l-4 3 1-7a8 8 0 1 1 18-4M7 10h10M7 14h6',
 skills:'M12 3 3 8l9 5 9-5-9-5M3 12l9 5 9-5M3 16l9 5 9-5',
 commands:'m5 7 5 5-5 5m8 0h6',
 proposals:'M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 3-1 3H9s0-2-1-3',
 canvas:'M3 4h18v16H3zM3 9h18M7 6h.1M10 6h.1',
 config:'M4 7h16M4 17h16M8 4v6m8 4v6',
 checks:'M9 5H4v16h16V5h-5M9 3h6v4H9zm-2 10 2 2 5-5m-5 8h6',
 knowledge:'M12 5c-4-3-9-2-9-2v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2zm0 0v16',
 kanban:'M4 4h6v7H4zm10 0h6v4h-6zM4 15h6v5H4zm10-3h6v8h-6z',
 table:'M3 4h18v16H3zM3 10h18M3 15h18M10 4v16',
 artifacts:'M5 3h10l4 4v14H5zm10 0v5h4M8 12h8m-8 4h6',
 console:'M3 5h18v15H3zm3 4 3 3-3 3m6 1h5',
 changes:'M8 3v4m0 4v10m8-18v10m0 4v4M5 7h6v4H5zm8 6h6v4h-6z',
 search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
 more:'M5 12h.1M12 12h.1M19 12h.1',
 minimize:'M6 12h12', maximize:'M4 9V4h5m6 0h5v5m0 6v5h-5M9 20H4v-5',
 check:'m5 12 4 4L19 6', clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 4v5l3 2',
 arrow:'M4 12h15m-6-6 6 6-6 6', send:'m4 4 17 8-17 8 3-8-3-8m3 8h14',
 play:'m8 4 13 8-13 8z', external:'M14 3h7v7m0-7L10 14M10 5H3v16h16v-7',
 link:'m10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
 plus:'M12 4v16M4 12h16', close:'m5 5 14 14M5 19 19 5', video:'M3 5h13v14H3zm13 4 5-3v12l-5-3',
 folder:'M3 5h7l2 3h9v12H3z', signal:'M4 17v3m5-8v8m6-13v13m5-18v18', mic:'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5m-3 6v1a6 6 0 0 0 12 0v-1m-6 7v4m-4 0h8'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.canvas}"/></svg>`;
const defs = [
 {id:'skills', title:'Skills Library', short:'Skills', icon:'skills', purpose:'The capabilities this expert can use.'},
 {id:'commands', title:'Justfile Commands', short:'Commands', icon:'commands', purpose:'Proposed actions and configured command bindings.'},
 {id:'presence', title:'Agent Presence', short:'Agent', icon:'presence', purpose:'The identity and purpose of your proposed expert.'},
 {id:'chat', title:'Conversation', short:'Chat', icon:'chat', purpose:'Local notes and questions for your onboarding conversation.'},
 {id:'canvas', title:'Working Canvas', short:'Canvas', icon:'canvas', purpose:'The document or preview currently in focus.'},
 {id:'proposals', title:'Proposals', short:'Proposals', icon:'proposals', purpose:'Review suggested work before it begins.'},
 {id:'checks', title:'Setup & Quality Checks', short:'Checks', icon:'checks', purpose:'Configuration completeness and verification evidence.'},
 {id:'config', title:'Expert Configuration', short:'Config', icon:'config', purpose:'Purpose, model, operating limits, and instructions.'},
 {id:'knowledge', title:'Second Brain', short:'Memory', icon:'knowledge', purpose:'Context, saved decisions, and source documents.'},
 {id:'prds', title:'PRDs', short:'PRDs', icon:'artifacts', purpose:'Draft requirements and indexed TAC implementation plans for this expert.'},
 {id:'kanban', title:'Kanban', short:'Kanban', icon:'kanban', purpose:'Read-only implementation work explicitly linked to this expert?s PRDs.'},
 {id:'artifacts', title:'Artifacts', short:'Artifacts', icon:'artifacts', purpose:'Find outputs and the sources behind them.'},
 {id:'console', title:'Run Console', short:'Console', icon:'console', purpose:'See what this document has actually validated.'},
 {id:'changes', title:'Changes & Approvals', short:'Changes', icon:'changes', purpose:'Compare and review the exact proposed change.'},
 {id:'atlas', title:'Activity Scatterplot', short:'Atlas', icon:'signal', purpose:'Explore this agent’s Supabase traces, runs and sessions with Bokeh.'},
 {id:'history', title:'Session History', short:'Sessions', icon:'clock', purpose:'Review saved user messages by session and open their linked traces.'},
 {id:'table', title:'Activity Table', short:'Table', icon:'table', purpose:'Inspect the scatterplot records and select matching points.'}
];

// Bind local feedback to this exact design, including its explanatory text.
const scope = 'gbauto.forge-lead-magnet.v1.' + S.document_id;
const STORAGE = scope + '.review', LAYOUT = scope + '.layout', NOTES = scope + '.notes';
let storageAvailable = true;
function readStore(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
function writeStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { storageAvailable = false; $('save-status').textContent=window.ForgeHost?'Notes and layout last for this open tab. Export to keep them.':'Storage unavailable; export your feedback'; } }
// Claim the exact pre-planning design once. A second tenant cannot inherit its feedback.
const legacyScope = 'gbauto.forge-lead-magnet.v1.' + S.legacy_document_id;
if (S.legacy_document_id && legacyScope !== scope && !readStore(legacyScope + '.migrated_to', null)) {
 let copied = false;
 for (const suffix of ['.review','.layout','.notes']) {
  const previous = readStore(legacyScope + suffix, null);
  if (previous !== null && readStore(scope + suffix, null) === null) { writeStore(scope + suffix, previous); copied = true; }
 }
 if (copied) writeStore(legacyScope + '.migrated_to', scope);
}
const stored = readStore(STORAGE, {});
let review = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
if (review.tasks && !review.prds) { review.prds = review.tasks; delete review.tasks; writeStore(STORAGE, review); }
let notes = readStore(NOTES, []);
if (!Array.isArray(notes)) notes = [];
notes = notes.filter(n => typeof n === 'string');
let states = {}, z = 10, activeView = 'workspace', maximized = null, dragging = null;
function content(id) { return $('panel-' + id).innerHTML; }
function renderWindow(d,index){
 const el=document.createElement('section');el.className='window';el.id='window-'+d.id;el.dataset.window=d.id;el.setAttribute('aria-label',d.title);
 el.innerHTML=`<div class="window-titlebar" tabindex="0" role="group" aria-label="Move ${d.title}. Arrow keys move; Shift and arrow keys resize."><span>${icon(d.icon)}</span><h2>${d.title}</h2><span class="window-number">${String(index+1).padStart(2,'0')}</span><div class="window-controls"><button class="icon-button window-more" aria-label="${d.title} window options" aria-expanded="false" data-window-action="menu">${icon('more')}</button><button class="icon-button minimize" aria-label="Minimize ${d.title}" data-window-action="minimize">${icon('minimize')}</button><button class="icon-button maximize" aria-label="Maximize ${d.title}" data-window-action="maximize">${icon('maximize')}</button></div></div><div class="window-menu" hidden><button data-snap="left">Snap left</button><button data-snap="center">Snap center</button><button data-snap="right">Snap right</button><button data-window-action="maximize">Maximize / restore</button><button data-action="review-element">Leave feedback</button></div><div class="window-body ${d.id==='presence'?'presence-body':d.id==='chat'?'chat-body':d.id==='canvas'?'canvas-body':''}">${content(d.id)}</div><div class="review-strip"><div class="review-top"><span>Design feedback</span><div class="review-options"><button data-review="approved" aria-pressed="false">Looks good</button><button data-review="changes" aria-pressed="false">Needs changes</button></div></div><textarea data-review-note="${d.id}" aria-label="Feedback for ${d.title}" placeholder="What would you change?"></textarea></div><div class="resize-handle" tabindex="0" role="button" aria-label="Resize ${d.title} with arrow keys"></div>`;
 $('workspace').appendChild(el);
 el.addEventListener('pointerdown',()=>bringFront(d.id));
 el.querySelector('.window-titlebar').addEventListener('pointerdown',ev=>startDrag(ev,d.id,false));
 el.querySelector('.resize-handle').addEventListener('pointerdown',ev=>startDrag(ev,d.id,true));
 el.querySelector('.window-titlebar').addEventListener('dblclick',ev=>{if(!ev.target.closest('button')&&activeView!=='gallery'&&innerWidth>=900)maximize(d.id);});
 el.querySelector('.window-titlebar').addEventListener('keydown',ev=>moveKeyboard(ev,d.id,false));
 el.querySelector('.resize-handle').addEventListener('keydown',ev=>moveKeyboard(ev,d.id,true));
}
function stageSize(){return {w:$('workspace').clientWidth,h:$('workspace').clientHeight};}
function bounds(rect){const {w,h}=stageSize();const minW=Math.min(240,w), minH=Math.min(190,h);const width=Math.max(minW,Math.min(rect.w,w));const height=Math.max(minH,Math.min(rect.h,h));return {x:Math.max(0,Math.min(rect.x,w-width)),y:Math.max(0,Math.min(rect.y,h-height)),w:width,h:height};}
function applyRect(id){const s=states[id],el=$('window-'+id);if(!s||!el)return;el.style.left=s.x+'px';el.style.top=s.y+'px';el.style.width=s.w+'px';el.style.height=s.h+'px';el.hidden=!s.open;}
function saveLayout(){if(activeView!=='workspace'||innerWidth<900)return;writeStore(LAYOUT,{version:1,stage:stageSize(),layout:$('layout-select').value,states:Object.fromEntries(Object.entries(states).map(([k,s])=>[k,{x:s.x,y:s.y,w:s.w,h:s.h,open:s.open}]))});}
function setLayout(name='balanced',save=true){
 const {w,h}=stageSize(),gap=16;
 const left=Math.round(w*.215),right=Math.round(w*.235),center=w-left-right-gap*2;
 const presenceW=Math.max(260,Math.round(center*.34));
 const cx=left+gap,rx=cx+center+gap,topH=Math.max(240,Math.round(h*.355)),leftH=Math.round(h*.43),proposalH=Math.round(h*.53);
 const defaults={
 skills:{x:0,y:0,w:left,h:leftH},commands:{x:0,y:leftH+gap,w:left,h:h-leftH-gap},
 presence:{x:cx,y:0,w:presenceW,h:topH},chat:{x:cx+presenceW+gap,y:0,w:center-presenceW-gap,h:topH},
 canvas:{x:cx,y:topH+gap,w:center,h:h-topH-gap},proposals:{x:rx,y:0,w:right,h:proposalH},checks:{x:rx,y:proposalH+gap,w:right,h:h-proposalH-gap}
 };
 let openIds=name==='focus'?['presence','chat','canvas']:name==='review'?['canvas','proposals','changes','checks']:Object.keys(defaults);
 if(name==='focus')Object.assign(defaults,{presence:{x:0,y:0,w:left,h:Math.round(h*.5)},chat:{x:0,y:Math.round(h*.5)+gap,w:left,h:h-Math.round(h*.5)-gap},canvas:{x:cx,y:0,w:w-cx,h}});
 if(name==='review')Object.assign(defaults,{canvas:{x:cx,y:0,w:center,h},proposals:{x:0,y:0,w:left,h},changes:{x:rx,y:0,w:right,h:Math.round(h*.55)},checks:{x:rx,y:Math.round(h*.55)+gap,w:right,h:h-Math.round(h*.55)-gap}});
 if(w<1140&&innerWidth>=900){
  const side=Math.max(290,Math.round(w*.34)),main=w-side-gap,split=Math.round(h*.55);
  if(name==='balanced'){
   openIds=['skills','checks','canvas','presence'];
   Object.assign(defaults,{skills:{x:0,y:0,w:side,h:split},checks:{x:0,y:split+gap,w:side,h:h-split-gap},canvas:{x:side+gap,y:0,w:main,h:split},presence:{x:side+gap,y:split+gap,w:main,h:h-split-gap}});
  }else if(name==='focus'){
   Object.assign(defaults,{presence:{x:0,y:0,w:side,h:split},chat:{x:0,y:split+gap,w:side,h:h-split-gap},canvas:{x:side+gap,y:0,w:main,h}});
  }else if(name==='review'){
   openIds=['proposals','changes','canvas'];
   Object.assign(defaults,{proposals:{x:0,y:0,w:side,h:split},changes:{x:0,y:split+gap,w:side,h:h-split-gap},canvas:{x:side+gap,y:0,w:main,h}});
  }
 }
 if(name==='dashboard'){
  const chartWidth=Math.round((w-gap)*.6);
  openIds=['atlas','table'];
  Object.assign(defaults,{atlas:{x:0,y:0,w:chartWidth,h},table:{x:chartWidth+gap,y:0,w:w-chartWidth-gap,h}});
 }
 defs.forEach((d,i)=>{states[d.id]={...bounds(defaults[d.id]||{x:Math.min(cx+25+i*3,w-420),y:Math.min(35+i*4,h-360),w:Math.max(340,center*.8),h:Math.max(320,h*.8)}),open:openIds.includes(d.id)};applyRect(d.id);});
 maximized=null;document.querySelectorAll('.window').forEach(el=>el.classList.remove('is-maximized'));
 $('layout-select').value=name;updateDock();if(save)saveLayout();
}
function bringFront(id){document.querySelectorAll('.window').forEach(el=>el.classList.toggle('focused',el.dataset.window===id));$('window-'+id).style.zIndex=++z;}
function openWindow(id){if(!states[id])return;states[id].open=true;applyRect(id);bringFront(id);updateDock();saveLayout();if(innerWidth<900||activeView==='gallery')$('window-'+id).scrollIntoView({behavior:'smooth',block:'start'});}
function minimize(id){if(maximized?.id===id)restoreMax();states[id].open=false;applyRect(id);updateDock();saveLayout();const dock=document.querySelector(`.dock-button[data-open="${id}"]`);dock?.focus({preventScroll:true});}
function maximize(id){if(innerWidth<900||activeView==='gallery')return;if(maximized?.id===id){restoreMax();saveLayout();return;}if(maximized)restoreMax();maximized={id,previous:{...states[id]}};states[id]={x:0,y:0,...stageSizeRect(),open:true};applyRect(id);$('window-'+id).classList.add('is-maximized');bringFront(id);}
function stageSizeRect(){const {w,h}=stageSize();return {w,h};}
function restoreMax(){if(!maximized)return;const {id,previous}=maximized;states[id]={...previous,open:true};$('window-'+id).classList.remove('is-maximized');applyRect(id);maximized=null;}
function snapRect(side){const {w,h}=stageSize(),gap=16;return side==='center'?{x:Math.round(w*.22),y:0,w:Math.round(w*.56),h}:{x:side==='left'?0:Math.round(w*.5)+gap/2,y:0,w:Math.round(w*.5)-gap/2,h};}
function snapWindow(id,side){if(maximized)restoreMax();Object.assign(states[id],bounds(snapRect(side)),{open:true});applyRect(id);saveLayout();}
function startDrag(ev,id,resize){
 if(ev.button!==0||activeView==='gallery'||innerWidth<900||ev.target.closest('button,input,select,textarea'))return;
 if(maximized?.id===id)return;
 ev.preventDefault();const el=ev.currentTarget;el.setPointerCapture(ev.pointerId);bringFront(id);
 dragging={id,resize,startX:ev.clientX,startY:ev.clientY,rect:{...states[id]},snap:null,target:el};$('window-'+id).classList.add('dragging');
 const move=e=>{const d=dragging;if(!d)return;const dx=e.clientX-d.startX,dy=e.clientY-d.startY;let r={...d.rect};if(d.resize){r.w+=dx;r.h+=dy;}else{r.x+=dx;r.y+=dy;}Object.assign(states[id],bounds(r));applyRect(id);
  if(!d.resize){const box=$('workspace').getBoundingClientRect();d.snap=e.clientX<box.left+35?'left':e.clientX>box.right-35?'right':e.clientY<box.top+24?'center':null;if(d.snap){const r=snapRect(d.snap);Object.assign($('snap-hint').style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px'});$('snap-hint').hidden=false;}else $('snap-hint').hidden=true;}
 };
 const end=()=>{if(!dragging)return;const side=dragging.snap;$('window-'+id).classList.remove('dragging');$('snap-hint').hidden=true;el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);dragging=null;if(side)snapWindow(id,side);else saveLayout();};
 el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}
function moveKeyboard(ev,id,resize){if(!ev.key.startsWith('Arrow')||ev.target!==ev.currentTarget||activeView==='gallery'||innerWidth<900)return;ev.preventDefault();if(maximized?.id===id)restoreMax();const d={...states[id]},n=ev.altKey?1:15,r=resize||ev.shiftKey;const delta=ev.key==='ArrowLeft'||ev.key==='ArrowUp'?-n:n;d[r?(ev.key==='ArrowLeft'||ev.key==='ArrowRight'?'w':'h'):(ev.key==='ArrowLeft'||ev.key==='ArrowRight'?'x':'y')]+=delta;Object.assign(states[id],bounds(d));applyRect(id);saveLayout();}
function setView(view){
 if(view===activeView)return;
 if(view==='gallery'){restoreMax();saveLayout();}
 activeView=view;document.body.classList.toggle('gallery',view==='gallery');$('gallery-intro').hidden=view!=='gallery';$('workspace-view').setAttribute('aria-pressed',String(view==='workspace'));$('gallery-view').setAttribute('aria-pressed',String(view==='gallery'));
 defs.forEach(d=>$('window-'+d.id).hidden=view==='gallery'?false:!states[d.id].open);
 if(view==='workspace'){requestAnimationFrame(()=>{if(innerWidth>=900){defs.forEach(d=>{Object.assign(states[d.id],bounds(states[d.id]));applyRect(d.id);});}updateDock();});}else{window.scrollTo({top:0,behavior:'smooth'});}
 updateDock();
}
function updateDock(){defs.forEach(d=>{const button=document.querySelector(`.dock-button[data-open="${d.id}"]`);button?.setAttribute('aria-pressed',String(activeView==='gallery'||states[d.id]?.open));});renderLauncher($('window-search').value);}
function renderLauncher(query=''){const filtered=defs.filter(d=>(d.title+' '+d.purpose).toLowerCase().includes(query.toLowerCase()));$('window-list').innerHTML=filtered.map(d=>`<button class="launcher-item" data-open="${d.id}">${icon(d.icon)}<span><strong>${d.title}</strong><small>${d.purpose}</small></span><span>${states[d.id]?.open?'Open':'+'}</span></button>`).join('')||'<p class="empty">No matching windows.</p>';}
function closeMenus(){document.querySelectorAll('.window-menu').forEach(el=>el.hidden=true);document.querySelectorAll('[data-window-action=menu]').forEach(el=>el.setAttribute('aria-expanded','false'));}
function closeLauncher(restoreFocus=false){$('window-launcher').hidden=true;$('windows-button').setAttribute('aria-expanded','false');if(restoreFocus)$('windows-button').focus();}
function updateReview(){defs.forEach(d=>{const r=review[d.id]||{},el=$('window-'+d.id);el.querySelectorAll('[data-review]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.review===r.status)));const ta=el.querySelector('[data-review-note]');if(document.activeElement!==ta)ta.value=r.note||'';});$('review-count').textContent=defs.filter(d=>review[d.id]?.status).length+' / '+defs.length;}
let toastTimer;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function download(name, text, type) {
 const url = URL.createObjectURL(new Blob([text], {type})), a = document.createElement('a');
 a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportConfig() { download('expert-config.yaml', yamlText, 'application/yaml'); toast('Your draft configuration is downloaded.'); }
function exportReview() {
 download('expert-design-feedback.json', JSON.stringify({
  kind:'expert_design_feedback', agent_id:S.agent_id, document_id:S.document_id, yaml_sha256:S.yaml_sha256,
  created_at:new Date().toISOString(), runtime_authorized:false, meeting_notes:notes,
  elements:defs.map(d=>({id:d.id,title:d.title,status:review[d.id]?.status||'unreviewed',note:review[d.id]?.note||''}))
 }, null, 2) + '\n', 'application/json');
 toast('Feedback exported. Share this file to send your notes.');
}
function selectCanvas(tab) {
 if (!['brief','sources','configuration'].includes(tab)) return;
 $('canvas-content').innerHTML = content('canvas-' + tab);
 document.querySelectorAll('[data-canvas]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.canvas===tab)));
}
function showField(field) {
 selectCanvas('configuration'); openWindow('canvas');
 requestAnimationFrame(()=>{const target=$('yaml-'+field); if(target){target.classList.add('highlight'); target.scrollIntoView({block:'center',behavior:'smooth'});}});
}
function showNotes() {
 $('meeting-notes').innerHTML=notes.map((note,index)=>`<div class="meeting-note"><span class="speaker">YOUR NOTE</span>${escape(note)}<button class="text-button" data-remove-note="${index}">Remove note</button></div>`).join('');
}

defs.forEach(renderWindow);
$('dock').innerHTML=defs.map(d=>`<button class="dock-button" data-open="${d.id}" aria-label="Open ${d.title}" aria-pressed="false" title="${d.title}">${icon(d.icon)}<span>${d.short}</span></button>`).join('');
setLayout('balanced',false);
const saved=readStore(LAYOUT,null);
if (saved?.version===1 && saved.states?.tasks && !saved.states.prds) { saved.states.prds=saved.states.tasks; delete saved.states.tasks; writeStore(LAYOUT,saved); }
if(saved?.version===1&&saved.states&&innerWidth>=900){
 for(const d of defs){const s=saved.states[d.id];if(s&&['x','y','w','h'].every(k=>Number.isFinite(s[k]))){const scaleX=stageSize().w/(saved.stage?.w||stageSize().w),scaleY=stageSize().h/(saved.stage?.h||stageSize().h);states[d.id]={...bounds({x:s.x*scaleX,y:s.y*scaleY,w:s.w*scaleX,h:s.h*scaleY}),open:Boolean(s.open)};applyRect(d.id);}}
 if(['balanced','focus','review','dashboard'].includes(saved.layout))$('layout-select').value=saved.layout;
}
updateDock(); updateReview(); showNotes(); bringFront('canvas');
$('workspace-view').addEventListener('click',()=>setView('workspace'));
$('gallery-view').addEventListener('click',()=>setView('gallery'));
$('layout-select').addEventListener('change',ev=>{if(activeView==='gallery')setView('workspace');requestAnimationFrame(()=>setLayout(ev.target.value));});
$('reset-layout').addEventListener('click',()=>{if(activeView==='gallery')setView('workspace');requestAnimationFrame(()=>{setLayout('balanced');toast('Balanced layout restored.');});});
$('windows-button').addEventListener('click',()=>{const show=$('window-launcher').hidden;$('window-launcher').hidden=!show;$('windows-button').setAttribute('aria-expanded',String(show));if(show)$('window-search').focus();});
$('close-launcher').addEventListener('click',()=>closeLauncher(true));
$('window-search').addEventListener('input',ev=>renderLauncher(ev.target.value));
$('help-button').addEventListener('click',()=>$('help-dialog').showModal());
$('export-review').addEventListener('click',exportReview);
$('chat-form').addEventListener('submit',ev=>{
 ev.preventDefault();const input=$('chat-text'),value=input.value.trim();if(!value)return;
 notes.push(value);writeStore(NOTES,notes);showNotes();input.value='';
 $('chat-messages').scrollTop=$('chat-messages').scrollHeight;
 toast('Meeting note saved here. Export feedback to share it.');
});
document.addEventListener('input',ev=>{
 if(ev.target.matches('[data-review-note]')){const id=ev.target.dataset.reviewNote;review[id]={...review[id],note:ev.target.value};writeStore(STORAGE,review);}
});
document.addEventListener('click',ev=>{
 const button=ev.target.closest('button');if(!button){if(!ev.target.closest('.window-menu'))closeMenus();return;}
 const win=button.closest('.window'),id=win?.dataset.window;
 if(button.dataset.open){openWindow(button.dataset.open);if(button.closest('#window-launcher')){closeLauncher();$('window-'+button.dataset.open).querySelector('.window-titlebar').focus({preventScroll:true});}}
 if(button.dataset.canvas)selectCanvas(button.dataset.canvas);
 if(button.dataset.artifact){selectCanvas(button.dataset.artifact);openWindow('canvas');}
 if(button.dataset.field)showField(button.dataset.field);
 if(button.dataset.removeNote!==undefined){notes.splice(Number(button.dataset.removeNote),1);writeStore(NOTES,notes);showNotes();}
 if(button.dataset.review){const current=review[id]?.status;review[id]={...review[id],status:current===button.dataset.review?null:button.dataset.review};writeStore(STORAGE,review);updateReview();}
 if(button.dataset.windowAction==='menu'){const menu=win.querySelector('.window-menu'),show=menu.hidden;closeMenus();menu.hidden=!show;button.setAttribute('aria-expanded',String(show));}
 else if(button.dataset.windowAction){closeMenus();if(button.dataset.windowAction==='minimize')minimize(id);if(button.dataset.windowAction==='maximize')maximize(id);}
 if(button.dataset.snap){snapWindow(id,button.dataset.snap);closeMenus();}
 switch(button.dataset.action){
  case 'export-config':exportConfig();break;
  case 'export-review':exportReview();break;
  case 'review-element':closeMenus();setView('gallery');requestAnimationFrame(()=>$('window-'+id).scrollIntoView({behavior:'smooth',block:'center'}));break;
 }
});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){if(document.querySelector('dialog[open]'))return;closeMenus();if(!$('window-launcher').hidden)closeLauncher(true);else if(maximized){restoreMax();saveLayout();}}});
document.addEventListener('pointerdown',ev=>{if(!ev.target.closest('.window-menu,[data-window-action=menu]'))closeMenus();if(!ev.target.closest('#window-launcher,#windows-button'))closeLauncher();});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(activeView==='workspace'&&innerWidth>=900){if(maximized){const id=maximized.id;Object.assign(states[id],{x:0,y:0,...stageSizeRect()});applyRect(id);}else setLayout($('layout-select').value,false);}},150);});
window.addEventListener('beforeunload',()=>{if(maximized)restoreMax();saveLayout();});
// Read-only inspection surface for browser verification.
window.ForgePreview={windows:defs.map(d=>({id:d.id,title:d.title})),source:S,review:()=>structuredClone(review),states:()=>structuredClone(states),view:()=>activeView,storageAvailable:()=>storageAvailable};
})();
