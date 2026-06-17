import { AlertTriangle, CheckCircle2, CircleDashed, Clock, ExternalLink } from 'lucide-react';

const stateStyles = {
  online: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  passed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  running: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ready: 'border-sky-200 bg-sky-50 text-sky-700',
  todo: 'border-[#D6D4C8] bg-[#E6E4D9] text-[#191919]/65',
  triage: 'border-[#D97757]/25 bg-[#D97757]/10 text-[#B75F43]',
  blocked: 'border-red-200 bg-red-50 text-red-700',
  degraded: 'border-amber-200 bg-amber-50 text-amber-700',
  scheduled: 'border-sky-200 bg-sky-50 text-sky-700',
  planned: 'border-[#D6D4C8] bg-[#E6E4D9] text-[#191919]/65',
  'needs instrumentation': 'border-amber-200 bg-amber-50 text-amber-700',
  'this build': 'border-[#D97757]/25 bg-[#D97757]/10 text-[#B75F43]',
};

export function StatusBadge({ state }) {
  const normalized = String(state || 'planned').toLowerCase();
  const className = stateStyles[normalized] || stateStyles.planned;
  return (
    <span className={`inline-flex min-h-0 items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase ${className}`}>
      {state}
    </span>
  );
}

export function MetricGrid({ metrics }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article key={metric.label} className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
          <p className="text-xs font-semibold uppercase text-[#191919]/45">{metric.label}</p>
          <p className="mt-3 font-serif text-4xl text-[#191919]">{metric.value}</p>
          <p className="mt-3 text-sm leading-6 text-[#191919]/65">{metric.detail}</p>
        </article>
      ))}
    </section>
  );
}

export function SystemCard({ system }) {
  const Icon = system.state === 'online' ? CheckCircle2 : system.state === 'degraded' ? AlertTriangle : CircleDashed;
  return (
    <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#E6E4D9]">
            <Icon className="h-4 w-4 text-[#D97757]" />
          </span>
          <div>
            <h3 className="font-serif text-2xl text-[#191919]">{system.name}</h3>
            <p className="mt-1 text-sm leading-6 text-[#191919]/65">{system.detail}</p>
          </div>
        </div>
        <StatusBadge state={system.state} />
      </div>
      <div className="mt-5 grid gap-3 text-sm text-[#191919]/65 sm:grid-cols-2">
        <p><span className="font-semibold text-[#191919]">Owner:</span> {system.owner}</p>
        <p><span className="font-semibold text-[#191919]">Host:</span> {system.host}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {system.checks.map((check) => (
          <span key={check} className="rounded-md border border-[#D6D4C8] bg-[#F3F1E7] px-2.5 py-1 text-xs text-[#191919]/60">
            {check}
          </span>
        ))}
      </div>
    </article>
  );
}

function formatTimestamp(value) {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

export function RunRow({ run }) {
  const runId = run.run_id || run.id;
  const taskId = run.task_id || 'n/a';
  const owner = run.assignee || run.profile || run.agent || 'unassigned';
  const started = run.started_at || run.started;
  const ended = run.ended_at;
  const timestampLabel = ended
    ? `${formatTimestamp(started)} to ${formatTimestamp(ended)}`
    : formatTimestamp(started);
  const detail = run.title || run.output || run.trace_name || 'Safe receipt row';

  return (
    <article className="grid gap-4 border-b border-[#D6D4C8] p-5 last:border-b-0 lg:grid-cols-[1.1fr_0.85fr_0.85fr_auto] lg:items-center">
      <div>
        <h3 className="font-medium text-[#191919]">{runId}</h3>
        <p className="mt-1 text-sm text-[#191919]/60">{detail}</p>
        <p className="mt-2 text-xs font-semibold uppercase text-[#191919]/45">Task {taskId}</p>
      </div>
      <div className="space-y-1 text-sm text-[#191919]/65">
        <p>{owner}</p>
        {run.profile && run.profile !== owner && <p className="text-xs text-[#191919]/45">profile {run.profile}</p>}
        {run.langfuse_url && (
          <a
            href={run.langfuse_url}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-[#D97757] hover:text-[#B75F43]"
            target="_blank"
            rel="noreferrer"
          >
            Langfuse
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-[#191919]/60">
        <Clock className="h-3.5 w-3.5 shrink-0 text-[#D97757]" />
        <span>{timestampLabel}</span>
      </div>
      <StatusBadge state={run.status} />
    </article>
  );
}
