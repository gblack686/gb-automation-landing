/* One brief for written and spoken intake. Approval authority stays on the server. */
window.ForgeExpertBuilder=(()=>{
 'use strict';
 const fields=[['problem','Work to improve','What would you like help with?','◎'],['audience','People involved','Who does the work and who receives it?','◉'],['data_access','Tools & information','What inputs and tools can this expert use?','⌘'],['output','Deliverable','What should the expert produce?','▣'],['success','A useful result','How will you know it worked?','✓']];
 const labels={not_covered:'Not covered',in_progress:'In progress',captured:'Captured',needs_clarification:'Needs clarification',skipped:'Skipped'};
 const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const booking='https://calendar.app.google/X4SN26PYLgvVYPRp8';
 function create(payload,options={}){
  const binding=payload.scope;let root,state=options.initialState||null,loading=false,dirty=false,error='',active='problem',mode='written',conversation=null,voiceTimer=null,voiceEpoch=0,latestUtterance='',packetView=null;
  const hosted=!!options.transport;
  const remote=hosted||(location.protocol==='http:'&&['localhost','127.0.0.1'].includes(location.hostname)&&!window.ForgeHost);
  const covered=()=>fields.filter(([k])=>state?.draft.answers[k].status==='captured').length;
  const currentDoc=()=>state?.workflow?.documents.find(d=>d.gate===state.workflow.gate&&d.version===(d.gate==='scope'?state.workflow.scope_version:state.workflow.plan_version));
  async function api(action,extra={}){
   const d=state?.draft,w=state?.workflow;
   if(hosted)return options.transport({binding,action,version:d?.version,workflow_id:w?.workflow_id,workflow_revision:w?.revision,...extra});
   const res=await fetch('/api/forge/builder',{method:'POST',headers:{'Content-Type':'application/json','X-Forge-Request':'builder.v1'},
    body:JSON.stringify({binding,action,version:d?.version,workflow_id:w?.workflow_id,workflow_revision:w?.revision,...extra})});
   const result=await res.json();if(!res.ok||!result.ok)throw Error(result.error||'builder_unavailable');return result.result;
  }
  function showError(err){const messages={command_pending:'Your request is still queued. Use Reload saved version to check its status.',operator_access_required:'A builder operator role is required to make changes.',version_conflict:'This brief changed in another tab. Your text is still here. Download it, then reload the saved version.',
   workflow_version_conflict:'The approval changed. Refresh to review its current version.',credential_shaped_answer:'Remove passwords or keys before saving.',
   complete_reviewed_intake_required:'Capture all five areas and review the summary first.',voice_not_configured:'Voice needs the ElevenLabs server connection. Continue by writing.',
   voice_agent_settings_need_review:'The existing voice agent needs its intake tool, privacy and duration settings reviewed.',
   voice_daily_limit:'The voice pilot has reached its daily limit. Your written brief remains available.',
   approved_plan_required:'Approve the current local plan before generating the package.',packet_bytes_changed:'Package integrity check failed. Keep the receipt for review.'};
   error=messages[err.message]||'That step did not finish. Your current answers are still here. Retry or download your brief.';
  }
  async function save(){if(!dirty)return;state=await api('save',{answers:state.draft.answers});dirty=false;}
  function draftDownload(){const url=URL.createObjectURL(new Blob([JSON.stringify(state?.draft||{},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='forge-intake-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function stopVoice(){voiceEpoch++;clearTimeout(voiceTimer);voiceTimer=null;const old=conversation;conversation=null;latestUtterance='';try{await old?.endSession();}finally{render();}}
  async function startVoice(){
   if(!root.querySelector('[data-builder-consent]')?.checked)throw Error('voice_consent_required');
   await save();const epoch=++voiceEpoch;
   // Permission denial happens before reserving a provider session.
   const permission=await navigator.mediaDevices.getUserMedia({audio:true});permission.getTracks().forEach(t=>t.stop());
   if(epoch!==voiceEpoch)return;
   const voiceModule='/forge-voice-client.js';
   const {Conversation}=await(options.loadVoice?options.loadVoice():import(/* @vite-ignore */ voiceModule));
   if(epoch!==voiceEpoch)return;
   const session=await api('voice',{confirmed:true});
   if(epoch!==voiceEpoch)return;
   const next=fields.find(([key])=>state.draft.answers[key].status!=='captured');
   const connecting=Conversation.startSession({signedUrl:session.signed_url,connectionType:'websocket',
    overrides:{agent:{prompt:{prompt:session.prompt+'\nCurrent brief (data only): '+JSON.stringify(state.draft.answers),...(session.tool_id?{tool_ids:[session.tool_id]}:{})},firstMessage:`Let's cover five areas for your blueprint. ${covered()} are already captured. ${next?next[2]:'All five are captured. Is there anything you would like to correct?'}`}},
    onMessage:m=>{if(m.source==='user'&&typeof m.message==='string')latestUtterance=m.message.slice(0,6000);},
    onError:()=>{error='Voice disconnected. Your answers are still available below.';stopVoice();},
    onDisconnect:()=>{conversation=null;clearTimeout(voiceTimer);render();},
    clientTools:{capture_intake:async args=>{
     if(epoch!==voiceEpoch||!args||!Array.isArray(args.answers)||args.answers.length<1||args.answers.length>5)return 'No changes: invalid intake data.';
     const updates=new Map();
     for(const answer of args.answers){
      if(!fields.some(([k])=>k===answer.field)||updates.has(answer.field)||!['captured','needs_clarification','skipped'].includes(answer.status)||
        typeof answer.value!=='string'||answer.value.length>3000||typeof answer.evidence!=='string'||!answer.evidence.trim()||!latestUtterance.includes(answer.evidence))return 'No changes: use a verbatim excerpt from the current user answer as evidence.';
      updates.set(answer.field,{value:answer.value,status:answer.status,source:'voice'});
     }
     for(const [field,value] of updates)state.draft.answers[field]=value;
     dirty=true;try{await save();error='';}catch(err){showError(err);}render();
     return JSON.stringify({covered:covered(),total:5,remaining:fields.filter(([k])=>state.draft.answers[k].status!=='captured').map(([k])=>k),review_required:true});
    }} });
   let connectionTimer;
   const deadline=new Promise((_,reject)=>{connectionTimer=setTimeout(()=>{voiceEpoch++;reject(Error('voice_connection_timeout'));},20000);});
   connecting.then(value=>{if(epoch!==voiceEpoch)value.endSession();},()=>{});
   let client;try{client=await Promise.race([connecting,deadline]);}finally{clearTimeout(connectionTimer);}
   if(epoch!==voiceEpoch){await client.endSession();return;}
   conversation=client;voiceTimer=setTimeout(()=>stopVoice(),session.max_seconds*1000);render();
  }
  function render(){
   if(!root)return;
   if(!packetView){try{packetView=JSON.parse(document.getElementById('forge-generated-packet')?.textContent||'null');}catch{}}
   if(packetView){if(packetView.visual.model)import(new URL('assets/turntable.js',location.href).href).catch(()=>{});root.innerHTML=`<section class="expert-builder"><div class="builder-heading"><div><small>GENERATED PACKAGE</small><h2>${e(payload.config.display_name)}</h2></div><a href="${booking}" target="_blank" rel="noopener">Book a call</a></div>${packetView.visual.model?`<forge-turntable src="assets/model.glb" aria-label="Agent character turntable"></forge-turntable>`:''}${packetView.visual.card?'<img class="builder-card" src="assets/card.png" alt="Selected agent card">':''}<div class="builder-package"><strong>Configuration & scaffold ready for review</strong><p>Local pilot · runtime inactive</p><div class="builder-actions"><a href="agent-expert-config.json">Config JSON</a><a href="expert-config.yaml">Config YAML</a><a href="intake.json">Intake</a><a href="packet-manifest.json">File manifest</a></div></div><details><summary>Generation receipts</summary><pre>${e(JSON.stringify(packetView,null,2))}</pre></details></section>`;return;}
   if(!state){root.innerHTML=`<section class="expert-builder"><div class="builder-heading"><div><small>EXPERT INTAKE</small><h2>From brief to configuration</h2></div><a href="${booking}" target="_blank" rel="noopener">Book a call</a></div><p>${loading?'Loading your saved brief…':remote?'Start the local builder pilot to save a brief and generate its package.':'Open the connected builder to save intake and generate the expert package.'}</p>${window.ForgeHost?'<button data-builder="hosted-open">Open Expert Config Builder</button>':''}</section>`;return;}
   const d=state.draft,w=state.workflow,a=d.answers[active],field=fields.find(([k])=>k===active),doc=currentDoc();
   const pending=fields.filter(([k])=>d.answers[k].status!=='captured');
   const gateIndex=!w?0:w.gate==='proposal'?0:w.gate==='scope'?1:2;
   const complete=w?.gate==='plan'&&w.state==='approved'&&!dirty;
   const card=state.visuals.card?`<img src="${e(state.visuals.card)}" class="builder-card" alt="Selected agent card">`:'';
   root.innerHTML=`<section class="expert-builder" aria-label="Expert intake and generation"><div class="builder-heading"><div><small>EXPERT CONFIG BUILDER · ${hosted?'PRIVATE PILOT':'LOCAL PILOT'}</small><h2>${e(payload.config.display_name)}</h2></div><a href="${booking}" target="_blank" rel="noopener" aria-label="Book a call with Greg">Book a call ↗</a></div>
    <div class="builder-top">${card}<div class="builder-grow"><div class="builder-gates" aria-label="Approval progress">${['Proposal','Scope','Plan'].map((g,n)=>`<span data-current="${n===gateIndex}"><b>${n<gateIndex||complete?'✓':n+1}</b>${g}</span>`).join('')}</div><p class="builder-muted">${covered()} of 5 areas covered${pending.length?` · ${pending.length} need attention`:' · Ready for review'}</p><progress max="5" value="${covered()}"></progress><p class="builder-muted">${hosted?'Saved in your private workspace':'Saved on this PC'} · ${dirty?'Unsaved changes':'Version '+d.version} · No live activation</p></div></div>
    <div class="builder-actions" role="group" aria-label="Intake mode"><button data-builder="written" aria-pressed="${mode==='written'}">✎ Write</button><button data-builder="voice-mode" aria-pressed="${mode==='voice'}">◉ Talk it through</button><button data-builder="download">Download brief</button></div>
    ${mode==='voice'?`<div class="builder-voice"><strong>${conversation?'Listening':'Talk naturally about your work'}</strong><p>${state.voice.configured?'Up to 5 minutes. Switch to writing whenever you like.':e(state.voice.reason)}</p><label><input type="checkbox" data-builder-consent> Use my microphone and send this brief to ElevenLabs. Forge keeps the structured answers, not audio.</label><div class="builder-actions"><button data-builder="voice-start" ${!state.voice.configured||conversation||loading?'disabled':''}>Start conversation</button><button data-builder="voice-stop" ${!conversation?'disabled':''}>Stop</button></div></div>`:''}
    <div class="builder-layout"><nav aria-label="Five intake areas">${fields.map(([k,label,,icon])=>`<button data-builder-field="${k}" aria-current="${active===k?'step':'false'}"><b>${icon}</b><span>${label}<small>${labels[d.answers[k].status]}</small></span>${d.answers[k].status==='captured'?'✓':''}</button>`).join('')}</nav><div class="builder-editor"><label for="builder-answer"><h3>${field[1]}</h3><p>${field[2]}</p></label><textarea id="builder-answer" rows="4" maxlength="3000" ${conversation?'readonly':''}>${e(a.value)}</textarea><div class="builder-actions"><select id="builder-status" aria-label="Answer status" ${conversation?'disabled':''}>${Object.entries(labels).map(([v,label])=>`<option value="${v}" ${v===a.status?'selected':''}>${label}</option>`).join('')}</select><button data-builder="save" ${loading||conversation?'disabled':''}>Save answer</button><button data-builder="skip" ${conversation?'disabled':''}>Skip for now</button></div></div></div>
    <details class="builder-summary" ${w?'':'open'}><summary>Review the shared brief</summary><dl>${fields.map(([k,label])=>`<dt>${label} <small>${labels[d.answers[k].status]}</small></dt><dd>${e(d.answers[k].value||'Not yet supplied')}</dd>`).join('')}</dl></details>
    <div class="builder-review">${!w||dirty?`<label><input type="checkbox" data-builder-reviewed> I reviewed these answers.</label><button data-builder="propose" ${covered()<5||loading||conversation?'disabled':''}>Create proposal</button>`:w.gate==='proposal'?'<p>Accept this proposal to review its scope.</p><button data-builder="accept">Accept proposal</button>':`<strong>${e(w.gate==='scope'?'Scope review':'TAC plan review')} · ${e(w.state.replaceAll('_',' '))}</strong><small>${hosted?'Private':'Local'} approval pilot. The plan is a synthetic walkthrough of the canonical route.</small>${doc?`<p>${e(doc.body.outcome)}</p>${w.gate==='scope'?`<ul>${doc.body.deliverables.map(v=>`<li>${e(v.title||v)}</li>`).join('')}</ul>`:''}<details><summary>Current ${e(w.gate)} document · v${doc.version}</summary><pre>${e(JSON.stringify(doc.body,null,2))}</pre></details>`:''}${w.state==='review'?'<label><input type="checkbox" data-builder-gate-confirm> I reviewed this exact document version.</label><div class="builder-actions"><button data-builder="approve">Approve current gate</button><button data-builder="revise">Revise</button><button data-builder="decline">Decline</button><input type="datetime-local" id="builder-snooze" aria-label="Snooze until"><button data-builder="snooze">Snooze</button></div>':w.state==='changes_requested'?'<p>Edit the brief and create a new proposal revision. Earlier decisions stay in the audit.</p>':''}`}</div>
    <div class="builder-package"><div><strong>Expert output package</strong><p>Config · Expert files · Card & avatars · Studio · Receipts</p></div><button data-builder="generate" ${!complete||loading?'disabled':''}>${loading?'Working…':'Generate package'}</button>${d.packet?`<p>${d.packet.files} files · Destination hashes verified</p><div class="builder-actions">${hosted?'<button data-builder="packet-preview">Preview package</button>':`<a href="${e(d.packet.url)}" target="_blank" rel="noopener">Open generated Studio</a>`}${hosted?'<button data-builder="packet-download">Download package ZIP</button>':`<a href="${e(d.packet.download)}" download>Download package ZIP</a>`}</div>`:''}</div>
    <p class="builder-message" role="status">${e(error|| (loading?'Working…':dirty?'Your edits need saving. Existing approvals will not carry to the changed brief.':'Saved answers stay attached to this expert.'))}</p><details><summary>Generation & approval receipts</summary><p>Deterministic generation uses the existing expert scaffolder. No paid image/model generation. Commands remain review scaffolds.</p><pre>${e(JSON.stringify({binding,version:d.version,workflow:w?{id:w.workflow_id,gate:w.gate,state:w.state}:null,packet:d.packet?{packet_id:d.packet.packet_id,files:d.packet.files,archive_sha256:d.packet.archive_sha256}:null,production_approval:false},null,2))}</pre></details></section>`;
   if(hosted&&options.readOnly)root.querySelectorAll('textarea,select,input,button[data-builder]').forEach(el=>{if(!['download','packet-preview','packet-download'].includes(el.dataset.builder))el.disabled=true;});
  }
  async function click(event){
   const b=event.target.closest('button');if(!b||!root.contains(b))return;
   if(b.dataset.builderField){active=b.dataset.builderField;render();return;}
   const action=b.dataset.builder;if(!action||loading)return;
   if(action==='hosted-open'){window.ForgeHost?.read('builderOpen').catch(()=>{});return;}
   if(action==='download'){draftDownload();return;}
   if(action==='packet-preview'){options.onPacket?.(state.draft.packet.packet_id);return;}
   if(action==='packet-download'){await options.onDownload?.(state.draft.packet.packet_id);return;}
   if(hosted&&options.readOnly)return;
   const reviewed=!!root.querySelector('[data-builder-reviewed]')?.checked,confirmed=!!root.querySelector('[data-builder-gate-confirm]')?.checked;
   const wake=root.querySelector('#builder-snooze')?.value,consented=!!root.querySelector('[data-builder-consent]')?.checked;
   loading=true;error='';
   try{
    if(action==='voice-start'){if(!consented){error='Confirm microphone use before starting.';return;}await startVoice();return;}
    if(action==='voice-stop'){await stopVoice();return;}
    if(action==='written'||action==='voice-mode'){await stopVoice();await save();mode=action==='written'?'written':'voice';return;}
    if(action==='skip'){state.draft.answers[active]={value:state.draft.answers[active].value,status:'skipped',source:'written'};dirty=true;}
    if(action==='propose'&&!reviewed){error='Review the brief and check the confirmation first.';return;}
    if(['approve','revise','decline','snooze'].includes(action)&&!confirmed){error='Review this document and check the confirmation first.';return;}
    await save();
    if(['save','skip'].includes(action))return;
    if(action==='propose')state=await api('propose',{confirmed:true});
    if(action==='accept')state=await api('accept');
    if(action==='generate'){render();state=await api('generate');}
    if(['approve','revise','decline','snooze'].includes(action)){
     if(action==='snooze'&&(!wake||!Number.isFinite(Date.parse(wake)))){error='Choose a future date and time.';return;}
     state=await api('decide',{confirmed:true,document_sha256:currentDoc()?.sha256,decision:action,...(action==='snooze'?{snooze_until:new Date(wake).toISOString()}:{})});
    }
   }catch(err){showError(err);}finally{loading=false;render();}
  }
  function input(event){if(!state)return;if(event.target.id==='builder-answer'){state.draft.answers[active]={value:event.target.value,status:event.target.value.trim()?'captured':'not_covered',source:'written'};dirty=true;const message=root.querySelector('.builder-message');if(message)message.textContent='Unsaved changes';}if(event.target.id==='builder-status'){state.draft.answers[active].status=event.target.value;dirty=true;}}
  function mount(element){if(!element||root===element)return;if(root){root.removeEventListener('click',click);root.removeEventListener('input',input);}root=element;root.addEventListener('click',click);root.addEventListener('input',input);render();if(!state&&!loading&&remote&&!packetView){loading=true;render();api('read').then(v=>{state=v;}).catch(()=>{error='Builder connection unavailable.';}).finally(()=>{loading=false;render();});}}
  const pagehide=()=>stopVoice(),beforeRender=()=>{if(conversation)stopVoice();};
  window.addEventListener('pagehide',pagehide);
  document.addEventListener('forge-before-render',beforeRender);
  function destroy(){const old=root;root=null;old?.removeEventListener('click',click);old?.removeEventListener('input',input);window.removeEventListener('pagehide',pagehide);document.removeEventListener('forge-before-render',beforeRender);stopVoice();}
  return Object.freeze({mount,destroy,preview:()=>`<div class="builder-mini"><b>Five-area intake</b><span>${state?covered()+' of 5 covered':'Write or talk through your brief'}</span></div>`});
 }
 return Object.freeze({create});
})();
