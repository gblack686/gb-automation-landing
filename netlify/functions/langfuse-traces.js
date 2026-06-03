/* global process, Buffer */

const DEFAULT_HOST = 'https://us.cloud.langfuse.com';

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

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function env(name) {
  return (process.env[name] || '').trim();
}

function parseJsonMaybe(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function collectText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function normalizeTags(trace) {
  const tags = Array.isArray(trace.tags) ? trace.tags : [];
  const metadata = parseJsonMaybe(trace.metadata);
  const input = collectText(trace.input);
  const output = collectText(trace.output);
  const haystack = [
    trace.name,
    tags.join(' '),
    collectText(metadata),
    input.slice(0, 2000),
    output.slice(0, 2000),
  ].join(' ').toLowerCase();

  const findTag = (prefix) => tags.find((tag) => String(tag).startsWith(prefix))?.slice(prefix.length);
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

function usageNumber(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
}

function normalizeTrace(trace, host) {
  const tags = normalizeTags(trace);
  const metadata = tags.metadata || {};
  const usage = parseJsonMaybe(trace.usageDetails || trace.usage_details || metadata.usageDetails);
  const cost = usageNumber(trace.totalCost, trace.total_cost, trace.cost, metadata.totalCost);
  const inputTokens = usageNumber(
    trace.inputUsage,
    trace.input_usage,
    usage.input,
    usage.input_tokens,
    usage.prompt_tokens,
    metadata.input_tokens,
  );
  const outputTokens = usageNumber(
    trace.outputUsage,
    trace.output_usage,
    usage.output,
    usage.output_tokens,
    usage.completion_tokens,
    metadata.output_tokens,
  );
  const cacheRead = usageNumber(
    usage.cache_read_input_tokens,
    usage.cache_read,
    metadata.cache_read_input_tokens,
  );
  const model = trace.model
    || metadata.model
    || metadata['llm.request.model']
    || metadata['langfuse.observation.model.name']
    || 'unknown';
  const id = trace.id || trace.traceId || trace.trace_id || trace.name || crypto.randomUUID();
  return {
    trace_id: id,
    name: trace.name || 'unnamed trace',
    harness: tags.harness,
    agent_profile: tags.agentProfile,
    repo: tags.repo,
    slug: tags.slug,
    branch: tags.branch,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_input_tokens: cacheRead,
    total_cost: cost,
    started_at: trace.timestamp || trace.createdAt || trace.startedAt || trace.startTime || null,
    latency_ms: trace.latency || trace.latencyMs || null,
    langfuse_url: `${host.replace(/\/$/, '')}/trace/${encodeURIComponent(id)}`,
    source: 'langfuse',
  };
}

async function langfuseGet(host, publicKey, secretKey, path, params) {
  const url = new URL(`${host.replace(/\/$/, '')}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  const token = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Langfuse ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function fetchTraces(event) {
  const host = env('LANGFUSE_HOST') || env('LANGFUSE_BASE_URL') || DEFAULT_HOST;
  const publicKey = env('LANGFUSE_PUBLIC_KEY');
  const secretKey = env('LANGFUSE_SECRET_KEY');
  if (!publicKey || !secretKey) {
    return { traces: fallbackTraces, source: 'static-fallback', error: 'LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY not configured' };
  }

  const hours = Math.max(1, Math.min(24 * 30, Number(event.queryStringParameters?.hours || 168)));
  const limit = Math.max(1, Math.min(100, Number(event.queryStringParameters?.limit || 50)));
  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  const payload = await langfuseGet(host, publicKey, secretKey, '/api/public/traces', {
    fromTimestamp: from.toISOString(),
    toTimestamp: to.toISOString(),
    page: 1,
    limit,
  });
  const rawRows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.traces) ? payload.traces : [];
  return {
    traces: rawRows.map((trace) => normalizeTrace(trace, host)),
    source: 'langfuse',
    window: { from: from.toISOString(), to: to.toISOString(), hours },
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(204, {});
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  try {
    return json(200, await fetchTraces(event));
  } catch (error) {
    return json(200, {
      traces: fallbackTraces,
      source: 'static-fallback',
      error: error.message || 'Langfuse proxy failed',
    });
  }
}
