import { createElement, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  ExternalLink,
  FileText,
  GitBranch,
  GitCommit,
  LayoutDashboard,
  ListFilter,
  Radio,
  Rows3,
  ShieldCheck,
  Sparkles,
  Tags,
  Workflow,
} from 'lucide-react';
import { observabilityData, formatNumber, formatPercent } from '../data/observabilityData';
import { StatusBadge } from '../components/OpsCards';

const navItems = [
  { label: 'Overview', to: '/ops/observability', end: true },
  { label: 'Traces', to: '/ops/observability/traces' },
  { label: 'Sessions', to: '/ops/observability/sessions' },
  { label: 'Agents', to: '/ops/observability/agents' },
  { label: 'Reports', to: '/ops/observability/reports' },
  { label: 'Live', to: '/ops/observability/live' },
];

const harnessColors = {
  codex: 'border-sky-200 bg-sky-50 text-sky-800',
  hermes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'claude-code': 'border-violet-200 bg-violet-50 text-violet-800',
  default: 'border-[#D6D4C8] bg-[#E6E4D9] text-[#191919]/70',
};

function PageHead({ eyebrow, title, children, action }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <span className="text-xs font-bold uppercase text-[#D97757]">{eyebrow}</span>
        <h1 className="mt-3 font-serif text-4xl text-[#191919] md:text-5xl">{title}</h1>
        {children ? <p className="mt-3 max-w-4xl text-sm leading-6 text-[#191919]/70">{children}</p> : null}
      </div>
      {action}
    </div>
  );
}

function SmallPill({ children, tone = 'default' }) {
  const color = harnessColors[tone] || harnessColors.default;
  return (
    <span className={`inline-flex min-h-0 items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase ${color}`}>
      {children}
    </span>
  );
}

