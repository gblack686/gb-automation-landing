'use strict';
(() => {
 const EXPERT='gbautomation/youtube-intel', pending=new Map(), view=window.ForgeWorkshopView;
 const form=document.getElementById('config-form'), save=form.querySelector('button[type=submit],button:not([type])');
 const run=document.querySelector('[data-action="demo-run"]');
 let connected=false,version=0,catalog=null,lastSaved=null,busy=false,runId=null,runRequest=null,saveRequest=null,pollTimer=null,pulseTimer=null,pollStarted=0;
 const status=document.createElement('button');status.id='connection-status';status.className='light-button';status.textContent='Connecting…';
 status.title='Refresh the saved configuration and command status';document.querySelector('.header-end').prepend(status);
 document.querySelector('.app-status>span').textContent='Configuration drafts + health checks can connect. Other windows are demonstrations.';
 document.querySelector('.config-note').textContent='Sign in through the Workshop to load and save a private configuration draft.';
 document.querySelector('#window-checks .window-body').innerHTML='<span class="eyebrow">VERIFIED STATUS</span><h3 class="spaced">Expert on the Mac Mini</h3><div id="connected-checks" class="panel-notice spaced" role="status">Connection not verified.</div><section class="private-detail spaced" aria-label="Live expert pulse"><div class="row"><h3>Live pulse</h3><button id="refresh-expert-pulse" class="light-button" type="button">Refresh pulse</button></div><div id="expert-pulse" class="spaced" role="status">Waiting for Mini telemetry.</div></section><p class="small spaced">Saving preserves your configuration as a private draft. It does not install or change the expert.</p><p class="small spaced">Health checks inspect the existing expert on the private worker. They do not validate unsaved or unapplied draft settings.</p>';
 document.querySelector('.help-note').textContent='Configuration drafts and the health recipe use your signed-in Workshop account when activated. Saving a draft does not apply it. Conversations, proposals and other commands remain demonstrations.';
 document.querySelector('#window-console .chip').textContent='Health receipts';
 document.querySelector('#window-console .row.spaced .tiny').textContent='Only the approved health recipe can connect';
 view.clearLog();view.log('Open a signed-in Workshop connection to request or retrieve a health check.');
 form.elements.model.readOnly=true;
 form.elements.purpose.maxLength=2000;
 save.textContent='Save draft';save.disabled=true;run.disabled=true;
 const errors={identity_link_required:'Your website account needs an operator-approved Forge identity link.',tenant_access_required:'This account does not have GBAutomation access.',authentication_required:'Sign in again to reconnect.',workshop_not_enabled:'The Workshop connection is prepared but has not been activated.',workshop_transport_error:'The website could not read the Workshop response. Retry connection or sign in again.',stale_draft_version:'This draft changed in another tab. Your edits are preserved. Use Refresh connection to load the saved version.',secret_like_configuration:'Remove credentials from the configuration.',invalid_configuration:'Check the name, purpose, model and video cap.',health_check_already_requested:'A health check is already queued or running.',run_not_found:'That health check is unavailable to this account.',workshop_unavailable:'Could not reach the Workshop service. Your edits are preserved; retry when connected.'};
 const friendly=e=>errors[e?.message]||'The request could not be completed. Your edits are preserved.';
 function rpc(method,input){return new Promise((resolve,reject)=>{
  if(window.parent===window){reject(new Error('authentication_required'));return;}
  const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);reject(new Error('workshop_unavailable'));},25000);
  pending.set(id,{resolve,reject,timer});window.parent.postMessage({type:'forge-workshop.request.v1',id,method,input},location.origin);
 });}
 let ready=false;
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==window.parent)return;
  if(event.data?.type==='forge-workshop.ready.v1'&&!ready){ready=true;load();return;}
  if(event.data?.type!=='forge-workshop.response.v1')return;
  const request=pending.get(event.data.id);if(!request)return;
  pending.delete(event.data.id);clearTimeout(request.timer);
  event.data.payload?.ok?request.resolve(event.data.payload):request.reject(new Error(event.data.payload?.error||'workshop_unavailable'));
 });
 function controls(){
  save.disabled=!connected||busy;
  for(const field of form.querySelectorAll('input,textarea'))field.disabled=busy;
  const allowed=view.recipe()==='health';run.disabled=!connected||busy||!allowed;
  run.textContent=allowed?(runId?'Refresh health status':'Run health check'):'Recipe not connected';
 }
 document.addEventListener('forge-workshop.recipe-selected',controls);
 function note(text){document.querySelector('.config-note').textContent=text;}
 function checks(text){document.getElementById('connected-checks').textContent=text;}
 const pulseBox=document.getElementById('expert-pulse');
 const when=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString():'unknown';
 function showPulse(pulse){
  pulseBox.replaceChildren();
  if(!pulse?.observed_at){pulseBox.textContent='No current expert telemetry is available from the Mini.';return;}
  const age=Date.now()-Date.parse(pulse.observed_at),stale=!Number.isFinite(age)||age>5*60*1000;
  const heading=document.createElement('p');heading.className='pulse-summary';heading.textContent=`${stale?'Stale telemetry':'Live telemetry'} · observed ${when(pulse.observed_at)} · Gateway ${pulse.gateway_running?'running':'not running'}`;pulseBox.append(heading);
  const names={'expert-nightly':'Expert nightly review','youtube-whitelist-intel':'Trusted channel scan','youtube-liked-intel':'Liked video scan'};
  const jobs=document.createElement('ul');jobs.className='pulse-jobs';
  for(const job of pulse.jobs||[]){
   const row=document.createElement('li'),title=document.createElement('strong'),state=document.createElement('span'),times=document.createElement('p');
   title.textContent=names[job.name]||job.name;state.className='pulse-state';state.textContent=`${job.enabled?'Enabled':'Disabled'} · ${job.last_status||'no result'}`;
   times.textContent=`Last: ${when(job.last_run_at)} · Next: ${when(job.next_run_at)}${job.failure_streak?' · '+job.failure_streak+' consecutive failures':''}`;
   row.append(title,state,times);jobs.append(row);
  }
  if(jobs.childElementCount)pulseBox.append(jobs);
  const history=document.createElement('section');history.className='pulse-history';
  const historyTitle=document.createElement('strong');historyTitle.textContent='Recent runs';history.append(historyTitle);
  const runList=document.createElement('ul');
  for(const item of pulse.runs||[]){
   const row=document.createElement('li');
   row.textContent=`${names[item.job]||item.job} · ${item.status} · ${when(item.finished_at||item.started_at||item.claimed_at)}`;
   runList.append(row);
  }
  if(!runList.childElementCount){const row=document.createElement('li');row.textContent='No recent run receipts available';runList.append(row);}
  history.append(runList);pulseBox.append(history);
  const logs=document.createElement('div');logs.className='pulse-logs';
  const logTitle=document.createElement('strong');logTitle.textContent='Recent log activity';logs.append(logTitle);
  for(const log of pulse.logs||[]){
   const line=document.createElement('span');line.textContent=`${log.name}: updated ${when(log.updated_at)}`;logs.append(line);
   for(const event of log.events||[]){const excerpt=document.createElement('span');excerpt.className='pulse-log-event';excerpt.textContent=`${when(event.at)} · ${event.level}: ${event.summary}`;logs.append(excerpt);}
  }
  if(!pulse.logs?.length){const line=document.createElement('span');line.textContent='No log metadata available';logs.append(line);}
  pulseBox.append(logs);
 }
 async function refreshPulse(){
  if(!connected)return;
  try{showPulse((await rpc('read',{expert_id:EXPERT})).pulse);}
  catch{pulseBox.textContent='Could not refresh Mini telemetry. Retry in a moment.';}
 }
 function schedulePulse(){clearInterval(pulseTimer);pulseTimer=setInterval(refreshPulse,120000);}
 document.getElementById('refresh-expert-pulse').addEventListener('click',refreshPulse);
 function showDraft(draft){
  version=draft?.version||0;lastSaved=draft?.configuration||catalog.configuration;
  view.setDraft(lastSaved);
  note(version?`Saved Forge draft v${version}. This does not apply settings to the runtime.`:'Loaded source configuration. Save to create a private Forge draft.');
  checks(`Identity verified. ${version?'Configuration draft v'+version+' saved.':'No saved configuration draft yet.'} Runtime health is checked separately.`);
 }
 async function load(){
  if(busy)return;
  busy=true;clearTimeout(pollTimer);runId=null;controls();
  status.textContent='Connecting…';status.disabled=true;
  try {
   const data=await rpc('read',{expert_id:EXPERT});catalog=data.catalog;
   if(catalog?.expert_id!==EXPERT)throw new Error('workshop_unavailable');
   connected=true;status.textContent='Refresh connection';showDraft(data.draft);showPulse(data.pulse);schedulePulse();
   if(data.run)showRun(data.run);
  }catch(e){connected=false;clearInterval(pulseTimer);status.textContent='Retry connection';note(friendly(e));checks(friendly(e));}
  finally{busy=false;status.disabled=false;controls();}
 }
 status.addEventListener('click',()=>{
  // Refresh is explicit because it replaces unsaved local form values.
  if(lastSaved && JSON.stringify(config())!==JSON.stringify(lastSaved)
    && !confirm('Load the saved draft and replace your unsaved edits?'))return;
  load();
 });
 function config(){return {name:form.elements.name.value.trim(),purpose:form.elements.purpose.value.trim(),model:form.elements.model.value,scan_cap:Number(form.elements.cap.value),approvals:'manual'};}
 form.addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();
  if(!connected||busy||!form.reportValidity())return;
  const values=config(),fingerprint=JSON.stringify({values,version});
  if(saveRequest?.fingerprint!==fingerprint)saveRequest={fingerprint,id:crypto.randomUUID()};
  busy=true;controls();note('Saving configuration draft…');
  try{const result=await rpc('save',{expert_id:EXPERT,config:values,expected_version:version,request_id:saveRequest.id});showDraft(result.draft);saveRequest=null;view.log('Configuration draft v'+version+' saved in Forge. Runtime settings were not applied.');}
  catch(e){note(friendly(e));}
  finally{busy=false;controls();}
 },true);
 function showRun(job){
  clearTimeout(pollTimer);
  const active=['pending','running'].includes(job.status);
  if(active&&runId!==job.id)pollStarted=Date.now();
  runId=active?job.id:null;
  view.clearLog();view.log('Health check '+job.id+' • '+job.status);
  if(job.result?.schema_version==='forge-workshop-health.v1'){
   view.log(job.result.healthy?'Health check passed.':'Health check completed with findings.');
   const labels={'expert.structure':'Expert profile structure','prime.quick_paths':'Startup quick paths','prime.read_only':'Read-only startup','index.sessions':'Session index','index.git':'Git index','index.prs':'Pull request index','index.kanban':'Kanban index','query.supabase':'Supabase query','query.langfuse':'Langfuse query','question.golden_set':'Golden questions','proposal.minimum_count':'Proposal coverage','self_improve.dry_run':'Improvement preview'};
   const states={static_pass:'configured',live_pass:'passed live check',live_empty:'connected, no records',pass:'passed',fail:'failed',blocked:'blocked',unavailable:'unavailable',not_configured:'not configured',available:'available'};
   for(const item of job.result.checks||[])view.log((labels[item.id]||item.id)+': '+(states[item.status]||item.status));
   checks(`Configuration draft v${version}. Health: ${job.result.healthy?'passed':'findings require review'}. Receipt ${job.id}.`);
  }else if(job.status==='error'){
   const message=job.error==='health_request_expired'?'Health request expired before completion. You can request a new check.':'Health check failed. Review the private worker logs.';
   view.log(message);checks(message);
  }
  if(active){
   if(Date.now()-pollStarted<300000){pollTimer=setTimeout(poll,2500);checks('Health check '+job.status+'. Waiting for the private worker.');}
   else {checks('Health is still pending. Automatic refresh paused. Use Refresh health status to check again.');view.log('Automatic refresh paused after five minutes. No new command was submitted.');}
  }
  else runRequest=null;
  controls();
 }
 async function poll(){
  if(!runId)return;
  try{showRun((await rpc('status',{expert_id:EXPERT,run_id:runId})).run);}
  catch(e){view.log(friendly(e)+' Use Refresh health status to retry.');controls();}
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.action==='clear-console'){event.stopImmediatePropagation();view.clearLog();view.log('Console cleared. Use Refresh health status to retrieve the latest receipt.');return;}
  if(button.dataset.action==='reset-config'){
   event.stopImmediatePropagation();event.preventDefault();if(lastSaved)view.setDraft(lastSaved);note('Restored the last loaded draft in this form.');return;
  }
  if(button.dataset.action!=='demo-run')return;
  event.stopImmediatePropagation();event.preventDefault();if(!connected||busy||view.recipe()!=='health')return;
  view.open('console');if(runId){pollStarted=Date.now();poll();return;}
  runRequest ||= crypto.randomUUID();busy=true;controls();view.log('Requesting a health check…');
  try{showRun((await rpc('run',{expert_id:EXPERT,recipe:'health',request_id:runRequest})).run);}
  catch(e){view.log(friendly(e));}
  finally{busy=false;controls();}
 },true);
 window.addEventListener('beforeunload',()=>{clearTimeout(pollTimer);clearInterval(pulseTimer);for(const p of pending.values())clearTimeout(p.timer);});
 if(window.parent===window){status.textContent='Open signed-in Workshop';status.onclick=()=>location.assign('/workshop');note('Open /workshop and sign in to connect. No commands are available on this standalone page.');}
 controls();
})();
