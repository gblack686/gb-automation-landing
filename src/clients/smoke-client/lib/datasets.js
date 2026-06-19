/**
 * Smoke-client tenant dataset registry.
 *
 * This array IS the security allowlist for the data explorer: only views listed
 * here are ever fetched by the browser. Every view is anon-readable and already
 * tenant-scoped SERVER-SIDE (no client-side tenant filter is — or should be —
 * relied on for isolation). The browser only ever issues read-only anon REST
 * GETs against these curated views; no raw SQL and no arbitrary filters.
 *
 * Each entry:
 *   - view        (string) Postgres view name (the only thing sent to the API).
 *   - label       (string) Human label for the dataset picker.
 *   - description (string) One-line explainer rendered above the table.
 *   - select      (string) Explicit, allow-listed column list (no `*`).
 *   - defaultSort { col, dir } Initial server-side order.
 *   - group       (string) Themed page this dataset belongs to (see GROUPS).
 *
 * Structured as plain data so more datasets — or whole other tenants — can be
 * added later without touching the explorer components.
 */
export const SMOKE_CLIENT_DATASETS = [
  // --- core scheduler / board / scrape lanes (have bespoke pages too) ---
  {
    view: 'obs_smoke_schedules',
    label: 'Schedules',
    description: 'Registered cron lanes for this tenant — host, profile, cadence, and last green time.',
    select:
      'name,cron_id,host,profile,schedule,mode,script_or_skill,bucket,state,last_green_at,manifest_synced_at,tenant,updated_at',
    defaultSort: { col: 'name', dir: 'asc' },
    group: 'core',
  },
  {
    view: 'obs_smoke_runs',
    label: 'Runs',
    description: 'Per-tick scheduler outcomes with pick/ok/fail counts, elapsed time, and cost.',
    select:
      'tick_id,cron_name,started_at,ended_at,elapsed_ms,picked_count,ok_count,fail_count,skipped_count,total_cost_usd,host',
    defaultSort: { col: 'started_at', dir: 'desc' },
    group: 'core',
  },
  {
    view: 'obs_smoke_run_outputs',
    label: 'Run Outputs',
    description: 'Individual agent outputs per run tick — status, branch, PR, cost, and turn counts.',
    select: 'output_id,tick_id,issue_id,status,branch,pr_url,cost_usd,turns,duration_s,agent_summary',
    defaultSort: { col: 'output_id', dir: 'desc' },
    group: 'core',
  },
  {
    view: 'obs_smoke_board',
    label: 'Board',
    description: 'Latest-per-task board cards grouped by their current status and step.',
    select:
      'run_id,task_id,client_slug,board_slug,profile,assignee,title,status,started_at,ended_at,created_at,updated_at,step_key',
    defaultSort: { col: 'updated_at', dir: 'desc' },
    group: 'core',
  },
  {
    view: 'obs_smoke_scrape_receipts',
    label: 'Scrape Receipts',
    description: 'Per-run browser-scrape receipts — route/site/production greenline, counts, duration, and cost.',
    select:
      'run_id,job_id,domain_module,target_url,registrable_domain,route_type,status,status_family,greenline_status,route_green,full_site_green,production_green,write_mode,target_count,visited_count,extracted_count,blocked_count,captcha_count,started_at,ended_at,duration_ms,cost_usd,token_count,failure_reason,created_at',
    defaultSort: { col: 'created_at', dir: 'desc' },
    group: 'core',
  },
  {
    view: 'obs_smoke_scrape_health',
    label: 'Scrape Health',
    description: 'Browser-scrape health rollup per domain module — run/ok/fail/greenline counts and latest run.',
    select:
      'client_slug,domain_module,run_count,ok_count,failed_count,greenline_pass_count,production_green_count,latest_run_at',
    defaultSort: { col: 'latest_run_at', dir: 'desc' },
    group: 'core',
  },

  // --- catalog: PRD spine + taxonomy + sprint links + dossiers ---
  {
    view: 'obs_smoke_prds',
    label: 'PRDs',
    description: 'Indexed PRD spine for this tenant — TAC status/level/pathway, schema contract, and index state.',
    select:
      'prd_id,title,slug,client,status,priority,kind,prd_type,tac_status,tac_level,tac_pathway,hermes_profiles,components,tags,path,word_count,section_count,schema_contract_ok,index_status,indexed_at,updated_at',
    defaultSort: { col: 'indexed_at', dir: 'desc' },
    group: 'catalog',
  },
  {
    view: 'obs_smoke_taxonomy',
    label: 'Taxonomy',
    description: 'Domain/service/client-tier tags derived per PRD, with sprint association and retag lineage.',
    select: 'prd_id,title,client,priority,domain,service,client_tier,sprint_id,retagged_from,indexed_at',
    defaultSort: { col: 'indexed_at', dir: 'desc' },
    group: 'catalog',
  },
  {
    view: 'obs_smoke_sprint_links',
    label: 'Sprint Links',
    description: 'Rock ↔ PRD sprint associations — relationship, owner profile, ranking, and carry-in source.',
    select:
      'link_id,sprint_id,rock_id,prd_id,relationship,status,owner_profile,promoted_mid_sprint,old_rank,new_rank,carried_in_from,created_at,updated_at',
    defaultSort: { col: 'created_at', dir: 'desc' },
    group: 'catalog',
  },
  {
    view: 'obs_smoke_dossiers',
    label: 'Dossiers',
    description: 'Per-PRD execution dossier rollup — stage span, total cost, trace count, and card count.',
    select: 'prd_id,title,client,first_stage_ts,last_stage_ts,total_cost,trace_count,card_count',
    defaultSort: { col: 'last_stage_ts', dir: 'desc' },
    group: 'catalog',
  },

  // --- jobs & builds: skill runs, host jobs, render gates, build runs ---
  {
    view: 'obs_smoke_skill_runs',
    label: 'Skill Runs',
    description: 'Individual skill invocations — category, status, elapsed time, invoker, and trace linkage.',
    select:
      'run_id,skill_name,status,skill_category,started_at,ended_at,elapsed_ms,invoked_by,auto_registered,error_message,parent_run_id,trace_id',
    defaultSort: { col: 'started_at', dir: 'desc' },
    group: 'jobs',
  },
  {
    view: 'obs_smoke_skill_metrics_daily',
    label: 'Skill Metrics',
    description: 'Daily per-skill rollup — run/ok/error counts with p50 and p95 latency.',
    select: 'day,skill_name,skill_category,run_count,ok_count,error_count,p50_ms,p95_ms',
    defaultSort: { col: 'day', dir: 'desc' },
    group: 'jobs',
  },
  {
    view: 'obs_smoke_host_jobs',
    label: 'Host Jobs',
    description: 'Host-level scheduled job receipts — task, host class, exit code, duration, and timing.',
    select: 'run_id,task_name,host,host_class,status,exit_code,duration_seconds,started_at,ended_at,created_at',
    defaultSort: { col: 'created_at', dir: 'desc' },
    group: 'jobs',
  },
  {
    view: 'obs_smoke_render_gates',
    label: 'Render Gates',
    description: 'Portal render-gate checks per view — rows rendered, freshness, and anon-clean verdict.',
    select:
      'run_id,created_at,host,status,command_label,gate_name,view_name,page_path,rows_rendered,view_count,fresh_within_1h,anon_clean',
    defaultSort: { col: 'created_at', dir: 'desc' },
    group: 'jobs',
  },
  {
    view: 'obs_smoke_build_runs',
    label: 'Build Runs',
    description: 'TAC build-run receipts per PRD — pathway, status, and total cost.',
    select: 'run_id,prd_id,status,pathway,total_cost_usd,created_at',
    defaultSort: { col: 'created_at', dir: 'desc' },
    group: 'jobs',
  },

  // --- traces & cost: Langfuse trace spine + daily cost rollup ---
  {
    view: 'obs_smoke_traces',
    label: 'Traces',
    description: 'Per-trace Langfuse spine — runtime/agent/profile, latency, tokens, cost, and observation count.',
    select:
      'trace_id,trace_name,trace_timestamp,tags,runtime,agent,profile,latency_sec,total_cost,input_tokens,output_tokens,total_tokens,observation_count,langfuse_url,last_synced_at',
    defaultSort: { col: 'trace_timestamp', dir: 'desc' },
    group: 'traces',
  },
  {
    view: 'obs_smoke_trace_cost_daily',
    label: 'Trace Cost',
    description: 'Daily trace cost rollup — trace count, summed cost/tokens, average latency, distinct agents.',
    select: 'day,trace_count,sum_cost,sum_tokens,avg_latency_sec,distinct_agents',
    defaultSort: { col: 'day', dir: 'desc' },
    group: 'traces',
  },

  // --- lineage: PRD lifecycle presence + dispatch + self-improve queue ---
  {
    view: 'obs_smoke_lineage',
    label: 'Lineage',
    description: 'Per-PRD lifecycle presence map — intake, dispatch, board, build, trace, and report stages.',
    select:
      'prd_id,title,client,intake_present,intake_ts,dispatch_present,dispatch_ts,board_present,board_ts,build_present,build_ts,trace_present,trace_ts,report_present,report_ts',
    defaultSort: { col: 'intake_ts', dir: 'desc' },
    group: 'lineage',
  },
  {
    view: 'obs_smoke_dispatch_links',
    label: 'Dispatch Links',
    description: 'PRD → task dispatch edges — team, profile, relationship, status, and dispatch source.',
    select:
      'prd_id,task_id,parent_task_id,run_id,team_id,profile,relationship,status,dispatch_source,created_at,updated_at',
    defaultSort: { col: 'created_at', dir: 'desc' },
    group: 'lineage',
  },
  {
    view: 'obs_smoke_self_improve',
    label: 'Self-Improve',
    description: 'Self-improvement tasks proposed off PRD execution — kind, status, and origin client.',
    select: 'task_id,title,status,kind,client_slug,created_at',
    defaultSort: { col: 'created_at', dir: 'desc' },
    group: 'lineage',
  },

  // --- visual: browser capture receipts ---
  {
    view: 'obs_smoke_browser_runs',
    label: 'Browser Runs',
    description: 'Browser-harness capture receipts — skill, target URL, screenshot path, status, and timing.',
    select:
      'run_id,skill,status,url,tenant,target_url,screenshot_path,langfuse_trace_id,error_message,started_at,ended_at',
    defaultSort: { col: 'started_at', dir: 'desc' },
    group: 'visual',
  },
];

/**
 * Themed page groups. Each grouped portal page renders the datasets whose
 * `group` matches its key via the shared <GroupExplorer>. `core` datasets also
 * have bespoke pages (Schedules / Runs / Board) and remain in the full explorer.
 */
export const GROUPS = {
  core: 'core',
  catalog: 'catalog',
  jobs: 'jobs',
  traces: 'traces',
  lineage: 'lineage',
  visual: 'visual',
};

/** All datasets belonging to a themed group, in registry order. */
export function datasetsByGroup(group) {
  return SMOKE_CLIENT_DATASETS.filter((d) => d.group === group);
}

/** Lookup a registry entry by view name (null if not allow-listed). */
export function findDataset(view) {
  return SMOKE_CLIENT_DATASETS.find((d) => d.view === view) || null;
}
