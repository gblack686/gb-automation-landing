const SAFE_RUN_SELECT = [
  'run_id',
  'source_table',
  'task_id',
  'client_slug',
  'repo_slug',
  'board_slug',
  'profile',
  'assignee',
  'title',
  'status',
  'started_at',
  'ended_at',
  'created_at',
  'source_updated_at',
].join(',');

const SAFE_TRACE_SELECT = [
  'trace_id',
  'trace_name',
  'trace_timestamp',
  'tags',
  'runtime',
  'agent',
  'profile',
  'latency_sec',
  'total_cost',
  'total_tokens',
  'observation_count',
  'langfuse_url',
].join(',');

export const controlPlaneViews = {
  runs: 'integration_agent_run_receipts_v1',
  traces: 'integration_langfuse_trace_receipts_v1',
};

export const controlPlaneFixture = {
  source: 'mocked-safe-receipts',
  generatedAt: '2026-06-11T14:45:00.000Z',
  runReceipts: [
    {
      run_id: 'hermes-kanban-run:15280',
      task_id: 't_bdb257fe',
      title: 'PORTAL: control-plane dashboard against safe views',
      status: 'running',
      assignee: 'coder',
      profile: 'coder',
      started_at: '2026-06-11T14:42:33.000Z',
      ended_at: null,
      created_at: '2026-06-11T14:42:33.000Z',
      source_updated_at: '2026-06-11T14:42:37.000Z',
    },
    {
      run_id: 'hermes-kanban-task:t_ee9bd5a1',
      task_id: 't_ee9bd5a1',
      title: 'INTEGRATION EXPERT: observability and control-plane contracts',
      status: 'done',
      assignee: 'dbforge',
      profile: 'dbforge',
      started_at: '2026-06-11T14:16:34.000Z',
      ended_at: '2026-06-11T14:32:17.000Z',
      created_at: '2026-06-11T14:16:34.000Z',
      source_updated_at: '2026-06-11T14:32:17.000Z',
    },
  ],
  traceReceipts: [
    {
      trace_id: 'trace-linear-cron-local',
      trace_name: 'linear-cron:local',
      trace_timestamp: '2026-06-11T14:30:00.000Z',
      runtime: 'local',
      agent: 'linear-cron',
      profile: 'coder',
      latency_sec: 8.2,
      total_cost: 0.01,
      total_tokens: 18750,
      observation_count: 6,
      langfuse_url: 'https://us.cloud.langfuse.com/project/gbauto/traces/trace-linear-cron-local',
    },
  ],
};

function getBrowserEnv() {
  if (typeof import.meta === 'undefined' || !import.meta.env) return {};
  return import.meta.env;
}

function buildSupabaseUrl(baseUrl, viewName, params) {
  const url = new URL(`/rest/v1/${viewName}`, baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url;
}

async function fetchSafeView({ baseUrl, anonKey, viewName, select, query }) {
  const url = buildSupabaseUrl(baseUrl, viewName, {
    select,
    limit: query.limit || 50,
    order: query.order,
    client_slug: query.clientSlug ? `eq.${query.clientSlug}` : undefined,
  });

  const response = await fetch(url.toString(), {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`${viewName} responded ${response.status}`);
  }

  return response.json();
}

export async function fetchControlPlaneReceipts(options = {}) {
  const env = getBrowserEnv();
  const baseUrl = options.supabaseUrl || env.VITE_SUPABASE_URL;
  const anonKey = options.supabaseAnonKey || env.VITE_SUPABASE_ANON_KEY;
  const clientSlug = options.clientSlug || 'gbautomation';
  const limit = options.limit || 50;

  if (!baseUrl || !anonKey) {
    return {
      ...controlPlaneFixture,
      clientSlug,
      status: 'fixture',
      note: 'Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to read the safe receipt views.',
    };
  }

  const [runReceipts, traceReceipts] = await Promise.all([
    fetchSafeView({
      baseUrl,
      anonKey,
      viewName: controlPlaneViews.runs,
      select: SAFE_RUN_SELECT,
      query: { clientSlug, limit, order: 'created_at.desc.nullslast' },
    }),
    fetchSafeView({
      baseUrl,
      anonKey,
      viewName: controlPlaneViews.traces,
      select: SAFE_TRACE_SELECT,
      query: { limit, order: 'trace_timestamp.desc.nullslast' },
    }),
  ]);

  return {
    source: 'supabase-safe-receipt-views',
    status: 'live',
    clientSlug,
    generatedAt: new Date().toISOString(),
    runReceipts,
    traceReceipts,
  };
}

export function joinRunsWithTraceReceipts(runReceipts = [], traceReceipts = []) {
  return runReceipts.map((run) => {
    const matchingTrace = traceReceipts.find((trace) => {
      if (!trace) return false;
      if (run.profile && trace.profile === run.profile) return true;
      if (run.assignee && trace.agent === run.assignee) return true;
      return false;
    });

    return {
      ...run,
      langfuse_url: run.langfuse_url || matchingTrace?.langfuse_url || null,
      trace_id: matchingTrace?.trace_id || null,
      trace_name: matchingTrace?.trace_name || null,
    };
  });
}
