export const opsData = {
  mirror: {
    name: 'Mac Mini Ops Mirror',
    host: 'Gregs-Mac-mini.local',
    role: 'Always-on agent host',
    status: 'Mac Mini mirror',
    syncPath: 'Hermes Kanban DB on Mac Mini -> sanitized website JSON -> ops dashboard',
    lastSync: 'Generated from Hermes Kanban export',
    policy:
      'This portal shows curated operational state only. It does not expose SSH, env files, raw logs, or direct command execution.',
  },
  metrics: [
    { label: 'Agents', value: '3', detail: 'Gelby, Jason VA, planned Sebastian' },
    { label: 'Cron checks', value: '14+', detail: 'Inbox, risk, briefs, memory, Linear, Hermes' },
    { label: 'Open blockers', value: 'Live', detail: 'Hermes Kanban mirror now supplies the website board' },
    { label: 'Trace health', value: 'Partial', detail: 'Langfuse works; team spans need richer child events' },
  ],
  systems: [
    {
      name: 'Hermes gateway',
      state: 'online',
      owner: 'Gelby',
      host: 'Mac Mini',
      detail: 'Telegram-facing agent runtime with Langfuse instrumentation and health jobs.',
      checks: ['launchd loaded', 'Langfuse auth passes', 'Telegram DM active'],
    },
    {
      name: 'OpenClaw runtime',
      state: 'online',
      owner: 'Gelby',
      host: 'Mac Mini',
      detail: 'Long-running workspace for client and operator automation.',
      checks: ['workspace mounted', 'cron jobs active', 'client repos present'],
    },
    {
      name: 'Langfuse observability',
      state: 'degraded',
      owner: 'Codex/Gelby',
      host: 'Cloud',
      detail: 'Recent traces exist, but agent-team token and tool-call details are still shallow.',
      checks: ['auth_check passes', 'diag probe visible', 'child spans missing'],
    },
    {
      name: 'Supabase ops mirror',
      state: 'active',
      owner: 'Codex',
      host: 'Supabase',
      detail: 'Static JSON mirror is live; Supabase remains the next durable multi-writer layer.',
      checks: ['schema plans drafted', 'read-only website contract', 'Mac Mini Kanban export added'],
    },
  ],
  agentRuns: [
    {
      id: 'tac-team-runner-verifier',
      agent: 'codex-verifier-agent',
      status: 'passed',
      started: '2026-05-11 22:37 UTC',
      duration: '8.2s',
      output: 'PR #42 verifier evidence, Supabase read-back, Langfuse trace',
      trace: 'ed2b667f9038f428afa80d312e5acaba',
    },
    {
      id: 'hermes-memory-curation',
      agent: 'Gelby',
      status: 'scheduled',
      started: 'daily',
      duration: 'n/a',
      output: 'Stable memory facts, transport rules, blockers, safety policies',
      trace: 'pending mirror',
    },
    {
      id: 'linear-cron',
      agent: 'Forge route',
      status: 'active',
      started: 'every 15m',
      duration: 'variable',
      output: 'Linear task checks and TAC build routing',
      trace: 'resources/lib/tracing.py',
    },
  ],
  kanbanColumns: [
    {
      title: 'Detect',
      description: 'Watchers that decide whether work exists.',
      tasks: [
        {
          title: 'Hermes health check',
          agent: 'Gelby',
          status: 'running',
          detail: 'Launchd health job checks gateway state without reading secrets.',
        },
        {
          title: 'Langfuse trace review',
          agent: 'Codex',
          status: 'needs instrumentation',
          detail: 'Report exists; next step is child spans for agents, tools, and phases.',
        },
      ],
    },
    {
      title: 'Fetch',
      description: 'Pull context into durable stores.',
      tasks: [
        {
          title: 'Client registry projection',
          agent: 'planned',
          status: 'planned',
          detail: 'Sync client profile metadata into Supabase without moving the source of truth.',
        },
        {
          title: 'Mac Mini service snapshot',
          agent: 'planned',
          status: 'planned',
          detail: 'Write sanitized service status rows for website dashboards.',
        },
      ],
    },
    {
      title: 'Process',
      description: 'Transform raw state into operator decisions.',
      tasks: [
        {
          title: 'TAC run receipts',
          agent: 'Codex verifier',
          status: 'active',
          detail: 'Receipts upsert into Supabase and archive into the second brain.',
        },
        {
          title: 'Archive candidates',
          agent: 'planned',
          status: 'planned',
          detail: 'Inventory high-volume Supabase tables before S3 archive runs.',
        },
      ],
    },
    {
      title: 'Report',
      description: 'Human-facing summaries and approvals.',
      tasks: [
        {
          title: 'Ops dashboard',
          agent: 'Website',
          status: 'this build',
          detail: 'Authenticated route for systems, runs, data, and Hermes Kanban.',
        },
        {
          title: 'Morning improvement plan',
          agent: 'planned',
          status: 'planned',
          detail: 'Convert trace review into an inbox plan Greg can approve.',
        },
      ],
    },
  ],
  dataStores: [
    {
      name: 'tac_build_runs',
      type: 'Supabase table',
      state: 'active',
      detail: 'Stores TAC dry-run and verifier receipts for auditable build routing.',
    },
    {
      name: 'archive_objects',
      type: 'Supabase table',
      state: 'planned',
      detail: 'Index of S3 archive objects, manifests, checksums, and restore status.',
    },
    {
      name: 'hermes_kanban_tasks',
      type: 'Supabase table',
      state: 'planned',
      detail: 'Canonical queue for unattended work across detect, fetch, process, report, and promote stages.',
    },
    {
      name: 'ops_service_snapshots',
      type: 'Supabase table',
      state: 'planned',
      detail: 'Sanitized Mac Mini service state for the website, without shell access or raw logs.',
    },
  ],
  actionQueue: [
    {
      action: 'Create Supabase mirror schemas',
      risk: 'low',
      status: 'planned',
      gate: 'Migration reviewed; no service-role keys in frontend',
    },
    {
      action: 'Publish Mac Mini snapshot writer',
      risk: 'medium',
      status: 'planned',
      gate: 'Writer redacts paths, tokens, env vars, and raw logs',
    },
    {
      action: 'Enable website live reads',
      risk: 'medium',
      status: 'planned',
      gate: 'Cognito route auth plus Supabase RLS/policy review',
    },
  ],
};
