import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const DEFAULT_HOST = 'https://us.cloud.langfuse.com';
const SECRET_ID = process.env.LANGFUSE_SECRET_ID || 'gbautomation/infrastructure/langfuse';

type JsonRecord = Record<string, any>;

const fallbackTraces = [
  {
    trace_id: 'ecom-report-window',
    name: 'ecom weekly telemetry window',
    harness: 'codex',
    agent_profile: 'ecom',
    repo: 'ecom',
    slug: 'ecom',
    branch: 'smoke/agent-team-config',
    model: 'gpt-5.5',
    input_tokens: 5439578,
    output_tokens: 385121,
    cache_read_input_tokens: 100388864,
    total_cost: 0.0005,
    started_at: '2026-06-02T21:06:14Z',
    latency_ms: null,
    langfuse_url: DEFAULT_HOST,
    source: 'static-report',
  },
  {
    trace_id: 'hermes-profile-gap',
    name: 'hermes profile trace tagging gap',
    harness: 'hermes',
    agent_profile: 'main',
    repo: 'gbautomation',
    slug: 'ecom',
    branch: 'unknown',
    model: 'unknown',
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    total_cost: 0,
    started_at: '2026-06-01T00:00:00Z',
    latency_ms: null,
    langfuse_url: DEFAULT_HOST,
    source: 'instrumentation-gap',
  },
  {
    trace_id: 'claude-subagent-gap',
    name: 'claude-code subagent unknown model',
    harness: 'claude-code',
    agent_profile: 'subagent',
    repo: 'gbautomation',
    slug: 'ecom',
    branch: 'codex/artifact-drive-backfill',
    model: 'unknown',
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    total_cost: 0,
    started_at: '2026-06-02T00:00:00Z',
    latency_ms: null,
    langfuse_url: DEFAULT_HOST,
    source: 'instrumentation-gap',
  },
];

const fallbackObservations = [
  {
    id: 'obs-codex-chain',
    traceId: 'ecom-report-window',
    parentObservationId: null,
    type: 'CHAIN',
    name: 'codex:ecom:weekly-report',
    startTime: '2026-06-02T21:06:14Z',
    model: 'gpt-5.5',
    inputUsage: 0,
    outputUsage: 0,
    metadata: { harness: 'codex', repo: 'ecom', slug: 'ecom', branch: 'smoke/agent-team-config' },
  },
  {
    id: 'obs-codex-tool',
    traceId: 'ecom-report-window',
    parentObservationId: 'obs-codex-chain',
    type: 'TOOL',
    name: 'Tool: terminal',
    startTime: '2026-06-02T21:06:18Z',
    model: 'gpt-5.5',
    inputUsage: 0,
    outputUsage: 0,
    input: { command: 'run_ecom_report.sh' },
    metadata: { harness: 'codex', tool: 'terminal' },
  },
  {
    id: 'obs-codex-generation',
    traceId: 'ecom-report-window',
    parentObservationId: 'obs-codex-tool',
    type: 'GENERATION',
    name: 'gpt-5.5 generation',
    startTime: '2026-06-02T21:06:22Z',
    model: 'gpt-5.5',
    inputUsage: 5439578,
    outputUsage: 385121,
    usageDetails: { cache_read_input_tokens: 100388864 },
    metadata: { harness: 'codex' },
  },
  {
    id: 'obs-hermes-chain',
    traceId: 'hermes-profile-gap',
    parentObservationId: null,
    type: 'CHAIN',
    name: 'Hermes turn end',
    startTime: '2026-06-01T00:00:00Z',
    model: null,
    inputUsage: 0,
    outputUsage: 0,
    metadata: { harness: 'hermes', profile: 'main' },
  },
  {
    id: 'obs-hermes-tool',
    traceId: 'hermes-profile-gap',
    parentObservationId: 'obs-hermes-chain',
    type: 'SPAN',
    name: 'tool_call:cron',
    startTime: '2026-06-01T00:00:06Z',
    model: null,
    inputUsage: 0,
    outputUsage: 0,
    metadata: { harness: 'hermes', tool: 'cron' },
  },
  {
    id: 'obs-claude-generation',
    traceId: 'claude-subagent-gap',
    parentObservationId: null,
    type: 'GENERATION',
    name: 'claude-code subagent generation',
    startTime: '2026-06-02T00:00:00Z',
    model: null,
    inputUsage: 0,
    outputUsage: 0,
    metadata: { harness: 'claude-code', profile: 'subagent' },
  },
];

