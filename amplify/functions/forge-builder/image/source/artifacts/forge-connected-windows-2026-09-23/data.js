/* Normalized, local design fixtures. Canonical column names are retained; ui is presentation-only. */
window.FORGE_DATA = (()=>{
const expert='gbautomation/youtube-intel',profile='expert-gbautomation-youtube-intel';
const week='prd_demo_weekly',health='prd_demo_health';
const ids={scan:'10000000-0000-4000-8000-000000000001',report:'10000000-0000-4000-8000-000000000002',health:'10000000-0000-4000-8000-000000000003',failed:'10000000-0000-4000-8000-000000000004'};
const ui=(title,icon,scope=week,extra={})=>({title,icon,scope,...extra});
const skills=[
 ['youtube-intel-app','YouTube intelligence','video','Research','Trusted channels','Indexed videos'],
 ['youtube-wiki-report','Video → wiki report','file','Publishing','Video transcript','Cited report'],
 ['youtube-indydevdan-process','TAC video research','spark','Research','Selected video','Reusable patterns'],
 ['expert:gbautomation:youtube-intel:health','Health check','shield','Quality','Expert profile','Check report'],
 ['expert:gbautomation:youtube-intel:prime','Load context','layers','Context','Saved knowledge','Context pack']
].map(([skill_name,title,icon,category,input,output],i)=>({skill_name,owner:'gbautomation:youtube-intel',skill_path:i<3?`resources/skills/${skill_name}/SKILL.md`:'experts/gbautomation/youtube-intel/justfile',ui:ui(title,icon,'shared',{category,input,output,state:i===2?'needs-review':'ready'})}));
const sources=[
 {source_artifact_id:'src_channels',source_type:'file',title:'Trusted channel registry',path:'config/youtube_channels.yaml',client_slug:'gbautomation',content_mode:'metadata',redaction_state:'metadata_only',ui:ui('Trusted channel registry','video',week,{freshness:'current',summary:'11 configured channels. High-priority sources appear first.',tags:['Channels','Allowlist']})},
 {source_artifact_id:'src_transcript',source_type:'transcript',title:'Agent workflows / transcript',path:'demo/transcript.md',client_slug:'gbautomation',content_mode:'summary',redaction_state:'redacted',ui:ui('Agent workflows / transcript','message',week,{freshness:'current',summary:'A sample source about small, verifiable agent workflows.',tags:['Transcript','Research']})},
 {source_artifact_id:'src_decision',source_type:'memory',title:'Keep sources with every claim',path:'demo/source-policy.md',client_slug:'gbautomation',content_mode:'summary',redaction_state:'metadata_only',ui:ui('Keep sources with every claim','brain','shared',{freshness:'current',summary:'Every report takeaway should point to its source material.',tags:['Decision','Citations']})},
 {source_artifact_id:'src_health',source_type:'receipt',title:'Connection review',path:'demo/health-receipt.json',client_slug:'gbautomation',content_mode:'summary',redaction_state:'metadata_only',ui:ui('Connection review','shield',health,{freshness:'stale',summary:'One demo connection needs verification before readiness can be claimed.',tags:['Health','Evidence']})}
];
const sessions=[
 {session_key:'hermes:youtube-intel:demo-weekly',session_id:'demo-weekly',profile,harness:'hermes',client_slug:'gbautomation',status:'active',title:'Build the weekly brief',kanban_task_id:'task_brief',trace_id:'trace_demo_weekly',ui:ui('Build the weekly brief','message',week,{when:'Today · 10:42 AM',tokens:4280})},
 {session_key:'hermes:youtube-intel:demo-health',session_id:'demo-health',profile,harness:'hermes',client_slug:'gbautomation',status:'error',title:'Inspect source health',kanban_task_id:'task_health',trace_id:'trace_demo_health',ui:ui('Inspect source health','shield',health,{when:'Today · 9:54 AM',tokens:1230})},
 {session_key:'hermes:youtube-intel:demo-archive',session_id:'demo-archive',profile,harness:'hermes',client_slug:'gbautomation',status:'archived',title:'Review last week’s findings',kanban_task_id:'task_collect',trace_id:'trace_demo_previous',ui:ui('Review last week’s findings','history',week,{when:'Yesterday · 4:18 PM',tokens:3100})}
];
sessions.forEach(s=>{s.ui.expert_key=expert;});
const runs=[
 {run_id:ids.report,skill_name:skills[1].skill_name,parent_run_id:ids.scan,trace_id:'trace_demo_weekly',status:'ok',elapsed_ms:12400,started_at:'2026-09-23T17:42:00Z',ended_at:'2026-09-23T17:42:12Z',ui:ui('Build weekly brief','file',week,{command:'just question',session_key:sessions[0].session_key,task_id:'task_brief',lines:[['stdout','Reading 5 indexed videos'],['stdout','3 reusable patterns found'],['stdout','Citations attached'],['stdout','Weekly brief ready'],['system','Exit 0']],exit:0})},
 {run_id:ids.scan,skill_name:skills[0].skill_name,parent_run_id:null,trace_id:'trace_demo_weekly',status:'ok',elapsed_ms:8300,started_at:'2026-09-23T17:40:00Z',ended_at:'2026-09-23T17:40:08Z',ui:ui('Scan trusted channels','video',week,{command:'just prime',session_key:sessions[0].session_key,task_id:'task_collect',lines:[['stdout','11 channels in scope'],['stdout','5 videos indexed'],['system','Exit 0']],exit:0})},
 {run_id:ids.health,skill_name:skills[3].skill_name,parent_run_id:null,trace_id:'trace_demo_health',status:'ok',elapsed_ms:4200,started_at:'2026-09-23T16:58:00Z',ended_at:'2026-09-23T16:58:04Z',ui:ui('Profile health check','shield',health,{command:'just health',session_key:sessions[1].session_key,task_id:'task_health',lines:[['stdout','Checking 8 profile requirements'],['stdout','5 verified, 2 need setup, 1 failed'],['system','Inspection completed · Exit 0']],exit:0})},
 {run_id:ids.failed,skill_name:skills[0].skill_name,parent_run_id:null,trace_id:'trace_demo_health',status:'error',elapsed_ms:1800,started_at:'2026-09-23T16:54:00Z',ended_at:'2026-09-23T16:54:02Z',ui:ui('Source connection check','video',health,{command:'just verify',session_key:sessions[1].session_key,task_id:'task_health',lines:[['stdout','Opening source connection'],['stderr','Sample error: source connection unavailable'],['system','Exit 1']],exit:1})}
];
const artifacts=[
 {artifact_id:'art_brief_v2',artifact_family_id:'family_brief',version_label:'v2',is_latest:true,lifecycle:'active',approval:'unreviewed',file_ext:'html',filename:'weekly-brief.html',artifact_kind:'report',source_artifact_id:'src_transcript',task_id:'task_brief',prd_id:week,run_id:ids.report,bytes:18400,ui:ui('Weekly intelligence brief','file',week,{subtitle:'3 patterns · 5 sources',summary:'Small loops. Clear evidence. Useful automation.',sections:['Verify every step','Keep sources close','Make failures visible']})},
 {artifact_id:'art_brief_v1',artifact_family_id:'family_brief',version_label:'v1',is_latest:false,lifecycle:'archived',approval:'gb_approved',file_ext:'html',filename:'weekly-brief-v1.html',artifact_kind:'report',source_artifact_id:'src_transcript',task_id:'task_brief',prd_id:week,run_id:ids.report,bytes:14100,ui:ui('Weekly intelligence brief','file',week,{subtitle:'2 patterns · 3 sources',summary:'A first pass through the week’s findings.',sections:['Verify every step','Keep sources close']})},
 {artifact_id:'art_channels',artifact_family_id:'family_channels',version_label:'v1',is_latest:true,lifecycle:'active',approval:'gb_approved',file_ext:'json',filename:'channel-index.json',artifact_kind:'dataset',source_artifact_id:'src_channels',task_id:'task_collect',prd_id:week,run_id:ids.scan,bytes:3200,ui:ui('Trusted channel index','video',week,{subtitle:'11 channels · 5 videos',summary:'A bounded source registry.',sections:['High priority','Medium priority','Low priority']})},
 {artifact_id:'art_health',artifact_family_id:'family_health',version_label:'v1',is_latest:true,lifecycle:'active',approval:'unreviewed',file_ext:'json',filename:'health-receipt.json',artifact_kind:'receipt',source_artifact_id:'src_health',task_id:'task_health',prd_id:health,run_id:ids.health,bytes:1800,ui:ui('Profile check receipt','shield',health,{subtitle:'5 passed · 3 need attention',summary:'Configuration present. Connection needs review.',sections:['Identity verified','Source unavailable','Review connection']})}
];
const tasks=[
 {task_id:'task_collect',title:'Collect source material',status:'done',ui:ui('Collect source material','video',week,{owner:profile,depends_on:[],due:'Today',progress:100})},
 {task_id:'task_brief',title:'Draft the weekly brief',status:'done',ui:ui('Draft the weekly brief','file',week,{owner:profile,depends_on:['task_collect'],due:'Today',progress:100})},
 {task_id:'task_review',title:'Review the finished brief',status:'blocked',ui:ui('Review the finished brief','eye',week,{owner:'Greg',depends_on:['task_brief'],intent_id:'intent_brief',due:'Tomorrow',progress:0})},
 {task_id:'task_health',title:'Verify source connection',status:'ready',ui:ui('Verify source connection','shield',health,{owner:profile,depends_on:[],due:'Today',progress:25})}
];
const proposals=[
 {proposal_id:'prop_weekly',tenant:'gbautomation',source_event_id:'evt_weekly',producer_run_id:'producer_demo',source_type:'youtube_transcript',workflow_route:'research',state:'gated',task_id:'task_review',card_title:'Publish the weekly brief',trace_id:'trace_demo_weekly',ui:ui('Publish the weekly brief','file',week,{impact:'1 report',intent_id:'intent_brief',why:'A cited brief is ready for your review.',before:'Internal draft',after:'Approved for review',field:'artifact.approval',artifact_id:'art_brief_v2'})},
 {proposal_id:'prop_cap',tenant:'gbautomation',source_event_id:'evt_cap',producer_run_id:'producer_demo',source_type:'second_brain_item',workflow_route:'planning',state:'gated',task_id:null,card_title:'Increase the scan cap',trace_id:'trace_demo_weekly',ui:ui('Increase the scan cap','settings',week,{impact:'1 setting',intent_id:'intent_cap',why:'Explore a broader weekly sample.',before:5,after:8,field:'max_videos_per_scan',config_id:'forgecfg_youtube_v1'})},
 {proposal_id:'prop_health',tenant:'gbautomation',source_event_id:'evt_health',producer_run_id:'producer_demo',source_type:'health_event',workflow_route:'hotfix',state:'blocked',task_id:'task_health',card_title:'Restore source verification',trace_id:'trace_demo_health',blocker_type:'connection',blocker_owner:'operator',blocker_next_safe_action:'Review connection evidence',ui:ui('Restore source verification','shield',health,{impact:'1 connection',why:'A source connection failed its last check.',before:'Unverified',after:'Verified'})}
];
const checks=['Identity','Purpose','Approval policy','Channel scope','Recipe bindings','Skill installation','Source connection','Live activation'].map((title,i)=>({check_id:'check_'+i,profile,run_id:ids.health,state:i<5?'passed':i===6?'failed':'pending',ui:ui(title,i===6?'link':'shield',health,{category:i<3?'Profile':i<6?'Bindings':'Runtime',target:i===5?'skills':i===6?'knowledge':'config',source_id:i===6?'src_health':null})}));
const configs=[{config_id:'forgecfg_youtube_v1',version:1,tenant:'gbautomation',owner_expert:'youtube-intel',fleet_profile:profile,skills:skills.map(s=>s.skill_name),ui:ui('YouTube Intelligence','settings','shared',{model:'gpt-5.6-sol',provider:'openai-codex',approval:'manual',scan_days:7,video_cap:5,max_turns:90,purpose:'Turn trusted YouTube sources into cited knowledge and useful reports.',tools:['Read sources','Build reports','Inspect recipes'],status:'source'})}];
const intents=[{intent_id:'intent_brief',state:'PENDING_APPROVAL',subject_slug:'weekly-brief',ui:ui('Review weekly brief','check',week,{proposal_id:'prop_weekly'})},{intent_id:'intent_cap',state:'PENDING_APPROVAL',subject_slug:'scan-cap',ui:ui('Change scan cap','settings',week,{proposal_id:'prop_cap'})}];
return {schema_version:'forge-window-projection.v1',demo:true,source_revision:window.FORGE_SOURCE.source_revision,
 experts:[{expert_key:expert,display_name:'YouTube Intelligence',source_path:'experts/gbautomation/youtube-intel',ui:ui('YouTube Intelligence','spark','shared',{profile,role:'Research & synthesis'})}],
 prds:[{prd_id:week,title:'Weekly intelligence',ui:ui('Weekly intelligence','file',week)},{prd_id:health,title:'Source health',ui:ui('Source health','shield',health)}],skills,sources,sessions,runs,artifacts,tasks,proposals,checks,configs,intents,
 routes:skills.map((s,i)=>({route_key:'route_demo_'+i,expert_key:expert,skill_name:s.skill_name,execution_policy:i===1?'proposal-only':'read-only',ui:ui(s.ui.title,s.ui.icon,'shared')})),
 messages:[{message_key:'msg_1',session_key:sessions[0].session_key,role:'user',content:'Show me the strongest patterns from this week.',ui:ui('Your request','message',week)},{message_key:'msg_2',session_key:sessions[0].session_key,role:'assistant',content:'Three patterns are ready, with sources attached. Open the brief to review them.',ui:ui('Expert response','spark',week,{artifact_id:'art_brief_v2',source_id:'src_transcript'})},{message_key:'msg_3',session_key:sessions[1].session_key,role:'assistant',content:'The sample connection check failed. Its run and evidence are linked below.',ui:ui('Connection result','shield',health,{run_id:ids.failed})}],
 runArtifacts:artifacts.map((a,i)=>({link_id:'link_'+i,artifact_id:a.artifact_id,skill_run_id:a.run_id,run_kind:'skill',relationship:'produced'})),
 storage:artifacts.map((a,i)=>({storage_object_id:'store_'+i,artifact_id:a.artifact_id,provider:'local',ui:ui(a.filename,'folder',a.prd_id,{location:'Demo / '+a.filename})})),
 sourceEvents:[{source_event_id:'evt_weekly',ui:ui('Transcript signal','message',week,{source_artifact_id:'src_transcript'})},{source_event_id:'evt_cap',ui:ui('Scope review','settings',week,{source_artifact_id:'src_channels'})},{source_event_id:'evt_health',ui:ui('Failed connection','shield',health,{source_artifact_id:'src_health'})}],
 producers:[{producer_run_id:'producer_demo',ui:ui('Proposal review batch','spark','shared')}],
 approvals:intents.map((r,i)=>({event_id:'event_'+i,intent_id:r.intent_id,event_type:'prepared',actor_kind:'automation',authorization_method:'none',ui:ui('Prepared for review','clock',r.ui.scope,{when:'Today · 10:45 AM'})})),
 commands:window.FORGE_SOURCE.recipes.map(r=>({...r,ui:ui(r.id==='health'?'Health check':r.id==='question'?'Ask expert':r.id==='prime'?'Load context':r.id.replaceAll('-',' '),'terminal','shared',{category:['health','check','test','verify','audit','drift','validate-playbook'].includes(r.id)?'Checks':r.parameters?'Input':'Recipes'})})),
 uiLinks:[{from:['configs','forgecfg_youtube_v1'],to:['experts',expert],label:'Owner expert',kind:'contract'},{from:['sessions',sessions[0].session_key],to:['sources','src_decision'],label:'Attached context',kind:'demo'}]
};
})();

