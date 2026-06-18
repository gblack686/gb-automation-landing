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
 *
 * Structured as plain data so more datasets — or whole other tenants — can be
 * added later without touching the explorer components.
 */
export const SMOKE_CLIENT_DATASETS = [
  {
    view: 'obs_smoke_schedules',
    label: 'Schedules',
    description: 'Registered cron lanes for this tenant — host, profile, cadence, and last green time.',
    select:
      'name,cron_id,host,profile,schedule,mode,script_or_skill,bucket,state,last_green_at,manifest_synced_at,tenant,updated_at',
    defaultSort: { col: 'name', dir: 'asc' },
  },
  {
    view: 'obs_smoke_runs',
    label: 'Runs',
    description: 'Per-tick scheduler outcomes with pick/ok/fail counts, elapsed time, and cost.',
    select:
      'tick_id,cron_name,started_at,ended_at,elapsed_ms,picked_count,ok_count,fail_count,skipped_count,total_cost_usd,host',
    defaultSort: { col: 'started_at', dir: 'desc' },
  },
  {
    view: 'obs_smoke_run_outputs',
    label: 'Run Outputs',
    description: 'Individual agent outputs per run tick — status, branch, PR, cost, and turn counts.',
    select: 'output_id,tick_id,issue_id,status,branch,pr_url,cost_usd,turns,duration_s,agent_summary',
    defaultSort: { col: 'output_id', dir: 'desc' },
  },
  {
    view: 'obs_smoke_board',
    label: 'Board',
    description: 'Latest-per-task board cards grouped by their current status and step.',
    select:
      'run_id,task_id,client_slug,board_slug,profile,assignee,title,status,started_at,ended_at,created_at,updated_at,step_key',
    defaultSort: { col: 'updated_at', dir: 'desc' },
  },
];

/** Lookup a registry entry by view name (null if not allow-listed). */
export function findDataset(view) {
  return SMOKE_CLIENT_DATASETS.find((d) => d.view === view) || null;
}