function parseJsonMaybe(value: any): JsonRecord {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function collectText(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function usageNumber(...values: any[]) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
}

function normalizeTags(trace: JsonRecord) {
  const tags = Array.isArray(trace.tags) ? trace.tags : [];
  const metadata = parseJsonMaybe(trace.metadata);
  const haystack = [
    trace.name,
    tags.join(' '),
    collectText(metadata),
    collectText(trace.input).slice(0, 2000),
    collectText(trace.output).slice(0, 2000),
  ].join(' ').toLowerCase();
  const findTag = (prefix: string) => tags.find((tag: any) => String(tag).startsWith(prefix))?.slice(prefix.length);
  const harness = findTag('harness:')
    || metadata.harness
    || (haystack.includes('hermes') ? 'hermes' : '')
    || (haystack.includes('claude-code') || haystack.includes('claude code') ? 'claude-code' : '')
    || (haystack.includes('codex') ? 'codex' : 'other');

  return {
    tags,
    metadata,
    harness,
    agentProfile: findTag('profile:') || metadata.agent_profile || metadata.profile || 'unknown',
    repo: findTag('repo:') || metadata.repo || metadata['cc.repo'] || 'unknown',
    slug: findTag('slug:') || metadata.slug || metadata.client || 'unknown',
    branch: findTag('branch:') || metadata.branch || metadata['cc.branch'] || 'unknown',
  };
}

function normalizeTrace(trace: JsonRecord, host: string) {
  const tags = normalizeTags(trace);
  const metadata = tags.metadata || {};
  const usage = parseJsonMaybe(trace.usageDetails || trace.usage_details || metadata.usageDetails);
  const id = trace.id || trace.traceId || trace.trace_id || trace.name || randomUUID();
  return {
    trace_id: id,
    name: trace.name || 'unnamed trace',
    harness: tags.harness,
    agent_profile: tags.agentProfile,
    repo: tags.repo,
    slug: tags.slug,
    branch: tags.branch,
    model: trace.model || metadata.model || metadata['llm.request.model'] || metadata['langfuse.observation.model.name'] || 'unknown',
    input_tokens: usageNumber(trace.inputUsage, trace.input_usage, usage.input, usage.input_tokens, usage.prompt_tokens, metadata.input_tokens),
    output_tokens: usageNumber(trace.outputUsage, trace.output_usage, usage.output, usage.output_tokens, usage.completion_tokens, metadata.output_tokens),
    cache_read_input_tokens: usageNumber(usage.cache_read_input_tokens, usage.cache_read, metadata.cache_read_input_tokens),
    total_cost: usageNumber(trace.totalCost, trace.total_cost, trace.cost, metadata.totalCost),
    started_at: trace.timestamp || trace.createdAt || trace.startedAt || trace.startTime || null,
    latency_ms: trace.latency || trace.latencyMs || null,
    langfuse_url: `${host.replace(/\/$/, '')}/trace/${encodeURIComponent(id)}`,
    source: 'langfuse',
  };
}

function observationUsage(observation: JsonRecord) {
  const metadata = parseJsonMaybe(observation.metadata);
  const usage = parseJsonMaybe(observation.usageDetails || observation.usage_details || metadata.usageDetails);
  return {
    input_tokens: usageNumber(observation.inputUsage, observation.input_usage, observation.promptTokens, usage.input, usage.input_tokens, usage.prompt_tokens, metadata.input_tokens),
    output_tokens: usageNumber(observation.outputUsage, observation.output_usage, observation.completionTokens, usage.output, usage.output_tokens, usage.completion_tokens, metadata.output_tokens),
    cache_read_input_tokens: usageNumber(usage.cache_read_input_tokens, usage.cache_read, metadata.cache_read_input_tokens),
  };
}

function normalizeObservation(observation: JsonRecord, traceLookup: Map<string, JsonRecord>) {
  const metadata = parseJsonMaybe(observation.metadata);
  const attrs = metadata.attributes || {};
  const traceId = observation.traceId || observation.trace_id || observation.trace?.id || 'unknown-trace';
  const trace = traceLookup.get(traceId) || {};
  const inferred = normalizeTags({
    name: observation.name || trace.name,
    tags: trace.tags || [],
    metadata: {
      ...trace.metadata,
      ...metadata,
      harness: metadata.harness || attrs.harness || trace.harness,
      repo: metadata.repo || attrs.repo || trace.repo,
      slug: metadata.slug || attrs.slug || trace.slug,
      branch: metadata.branch || attrs.branch || trace.branch,
    },
    input: observation.input,
    output: observation.output,
  });
  const usage = observationUsage(observation);
  return {
    observation_id: observation.id || observation.observationId || randomUUID(),
    trace_id: traceId,
    parent_observation_id: observation.parentObservationId || observation.parent_observation_id || null,
    type: String(observation.type || 'UNKNOWN').toUpperCase(),
    name: observation.name || 'unnamed observation',
    harness: inferred.harness || trace.harness || 'other',
    agent_profile: inferred.agentProfile || trace.agent_profile || 'unknown',
    repo: inferred.repo || trace.repo || 'unknown',
    slug: inferred.slug || trace.slug || 'unknown',
    branch: inferred.branch || trace.branch || 'unknown',
    model: observation.model || metadata.model || attrs['llm.request.model'] || trace.model || 'unknown',
    started_at: observation.startTime || observation.start_time || observation.createdAt || null,
    latency_ms: observation.latency || observation.latencyMs || null,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_input_tokens: usage.cache_read_input_tokens,
    input_preview: collectText(observation.input).slice(0, 240),
    output_preview: collectText(observation.output).slice(0, 240),
  };
}

function summarizeTraceTrees(traces: JsonRecord[], observations: JsonRecord[]) {
  const byTrace = new Map();
  for (const trace of traces) {
    byTrace.set(trace.trace_id, {
      trace_id: trace.trace_id,
      observation_count: 0,
      chain_count: 0,
      span_count: 0,
      tool_count: 0,
      generation_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 0,
      missing_model_count: 0,
      has_tool_tree: false,
    });
  }
  for (const observation of observations) {
    const stats = byTrace.get(observation.trace_id);
    if (!stats) continue;
    stats.observation_count += 1;
    stats.input_tokens += observation.input_tokens || 0;
    stats.output_tokens += observation.output_tokens || 0;
    stats.cache_read_input_tokens += observation.cache_read_input_tokens || 0;
    if (!observation.model || observation.model === 'unknown') stats.missing_model_count += 1;
    if (observation.type === 'CHAIN') stats.chain_count += 1;
    if (observation.type === 'SPAN') stats.span_count += 1;
    if (observation.type === 'TOOL' || observation.name.toLowerCase().startsWith('tool:')) stats.tool_count += 1;
    if (observation.type === 'GENERATION') stats.generation_count += 1;
  }
  for (const stats of byTrace.values()) stats.has_tool_tree = stats.tool_count > 0 || stats.span_count > 0;
  return Object.fromEntries(byTrace);
}

function observationsToEvents(observations: JsonRecord[]) {
  const seqBySession = new Map();
  return observations
    .slice()
    .sort((a, b) => String(a.started_at || '').localeCompare(String(b.started_at || '')))
    .map((observation) => {
      const session = `${observation.harness}-${observation.trace_id}`;
      const seq = (seqBySession.get(session) || 0) + 1;
      seqBySession.set(session, seq);
      const type = observation.type === 'GENERATION'
        ? 'assistant_message'
        : observation.type === 'TOOL' || observation.name.toLowerCase().startsWith('tool:')
          ? 'tool_call'
          : observation.type === 'SPAN'
            ? 'custom'
            : 'turn_start';
      return {
        event_id: observation.observation_id,
        session_id: session,
        seq,
        type,
        ts: observation.started_at || new Date(0).toISOString(),
        cwd: observation.repo,
        pool: observation.slug,
        tags: [`harness:${observation.harness}`, `repo:${observation.repo}`, `slug:${observation.slug}`, `branch:${observation.branch}`],
        agent_name: observation.harness,
        provider: observation.harness === 'codex' ? 'openai' : 'anthropic',
        model: observation.model,
        payload: {
          observation_type: observation.type,
          observation_name: observation.name,
          trace_id: observation.trace_id,
          parent_observation_id: observation.parent_observation_id,
          input_tokens: observation.input_tokens,
          output_tokens: observation.output_tokens,
          summary: observation.output_preview || observation.input_preview || observation.name,
        },
      };
    });
}

function attachTreeStats(traces: JsonRecord[], treeStats: JsonRecord) {
  return traces.map((trace) => {
    const stats = treeStats[trace.trace_id] || {};
    return {
      ...trace,
      tree: stats,
      input_tokens: trace.input_tokens || stats.input_tokens || 0,
      output_tokens: trace.output_tokens || stats.output_tokens || 0,
      cache_read_input_tokens: trace.cache_read_input_tokens || stats.cache_read_input_tokens || 0,
    };
  });
}

function fallbackPayload(reason: string) {
  const traceLookup = new Map(fallbackTraces.map((trace) => [trace.trace_id, trace]));
  const observations = fallbackObservations.map((observation) => normalizeObservation(observation, traceLookup));
  const treeStats = summarizeTraceTrees(fallbackTraces, observations);
  return {
    traces: attachTreeStats(fallbackTraces, treeStats),
    observations,
    treeStats,
    events: observationsToEvents(observations),
    source: 'static-fallback',
    error: reason,
  };
}

async function getLangfuseSecret() {
  const client = new SecretsManagerClient({});
  const response = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
  const secret = parseJsonMaybe(response.SecretString);
  return {
    host: String(secret.base_url || secret.host || secret.LANGFUSE_HOST || DEFAULT_HOST),
    publicKey: String(secret.public_key || secret.LANGFUSE_PUBLIC_KEY || ''),
    secretKey: String(secret.secret_key || secret.LANGFUSE_SECRET_KEY || ''),
  };
}

async function langfuseGet(host: string, publicKey: string, secretKey: string, path: string, params: JsonRecord) {
  const url = new URL(`${host.replace(/\/$/, '')}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const token = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`Langfuse ${response.status}: ${await response.text()}`);
  return response.json();
}

async function langfusePageAll(host: string, publicKey: string, secretKey: string, path: string, baseParams: JsonRecord, maxPages: number) {
  const rows = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const payload = await langfuseGet(host, publicKey, secretKey, path, { ...baseParams, page, limit: baseParams.limit || 100 });
    const data = Array.isArray(payload.data) ? payload.data : [];
    rows.push(...data);
    const totalPages = Number(payload.meta?.totalPages || 1);
    if (!data.length || page >= totalPages) break;
  }
  return rows;
}

async function fetchTraces(args: JsonRecord) {
  const { host, publicKey, secretKey } = await getLangfuseSecret();
  if (!publicKey || !secretKey) return fallbackPayload(`${SECRET_ID} missing public_key/secret_key`);

  const hours = Math.max(1, Math.min(24 * 30, Number(args.hours || 168)));
  const limit = Math.max(1, Math.min(100, Number(args.limit || 50)));
  const observationPages = Math.max(1, Math.min(20, Number(args.observationPages || 5)));
  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  const tracePayload = await langfuseGet(host, publicKey, secretKey, '/api/public/traces', {
    fromTimestamp: from.toISOString(),
    toTimestamp: to.toISOString(),
    page: 1,
    limit,
  });
  const rawRows = Array.isArray(tracePayload.data) ? tracePayload.data : Array.isArray(tracePayload.traces) ? tracePayload.traces : [];
  const traces: JsonRecord[] = rawRows.map((trace: JsonRecord) => normalizeTrace(trace, host));
  const traceLookup = new Map<string, JsonRecord>(traces.map((trace) => [trace.trace_id, trace]));
  const traceIds = new Set(traceLookup.keys());
  const rawObservations = await langfusePageAll(host, publicKey, secretKey, '/api/public/observations', {
    fromStartTime: from.toISOString(),
    toStartTime: to.toISOString(),
    limit: 100,
  }, observationPages);
  const observations = rawObservations
    .map((observation) => normalizeObservation(observation, traceLookup))
    .filter((observation) => traceIds.has(observation.trace_id));
  const treeStats = summarizeTraceTrees(traces, observations);
  return {
    traces: attachTreeStats(traces, treeStats),
    observations,
    treeStats,
    events: observationsToEvents(observations),
    source: 'langfuse-amplify',
    window: { from: from.toISOString(), to: to.toISOString(), hours, observationPages },
  };
}

export const handler = async (event: { arguments?: JsonRecord }) => {
  try {
    return { payload: await fetchTraces(event.arguments || {}) };
  } catch (error) {
    return { payload: fallbackPayload(error instanceof Error ? error.message : 'Langfuse Amplify function failed') };
  }
};