window.FORGE_CONTRACTS = {
 keys:{experts:'expert_key',prds:'prd_id',skills:'skill_name',sources:'source_artifact_id',sessions:'session_key',runs:'run_id',artifacts:'artifact_id',tasks:'task_id',proposals:'proposal_id',checks:'check_id',configs:'config_id',intents:'intent_id',routes:'route_key',messages:'message_key',runArtifacts:'link_id',storage:'storage_object_id',sourceEvents:'source_event_id',producers:'producer_run_id',approvals:'event_id',commands:'id'},
 tables:{experts:'agent_experts',prds:'prd_artifacts',skills:'ops_skills_registry',sources:'source_artifacts',sessions:'agent_sessions',runs:'skill_runs',artifacts:'generated_artifacts',tasks:'kanban_task_proposals',proposals:'agent_os_proposals',checks:'UI check projection',configs:'agent-configuration.v1',intents:'gate_ledger_intents',routes:'agent_expert_routes',messages:'agent_session_messages',runArtifacts:'run_artifact_links',storage:'artifact_storage_objects',sourceEvents:'source_events',producers:'producer_runs',approvals:'approval_events',commands:'Justfile snapshot'},
 relations:[
 ['routes','expert_key','experts','fk','Expert route','expert'],['routes','skill_name','skills','fk','Bound skill','expert'],
 ['messages','session_key','sessions','fk','Conversation','session'],
 ['sessions','ui.expert_key','experts','demo','Runtime-profile association','projection'],
 ['runs','skill_name','skills','reference','Invoked skill','skill'],['runs','parent_run_id','runs','fk','Parent run','skill-v2'],
 ['runArtifacts','artifact_id','artifacts','fk','Produced artifact','lineage'],['runArtifacts','skill_run_id','runs','fk','Producing run','lineage'],
 ['storage','artifact_id','artifacts','fk','Stored artifact','artifact'],
 ['artifacts','source_artifact_id','sources','conditional-fk','Source evidence','artifact'],['artifacts','task_id','tasks','reference','Origin task','artifact'],['artifacts','prd_id','prds','conditional-fk','Workstream','artifact'],
 ['proposals','source_event_id','sourceEvents','fk','Source event','proposal'],['proposals','producer_run_id','producers','fk','Producer','proposal'],['proposals','task_id','tasks','fk','Related task','proposal'],
 ['approvals','intent_id','intents','fk','Gate intent','approval'],['sessions','kanban_task_id','tasks','reference','Session task','evidence'],
 ['checks','run_id','runs','demo','Check evidence','projection'],['checks','ui.source_id','sources','demo','Evidence source','projection'],
 ['runs','ui.session_key','sessions','demo','Correlated session','projection'],['runs','ui.task_id','tasks','demo','Related task','projection'],
 ['proposals','ui.intent_id','intents','demo','Review gate','projection'],['proposals','ui.artifact_id','artifacts','demo','Review artifact','projection'],['proposals','ui.config_id','configs','demo','Draft configuration','projection'],
 ['sourceEvents','ui.source_artifact_id','sources','demo','Origin source','projection'],['messages','ui.artifact_id','artifacts','demo','Attached artifact','projection'],['messages','ui.source_id','sources','demo','Attached source','projection'],['messages','ui.run_id','runs','demo','Run evidence','projection']
 ],
 sources:{
 expert:{path:'supabase/migrations/20260728120000_create_agent_expert_catalog_and_run_previews.sql',lines:'12-70'},
 session:{path:'supabase/migrations/20260624224000_create_agent_session_history.sql',lines:'22-55,114-149'},
 skill:{path:'supabase/migrations/20260517000001_create_skill_runs.sql',lines:'8-33'},
 'skill-v2':{path:'supabase/migrations/20260517000002_skill_runs_v2.sql',lines:'8-12'},
 lineage:{path:'supabase/migrations/20260814223000_run_artifact_receipt_lineage.sql',lines:'7-23'},
 artifact:{path:'supabase/migrations/20260812130000_adr21_create_artifact_spine.sql',lines:'55-153,232-255'},
 proposal:{path:'supabase/migrations/20260809_agent_os_v2_4_contracts.sql',lines:'189-247'},
 approval:{path:'supabase/migrations/20260813010000_adr14_approval_event_spine.sql',lines:'43-85,124-186'},
 evidence:{path:'second-brain/systems/agent-os-supabase-evidence-map.md',lines:'3: existing keys and soft lineage'},
 config:{path:'services/gbauto_agent_os/src/gbauto_agent_os/schemas/agent-configuration.v1.schema.json',lines:'1-110'},
 projection:{path:'artifacts/forge-connected-windows-2026-09-23/CONTRACT.md',lines:'UI-only associations; not database foreign keys'}
 }
};
