/* Shared presentation of the canonical Forge-to-TAC request. No workflow writes. */
window.ForgePlanTemplate = (() => {
 'use strict';
 const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const paths = {target:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8',settings:'M4 7h16M7 4v6M4 17h16m-7-3v6',layers:'m3 7 9-4 9 4-9 4-9-4m0 5 9 4 9-4M3 17l9 4 9-4',route:'M5 3v12a5 5 0 0 0 5 5h9m-4-4 4 4-4 4M5 8h10V3m-4 4 4-4 4 4',package:'m3 7 9-4 9 4v10l-9 4-9-4V7m0 0 9 5 9-5M12 12v9',check:'m4 12 5 5L20 6',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z'};
 const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.layers}"/></svg>`;
 const labels = {draft:'Draft',supplied:'Supplied',needs_input:'To confirm',needs_binding:'Needs setup',planned:'Planned',not_run:'Not run',not_assessed:'Not assessed'};
 function download(name, content, type='application/json') {
  const url=URL.createObjectURL(new Blob([content],{type})), a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function create(request) {
  const t=request.template, sections=t.sections;
  const binding={request_id:request.request_id,tenant_id:request.tenant_id,agent_id:request.agent_id,config_sha256:request.config_sha256,template_sha256:t.sha256};
  const key='gbauto.forge-plan-review.v1.'+JSON.stringify(binding);
  const local=!window.ForgeHost && (location.protocol==='file:' || ['localhost','127.0.0.1'].includes(location.hostname));
  let root, active=0, reviewed=[], note='', status='draft', savedAt=null, storageFailed=false;
  if(local)try{
   const saved=JSON.parse(localStorage.getItem(key));
   if(saved && Object.entries(binding).every(([k,v])=>saved[k]===v) && Array.isArray(saved.reviewed_sections) &&
      saved.reviewed_sections.every(id=>sections.some(s=>s.id===id)) && new Set(saved.reviewed_sections).size===saved.reviewed_sections.length &&
      typeof saved.note==='string' && saved.note.length<=2000 && ['draft','changes_requested','approved_locally'].includes(saved.status) &&
      (saved.status!=='approved_locally' || saved.reviewed_sections.length===sections.length)){
    reviewed=saved.reviewed_sections;note=saved.note;status=saved.status;savedAt=saved.recorded_at;
   }
  }catch{/* Storage may be unavailable in an opaque host; the review stays in memory. */}
  function receipt(){return {schema_version:'forge-planning-template-review.v1',...binding,status,reviewed_sections:[...reviewed],note,
   recorded_at:savedAt,authority:'local_design_feedback',scope_approved:false,implementation_approved:false,runtime_authorized:false};}
  function save(){savedAt=new Date().toISOString();if(local)try{localStorage.setItem(key,JSON.stringify(receipt()));storageFailed=false;}catch{storageFailed=true;}}
  function summary(){return `<div class="plan-mini"><div class="plan-gates">${t.gates.map((g,n)=>`<span>${n+1} ${esc(g)}</span>`).join('<b aria-hidden="true">›</b>')}</div><div class="plan-mini-grid">${sections.map(s=>`<span>${icon(s.icon)}${esc(s.title)}</span>`).join('')}</div><small>Draft for ${esc(request.agent_id)} · ${sections.length} sections</small></div>`;}
  function message(){return (status==='approved_locally'?'Template approved locally.':status==='changes_requested'?'Changes requested locally.':`${reviewed.length} of ${sections.length} sections reviewed.`)+' '+(storageFailed?'Browser storage unavailable. Download your review.':local?'Saved in this browser.':'Kept in this tab until downloaded.');}
  function render(){
   if(!root)return;
   const section=sections[active];
   root.innerHTML=`<section class="plan-template" aria-label="Planning template review">
    <header class="plan-heading"><div><small>PLANNING DRAFT</small><h2>${esc(request.title)}</h2><p>${esc(request.tenant_id || 'Tenant to confirm')} · ${esc(request.agent_id)}</p></div><span class="plan-version">Config ${esc(request.config_sha256.slice(0,8))}</span></header>
    <div class="plan-gates" aria-label="Human approval gates">${t.gates.map((g,n)=>`<span>${n+1} ${esc(g)}</span>`).join('<b aria-hidden="true">›</b>')}<small>Workflow approvals remain pending</small></div>
    <div class="plan-layout"><nav class="plan-nav" aria-label="Plan sections">${sections.map((s,n)=>`<button type="button" data-plan-section="${n}" aria-current="${n===active?'step':'false'}">${icon(s.icon)}<span>${esc(s.title)}</span><b aria-label="${reviewed.includes(s.id)?'Reviewed':'Not reviewed'}">${reviewed.includes(s.id)?'✓':String(n+1).padStart(2,'0')}</b></button>`).join('')}</nav>
    <article class="plan-content" tabindex="-1"><div class="plan-section-title">${icon(section.icon)}<div><small>SECTION ${active+1} / ${sections.length}</small><h3>${esc(section.title)}</h3></div></div><p>${esc(section.subtitle)}</p>
    <div class="plan-cards ${section.id==='steps'?'plan-steps':''}">${section.cards.map((c,n)=>`<section class="plan-item"><div class="plan-card-heading">${section.id==='steps'?`<b class="plan-step-number">${n+1}</b>`:''}<h4>${esc(c.title)}</h4><span class="plan-tag" data-state="${esc(c.state)}">${labels[c.state]||esc(c.state)}</span></div><p>${esc(c.body)}</p>${Object.keys(c.details).length?`<details><summary>Details</summary><dl>${Object.entries(c.details).map(([k,v])=>`<dt>${esc(k.replaceAll('_',' '))}</dt><dd>${Array.isArray(v)?v.length?'<ul>'+v.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'Not supplied':esc(v)}</dd>`).join('')}</dl></details>`:''}</section>`).join('')}</div>
    <div class="plan-step-actions"><button type="button" data-plan-action="back" ${active===0?'disabled':''}>Previous</button><button type="button" data-plan-action="review" class="plan-primary">${reviewed.includes(section.id)?'Reviewed · ': 'Mark reviewed'}${active<sections.length-1?' & next':''}</button></div></article></div>
    <footer class="plan-review"><label for="plan-review-note">Review notes <small>Optional changes or context</small></label><textarea id="plan-review-note" maxlength="2000" rows="2" placeholder="What should we adjust?">${esc(note)}</textarea>
    <div class="plan-review-actions"><button type="button" data-plan-action="changes">Request changes</button><button type="button" data-plan-action="approve" class="plan-primary" ${reviewed.length!==sections.length?'disabled':''}>Approve template locally</button><button type="button" data-plan-action="handoff">Download TAC handoff</button><button type="button" data-plan-action="export">Download review</button></div>
    <p data-plan-status role="status">${esc(message())}</p><small>Design feedback only. Does not approve scope, authorize implementation, send email or activate this expert.</small></footer></section>`;
  }
  function onClick(event){
   const button=event.target.closest('button');if(!button || !root.contains(button))return;
   if(button.dataset.planSection!==undefined){active=Number(button.dataset.planSection);render();root.querySelector('.plan-content').focus();return;}
   const action=button.dataset.planAction;if(!action)return;
   if(action==='handoff'){download('forge-tac-plan-handoff.md','/plan '+request.title+'\n\n'+request.route.instructions+'\n\n```json\n'+JSON.stringify(request,null,2)+'\n```\n','text/markdown');return;}
   if(action==='export'){download('forge-planning-review.json',JSON.stringify(receipt(),null,2)+'\n');return;}
   if(action==='back')active=Math.max(0,active-1);
   if(action==='review'){if(!reviewed.includes(sections[active].id))reviewed.push(sections[active].id);active=Math.min(sections.length-1,active+1);save();}
   if(action==='approve' && reviewed.length===sections.length){status='approved_locally';save();}
   if(action==='changes'){status='changes_requested';save();}
   render();
   root.querySelector(action==='review'||action==='back'?'.plan-content':'[data-plan-status]').scrollIntoView({block:'nearest'});
   if(action==='review'||action==='back')root.querySelector('.plan-content').focus();
  }
  function onInput(event){if(event.target.id==='plan-review-note'){note=event.target.value;status='draft';save();root.querySelector('[data-plan-status]').textContent=message();}}
  function mount(element){
   if(!element || root===element)return;
   if(root){root.removeEventListener('click',onClick);root.removeEventListener('input',onInput);}
   root=element;root.addEventListener('click',onClick);root.addEventListener('input',onInput);render();
  }
  return Object.freeze({preview:summary,mount,review:()=>structuredClone(receipt())});
 }
 return Object.freeze({create});
})();
