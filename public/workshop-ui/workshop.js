'use strict';
(() => {
const S = window.FORGE_SOURCE;
const $ = id => document.getElementById(id);
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
 tasks:'M4 4h6v7H4zm10 0h6v4h-6zM4 15h6v5H4zm10-3h6v8h-6z',
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
 {id:'commands', title:'Justfile Commands', short:'Commands', icon:'commands', purpose:'Real recipes, inputs, and sample execution.'},
 {id:'presence', title:'Agent Presence', short:'Agent', icon:'presence', purpose:'The selected expert and its configured avatar.'},
 {id:'chat', title:'Conversation', short:'Chat', icon:'chat', purpose:'A focused conversation with the expert.'},
 {id:'canvas', title:'Working Canvas', short:'Canvas', icon:'canvas', purpose:'The document or preview currently in focus.'},
 {id:'proposals', title:'Proposals', short:'Proposals', icon:'proposals', purpose:'Review suggested work before it begins.'},
 {id:'checks', title:'Setup & Quality Checks', short:'Checks', icon:'checks', purpose:'Configuration completeness and verification evidence.'},
 {id:'config', title:'Expert Configuration', short:'Config', icon:'config', purpose:'Purpose, model, operating limits, and instructions.'},
 {id:'knowledge', title:'Second Brain', short:'Memory', icon:'knowledge', purpose:'Context, saved decisions, and source documents.'},
 {id:'tasks', title:'Tasks & Workstream', short:'Tasks', icon:'tasks', purpose:'An expert-scoped view of work and dependencies.'},
 {id:'artifacts', title:'Artifacts', short:'Artifacts', icon:'artifacts', purpose:'Find outputs and the sources behind them.'},
 {id:'console', title:'Run Console', short:'Console', icon:'console', purpose:'Follow command output and execution history.'},
 {id:'changes', title:'Changes & Approvals', short:'Changes', icon:'changes', purpose:'Compare and review the exact proposed change.'}
];
const STORAGE = 'gbauto.nexus-window-review.v1.youtube-intel';
const LAYOUT = 'gbauto.nexus-window-layout.v1.youtube-intel';
let storageAvailable = true;
function readStore(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
function writeStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { storageAvailable = false; $('save-status').textContent='Storage unavailable; use Export review'; } }
const storedReview=readStore(STORAGE, {});
let review = storedReview && typeof storedReview==='object' && !Array.isArray(storedReview) ? storedReview : {};
let states = {}, z = 10, activeView = 'workspace', activeRecipe = 'health', activeCanvas = 'brief', searchRecipes = '', activeSkill = 'youtube-wiki-report';
let proposalState = {}, draftConfig = null, maximized = null, dragging = null;
const runtimeLog = [{time:'SOURCE', text:`Loaded ${S.recipes.length} recipes from the YouTube expert justfile.`, kind:'info'}, {time:'PREVIEW',text:'No runtime connected. Demo commands produce sample output only.',kind:'info'}];
const skills = [
 {id:'youtube-wiki-report',name:'Video → wiki report',detail:'A cited note and a branded report',icon:'artifacts',input:'A YouTube URL and available source material.',output:'A source note, report, and receipt.',source:'resources/skills/youtube-wiki-report/SKILL.md'},
 {id:'youtube-intel-app',name:'YouTube intelligence',detail:'Trusted channels and useful signals',icon:'video',input:'An approved channel list and scan window.',output:'Indexed videos and explicit processing states.',source:'resources/skills/youtube-intel-app/SKILL.md'},
 {id:'youtube-indydevdan-process',name:'TAC video research',detail:'Patterns worth bringing into your work',icon:'skills',input:'A selected TAC video and its transcript.',output:'Lesson maps, source-backed notes, and patterns.',source:'resources/skills/youtube-indydevdan-process/SKILL.md'}
];
const proposals = [
 {id:'weekly', label:'RESEARCH', title:'Turn the weekly scan into a useful brief', description:'Group findings by reusable pattern, with a source link for every takeaway.', scope:'Draft a reporting workflow', tag:'Suggested'},
 {id:'transcripts', label:'QUALITY', title:'Make missing transcripts visible', description:'Keep an explicit source status before a video can become a report.', scope:'Review the processing states', tag:'Suggested'},
 {id:'scan', label:'CONFIGURATION', title:'Review the scan cap', description:`Compare the current ${S.scan_cap}-video cap with a proposed 8-video draft.`, scope:'One configuration field', tag:'Example change'}
];
const recipeDescriptions = {
 health:'Read the expert smoke-test definitions and inspect health.',prime:'Load bounded, current expert context.',drift:'Compare expert definitions with the source of truth.',test:'Replay the expert’s defined tests.',proposals:'Generate a proposal report for this expert.',
 'proposals-apply':'Write proposal results through the expert’s proposal workflow.',check:'Check the expert installation contract.',verify:'Verify the expert installation contract.',install:'Apply the expert installation.',audit:'Run the check, drift, routes, and test recipes.',routes:'List the expert’s available command routes.',question:'Ask a question using the expert route.',plan:'Prepare a plan through the expert route.',improve:'Run the expert’s self-improvement route.',graph:'Inspect expert graph context.',maintain:'Run the expert maintenance route.',pbi:'Enter the expert plan/build/improve route.',default:'List the available Justfile recipes.','validate-playbook':'Validate the portable expert playbook contract.'
};
const notice = text => `<div class="panel-notice">${text}</div>`;
const searchBox = (id, placeholder) => `<div class="search-wrap">${icon('search')}<input type="search" id="${id}" placeholder="${placeholder}" aria-label="${placeholder}"></div>`;
const panelButton = (text, action, extra='') => `<button class="panel-button ${extra}" data-action="${action}">${text}</button>`;
function content(id) {
 switch(id) {
 case 'presence': return `<iframe src="avatar.html" title="YouTube Intelligence configured avatar" sandbox="allow-same-origin"></iframe><span class="presence-label"><i></i> Source avatar · voice off</span>`;
 case 'skills': return `${searchBox('skill-search','Find a skill…')}<div class="section-mini"><span>Source-linked skills</span><span>03</span></div><div class="item-list" id="skill-list">${skillList('')}</div><div class="rule"></div><div id="skill-detail">${skillDetail(skills[0])}</div>`;
 case 'commands': return `${searchBox('recipe-search','Find a recipe…')}<div class="section-mini"><span>YouTube expert / justfile</span><span>${S.recipes.length} recipes</span></div><div id="recipe-list" class="command-list">${recipeList()}</div><div id="command-detail" class="command-detail">${commandDetail()}</div>`;
 case 'chat': return `<div class="chat-messages" id="chat-messages" role="log" aria-live="polite"><div class="message"><span class="speaker">YOUTUBE INTELLIGENCE · DEMO</span>I turn the channels you trust into knowledge you can use. Choose a skill, inspect a proposal, or tell me what you’re looking for.</div></div><form id="chat-form" class="chat-input"><input id="chat-text" aria-label="Message to the demo expert" placeholder="What would you like to explore?" maxlength="800" required><button class="panel-button primary" aria-label="Send demo message">${icon('send')}</button></form>`;
 case 'canvas': return `<div class="canvas-tabs" role="group" aria-label="Working canvas content"><button data-canvas="brief" aria-pressed="true">Brief</button><button data-canvas="sources" aria-pressed="false">Sources</button><button data-canvas="configuration" aria-pressed="false">Config</button><span>PREVIEW</span></div><div class="canvas-content" id="canvas-content">${canvasContent('brief')}</div>`;
 case 'proposals': return `<div class="row" style="margin-bottom:13px"><span class="muted tiny">Example proposal inbox</span><span class="chip orange">3 to review</span></div><div id="proposal-list">${proposalList()}</div>`;
 case 'checks': return `<div class="readiness-overview"><div><span class="eyebrow">CONFIGURATION</span><p class="small">A clear path to ready.</p></div><div class="readiness-number">5 <span>/ 8</span></div></div><div class="progress"><i></i></div>${[
  ['Identity','Source present','config',true],['Purpose & instructions','Source present','config',true],['Runtime settings','Configured','config',true],['Channel context',`${S.channels.length} sources`,'knowledge',true],['Approval rules','Manual','config',true],['Skill installation','Not verified','skills',false],['Connections','Not verified','config',false],['Live validation','Not run','console',false]
 ].map(([name,status,target,done])=>`<button class="check-row ${done?'':'pending'}" data-open="${target}">${icon(done?'check':'clock')}<span>${name}</span><span>${status}</span></button>`).join('')}<div class="rule"></div><button class="text-button" data-open="console">View verification evidence ↗</button><p class="tiny spaced">Configured does not mean tested. Activation is a separate decision.</p>`;
 case 'config': return `<span class="eyebrow">SOURCE CONFIGURATION</span><h3 style="margin-top:7px">Shape your expert.</h3><form id="config-form" class="stack"><label><span>Display name</span><input name="name" value="${escape(S.name)}" maxlength="100" required></label><label><span>Purpose</span><textarea name="purpose" rows="3" required>Turn trusted YouTube sources into cited knowledge, reusable patterns, and useful reports.</textarea></label><div class="field-row"><label><span>Model</span><input name="model" value="${escape(S.model)}" required></label><label><span>Video cap</span><input name="cap" type="number" min="1" max="50" value="${S.scan_cap}" required></label></div><div class="row"><span class="small muted">Approval mode</span><span class="chip cream">${escape(S.approvals.mode)}</span></div><div class="form-actions"><button class="panel-button primary">Save local draft</button><button class="panel-button" type="button" data-action="reset-config">Reset</button></div></form><p class="config-note">Edits affect this preview draft only. Source files stay unchanged.</p><div class="rule"></div><h4>Connections</h4><div class="connection-row">${icon('link')}<div><strong>Model provider</strong><small>${escape(S.provider)}</small></div><span class="chip amber">Not checked</span></div><div class="connection-row">${icon('video')}<div><strong>YouTube sources</strong><small>${S.channels.length} configured channels</small></div><span class="chip amber">Not checked</span></div>`;
 case 'knowledge': return `${searchBox('knowledge-search','Search context…')}<span class="eyebrow">SECOND BRAIN / YOUTUBE INTEL</span><div id="knowledge-list">${knowledgeList('')}</div><div class="rule"></div><p class="small">Saved context should answer the familiar questions before intake asks them again.</p>`;
 case 'tasks': return `<div class="row"><span class="eyebrow">EXAMPLE WORKSTREAM</span><span class="chip">3 items</span></div><h3 class="spaced">Keep the work moving.</h3><p class="small">A preview of the expert’s work queue.</p><div class="task-line"><div class="row"><span class="chip amber">Waiting for review</span><span class="tiny muted">01</span></div><strong>Review the weekly brief proposal</strong><p>Scope and deliverables before a run begins.</p><button class="text-button spaced" data-open="proposals">Open proposal ↗</button></div><div class="task-line"><div class="row"><span class="chip">Draft</span><span class="tiny muted">02</span></div><strong>Collect source material</strong><p>Depends on the approved channel scope.</p></div><div class="task-line"><div class="row"><span class="chip">Draft</span><span class="tiny muted">03</span></div><strong>Review the finished artifact</strong><p>Inspect citations, quality checks, and output.</p><button class="text-button spaced" data-open="artifacts">View example artifacts ↗</button></div>`;
 case 'artifacts': return `<span class="eyebrow">OUTPUT LIBRARY</span><h3 class="spaced">The work, made visible.</h3><p class="small">Example output cards and real source snapshots.</p>${[
  ['brief','Weekly intelligence brief','Design example · document'],['sources','Trusted channel registry','Source snapshot · '+S.channels.length+' channels'],['configuration','Expert configuration','Source snapshot · '+S.model]
 ].map(([id,title,detail])=>`<div class="artifact-tile"><span class="artifact-thumb">${icon('artifacts')}</span><div><strong>${title}</strong><small>${detail}</small></div><button class="icon-button" data-artifact="${id}" aria-label="Open ${escape(title)}">${icon('external')}</button></div>`).join('')}<div class="rule"></div><button class="panel-button full" data-action="export-config">Download configuration snapshot ${icon('external')}</button>`;
 case 'console': return `<div class="row" style="margin-bottom:13px"><span class="chip orange">Simulation</span><button class="text-button" data-action="clear-console">Clear output</button></div><div id="console-log" class="console-content" role="log" aria-live="polite">${consoleLines()}</div><div class="row spaced"><span class="tiny muted">No shell or agent connected</span><button class="text-button" data-open="commands">Open recipes ↗</button></div>`;
 case 'changes': return `<div class="row"><span class="eyebrow">PROPOSED CHANGE</span><span class="chip orange">Demonstration</span></div><h3 class="spaced">One field. In full view.</h3><p class="small">Increase the video cap for a single expert configuration draft.</p><div class="rule"></div><p class="tiny muted">config/youtube_channels.yaml</p><div class="diff-line diff-old">− max_videos_per_scan: ${S.scan_cap}</div><div class="diff-line diff-new">+ max_videos_per_scan: 8</div><div class="rule"></div><div class="row"><span class="small muted">Affected scope</span><span class="chip">Scan cap only</span></div><p class="small spaced">This could increase the work in each scan. Keep the channel allowlist and approval rules unchanged.</p><div class="form-actions"><button class="panel-button primary" data-action="approve-change">Approve demo change</button><button class="panel-button" data-action="reject-change">Decline</button></div><p id="change-status" class="config-note">No source edit or live approval will be created.</p>`;
 default:return '';
 }
}
function skillList(query) {
 const filtered=skills.filter(s=>(s.name+' '+s.detail).toLowerCase().includes(query.toLowerCase()));
 return filtered.map(s=>`<button class="list-item ${s.id===activeSkill?'selected':''}" data-skill="${s.id}"><span class="item-icon">${icon(s.icon)}</span><span><strong>${s.name}</strong><small>${s.detail}</small></span><span class="arrow">↗</span></button>`).join('') || '<p class="empty">No matching skills.</p>';
}
function skillDetail(skill) {return `<span class="eyebrow">${escape(skill.name)}</span><p class="small spaced">${escape(skill.output)}</p><p class="tiny spaced">Input: ${escape(skill.input)}</p><div class="row spaced"><span class="chip">Source-linked</span><button class="text-button" data-action="use-skill">Use in conversation ↗</button></div>`;}
function recipeList() {
 const filtered=S.recipes.filter(r=>(r.id+' '+(recipeDescriptions[r.id]||'')).toLowerCase().includes(searchRecipes.toLowerCase()));
 return filtered.map(r=>`<button class="recipe-button ${activeRecipe===r.id?'selected':''}" data-recipe="${r.id}">${icon('commands')}<code>${escape(r.id)}</code><span class="recipe-type">${r.parameters?'takes input':'recipe'}</span></button>`).join('') || '<p class="empty">No recipes match this search.</p>';
}
function commandDetail() {
 const r=S.recipes.find(r=>r.id===activeRecipe)||S.recipes[0];
 const needsInput=r.parameters && !r.parameters.includes('=');
 return `<p class="tiny">${escape(recipeDescriptions[r.id]||'Run the source-defined expert recipe.')}</p>${r.parameters?`<label class="spaced"><span>Recipe input (${escape(r.parameters)})</span><input id="recipe-argument" maxlength="240" placeholder="${needsInput?'Enter a value…':'Optional argument…'}" ${needsInput?'required':''}></label>`:''}<div class="command-line mono"><span>$</span><code id="command-preview">just ${escape(r.id)}</code></div><details class="recipe-source"><summary>Inspect recipe source</summary><pre>${escape(r.source)}</pre></details>`;
}
function proposalList() {
 return proposals.map(p=>{
 const decision=proposalState[p.id];
 return `<article class="proposal-card"><div class="proposal-meta"><span>${p.label}</span><span class="chip ${decision?'green':''}">${decision?escape(decision):p.tag}</span></div><h4>${p.title}</h4><p>${p.description}</p><div class="proposal-actions"><button class="panel-button" data-proposal="${p.id}" data-decision="Accepted demo">Accept demo</button><button class="panel-button" data-proposal="${p.id}" data-decision="Revise">Revise</button><button class="text-button" data-proposal="${p.id}" data-decision="Declined demo">Decline</button></div>${decision==='Revise'?`<label class="proposal-note"><span>What should change?</span><textarea data-proposal-note="${p.id}" placeholder="Add your direction…">${escape(proposalState[p.id+'-note']||'')}</textarea></label>`:''}${p.id==='scan'?'<button class="text-button spaced" data-open="changes">Inspect the exact diff ↗</button>':''}${decision&&decision!=='Revise'?'<div class="proposal-outcome">Local demo decision only. No work dispatched.</div>':''}</article>`;
 }).join('');
}
function canvasContent(tab) {
 if(tab==='sources')return `<div class="document-header">${icon('knowledge')} SOURCE SNAPSHOT</div><h3>Your trusted sources.</h3><p>From the YouTube expert’s configured channel registry.</p><div class="source-list">${S.channels.map((c,i)=>`<div class="doc-item"><span class="doc-index">${String(i+1).padStart(2,'0')}</span><div><h4>${escape(c.name)}</h4><p>${escape(c.handle)} · ${escape(c.priority)} priority</p></div></div>`).join('')}</div>`;
 if(tab==='configuration')return `<div class="document-header">${icon('config')} ${draftConfig?'LOCAL DRAFT':'SOURCE SNAPSHOT'}</div><h3>The settings behind the expert.</h3><p>Configuration view. Runtime connectivity has not been checked.</p><pre class="spaced">${escape(JSON.stringify(draftConfig||{name:S.name,expert_id:S.expert_id,model:S.model,provider:S.provider,scan_days:S.scan_days,max_videos_per_scan:S.scan_cap,approvals:S.approvals},null,2))}</pre>`;
 return `<div class="document-header">${icon('artifacts')} YOUTUBE INTELLIGENCE <span style="margin-left:auto">EXAMPLE BRIEF</span></div><h3>The signal,<br><em>without the noise.</em></h3><p>A workspace for turning trusted videos into knowledge, reusable patterns, and decisions worth keeping.</p><div class="doc-stats"><div><strong>${S.channels.length}</strong><span>Trusted channels</span></div><div><strong>${S.scan_days} days</strong><span>Scan window</span></div><div><strong>${S.scan_cap} videos</strong><span>Scan cap</span></div></div><div class="doc-item"><span class="doc-index">01</span><div><h4>Collect the source, preserve the context.</h4><p>Keep the transcript, original URL, and processing status together.</p></div></div><div class="doc-item"><span class="doc-index">02</span><div><h4>Find the idea worth applying.</h4><p>Connect a useful pattern to the work you’re already doing.</p></div></div><div class="doc-item"><span class="doc-index">03</span><div><h4>Make the next step reviewable.</h4><p>Send a proposal with evidence, scope, and a clear deliverable.</p></div></div><div class="doc-footer"><span>Layout example · no scan has run</span><button class="light-button" data-open="proposals">Review proposals ↗</button></div>`;
}
const knowledgeEntries=[
 {title:'Trusted channel registry',text:`${S.channels.length} channels · ${S.scan_days}-day window · ${S.scan_cap}-video cap`,source:'config/youtube_channels.yaml',icon:'video'},
 {title:'Expert mental model',text:'YouTube ingestion, evidence, processing, and report conventions.',source:'experts/gbautomation/youtube-intel/expertise.md',icon:'knowledge'},
 {title:'Saved scope & preferences',text:'Retrieve confirmed answers first. Ask only about new or changed decisions.',source:'second-brain/os/USER.md',icon:'chat'},
 {title:'Website brand',text:'Newsreader, Inter, cream, and terracotta. Preserve approved copy and assets.',source:'second-brain/systems/brand/gbauto-brand-tokens.md',icon:'canvas'}
];
function knowledgeList(query){const filtered=knowledgeEntries.filter(x=>(x.title+' '+x.text).toLowerCase().includes(query.toLowerCase()));return filtered.map(x=>`<div class="source-row">${icon(x.icon)}<div><strong>${x.title}</strong><p>${x.text}</p><small style="overflow-wrap:anywhere">${x.source}</small></div></div>`).join('')||'<p class="empty">No matching context.</p>';}
function consoleLines(){return runtimeLog.map(l=>`<div class="console-line"><span class="console-time mono">${escape(l.time)}</span><span>${l.kind==='command'?'<em>':''}${escape(l.text)}${l.kind==='command'?'</em>':''}</span></div>`).join('');}
function log(text,kind='info'){runtimeLog.push({time:new Date().toLocaleTimeString('en-US',{hour12:false}),text,kind});$('console-log').innerHTML=consoleLines();$('console-log').scrollTop=$('console-log').scrollHeight;}
function renderWindow(d,index){
 const el=document.createElement('section');el.className='window';el.id='window-'+d.id;el.dataset.window=d.id;el.setAttribute('aria-label',d.title);
 el.innerHTML=`<div class="window-titlebar" tabindex="0" role="group" aria-label="Move ${d.title}. Arrow keys move; Shift and arrow keys resize."><span>${icon(d.icon)}</span><h2>${d.title}</h2><span class="window-number">${String(index+1).padStart(2,'0')}</span><div class="window-controls"><button class="icon-button window-more" aria-label="${d.title} window options" aria-expanded="false" data-window-action="menu">${icon('more')}</button><button class="icon-button minimize" aria-label="Minimize ${d.title}" data-window-action="minimize">${icon('minimize')}</button><button class="icon-button maximize" aria-label="Maximize ${d.title}" data-window-action="maximize">${icon('maximize')}</button></div></div><div class="window-menu" hidden><button data-snap="left">Snap left</button><button data-snap="center">Snap center</button><button data-snap="right">Snap right</button><button data-window-action="maximize">Maximize / restore</button><button data-action="review-element">Review this element</button></div><div class="window-body ${d.id==='presence'?'presence-body':d.id==='chat'?'chat-body':d.id==='canvas'?'canvas-body':''}">${content(d.id)}</div>${d.id==='commands'?`<div class="command-footer"><div class="row"><button class="panel-button primary" data-action="demo-run">${icon('play')} Demo run</button><button class="text-button" data-action="copy-command">Copy command</button></div></div>`:''}<div class="review-strip"><div class="review-top"><span>Design review</span><div class="review-options"><button data-review="approved" aria-pressed="false">Looks good</button><button data-review="changes" aria-pressed="false">Needs changes</button></div></div><textarea data-review-note="${d.id}" aria-label="Design notes for ${d.title}" placeholder="What would you change?"></textarea></div><div class="resize-handle" tabindex="0" role="button" aria-label="Resize ${d.title} with arrow keys"></div>`;
 $('workspace').appendChild(el);
 el.addEventListener('pointerdown',()=>bringFront(d.id));
 el.querySelector('.window-titlebar').addEventListener('pointerdown',ev=>startDrag(ev,d.id,false));
 el.querySelector('.resize-handle').addEventListener('pointerdown',ev=>startDrag(ev,d.id,true));
 el.querySelector('.window-titlebar').addEventListener('dblclick',ev=>{if(!ev.target.closest('button')&&activeView!=='gallery'&&innerWidth>=900)maximize(d.id);});
 el.querySelector('.window-titlebar').addEventListener('keydown',ev=>moveKeyboard(ev,d.id,false));
 el.querySelector('.resize-handle').addEventListener('keydown',ev=>moveKeyboard(ev,d.id,true));
}
function stageSize(){return {w:$('workspace').clientWidth,h:$('workspace').clientHeight};}
function bounds(rect){const {w,h}=stageSize();const minW=Math.min(260,w), minH=Math.min(190,h);const width=Math.max(minW,Math.min(rect.w,w));const height=Math.max(minH,Math.min(rect.h,h));return {x:Math.max(0,Math.min(rect.x,w-width)),y:Math.max(0,Math.min(rect.y,h-height)),w:width,h:height};}
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
   openIds=['skills','commands','canvas','chat'];
   Object.assign(defaults,{skills:{x:0,y:0,w:side,h:split},commands:{x:0,y:split+gap,w:side,h:h-split-gap},canvas:{x:side+gap,y:0,w:main,h:split},chat:{x:side+gap,y:split+gap,w:main,h:h-split-gap}});
  }else if(name==='focus'){
   Object.assign(defaults,{presence:{x:0,y:0,w:side,h:split},chat:{x:0,y:split+gap,w:side,h:h-split-gap},canvas:{x:side+gap,y:0,w:main,h}});
  }else{
   openIds=['proposals','changes','canvas'];
   Object.assign(defaults,{proposals:{x:0,y:0,w:side,h:split},changes:{x:0,y:split+gap,w:side,h:h-split-gap},canvas:{x:side+gap,y:0,w:main,h}});
  }
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
function updateReview(){defs.forEach(d=>{const r=review[d.id]||{},el=$('window-'+d.id);el.querySelectorAll('[data-review]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.review===r.status)));const ta=el.querySelector('[data-review-note]');if(document.activeElement!==ta)ta.value=r.note||'';});$('review-count').textContent=defs.filter(d=>review[d.id]?.status).length+' / 13';}
let toastTimer;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function selectCanvas(tab){activeCanvas=tab;$('canvas-content').innerHTML=canvasContent(tab);document.querySelectorAll('[data-canvas]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.canvas===tab)));}
function commandText(){const r=S.recipes.find(r=>r.id===activeRecipe);const arg=$('recipe-argument')?.value.trim();return 'just '+r.id+(arg?' '+JSON.stringify(arg):'');}
function demoRun(){
 const arg=$('recipe-argument');if(arg&&!arg.checkValidity()){arg.reportValidity();return;}
 const cmd=commandText();openWindow('console');log('$ '+cmd,'command');log('DEMO: command selected; no process was started.');log('Source: experts/gbautomation/youtube-intel/justfile');log('A connected run would stream output and return its exit status here.');toast('Sample output is in the Run Console. Nothing executed.');
}
function exportReview(){download('nexus-forge-element-review.json',{kind:'design_review',expert_id:S.expert_id,created_at:new Date().toISOString(),prototype:'nexus-forge-window-preview-2026-09-18',design:document.body.dataset.design||'studio',mode:document.body.dataset.mode||'light',source_revision:S.source_revision,implementation_authorized:false,runtime_authorized:false,elements:defs.map(d=>({id:d.id,title:d.title,status:review[d.id]?.status||'unreviewed',note:review[d.id]?.note||''}))});toast('Design review exported. This is not a runtime approval.');}

defs.forEach(renderWindow);
$('dock').innerHTML=defs.map(d=>`<button class="dock-button" data-open="${d.id}" aria-label="Open ${d.title}" aria-pressed="false" title="${d.title}">${icon(d.icon)}<span>${d.short}</span></button>`).join('');
setLayout('balanced',false);
const saved=readStore(LAYOUT,null);
if(saved?.version===1&&saved.states&&innerWidth>=900){
 for(const d of defs){const s=saved.states[d.id];if(s&&['x','y','w','h'].every(k=>Number.isFinite(s[k]))){const scaleX=stageSize().w/(saved.stage?.w||stageSize().w),scaleY=stageSize().h/(saved.stage?.h||stageSize().h);states[d.id]={...bounds({x:s.x*scaleX,y:s.y*scaleY,w:s.w*scaleX,h:s.h*scaleY}),open:Boolean(s.open)};applyRect(d.id);}}
 if(['balanced','focus','review'].includes(saved.layout))$('layout-select').value=saved.layout;
}
updateDock();updateReview();bringFront('canvas');
$('recipe-list').scrollTop=$('recipe-list').querySelector('.selected')?.offsetTop-$('recipe-list').offsetTop||0;
$('workspace-view').addEventListener('click',()=>setView('workspace'));
$('gallery-view').addEventListener('click',()=>setView('gallery'));
$('layout-select').addEventListener('change',ev=>{if(activeView==='gallery')setView('workspace');requestAnimationFrame(()=>setLayout(ev.target.value));});
$('reset-layout').addEventListener('click',()=>{if(activeView==='gallery')setView('workspace');requestAnimationFrame(()=>{setLayout('balanced');toast('Balanced layout restored. Your design review is unchanged.');});});
$('windows-button').addEventListener('click',()=>{const show=$('window-launcher').hidden;$('window-launcher').hidden=!show;$('windows-button').setAttribute('aria-expanded',String(show));if(show)$('window-search').focus();});
$('close-launcher').addEventListener('click',()=>closeLauncher(true));
$('window-search').addEventListener('input',ev=>renderLauncher(ev.target.value));
$('help-button').addEventListener('click',()=>$('help-dialog').showModal());
$('export-review').addEventListener('click',exportReview);
$('skill-search').addEventListener('input',ev=>$('skill-list').innerHTML=skillList(ev.target.value));
$('knowledge-search').addEventListener('input',ev=>$('knowledge-list').innerHTML=knowledgeList(ev.target.value));
$('recipe-search').addEventListener('input',ev=>{searchRecipes=ev.target.value;$('recipe-list').innerHTML=recipeList();});
$('chat-form').addEventListener('submit',ev=>{ev.preventDefault();const input=$('chat-text'),text=input.value.trim();if(!text)return;const reply=/proposal/i.test(text)?'Demo reply: your proposal inbox is on the right. Open a proposal to inspect its scope, or use Changes to review a configuration diff.':/command|just|health|recipe/i.test(text)?'Demo reply: choose a recipe in Justfile Commands, inspect its source, and use Demo run to preview the console interaction.':'Demo reply: I would use the selected expert’s context to work through that request. This preview demonstrates the conversation layout; no model is connected.';$('chat-messages').insertAdjacentHTML('beforeend',`<div class="message user"><span class="speaker">YOU</span>${escape(text)}</div><div class="message"><span class="speaker">YOUTUBE INTELLIGENCE · DEMO</span>${reply}</div>`);input.value='';$('chat-messages').scrollTop=$('chat-messages').scrollHeight;});
$('config-form').addEventListener('submit',ev=>{ev.preventDefault();const fd=new FormData(ev.target);draftConfig={name:fd.get('name'),purpose:fd.get('purpose'),model:fd.get('model'),max_videos_per_scan:Number(fd.get('cap')),approvals:S.approvals.mode};if(activeCanvas==='configuration')selectCanvas(activeCanvas);toast('Local draft updated. Source configuration was not changed.');log('A local configuration draft was updated; no source file was written.');});
document.addEventListener('input',ev=>{
 if(ev.target.id==='recipe-argument')$('command-preview').textContent=commandText();
 if(ev.target.matches('[data-review-note]')){const id=ev.target.dataset.reviewNote;review[id]={...review[id],note:ev.target.value};writeStore(STORAGE,review);}
 if(ev.target.matches('[data-proposal-note]'))proposalState[ev.target.dataset.proposalNote+'-note']=ev.target.value;
});
document.addEventListener('click',ev=>{
 const button=ev.target.closest('button');if(!button){if(!ev.target.closest('.window-menu'))closeMenus();return;}
 const win=button.closest('.window'),id=win?.dataset.window;
 if(button.dataset.open){openWindow(button.dataset.open);if(button.closest('#window-launcher')){closeLauncher();$('window-'+button.dataset.open).querySelector('.window-titlebar').focus({preventScroll:true});}}
 if(button.dataset.skill){activeSkill=button.dataset.skill;$('skill-list').innerHTML=skillList($('skill-search').value);$('skill-detail').innerHTML=skillDetail(skills.find(s=>s.id===activeSkill));}
 if(button.dataset.recipe){activeRecipe=button.dataset.recipe;$('recipe-list').innerHTML=recipeList();$('command-detail').innerHTML=commandDetail();}
 if(button.dataset.canvas)selectCanvas(button.dataset.canvas);
 if(button.dataset.artifact){selectCanvas(button.dataset.artifact);openWindow('canvas');}
 if(button.dataset.proposal){proposalState[button.dataset.proposal]=button.dataset.decision;$('proposal-list').innerHTML=proposalList();log('Demo proposal decision: '+button.dataset.decision+'. No work dispatched.');}
 if(button.dataset.review){const current=review[id]?.status;review[id]={...review[id],status:current===button.dataset.review?null:button.dataset.review};writeStore(STORAGE,review);updateReview();}
 if(button.dataset.windowAction==='menu'){const menu=win.querySelector('.window-menu'),show=menu.hidden;closeMenus();menu.hidden=!show;button.setAttribute('aria-expanded',String(show));}
 else if(button.dataset.windowAction){closeMenus();if(button.dataset.windowAction==='minimize')minimize(id);if(button.dataset.windowAction==='maximize')maximize(id);}
 if(button.dataset.snap){snapWindow(id,button.dataset.snap);closeMenus();}
 switch(button.dataset.action){
  case 'demo-run':demoRun();break;
  case 'copy-command':if(navigator.clipboard?.writeText)navigator.clipboard.writeText(commandText()).then(()=>toast('Command copied.')).catch(()=>toast('Clipboard unavailable. Select the command text to copy it.'));else toast('Select the command text to copy it.');break;
  case 'use-skill':openWindow('chat');$('chat-text').value='Use '+skills.find(s=>s.id===activeSkill).name+' to help me with ';$('chat-text').focus();break;
  case 'reset-config':$('config-form').reset();draftConfig=null;if(activeCanvas==='configuration')selectCanvas(activeCanvas);toast('Source settings restored in the local draft.');break;
  case 'export-config':download('youtube-expert-config-preview.json',{kind:'source_snapshot_preview',source_revision:S.source_revision,expert_id:S.expert_id,configuration:draftConfig||{name:S.name,model:S.model,provider:S.provider,scan_cap:S.scan_cap,approvals:S.approvals}});break;
  case 'clear-console':runtimeLog.length=0;log('Console cleared. No live runtime is connected.');break;
  case 'approve-change':$('change-status').textContent='Approved in this demo only. No source edit or runtime approval was created.';toast('Demo change accepted. Source configuration unchanged.');break;
  case 'reject-change':$('change-status').textContent='Declined in this demo. Current source configuration unchanged.';break;
  case 'review-element':closeMenus();setView('gallery');requestAnimationFrame(()=>$('window-'+id).scrollIntoView({behavior:'smooth',block:'center'}));break;
 }
});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){closeMenus();if(!$('window-launcher').hidden)closeLauncher(true);else if(maximized){restoreMax();saveLayout();}}});
document.addEventListener('pointerdown',ev=>{if(!ev.target.closest('.window-menu,[data-window-action=menu]'))closeMenus();if(!ev.target.closest('#window-launcher,#windows-button'))closeLauncher();});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(activeView==='workspace'&&innerWidth>=900){if(maximized){const id=maximized.id;Object.assign(states[id],{x:0,y:0,...stageSizeRect()});applyRect(id);}else setLayout($('layout-select').value,false);}},150);});
window.addEventListener('beforeunload',()=>{if(maximized)restoreMax();saveLayout();});
// Inspection surface for the local validator. No shell, fetch, or runtime adapter is present.
window.ForgePreview={windows:defs.map(d=>({id:d.id,title:d.title})),source:S,review:()=>structuredClone(review),states:()=>structuredClone(states),view:()=>activeView,storageAvailable:()=>storageAvailable};
// A narrow presentation adapter. Authentication and requests live in the host.
window.ForgeWorkshopView={recipe:()=>activeRecipe,open:openWindow,log,
 clearLog:()=>{runtimeLog.length=0;$('console-log').textContent='';},
 setDraft:c=>{draftConfig={name:c.name,purpose:c.purpose,model:c.model,max_videos_per_scan:c.scan_cap,approvals:c.approvals};
  const f=$('config-form');f.elements.name.value=c.name;f.elements.purpose.value=c.purpose;f.elements.model.value=c.model;f.elements.cap.value=c.scan_cap;
  if(activeCanvas==='configuration')selectCanvas(activeCanvas);}
};
})();
