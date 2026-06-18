import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Database, ExternalLink, Search } from 'lucide-react';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';

const preferredColumns = {
  cron_runs: ['cron_name', 'started_at', 'picked_count', 'ok_count', 'fail_count', 'skipped_count', 'host'],
  cron_run_outputs: ['status', 'issue_id', 'branch', 'pr_url', 'turns', 'duration_s', 'cost_usd', 'agent_summary'],
  test_runs: ['suite_name', 'status', 'environment', 'started_at', 'total_tests', 'passed', 'failed', 'errors', 'report_url'],
  tac_test_runs: ['suite', 'status', 'last_run_at', 'tests_total', 'tests_passed', 'tests_failed', 'duration_sec', 'report_url'],
  tac_component_retrievals: ['retrieval_created_at', 'query_count', 'components_scanned', 'match_count', 'returned_count', 'source', 'retrieval_path'],
  tac_self_improve_events: ['event_created_at', 'run_id', 'pathway', 'status', 'client', 'recommendation_count', 'event_path'],
  ecom_scrape_jobs: ['status', 'run_after', 'attempts', 'max_attempts', 'claimed_by', 'claimed_at', 'error_message', 'created_at'],
  langfuse_traces: ['trace_name', 'agent', 'runtime', 'trace_timestamp', 'latency_sec', 'total_cost', 'total_tokens', 'observation_count', 'langfuse_url'],
  agent_log_artifacts: ['client_slug', 'repo_slug', 'agent', 'category', 'basename', 'modified_at', 'content_mode', 'captured_bytes', 'path'],
};

const labels = {
  cron_name: 'Cron',
  started_at: 'Started',
  picked_count: 'Picked',
  ok_count: 'OK',
  fail_count: 'Failed',
  skipped_count: 'Skipped',
  issue_id: 'Issue',
  pr_url: 'PR',
  duration_s: 'Duration',
  cost_usd: 'Cost',
  agent_summary: 'Summary',
  suite_name: 'Suite',
  total_tests: 'Tests',
  report_url: 'Report',
  last_run_at: 'Last Run',
  tests_total: 'Tests',
  tests_passed: 'Passed',
  tests_failed: 'Failed',
  retrieval_created_at: 'Retrieved',
  query_count: 'Queries',
  components_scanned: 'Scanned',
  match_count: 'Matches',
  returned_count: 'Returned',
  retrieval_path: 'Path',
  event_created_at: 'Created',
  recommendation_count: 'Recommendations',
  event_path: 'Path',
  run_after: 'Run After',
  max_attempts: 'Max',
  claimed_by: 'Worker',
  claimed_at: 'Claimed',
  error_message: 'Error',
  trace_name: 'Trace',
  trace_timestamp: 'Timestamp',
  latency_sec: 'Latency',
  total_cost: 'Cost',
  total_tokens: 'Tokens',
  observation_count: 'Observations',
  langfuse_url: 'Langfuse',
  client_slug: 'Client',
  repo_slug: 'Repo',
  content_mode: 'Mode',
  captured_bytes: 'Captured',
  modified_at: 'Modified',
};

