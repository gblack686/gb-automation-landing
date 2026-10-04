/* Private Studio adapter. Private reads; visual generation opens the authenticated host. */
window.ForgePrivate = (() => {
 'use strict';
 const P=JSON.parse(document.getElementById('private-studio-data').textContent), config=P.config;
 const planTemplate=window.ForgePlanTemplate.create(P.planning_request);
 const expertBuilder=window.ForgeExpertBuilder.create(P);
 const generatedPacket=JSON.parse(document.getElementById('forge-generated-packet')?.textContent||'null');
 const generatedHero=()=>generatedPacket?.visual.model?'<forge-turntable src="assets/model.glb" aria-label="Agent character turntable"></forge-turntable><div class="private-toolbar"><a href="packet-manifest.json">Package manifest</a><a href="generation-receipt.json">Generation receipt</a></div>':'';
 let approvedVisual=null;
 async function loadVisual(){try{const value=await window.ForgeHost?.read('visualActive');if(value&&value.tenant_id===P.scope.tenant_id&&value.expert_id===P.scope.agent_id&&/^[a-f0-9-]{36}$/.test(value.id)&&/^data:image\/png;base64,/.test(value.portrait)&&/^[a-f0-9]{64}$/.test(value.sha256)){approvedVisual=value;P.avatar=value.portrait;P.avatar_icon=/^data:image\/png;base64,/.test(value.avatar_icon)&&/^[a-f0-9]{64}$/.test(value.avatar_icon_sha256)?value.avatar_icon:null;P.avatar_credit=value.credit||null;F?.render();}}catch{/* Keep the packaged portrait when the visual service is unavailable. */}}
 window.addEventListener('forge-visual-updated',loadVisual);
 const keys={skills:'skill_name',commands:'command_id',experts:'agent_id',sessions:'session_key',artifacts:'id',proposals:'proposal_id',checks:'check_id',configs:'config_id',sources:'source_id',tasks:'task_id',runs:'row_key',intents:'intent_id',prds:'prd_id'};
 const tables={skills:'Configuration skill bindings',commands:'Configuration command bindings',experts:'agent_expert_config.v1',sessions:'agent_sessions',artifacts:'Packaged artifacts / PRD projection',proposals:'agent_os_proposals',checks:'Configuration readiness',configs:'agent_expert_config.v1',sources:'client_context_refs',tasks:'Scoped Kanban projection',runs:'Activity metrics projection',intents:'Approval workflow',prds:'prd_artifacts'};
 window.FORGE_CONTRACTS={keys,tables,sources:{},relations:[['proposals','task_id','tasks','reference','Linked task',''],['artifacts','prd_id','prds','reference','Artifact PRD','']]};
 const ui=(title,icon,state='unverified',category='Packaged configuration')=>({title,icon,state,category,scope:'shared'});
 const commandTitle=value=>typeof value==='string'?value:String(value?.id||'Unnamed recipe').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
 const seed=Object.fromEntries(Object.keys(keys).map(k=>[k,[]]));
 seed.schema_version='forge-private-studio.v1';seed.demo=false;seed.uiLinks=[];
 seed.experts=[{...config,ui:ui(config.display_name,'user','draft')}];
 seed.configs=[{...config,config_id:P.scope.config_sha256,ui:ui(config.display_name,'settings','draft')}];
 seed.skills=config.skills.map(name=>({skill_name:name,ui:ui(name,'spark','unverified')}));
 seed.commands=[...config.prime_commands.map(value=>[value,'Startup']),...config.preset_commands.map(value=>[value,'Preset'])].map(([value,category],i)=>({command_id:'command-'+i,command:value,ui:ui(commandTitle(value),'terminal','unverified',category)}));
 seed.sources=config.client_context_refs.map(value=>({source_id:value,ui:ui(value,'brain','reference','Configuration reference')}));
 seed.artifacts=P.artifacts.map(a=>({...a,ui:ui(a.title,'file','packaged',a.mime)}));
 seed.checks=[['identity','Identity',Boolean(config.agent_id)],['skills','Skill bindings',config.skills.length>0],['commands','Command bindings',seed.commands.length>0],['context','Context references',config.client_context_refs.length>0],['validation','Validation workflows',config.validation_workflows.length>0],['runtime','Runtime verification',false]].map(([check_id,title,supplied])=>({check_id,supplied,ui:ui(title,'shield',supplied?'supplied':'unverified','Configuration only')}));
 window.FORGE_DATA=seed;
 let F, historyPage=null, historyRequest={view:'sessions'}, atlas=null, planning=null;
 let proposalPage={offset:0,total:0,limit:50}, proposalQuery={}, selectedMetric=null, dataset='traces', axis='tokens';
 const status={}, busy=new Set(), details=new Map();
 let avatarDraft=null, avatarController=null, avatarFocus=null;
 const avatarScope=JSON.stringify([P.scope.tenant_id,P.scope.agent_id,P.scope.config_sha256]);
 const e=v=>F.esc(v), i=n=>F.icon(n), fmt=v=>v===null||v===undefined?'Not recorded':typeof v==='number'?v.toLocaleString(undefined,{maximumFractionDigits:3}):String(v);
 const when=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString():'Time not recorded';
 const act=(label,action,key='',disabled=false)=>`<button data-action="${action}" data-key="${e(key)}" ${disabled?'disabled':''}>${label}</button>`;
 const nav=(label,target)=>`<button data-nav="${target}">${label}</button>`;
 const readonly=()=>`<div class="private-readonly">${i('lock')} Review only. Decisions, email and execution are not connected here.</div>`;
 const info=(key)=>`<p class="private-status" role="status" data-status="${key}">${e(status[key]||'Waiting for private connection')}</p>`;
 const refresh=key=>act(i('refresh')+' Refresh','refresh',key,busy.has(key));
 const rows=(kind,list,limit=3)=>list.slice(0,limit).map(r=>F.miniRow(kind,r)).join('');
 const no=(text,detail='No matching saved records are available.')=>F.empty(text,detail);
 function field(label,value,glyph='link'){return `<div><small>${i(glyph)} ${e(label)}</small><p><code>${e(value||'Not linked')}</code></p></div>`;}
 function commandDetail(r){
  const command=r.command;
  if(typeof command==='string')return `<div class="private-detail"><h3>${e(commandTitle(command))}</h3><p>Packaged recipe binding. Runtime execution has not been verified.</p><pre>${e(command)}</pre>${act(i('play')+' Run now','disabled','',true)}</div>`;
  const mode={read_only:'Read only',dry_run:'Dry run',mutation:'Changes files or settings'}[command.mode]||'Mode not specified';
  return `<div class="private-detail"><h3>${e(commandTitle(command))}</h3><p>${e(r.ui.category)} recipe · ${e(mode)}</p><div class="private-fields">${field('Recipe ID',command.id,'terminal')}${field('Definition',command.root,'file')}${field('Approval',command.approval_required?'Required before changes':'Not required by configuration','shield')}</div>${Array.isArray(command.argv)&&command.argv.length?`<details><summary>Declared arguments</summary><pre>${e(command.argv.join(' '))}</pre></details>`:''}${act(i('play')+' Run now','disabled','',true)}<p>Execution, last-run result and output are not connected in this Atlas view. The signed-in Workshop connects the YouTube health recipe.</p></div>`;
 }
 function record(kind,r){return `<details class="spaced"><summary>Saved fields</summary><pre>${e(JSON.stringify(r,null,2))}</pre></details>`;}
 function loaded(key,count){status[key]=`Supabase · ${count} records · ${new Date().toLocaleTimeString()}`;}
 async function read(key,view,input,accept){
  if(busy.has(key))return;
  if(!window.ForgeHost){status[key]='Open this workspace after website sign-in to load private records.';F.render();return;}
  busy.add(key);status[key]='Loading private records…';F.render();
  try {const value=await ForgeHost.read(view,input);accept(value);}catch {status[key]='Refresh unavailable. Last successful records retained.';}
  finally {busy.delete(key);F.render();}
 }
 function validScope(v){return v&&v.tenant_id===P.scope.tenant_id&&v.agent_id===P.scope.agent_id;}
 function proposals(query={}){
  return read('proposals','proposals',query,v=>{
   if(!validScope(v)||!Array.isArray(v.rows)||v.rows.length>50||v.offset!==(query.offset||0)||v.limit!==50||!Number.isSafeInteger(v.total)||v.total<v.rows.length||v.rows.some(r=>!validScope(r)||!/^prop_[a-z0-9_]+$/.test(r.proposal_id)))throw Error('Invalid proposals');
   proposalQuery={...query};proposalPage=v;
   F.D.proposals=v.rows.map(r=>({...r,ui:ui(r.card_title,'spark',r.state,r.source_type)}));
   loaded('proposals',v.total);
  });
 }
 function proposalDetail(id){
  if(!F.find('proposals',id))return;
  F.S.selected.proposals=id;
  return read('proposal','proposal',{proposal_id:id},v=>{
   if(!validScope(v)||v.proposal_id!==id||typeof v.summary!=='string'||!Array.isArray(v.action_items))throw Error('Invalid detail');
   details.set(id,v);loaded('proposal',1);
  });
 }
 function history(request={view:'sessions'}){
  return read('history','history',request,v=>{
   if(!validScope(v)||v.schema_version!=='forge-history-page.v1'||v.source!=='supabase'||v.view!==request.view||v.session_key!==(request.session_key||null)||v.message_key!==(request.message_key||null)||!Array.isArray(v.rows)||v.rows.length>50)throw Error('Invalid history');
   const key={sessions:'session_key',messages:'message_key',traces:'trace_id'}[v.view];
   if(v.rows.some(r=>typeof r[key]!=='string'||!r[key])||new Set(v.rows.map(r=>r[key])).size!==v.rows.length||v.next!==null&&(typeof v.next!=='string'||v.next.length>512||v.next!==v.rows.at(-1)?.[key]))throw Error('Invalid cursor');
   if(v.view==='messages'&&v.rows.some(r=>typeof r.message_text!=='string'||r.message_text.length>12000))throw Error('Invalid message');
   historyPage=v;historyRequest={...request};
   if(v.view==='sessions')F.D.sessions=v.rows.map(r=>({...r,ui:ui(r.session_id,'message',r.delivery,r.harness)}));
   loaded('history',v.rows.length);
  });
 }
 function loadPlanning(){
  return read('planning','planning',{},v=>{
   if(!validScope(v)||v.schema_version!=='forge-planning-snapshot.v1'||v.config_sha256!==P.scope.config_sha256||v.board_slug!==P.scope.board_slug||v.source!=='supabase'||!Array.isArray(v.prds)||v.prds.length>100||!Array.isArray(v.cards)||v.cards.length>200||!Array.isArray(v.artifacts)||v.artifacts.length>30)throw Error('Invalid planning');
   const ids=new Set(v.prds.map(p=>p.prd_id));
   if(ids.size!==v.prds.length||v.cards.some(c=>!Array.isArray(c.prd_ids)||!c.prd_ids.length||c.prd_ids.some(id=>!ids.has(id)))||v.artifacts.some(a=>a.kind!=='actual'||a.prd_id&&!ids.has(a.prd_id)))throw Error('Invalid planning relationships');
   planning=v;F.D.prds=v.prds.map(p=>({...p,ui:ui(p.title,'file',p.status,'PRD index')}));
   F.D.tasks=v.cards.map(c=>({...c,ui:ui(c.title,'tasks',c.status,'Kanban')}));
   F.D.uiLinks=v.cards.flatMap(c=>c.prd_ids.map(id=>({from:['tasks',c.task_id],to:['prds',id],kind:'reference',label:'Scoped PRD reference'})));
   const actual=new Map(P.artifacts.map(a=>[a.id,a]));
   F.D.artifacts=[...P.artifacts,...v.artifacts.filter(a=>!actual.has(a.id))].map(a=>({...a,ui:ui(a.title,'file',actual.has(a.id)?'packaged':'metadata',a.mime)}));
   F.$('scope').innerHTML='<option value="all">All workstreams</option>'+v.prds.map(p=>`<option value="${e(p.prd_id)}">${e(p.title)}</option>`).join('');
   if(F.S.scope!=='all'&&!ids.has(F.S.scope))F.S.scope='all';
   loaded('planning',v.prds.length+v.cards.length);
  });
 }
 function activity(){
  return read('atlas','atlas',{},v=>{
   if(v?.schema_version!=='forge-atlas-snapshot.v1'||v.agent_id!==P.scope.agent_id||v.source!=='supabase'||!Number.isFinite(Date.parse(v.captured_at)))throw Error('Invalid activity');
   for(const name of ['traces','runs','sessions']){
    if(!Array.isArray(v.datasets?.[name])||v.datasets[name].length>200)throw Error('Invalid metrics');
    for(const r of v.datasets[name])if(!new RegExp('^'+name+'-[0-9]{1,3}$').test(r.row_key)||!Number.isFinite(Date.parse(r.observed_at))||['tokens','cost','duration','events'].some(k=>r[k]!==null&&(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0)))throw Error('Invalid metric');
   }
   atlas=v;F.D.runs=v.datasets.runs.map(r=>({...r,ui:ui(r.row_key,'terminal','recorded','Run metrics')}));
   loaded('atlas',Object.values(v.datasets).reduce((n,r)=>n+r.length,0));
  });
 }
 function listWindow(w,description,detail){
  const kind=F.def(w).kind;
  return {preview:()=>F.all(kind).length?F.metrics([[F.all(kind).length,description]])+rows(kind,F.all(kind)):no('No '+description.toLowerCase(), 'This configuration has no bindings yet.'),
   full:()=>{const found=F.filtered(w),r=F.selectedFrom(w,found);return F.filters(w)+`<div class="cards">${found.map(r=>F.card(kind,r)).join('')}</div>`+(r?detail(r):no('No matching records'));}};
 }
 function expertBadge(id){
  if(!id)return `<span class="private-expert-chip unassigned">${i('user')} Unassigned</span>`;
  const current=id===P.scope.agent_id,src=current?(P.avatar_icon||P.avatar):null;
  return `<span class="private-expert-chip" data-expert-id="${e(id)}">${src?`<img src="${e(src)}" alt="${e(config.display_name)} avatar" width="28" height="28">`:i('user')}<span>${e(current?config.display_name:id)}</span></span>`;
 }
 function proposalBody(full){
  const list=F.D.proposals, selected=F.chosen('proposals'), detail=selected&&details.get(selected.proposal_id);
  const cards=list.slice(0,full?50:3).map(r=>`<button class="card" data-action="proposal-open" data-window="proposals" data-key="${e(r.proposal_id)}"><div class="card-top">${i('spark')}${F.badge(r.state)}</div><strong>${e(r.card_title)}</strong><small>${i('source')} ${e(r.source_type)} ${r.source_synthetic?'· Synthetic source':''}</small><small>Generated by</small>${expertBadge(r.agent_id)}<small>Assigned to</small>${expertBadge(r.assigned_expert)}</button>`).join('');
  const table=`<div class="cards private-proposal-table"><table class="private-table" role="table" aria-label="Proposals"><thead><tr><th role="columnheader" scope="col">Proposal</th><th role="columnheader" scope="col">State</th><th role="columnheader" scope="col">Generated by</th><th role="columnheader" scope="col">Assigned to</th></tr></thead><tbody>${list.map(r=>`<tr><td><button data-action="proposal-open" data-window="proposals" data-key="${e(r.proposal_id)}">${e(r.card_title)}</button><small>${e(r.source_type)}</small></td><td>${F.badge(r.state)}</td><td>${expertBadge(r.agent_id)}</td><td>${expertBadge(r.assigned_expert)}</td></tr>`).join('')}</tbody></table></div>`;
  if(!full)return F.metrics([[proposalPage.total,'Expert proposals']])+`<div class="stack">${cards||no('No proposals for this expert',config.display_name)}</div>`+info('proposals');
  return `<p class="tiny">${e(config.display_name)} · proposals</p><form id="proposal-search" class="filterbar"><label class="search">${i('search')}<input name="search" maxlength="120" aria-label="Search proposals" placeholder="Search proposals…" value="${e(proposalQuery.search||'')}"></label><label>State <select name="state" aria-label="Proposal state"><option value="">All states</option>${['gated','blocked','queued','approved','denied'].map(s=>`<option ${proposalQuery.state===s?'selected':''}>${s}</option>`).join('')}</select></label><button type="button" data-action="proposal-search" ${busy.has('proposals')?'disabled':''}>Search</button></form>${info('proposals')}${list.length?table:`<div class="cards">${no('No proposals for this expert','No saved proposals match this expert and the current filters.')}</div>`}<div class="private-pager">${act('Previous','proposal-prev','',!proposalPage.offset||busy.has('proposals'))}<small>${proposalPage.total?proposalPage.offset+1:0}–${Math.min(proposalPage.offset+list.length,proposalPage.total)} of ${proposalPage.total}</small>${act('Next','proposal-next','',proposalPage.offset+50>=proposalPage.total||busy.has('proposals'))}</div>`+
   (selected?`<article class="private-detail" id="proposal-detail"><div class="row between"><h3>${e(selected.card_title)}</h3>${F.badge(selected.state)}</div>${detail?`<p>${e(detail.summary||'No saved summary.')}</p><ul>${detail.action_items.map(a=>`<li>${e(a)}</li>`).join('')}</ul>`:act('Open saved detail','proposal-open',selected.proposal_id,busy.has('proposal'))}${info('proposal')}<div class="private-fields">${field('Source event',selected.source_event_id,'source')}${field('Producer run',selected.producer_run_id,'terminal')}${field('Task',selected.task_id,'tasks')}${field('Updated',when(selected.updated_at),'clock')}</div>${selected.task_id&&F.find('tasks',selected.task_id)?F.chip('tasks',selected.task_id):''}${act('Accept proposal','disabled','',true)}${readonly()}</article>`:'');
 }
 function safeTrace(url,id){return typeof url==='string'&&/^https:\/\/(us\.cloud\.langfuse\.com|cloud\.langfuse\.com|eu\.cloud\.langfuse\.com)\/project\/[A-Za-z0-9_-]+\/traces\/[A-Za-z0-9_-]+$/.test(url)&&url.split('/').at(-1)===id;}
 function historyBody(full){
  if(!full)return F.metrics([[F.D.sessions.length,'Sessions on loaded page']])+rows('sessions',F.D.sessions)+info('history')+nav('Browse sessions','chat');
  const v=historyPage;
  return `<div class="private-toolbar">${act('Sessions','history-home')}${refresh('history')}${v?.session_key?act('Messages','history-messages',v.session_key)+act('Session traces','history-traces',v.session_key):''}</div>${info('history')}${v?.session_key?field('Session',v.session_key,'message'):''}<div class="stack">${v?.rows.map(r=>v.view==='sessions'?`<article class="private-detail"><h3>${e(r.session_id)}</h3><div class="row wrap">${F.badge(r.delivery)}<small>${e(r.harness)} · ${e(when(r.last_active_at))}</small></div>${F.metrics([[r.saved_messages,'Saved messages'],[r.expected_messages,'Expected messages']])}<div class="private-toolbar">${act('Messages','history-messages',r.session_key)}${act('Traces','history-traces',r.session_key)}</div></article>`:v.view==='messages'?`<article class="private-detail"><small>Message ${e(r.seq)} · ${e(when(r.ts))}</small><pre class="private-message">${e(r.message_text)}</pre>${r.preview_truncated?'<small>Preview limited to 12,000 characters.</small>':''}${act('Message traces','message-traces',r.message_key)}</article>`:`<article class="private-detail"><h3>${e(r.trace_name||r.trace_id)}</h3>${F.metrics([[fmt(r.total_tokens),'Tokens'],[fmt(r.observation_count),'Observations']])}${safeTrace(r.langfuse_url,r.trace_id)?`<a href="${e(r.langfuse_url)}" target="_blank" rel="noopener noreferrer">Open trace in Langfuse ↗</a>`:'<small>Verified trace link unavailable.</small>'}${field('Trace',r.trace_id,'graph')}</article>`).join('')||no('No saved '+(v?.view||'sessions'), 'Capture or correlation may not yet be available.')}</div>${v?.next?act('Next page','history-next','',busy.has('history')):''}`;
 }
 function metricBody(full){
  const list=atlas?.datasets[dataset]||[], ys=list.map(r=>r[axis]).filter(v=>v!==null), max=Math.max(1,...ys), times=list.map(r=>Date.parse(r.observed_at));
  const minT=Math.min(...times),range=Math.max(1,Math.max(...times)-minT);
  const chart=list.length?`<svg class="private-chart" viewBox="0 0 640 250" role="img" aria-label="${e(dataset)} by recorded time and ${e(axis)}"><text x="20" y="20">${e(axis)} · max ${e(fmt(max))}</text><path d="M35 30V210H620" stroke="var(--line)" fill="none"/>${list.filter(r=>r[axis]!==null).map(r=>`<circle tabindex="0" role="button" aria-label="Select ${e(r.row_key)}" data-metric="${e(r.row_key)}" class="${selectedMetric===r.row_key?'selected':''}" cx="${40+(Date.parse(r.observed_at)-minT)/range*555}" cy="${200-r[axis]/max*160}" r="6"><title>${e(r.row_key)} · ${e(fmt(r[axis]))}</title></circle>`).join('')}<text x="35" y="238">Recorded time →</text></svg>`:no('No activity metrics loaded');
  if(!full)return F.metrics([[list.length,dataset+' in snapshot']])+chart+info('atlas');
  return `<div class="private-toolbar"><label>Dataset <select id="activity-dataset">${['traces','runs','sessions'].map(v=>`<option ${v===dataset?'selected':''}>${v}</option>`).join('')}</select></label><label>Y axis <select id="activity-axis">${({traces:['tokens','cost','duration'],runs:['duration'],sessions:['duration','events']}[dataset]).map(v=>`<option ${v===axis?'selected':''}>${v}</option>`).join('')}</select></label>${refresh('atlas')}</div>${info('atlas')}${chart}<div class="contract-scroll"><table class="private-table"><thead><tr><th>Record</th><th>Recorded</th><th>${e(axis)}</th></tr></thead><tbody>${list.map(r=>`<tr class="${selectedMetric===r.row_key?'selected':''}"><td><button data-metric="${e(r.row_key)}">${e(r.row_key)}</button></td><td>${e(when(r.observed_at))}</td><td>${e(fmt(r[axis]))}</td></tr>`).join('')}</tbody></table></div><p class="tiny spaced">Latest 90 days, up to 200 records per dataset. Metrics do not include command output or verified execution status.</p>`;
 }
 function plansBody(full){
  const prds=F.D.prds.filter(p=>F.S.scope==='all'||p.prd_id===F.S.scope),cards=F.filtered('tasks',{state:r=>r.status}).filter(c=>F.S.scope==='all'||c.prd_ids.includes(F.S.scope));
  if(!full)return expertBuilder.preview()+planTemplate.preview()+nav('Review config blueprint','tasks')+F.metrics([[prds.length,'PRDs'],[cards.length,'Linked tasks']]);
  return '<div id="forge-expert-builder"></div><div id="forge-plan-template"></div><details class="spaced"><summary>Indexed plans & linked work</summary>'+refresh('planning')+info('planning')+F.filters('tasks',[['state','State',[...new Set(F.D.tasks.map(c=>c.status))]]])+`<div class="cards">${prds.map(p=>`<article class="card"><div class="card-top">${i('file')}${F.badge(p.status)}</div><strong>${e(p.title)}</strong><small>${p.config_sha256===P.scope.config_sha256?'Current configuration':p.config_sha256?'Previous configuration':'Configuration lineage missing'}</small>${act('Inspect plan','plan-open',p.prd_id)}</article>`).join('')}</div><div class="board spaced">${[...new Set(cards.map(c=>c.status))].map(s=>`<section class="board-lane"><h4>${e(s)}</h4>${cards.filter(c=>c.status===s).map(c=>`<article class="private-detail"><strong>${e(c.title)}</strong><code>${e(c.task_id)}</code>${c.prd_ids.map(id=>act(i('file')+' PRD','plan-open',id)).join('')}</article>`).join('')}</section>`).join('')||no('No linked tasks')}</div></details>`;
 }
 function artifactDetail(a){const local=P.artifacts.find(x=>x.id===a.id&&x.sha256===a.sha256);return `<article class="private-detail"><h3>${e(a.title)}</h3>${F.metrics([[fmt(a.bytes),'Bytes'],[local?'Included':'Metadata only','Content']])}${field('SHA-256',a.sha256,'shield')}${a.prd_id?act('Open linked PRD','plan-open',a.prd_id):''}${local?act('Preview','artifact-preview',a.id)+act(i('download')+' Download','artifact-download',a.id):'<p>File content is not included in this private package.</p>'}</article>`;}
 function modal(title,body){F.$('inspect-title').textContent=title;F.$('inspect-content').innerHTML=body;if(!F.$('inspect-dialog').open)F.$('inspect-dialog').showModal();}
 function avatarPreview(){
  const card=avatarDraft?.selected, cached=P.visual_intake.catalog.cards.find(c=>c.key===card?.key);
  return `<div class="row"><img class="private-portrait" src="${P.avatar}" alt="Current expert portrait"><div><h3>${e(config.display_name)}</h3>${F.badge('draft','Avatar studio')}</div></div>`+
   (approvedCard(false)||(cached?`<div class="private-card-choice"><img src="${cached.image_data}" alt="Selected MTG card"><div><strong>${e(card.face_name||card.name)}</strong><small>${e(card.set_code.toUpperCase())} #${e(card.collector_number)}</small></div></div>`:'<p class="spaced">Choose a card to shape this expert’s portrait and full character.</p>'))+
   F.flow([['file','Agent card'],['user','Portrait'],['spark','Full-body 3D']],true)+(approvedVisual?act('Review approved visuals','visual-jobs'):'')+nav(card?'Continue avatar draft':'Choose avatar inspiration','presence');
 }
 function approvedCard(full){
  if(!approvedVisual?.agent_card||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(approvedVisual.agent_card)||!/^[a-f0-9]{64}$/.test(approvedVisual.agent_card_sha256||''))return '';
  return `<figure class="private-agent-card" style="margin:20px 0;text-align:center"><img src="${approvedVisual.agent_card}" alt="Approved full agent card" style="height:${full?430:180}px;width:auto;max-width:100%;object-fit:contain;border-radius:14px"><figcaption>Approved agent card${full?' · '+act('Review & download packet','visual-jobs'):''}</figcaption></figure>`;
 }
 function mountAvatar(){
  avatarController?.dispose(); avatarController=null;
  const host=document.getElementById('avatar-intake'); if(!host)return;
  const root=host.attachShadow({mode:'open'}), bundle=P.visual_intake;
  root.innerHTML='<style>'+bundle.css+'</style>'+bundle.html;
  avatarController=window.ForgeVisualIntake.mount(root,{
   catalog:bundle.catalog,briefTemplate:bundle.briefTemplate,scopeKey:avatarScope,configSha256:P.scope.config_sha256,
   expert:{tenant_id:P.scope.tenant_id,tree:P.scope.tenant_id,expert_id:P.scope.agent_id,display_name:config.display_name,purpose:config.purpose,profile_id:null,artifact_root:null},
   allowSearch:false,load:()=>avatarDraft,save:draft=>{avatarDraft=structuredClone(draft);},
   onGenerate:brief=>window.ForgeHost.read('visualOpen',{brief}),
   savedLabel:'Draft kept until reload. Download to keep a copy.',restoredLabel:'Session draft restored. Download to keep a copy.'
  });
  if(avatarFocus){const target=root.getElementById(avatarFocus.id);target?.focus({preventScroll:true});if(target?.setSelectionRange&&avatarFocus.start!==null)target.setSelectionRange(avatarFocus.start,avatarFocus.end);}
 }
 function actions(action,b){
  if(action==='visual-jobs')return window.ForgeHost?.read('visualOpen').catch(()=>F.toast('Generation studio unavailable.'));
  const key=b.dataset.key;
  if(action==='proposal-search')return searchProposals();
  if(action==='refresh')return ({proposals:()=>proposals(proposalQuery),history:()=>history(historyRequest),planning:loadPlanning,atlas:activity}[key])?.();
  if(action==='proposal-open'){F.navigate('proposals',key);return proposalDetail(key);}
  if(action==='proposal-prev'||action==='proposal-next')return proposals({...proposalQuery,offset:Math.max(0,proposalPage.offset+(action==='proposal-next'?50:-50))});
  if(action==='history-home')return history();
  if(action==='history-messages'||action==='history-traces'){F.S.selected.chat=key;return history({view:action==='history-messages'?'messages':'traces',session_key:key});}
  if(action==='message-traces')return history({view:'traces',session_key:historyPage.session_key,message_key:key});
  if(action==='history-next')return history({...historyRequest,after:historyPage.next});
  if(action==='plan-open'){const p=F.find('prds',key);if(!p)return;const a=P.artifacts.find(a=>a.prd_id===key&&a.sha256===p.body_sha256);return modal(p.title,field('PRD',key,'file')+field('Source path',p.path,'source')+field('Config SHA-256',p.config_sha256,'settings')+(a?act('Preview packaged plan','artifact-preview',a.id):'<p>Plan content is not packaged. The saved index is shown below.</p>')+record('prds',p));}
  if(action==='artifact-preview'||action==='artifact-download'){
   const a=P.artifacts.find(a=>a.id===key);if(!a)return;
   if(action==='artifact-download')return F.download(a.filename,a.content);
   modal(a.title,a.mime==='text/html'?'<iframe class="private-artifact-frame" title="Artifact preview" sandbox="" referrerpolicy="no-referrer"></iframe>':`<pre>${e(a.content)}</pre>`);
   if(a.mime==='text/html'){const frame=F.$('inspect-content').querySelector('iframe'),policy="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'";frame.setAttribute('csp',policy);frame.srcdoc='<meta http-equiv="Content-Security-Policy" content="'+policy+'">'+a.content;}return;
  }
  if(action==='config-download')F.download('expert-config.yaml',P.yaml);
 }
 function searchProposals(){const form=F.$('proposal-search');if(!form)return;const data=new FormData(form),query={offset:0};for(const k of ['search','state'])if(data.get(k))query[k]=String(data.get(k));return proposals(query);}
 function start(){
  F=window.Forge;
  if(generatedPacket?.visual.model)import(new URL('assets/turntable.js',location.href).href).catch(()=>{});
  F.defs.find(d=>d.id==='tasks').title='Expert Config Builder';
  loadVisual();
  F.views.skills=listWindow('skills','Skill bindings',r=>`<div class="private-detail"><h3>${e(r.skill_name)}</h3><p>Binding supplied in this draft. Runtime installation has not been verified.</p>${F.chip('configs',P.scope.config_sha256)}</div>`);
  F.views.commands=listWindow('commands','Command bindings',commandDetail);
  F.views.commands.preview=()=>F.metrics([[F.D.commands.length,'Command bindings']])+F.flow([['terminal','Recipe'],['play','Run'],['file','Output']],true)+act(i('play')+' Run now','disabled','',true)+'<p class="tiny spaced">Execution and output are not connected.</p>';
  F.views.presence={preview:avatarPreview,full:()=>`${generatedHero()}<div class="row wrap"><img class="private-portrait" src="${P.avatar}" alt="Current expert portrait"><div><h1>${e(config.display_name)}</h1><p>${e(P.tagline)}</p>${P.avatar_credit?`<small>Current portrait reference: ${e(P.avatar_credit.name)} · ${e(P.avatar_credit.artist)}</small>`:''}</div></div>${approvedCard(true)}<div class="private-toolbar">${nav('Sessions','chat')}${nav('Build expert config','tasks')}${nav('Activity','console')}</div><div id="avatar-intake" aria-label="Avatar character studio"></div>`};
  F.views.chat={preview:()=>historyBody(false),full:()=>historyBody(true)};
  F.views.canvas={preview:()=>F.flow(P.workflow.slice(0,3).map(s=>['file',s.title]),true)+nav('Open brief','canvas'),full:()=>`<article class="document"><span class="eyebrow">EXPERT BRIEF</span><h1>${e(config.display_name)}</h1><p>${e(config.purpose)}</p><div class="stack spaced">${P.workflow.map((s,n)=>`<section class="private-detail"><small>STEP ${n+1}</small><h3>${e(s.title)}</h3><p>${e(s.description)}</p></section>`).join('')}</div><div class="private-toolbar">${nav('Actual outputs','artifacts')}${nav('Configuration','config')}${nav('Build expert config','tasks')}</div></article>`};
  F.views.proposals={preview:()=>proposalBody(false),full:()=>proposalBody(true)};
  F.views.checks={preview:()=>F.metrics([[F.D.checks.filter(c=>c.supplied).length+'/'+F.D.checks.length,'Configuration supplied']])+rows('checks',F.D.checks)+nav('Review readiness','checks'),full:()=>`<p>These checks describe the packaged configuration. They do not certify a working runtime.</p><div class="cards spaced">${F.D.checks.map(c=>F.card('checks',c)).join('')}</div>${readonly()}`};
  F.views.config={preview:()=>F.flow([['user','Identity'],['settings','Bindings'],['shield','Approval']],true)+F.metrics([[Object.keys(config).length,'Fields'],[config.skills.length,'Skills']])+nav('Inspect configuration','config'),full:()=>`<p>Packaged expert configuration · read-only</p><div class="private-toolbar">${act(i('download')+' Download YAML','config-download')}</div><div class="private-fields">${Object.entries(config).map(([k,v])=>`<details><summary>${i('settings')} ${e(k)}</summary><pre>${e(typeof v==='string'?v:JSON.stringify(v,null,2))}</pre></details>`).join('')}</div>${field('Configuration SHA-256',P.scope.config_sha256,'shield')}`};
  F.views.knowledge=listWindow('knowledge','Context references',r=>`<div class="private-detail">${field('Reference',r.source_id,'brain')}<p>Reference supplied by this configuration. Source content is not returned by the current read API.</p>${F.chip('configs',P.scope.config_sha256)}</div>`);
  F.views.tasks={preview:()=>plansBody(false),full:()=>plansBody(true)};
  F.views.artifacts=listWindow('artifacts','Actual outputs',artifactDetail);
  F.views.artifacts.preview=()=>F.metrics([[F.D.artifacts.length,'Actual outputs']])+rows('artifacts',F.D.artifacts)+info('planning');
  F.views.console={preview:()=>metricBody(false),full:()=>metricBody(true)};
  F.views.changes={preview:()=>F.flow([['spark','Proposal'],['file','Scope'],['check','Plan']],true)+readonly(),full:()=>`<div class="private-gates">${F.flow([['spark','Proposal','Greg accepts'],['file','Scope','Greg approves; client feedback'],['check','Plan','Implementation approval']])}</div><p>Three human approval gates. Auto-approval of implementation requires explicit opt-in for that scope.</p><div class="private-toolbar">${nav('Review proposals','proposals')}</div>${readonly()}`};
  for(const view of Object.values(F.views))view.action=actions;
  const startWindow=document.querySelector('meta[name="forge-start-window"]')?.content;
  if(['proposals','presence','tasks'].includes(startWindow)){F.S.window=startWindow;F.S.view='full';}
  document.addEventListener('forge-render',()=>{planTemplate.mount(document.getElementById('forge-plan-template'));expertBuilder.mount(document.getElementById('forge-expert-builder'));});
  document.addEventListener('forge-render',mountAvatar);
  document.addEventListener('forge-before-render',()=>{const active=document.getElementById('avatar-intake')?.shadowRoot?.activeElement;avatarFocus=active?.matches('input,textarea,select')?{id:active.id,start:active.selectionStart??null,end:active.selectionEnd??null}:null;});
  F.start();
  document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.closest('#proposal-search')){event.preventDefault();searchProposals();}});
  document.addEventListener('change',event=>{if(event.target.id==='activity-dataset'){dataset=event.target.value;axis=dataset==='traces'?'tokens':'duration';selectedMetric=null;F.render();}if(event.target.id==='activity-axis'){axis=event.target.value;F.render();}});
  const metric=event=>{const element=event.target.closest('[data-metric]');if(element){selectedMetric=element.dataset.metric;F.render();}};
  document.addEventListener('click',metric);document.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){if(event.target.matches('[data-metric]')){event.preventDefault();metric(event);}}});
  Promise.allSettled([proposals(),history(),loadPlanning(),activity()]);
 }
 return Object.freeze({start});
})();