function ObservabilityNav() {
  return (
    <nav className="flex max-w-full overflow-x-auto rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/65 p-1 text-xs font-semibold uppercase">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `min-h-0 whitespace-nowrap rounded px-3 py-2 transition-colors ${
              isActive
                ? 'bg-[#191919] text-[#F3F1E7]'
                : 'text-[#191919]/60 hover:bg-white/50 hover:text-[#191919]'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SummaryMetric({ label, value, detail, icon: MetricIcon }) {
  return (
    <article className="rounded-md border border-[#D6D4C8] bg-white/50 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-[#191919]/45">{label}</p>
        {createElement(MetricIcon, { className: 'h-4 w-4 text-[#D97757]' })}
      </div>
      <p className="mt-3 font-serif text-4xl text-[#191919]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[#191919]/65">{detail}</p>
    </article>
  );
}

function Overview() {
  const { summary, template } = observabilityData;
  const metrics = [
    { label: 'Traces', value: formatNumber(summary.traces), detail: summary.window, icon: Activity },
    { label: 'Generations', value: formatNumber(summary.generations), detail: `${formatNumber(summary.attributedGenerations)} attributed`, icon: Workflow },
    { label: 'Tokens', value: formatNumber(summary.inputTokens + summary.outputTokens), detail: `${formatPercent(summary.cacheHitRate)} cache hit rate`, icon: BarChart3 },
    { label: 'Conformance', value: '2 gaps', detail: `${formatPercent(summary.unknownModelPercent)} unknown models, ${formatPercent(summary.structuredTagPercent)} structured tags`, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="Agent Observability"
        title="Ecom Trace Control Room"
        action={
          <a
            href="https://us.cloud.langfuse.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] px-3 py-2 text-xs font-semibold uppercase text-[#191919]/60 hover:border-[#D97757] hover:text-[#D97757]"
          >
            Langfuse
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        }
      >
        Dedicated pages for Hermes, Claude Code, Codex, local session archives, and the ecom telemetry report.
      </PageHead>

      <ObservabilityNav />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <SummaryMetric key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-md border border-[#D6D4C8] bg-white/50 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#D97757]" />
            <h2 className="font-serif text-2xl text-[#191919]">Trace Standard</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="text-xs font-semibold uppercase">Unknown model</p>
              <p className="mt-2 font-serif text-3xl">{formatPercent(summary.unknownModelPercent)}</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="text-xs font-semibold uppercase">Structured tags</p>
              <p className="mt-2 font-serif text-3xl">{formatPercent(summary.structuredTagPercent)}</p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <p className="text-xs font-semibold uppercase">Tool tree</p>
              <p className="mt-2 font-serif text-3xl">{summary.toolTree}</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-[#191919]/65">
            The consumer side is implemented in the telemetry-report skill. The remaining work is runtime emission:
            repo, slug, branch, profile, and resolved model metadata on every trace.
          </p>
        </article>

        <article className="rounded-md border border-[#D6D4C8] bg-[#191919] p-5 text-[#F3F1E7]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#D97757]" />
            <h2 className="font-serif text-2xl">Template Reuse</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#F3F1E7]/75">
            The live page adapts the Pi Observability frontend patterns into this React ops surface.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {template.reusedComponents.map((item) => (
              <span key={item} className="rounded-md border border-[#F3F1E7]/15 bg-white/5 px-2.5 py-1 text-xs text-[#F3F1E7]/70">
                {item}
              </span>
            ))}
          </div>
          <a
            href={template.repo}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex min-h-0 items-center gap-2 rounded-md border border-[#F3F1E7]/20 px-3 py-2 text-xs font-semibold uppercase text-[#F3F1E7]/70 hover:border-[#D97757] hover:text-[#D97757]"
          >
            Template repo
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </article>
      </section>

      <section className="overflow-hidden rounded-md border border-[#D6D4C8] bg-white/50">
        {observabilityData.sources.map((source) => (
          <article key={source.name} className="grid gap-4 border-b border-[#D6D4C8] p-5 last:border-b-0 lg:grid-cols-[0.9fr_1.2fr_0.9fr_auto] lg:items-center">
            <div>
              <h3 className="font-medium text-[#191919]">{source.name}</h3>
              <p className="mt-1 text-xs uppercase text-[#191919]/45">{source.owner}</p>
            </div>
            <p className="font-mono text-xs leading-5 text-[#191919]/65">{source.localPath}</p>
            <p className="text-sm leading-6 text-[#191919]/65">{source.role}</p>
            <StatusBadge state={source.status} />
          </article>
        ))}
      </section>
    </div>
  );
}

function useLangfuseTraces() {
  const [state, setState] = useState({ loading: true, rows: observabilityData.traceFixtures, source: 'static', error: '' });

  useEffect(() => {
    let active = true;
    fetch('/.netlify/functions/langfuse-traces?hours=168')
      .then((response) => {
        if (!response.ok) throw new Error(`Langfuse function ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        const rows = Array.isArray(payload.traces) && payload.traces.length ? payload.traces : observabilityData.traceFixtures;
        setState({ loading: false, rows, source: payload.source || 'function', error: payload.error || '' });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, rows: observabilityData.traceFixtures, source: 'static-fallback', error: error.message });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

