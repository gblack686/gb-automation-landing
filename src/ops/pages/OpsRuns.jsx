import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { RunRow } from '../components/OpsCards';
import {
  controlPlaneViews,
  fetchControlPlaneReceipts,
  joinRunsWithTraceReceipts,
} from '../data/controlPlaneReceipts';

function formatCount(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function OpsRuns() {
  const [receipts, setReceipts] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchControlPlaneReceipts()
      .then((data) => {
        if (!cancelled) {
          setReceipts(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runRows = joinRunsWithTraceReceipts(receipts?.runReceipts, receipts?.traceReceipts);
  const traceCount = receipts?.traceReceipts?.length || 0;
  const sourceLabel = receipts?.status === 'live' ? 'Live safe views' : 'Mocked safe fixture';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-xs font-bold uppercase text-[#D97757]">Control Plane Receipts</span>
          <h1 className="mt-3 font-serif text-4xl text-[#191919] md:text-5xl">Agent Runs</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#191919]/70">
            Recent Hermes task receipts and Langfuse trace summaries. Browser reads are limited
            to versioned safe views: {controlPlaneViews.runs} and {controlPlaneViews.traces}.
          </p>
        </div>
        <a
          href="https://us.cloud.langfuse.com"
          className="inline-flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] px-3 py-2 text-xs font-semibold uppercase text-[#191919]/60 hover:border-[#D97757] hover:text-[#D97757]"
          target="_blank"
          rel="noreferrer"
        >
          Langfuse
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
          <p className="text-xs font-semibold uppercase text-[#191919]/45">Source</p>
          <p className="mt-3 font-serif text-2xl text-[#191919]">{sourceLabel}</p>
          <p className="mt-3 text-sm leading-6 text-[#191919]/65">
            No raw payload blobs are requested by this dashboard.
          </p>
        </article>
        <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
          <p className="text-xs font-semibold uppercase text-[#191919]/45">Run receipts</p>
          <p className="mt-3 font-serif text-2xl text-[#191919]">{formatCount(runRows.length, 'row')}</p>
          <p className="mt-3 text-sm leading-6 text-[#191919]/65">
            task_id, run_id, status, owner, and timestamps only.
          </p>
        </article>
        <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
          <p className="text-xs font-semibold uppercase text-[#191919]/45">Trace receipts</p>
          <p className="mt-3 font-serif text-2xl text-[#191919]">{formatCount(traceCount, 'row')}</p>
          <p className="mt-3 text-sm leading-6 text-[#191919]/65">
            Langfuse URL plus counters, never trace content.
          </p>
        </article>
      </section>

      {loading && (
        <div className="flex items-center gap-2 rounded-md border border-[#D6D4C8] bg-white/45 p-5 text-sm text-[#191919]/65">
          <RefreshCw className="h-4 w-4 animate-spin text-[#D97757]" />
          Loading safe receipts...
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Safe receipt view read failed: {error}
        </div>
      )}

      {!loading && !error && receipts?.note && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          {receipts.note}
        </div>
      )}

      {!loading && !error && (
        <section className="overflow-hidden rounded-md border border-[#D6D4C8] bg-white/45">
          {runRows.map((run) => (
            <RunRow key={run.run_id || run.id} run={run} />
          ))}
          {runRows.length === 0 && (
            <div className="p-5 text-sm text-[#191919]/60">No safe receipt rows returned.</div>
          )}
        </section>
      )}
    </div>
  );
}