function humanLabel(value) {
  return labels[value] || String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function shortValue(value, max = 100) {
  const text = formatValue(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function statusTone(value) {
  const status = String(value || '').toLowerCase();
  if (['ok', 'pass', 'passed', 'done', 'applied', 'active', 'true', 'pr_opened'].includes(status)) return 'good';
  if (['fail', 'failed', 'error', 'timeout', 'cancelled', 'false'].includes(status)) return 'bad';
  if (['pending', 'running', 'partial', 'skipped', 'noop', 'draft', 'paused', 'metadata', 'tail', 'truncated'].includes(status)) return 'warn';
  return 'neutral';
}

function StatusPill({ value }) {
  const tone = statusTone(value);
  const className = {
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    bad: 'border-red-200 bg-red-50 text-red-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-700',
    neutral: 'border-[#D6D4C8] bg-[#E6E4D9] text-[#191919]/65',
  }[tone];
  return <span className={`inline-flex rounded-md border px-2 py-1 text-[11px] font-bold uppercase ${className}`}>{formatValue(value)}</span>;
}

function Metric({ label, value }) {
  return (
    <article className="rounded-md border border-[#D6D4C8] bg-white/50 p-4">
      <p className="text-xs font-bold uppercase text-[#191919]/45">{label}</p>
      <p className="mt-2 font-serif text-3xl text-[#191919]">{value}</p>
    </article>
  );
}

function BarChart({ title, counts }) {
  const entries = Object.entries(counts || {}).slice(0, 6);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return (
    <div className="rounded-md border border-[#D6D4C8] bg-white/55 p-4">
      <p className="text-xs font-bold uppercase text-[#191919]/45">{title}</p>
      <div className="mt-3 space-y-2">
        {entries.length ? entries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-xs">
            <span className="truncate text-[#191919]/55" title={key}>{humanLabel(key)}</span>
            <span className="h-2 overflow-hidden rounded-full bg-[#E6E4D9]">
              <span className="block h-full rounded-full bg-[#D97757]" style={{ width: `${Math.max(4, Math.round((value / max) * 100))}%` }} />
            </span>
            <strong className="text-right text-[#191919]">{value}</strong>
          </div>
        )) : <p className="text-sm text-[#191919]/45">No grouped values yet.</p>}
      </div>
    </div>
  );
}

function ActivityChart({ table }) {
  const buckets = Array.from({ length: 14 }, () => 0);
  if (table.time_col) {
    const now = new Date(table.summary.latest || Date.now());
    table.rows.forEach((row) => {
      const date = new Date(row[table.time_col]);
      if (Number.isNaN(date.getTime())) return;
      const diff = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) / 86400000);
      if (diff >= 0 && diff < buckets.length) buckets[buckets.length - 1 - diff] += 1;
    });
  }
  const max = Math.max(1, ...buckets);
  return (
    <div className="rounded-md border border-[#D6D4C8] bg-white/55 p-4">
      <p className="text-xs font-bold uppercase text-[#191919]/45">Recent Activity</p>
      <div className="mt-3 flex h-24 items-end gap-1">
        {buckets.map((value, index) => (
          <span
            key={index}
            className={`flex-1 rounded-t-sm ${value ? 'bg-[#2E6F64]' : 'bg-[#E6E4D9]'}`}
            title={`${value} rows`}
            style={{ height: value ? `${Math.max(8, Math.round((value / max) * 88))}%` : '5px' }}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-[#191919]/45">Last 14 days, oldest to newest</p>
    </div>
  );
}

function columnsFor(table, rows) {
  const available = new Set(Object.keys(rows[0] || {}));
  const preferred = (preferredColumns[table.name] || []).filter((column) => available.has(column));
  const rest = [...available].filter((column) => !preferred.includes(column));
  return [...preferred, ...rest].slice(0, 9);
}

function Cell({ column, value }) {
  const lower = column.toLowerCase();
  if (lower.includes('url') && typeof value === 'string' && value.startsWith('http')) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="inline-flex min-h-0 items-center gap-1 font-semibold text-[#365D8B] hover:underline">
        {shortValue(value, 52)}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  if (lower === 'status' || lower.includes('status') || lower === 'active' || lower === 'content_mode' || lower === 'change_type') {
    return <StatusPill value={value} />;
  }
  if (lower.includes('_at') || lower.includes('timestamp')) return formatDate(value);
  return shortValue(value, lower.includes('summary') || lower.includes('path') || lower.includes('error') ? 140 : 90);
}

function DataTable({ table, rows }) {
  if (!rows.length) {
    return (
      <div className="border-t border-[#D6D4C8] p-5 text-sm text-[#191919]/55">
        {table.error || 'No rows match the current filters.'}
      </div>
    );
  }
  const columns = columnsFor(table, rows);
  return (
    <div className="max-h-[28rem] overflow-auto border-t border-[#D6D4C8]">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-[#F3F1E7] text-[#191919]/45">
          <tr>
            {columns.map((column) => <th key={column} className="border-b border-[#D6D4C8] px-3 py-2 font-bold uppercase">{humanLabel(column)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-[#D6D4C8]/70 last:border-b-0">
              {columns.map((column) => <td key={column} className="max-w-xs px-3 py-2 align-top text-[#191919]/70"><Cell column={column} value={row[column]} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DashboardCard({ table, query }) {
  const rows = table.rows.filter((row) => !query || JSON.stringify(row).toLowerCase().includes(query));
  const chartCounts = table.status_col ? table.summary.status_counts : table.summary.top_groups;
  return (
    <article className="glass-panel overflow-hidden rounded-lg border border-[#D6D4C8]">
      <div className="flex flex-col gap-3 border-b border-[#D6D4C8] bg-white/35 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="gb-eyebrow flex items-center gap-2 text-[#D97757]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D97757]" aria-hidden="true" />
            {table.name}
          </p>
          <h3 className="mt-2 font-serif text-2xl text-[#191919]">{table.label}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#191919]/60">{table.description}</p>
        </div>
        <span className="gb-pill h-fit shrink-0">{rows.length} rows</span>
      </div>

      <div className="grid gap-3 border-b border-[#D6D4C8] p-4 md:grid-cols-4">
        <Metric label="Rows" value={table.summary.row_count} />
        <Metric label="Latest" value={formatDate(table.summary.latest)} />
        <Metric label="Groups" value={Object.keys(table.summary.top_groups || {}).length} />
        <Metric label="Status Types" value={Object.keys(table.summary.status_counts || {}).length || '-'} />
      </div>

      <div className="grid gap-4 border-b border-[#D6D4C8] p-4 lg:grid-cols-[22rem_1fr]">
        <BarChart title={table.status_col ? 'Status Distribution' : 'Top Groups'} counts={chartCounts} />
        <ActivityChart table={table} />
      </div>

      <DataTable table={table} rows={rows} />
    </article>
  );
}

export default function OpsSupabase() {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState('ops');
  const [tableFilter, setTableFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/ops/supabase/snapshot.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Snapshot unavailable (${response.status})`);
        return response.json();
      })
      .then((data) => { if (!cancelled) setSnapshot(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load Supabase snapshot'); });
    return () => { cancelled = true; };
  }, []);

  const dashboards = snapshot?.dashboards || {};
  const dashboardKeys = Object.keys(dashboards);
  const tables = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.tables
      .filter((table) => table.dashboard === active)
      .filter((table) => tableFilter === 'all' || table.name === tableFilter);
  }, [active, snapshot, tableFilter]);

  const visibleRows = tables.reduce((total, table) => total + table.rows.length, 0);
  const latest = tables.map((table) => table.summary.latest).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0];
  const failureCount = tables.reduce((total, table) => total + Object.entries(table.summary.status_counts || {}).reduce((sum, [status, count]) => sum + (statusTone(status) === 'bad' ? count : 0), 0), 0);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-5 text-red-800">
        <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /><strong>Supabase snapshot failed</strong></div>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!snapshot) {
    return <p className="text-sm text-[#191919]/55">Loading Supabase dashboard...</p>;
  }

  return (
    <OpsPageShell>
      <div className="space-y-3">
        {/* Header — Supabase Mirror eyebrow + Dashboard Series title + snapshot freshness */}
        <CollapsibleSection
          eyebrow="Supabase Mirror"
          title="Dashboard Series"
          meta={
            <span className={`gb-chip ${snapshot.live ? 'gb-chip-green' : 'gb-chip-amber'}`}>
              {snapshot.live ? 'Live snapshot' : 'Offline snapshot'}
            </span>
          }
        >
          <p className="max-w-3xl text-sm leading-7 text-[#191919]/70">
            Sanitized, read-only operations data generated server-side from Supabase and rendered
            here without exposing service-role credentials to the browser.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`gb-chip ${snapshot.live ? 'gb-chip-green' : 'gb-chip-amber'}`}>
              {snapshot.live ? 'Live snapshot' : 'Offline snapshot'}
            </span>
            <span className="gb-chip gb-chip-blue">Generated {formatDate(snapshot.generated_at)}</span>
          </div>
        </CollapsibleSection>

        {/* Summary metrics row */}
        <CollapsibleSection
          eyebrow="01"
          title="Summary Metrics"
          meta={<span className="gb-pill">{tables.length} tables in view</span>}
        >
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Rows Loaded" value={visibleRows} />
            <Metric label="Tables In View" value={tables.length} />
            <Metric label="Failures" value={failureCount} />
            <Metric label="Latest Event" value={formatDate(latest)} />
          </section>
        </CollapsibleSection>

        {/* Dashboard selector + table filter + row search */}
        <CollapsibleSection
          eyebrow="02"
          title="Dashboard Controls"
          meta={<span className="gb-pill">{dashboards[active]?.title || active}</span>}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {dashboardKeys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setActive(key); setTableFilter('all'); }}
                  className={`min-h-0 rounded-md px-3 py-2 text-xs font-bold uppercase ${active === key ? 'bg-[#191919] text-[#F3F1E7]' : 'bg-white/60 text-[#191919]/60 hover:text-[#191919]'}`}
                >
                  {dashboards[key].title}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select value={tableFilter} onChange={(event) => setTableFilter(event.target.value)} className="rounded-md border border-[#D6D4C8] bg-white/70 px-3 py-2 text-sm text-[#191919]">
                <option value="all">All tables</option>
                {snapshot.tables.filter((table) => table.dashboard === active).map((table) => (
                  <option key={table.name} value={table.name}>{table.label}</option>
                ))}
              </select>
              <label className="flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] bg-white/70 px-3 py-2 text-sm text-[#191919]/65">
                <Search className="h-4 w-4 text-[#D97757]" />
                <input value={query} onChange={(event) => setQuery(event.target.value.toLowerCase())} placeholder="Search rows" className="min-h-0 border-0 bg-transparent p-0 text-sm outline-none" />
              </label>
            </div>
          </div>
        </CollapsibleSection>

        {/* Dashboard cards — one per table */}
        <CollapsibleSection
          eyebrow="03"
          title="Dashboard Tables"
          defaultOpen
          meta={<span className="gb-pill">{tables.length} in view</span>}
        >
          <div className="space-y-6">
            {tables.map((table) => <DashboardCard key={table.name} table={table} query={query} />)}
          </div>
        </CollapsibleSection>

        {/* Data Boundary callout */}
        <CollapsibleSection
          eyebrow="04"
          title="Data Boundary"
          meta={<span className="gb-chip gb-chip-amber">Boundary</span>}
        >
          <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <h3 className="font-serif text-xl">Data Boundary</h3>
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6">
              This page consumes a sanitized JSON snapshot from the website public folder. Live Supabase
              reads, AWS Secrets Manager, and service-role keys stay in the generator process.
            </p>
          </div>
        </CollapsibleSection>
      </div>

      <div className="hidden" aria-hidden="true"><Activity /></div>
    </OpsPageShell>
  );
}