function Traces() {
  const [harness, setHarness] = useState('all');
  const [query, setQuery] = useState('');
  const { loading, rows, source, error } = useLangfuseTraces();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const harnessOk = harness === 'all' || row.harness === harness;
      const queryOk = !q || [row.name, row.repo, row.slug, row.branch, row.model, row.agent_profile]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      return harnessOk && queryOk;
    });
  }, [harness, query, rows]);

  return (
    <div className="space-y-8">
      <PageHead eyebrow="Langfuse Logs" title="Trace Browser">
        Server-side Langfuse reads use the Netlify function when credentials are configured; otherwise the page stays usable with the latest archived report data.
      </PageHead>
      <ObservabilityNav />

      <section className="rounded-md border border-[#D6D4C8] bg-white/50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <ListFilter className="h-4 w-4 text-[#D97757]" />
            {['all', 'hermes', 'claude-code', 'codex'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setHarness(item)}
                className={`min-h-0 rounded-md border px-3 py-2 text-xs font-semibold uppercase ${
                  harness === item
                    ? 'border-[#191919] bg-[#191919] text-[#F3F1E7]'
                    : 'border-[#D6D4C8] bg-[#F3F1E7] text-[#191919]/60'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input-field min-h-0 rounded-md px-3 py-2 text-sm md:w-72"
            placeholder="Filter traces"
          />
        </div>
        <p className="mt-3 text-xs text-[#191919]/50">
          Source: {source}{loading ? ' (loading)' : ''}{error ? ` - ${error}` : ''}
        </p>
      </section>

      <section className="overflow-hidden rounded-md border border-[#D6D4C8] bg-white/50">
        {filtered.map((trace) => (
          <article key={trace.trace_id} className="grid gap-4 border-b border-[#D6D4C8] p-5 last:border-b-0 xl:grid-cols-[1.1fr_0.7fr_0.9fr_0.8fr_auto] xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SmallPill tone={trace.harness}>{trace.harness}</SmallPill>
                <SmallPill>{trace.agent_profile || 'unknown profile'}</SmallPill>
              </div>
              <h3 className="mt-3 font-medium text-[#191919]">{trace.name}</h3>
              <p className="mt-1 font-mono text-xs text-[#191919]/45">{trace.trace_id}</p>
            </div>
            <div className="text-sm text-[#191919]/65">
              <p>{trace.repo || 'unknown repo'}</p>
              <p className="font-mono text-xs text-[#191919]/45">{trace.branch || 'unknown branch'}</p>
            </div>
            <div className="text-sm text-[#191919]/65">
              <p>{trace.model || 'unknown model'}</p>
              <p className="font-mono text-xs text-[#191919]/45">{trace.slug || 'unknown slug'}</p>
            </div>
            <div className="text-sm text-[#191919]/65">
              <p>{formatNumber(trace.input_tokens)} in</p>
              <p>{formatNumber(trace.output_tokens)} out</p>
            </div>
            <a
              href={trace.langfuse_url || 'https://us.cloud.langfuse.com'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] px-3 py-2 text-xs font-semibold uppercase text-[#191919]/60 hover:border-[#D97757] hover:text-[#D97757]"
            >
              Open
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}

function Sessions() {
  return (
    <div className="space-y-8">
      <PageHead eyebrow="Local Archives" title="Session Directory Map">
        Hermes, Claude Code, and Codex archives are indexed here so local session files can be reconciled with Langfuse traces.
      </PageHead>
      <ObservabilityNav />
      <section className="grid gap-4 lg:grid-cols-2">
        {observabilityData.sessions.map((session) => (
          <article key={session.id} className="rounded-md border border-[#D6D4C8] bg-white/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SmallPill tone={session.harness}>{session.harness}</SmallPill>
                <h2 className="mt-3 font-serif text-2xl text-[#191919]">{session.id}</h2>
              </div>
              <StatusBadge state={session.traceStatus} />
            </div>
            <p className="mt-4 font-mono text-xs leading-5 text-[#191919]/60">{session.path}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <p className="rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-3 text-sm text-[#191919]/65">Profile<br /><strong className="text-[#191919]">{session.profile}</strong></p>
              <p className="rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-3 text-sm text-[#191919]/65">Files<br /><strong className="text-[#191919]">{session.files}</strong></p>
              <p className="rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-3 text-sm text-[#191919]/65">Latest<br /><strong className="text-[#191919]">{session.latest}</strong></p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Agents() {
  return (
    <div className="space-y-8">
      <PageHead eyebrow="Profiles" title="Agent Emission Contracts">
        Each assistant profile needs stable harness, profile, repo, slug, branch, model, and session metadata.
      </PageHead>
      <ObservabilityNav />
      <section className="grid gap-5 lg:grid-cols-3">
        {observabilityData.agents.map((agent) => (
          <article key={agent.name} className="rounded-md border border-[#D6D4C8] bg-white/50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SmallPill tone={agent.harness}>{agent.harness}</SmallPill>
                <h2 className="mt-3 font-serif text-2xl text-[#191919]">{agent.name}</h2>
              </div>
              <StatusBadge state={agent.status} />
            </div>
            <p className="mt-3 text-sm leading-6 text-[#191919]/65">{agent.profile}</p>
            <p className="mt-3 font-mono text-xs leading-5 text-[#191919]/45">{agent.source}</p>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase text-[#191919]/45">Emitted</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {agent.emitted.map((item) => <SmallPill key={item}>{item}</SmallPill>)}
              </div>
            </div>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase text-[#191919]/45">Missing</p>
              <ul className="mt-2 space-y-2 text-sm text-[#191919]/65">
                {agent.missing.map((item) => <li key={item}>- {item}</li>)}
              </ul>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Reports() {
  return (
    <div className="space-y-8">
      <PageHead eyebrow="Reports" title="Observability Archive">
        Durable report links copied from the gbautomation telemetry and Langfuse report artifacts.
      </PageHead>
      <ObservabilityNav />
      <section className="overflow-hidden rounded-md border border-[#D6D4C8] bg-white/50">
        {observabilityData.reports.map((report) => (
          <article key={report.href} className="grid gap-4 border-b border-[#D6D4C8] p-5 last:border-b-0 lg:grid-cols-[1fr_0.35fr_1.1fr_auto] lg:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#E6E4D9]">
                <FileText className="h-4 w-4 text-[#D97757]" />
              </span>
              <div>
                <h2 className="font-medium text-[#191919]">{report.title}</h2>
                <p className="text-xs uppercase text-[#191919]/45">{report.kind}</p>
              </div>
            </div>
            <p className="text-sm text-[#191919]/60">{report.date}</p>
            <p className="font-mono text-xs leading-5 text-[#191919]/50">{report.sourcePath}</p>
            <a
              href={report.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] px-3 py-2 text-xs font-semibold uppercase text-[#191919]/60 hover:border-[#D97757] hover:text-[#D97757]"
            >
              Open
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}

function eventSummary(event) {
  if (event.payload?.command) return event.payload.command;
  if (event.payload?.summary) return event.payload.summary;
  if (event.payload?.label) return `${event.payload.label}: ${event.payload.value}`;
  return event.type;
}

function LiveSingle({ events, selectedSession }) {
  const rows = selectedSession === 'all' ? events : events.filter((event) => event.session_id === selectedSession);
  return (
    <section className="overflow-hidden rounded-md border border-[#D6D4C8] bg-[#111827] text-[#F3F1E7]">
      {rows.map((event) => (
        <article key={event.event_id} className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 md:grid-cols-[80px_150px_1fr_150px] md:items-center">
          <p className="font-mono text-xs text-[#F3F1E7]/45">{event.ts.slice(11, 19)}</p>
          <SmallPill tone={event.tags.find((tag) => tag.startsWith('harness:'))?.replace('harness:', '')}>{event.type}</SmallPill>
          <p className="text-sm leading-6 text-[#F3F1E7]/75">{eventSummary(event)}</p>
          <p className="font-mono text-xs text-[#F3F1E7]/45">{event.model || 'unknown'}</p>
        </article>
      ))}
    </section>
  );
}

function LiveSwimlane({ events }) {
  const sessions = [...new Set(events.map((event) => event.session_id))];
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      {sessions.map((sessionId) => (
        <article key={sessionId} className="rounded-md border border-[#D6D4C8] bg-white/50">
          <div className="border-b border-[#D6D4C8] p-4">
            <h2 className="font-mono text-sm text-[#191919]">{sessionId}</h2>
          </div>
          {events.filter((event) => event.session_id === sessionId).map((event) => (
            <div key={event.event_id} className="border-b border-[#D6D4C8] p-4 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <SmallPill>{event.type}</SmallPill>
                <span className="font-mono text-xs text-[#191919]/45">seq {event.seq}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#191919]/65">{eventSummary(event)}</p>
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}

function LiveRace({ events }) {
  const rows = events.map((event) => ({
    ...event,
    turn: event.payload?.turn || event.seq,
  }));
  return (
    <section className="rounded-md border border-[#D6D4C8] bg-white/50 p-5">
      <div className="space-y-4">
        {rows.map((event) => (
          <div key={event.event_id} className="grid gap-3 md:grid-cols-[180px_1fr_90px] md:items-center">
            <p className="font-mono text-xs text-[#191919]/55">{event.session_id}</p>
            <div className="relative h-10 rounded-md border border-[#D6D4C8] bg-[#F3F1E7]">
              <div
                className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#D97757]"
                style={{ left: `${Math.min(80, event.turn * 18)}%`, width: '18%' }}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase text-[#191919]/55">
                {event.type}
              </span>
            </div>
            <p className="font-mono text-xs text-[#191919]/45">turn {event.turn}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Live() {
  const [view, setView] = useState('single');
  const [selectedSession, setSelectedSession] = useState('all');
  const events = observabilityData.liveEvents;
  const sessions = ['all', ...new Set(events.map((event) => event.session_id))];

  return (
    <div className="space-y-8">
      <PageHead eyebrow="Template Viewer" title="Live Event Timeline">
        Adapted from the Pi Observability frontend: single-session timeline, swimlane view, and race view over the same ObsEvent-shaped rows.
      </PageHead>
      <ObservabilityNav />
      <section className="rounded-md border border-[#D6D4C8] bg-white/50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'single', label: 'Single', icon: Rows3 },
              { id: 'swimlane', label: 'Swimlane', icon: LayoutDashboard },
              { id: 'race', label: 'Race', icon: Radio },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`inline-flex min-h-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase ${
                    view === item.id
                      ? 'border-[#191919] bg-[#191919] text-[#F3F1E7]'
                      : 'border-[#D6D4C8] bg-[#F3F1E7] text-[#191919]/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <select
            value={selectedSession}
            onChange={(event) => setSelectedSession(event.target.value)}
            className="input-field min-h-0 rounded-md px-3 py-2 text-sm"
            disabled={view !== 'single'}
          >
            {sessions.map((session) => (
              <option key={session} value={session}>{session}</option>
            ))}
          </select>
        </div>
      </section>
      {view === 'single' ? <LiveSingle events={events} selectedSession={selectedSession} /> : null}
      {view === 'swimlane' ? <LiveSwimlane events={events} /> : null}
      {view === 'race' ? <LiveRace events={events} /> : null}
    </div>
  );
}

function InventoryFooter() {
  return (
    <section className="mt-10 grid gap-4 lg:grid-cols-2">
      <article className="rounded-md border border-[#D6D4C8] bg-white/40 p-5">
        <div className="flex items-center gap-2">
          <GitCommit className="h-4 w-4 text-[#D97757]" />
          <h2 className="font-serif text-2xl text-[#191919]">Committers</h2>
        </div>
        <div className="mt-4 max-h-72 overflow-auto">
          {observabilityData.committers.map((committer) => (
            <p key={`${committer.scope}-${committer.name}-${committer.email}`} className="border-b border-[#D6D4C8]/70 py-2 text-sm text-[#191919]/65 last:border-b-0">
              <span className="font-semibold text-[#191919]">{committer.scope}</span> - {committer.name} <span className="font-mono text-xs text-[#191919]/45">{committer.email}</span>
            </p>
          ))}
        </div>
      </article>
      <article className="rounded-md border border-[#D6D4C8] bg-white/40 p-5">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-[#D97757]" />
          <h2 className="font-serif text-2xl text-[#191919]">Local Worktrees</h2>
        </div>
        <div className="mt-4 max-h-72 overflow-auto">
          {observabilityData.worktrees.map((worktree) => (
            <p key={worktree.path} className="border-b border-[#D6D4C8]/70 py-2 text-sm text-[#191919]/65 last:border-b-0">
              <span className="font-semibold text-[#191919]">{worktree.repo}</span> - {worktree.branch}
              {worktree.locked ? <span className="ml-2 text-[#D97757]">locked</span> : null}
              <span className="block font-mono text-xs text-[#191919]/45">{worktree.path}</span>
            </p>
          ))}
        </div>
      </article>
    </section>
  );
}

export default function OpsObservability() {
  const { pathname } = useLocation();
  let body = <Overview />;
  if (pathname.endsWith('/traces')) body = <Traces />;
  if (pathname.endsWith('/sessions')) body = <Sessions />;
  if (pathname.endsWith('/agents')) body = <Agents />;
  if (pathname.endsWith('/reports')) body = <Reports />;
  if (pathname.endsWith('/live')) body = <Live />;

  return (
    <div>
      {body}
      <InventoryFooter />
      <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-[#191919]/45">
        <Clock className="h-3.5 w-3.5" />
        <span>Generated {observabilityData.generatedAt}</span>
        <Tags className="h-3.5 w-3.5" />
        <span>Full-tree trace attribution standard</span>
        <Link to="/ops/runs" className="min-h-0 text-[#D97757] hover:text-[#191919]">Agent runs</Link>
      </div>
    </div>
  );
}
