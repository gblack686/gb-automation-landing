import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarClock, CircleDollarSign, LayoutGrid, ShieldCheck } from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import CollapsibleSection from '../../../ops/components/CollapsibleSection';
import { fetchSmokeSchedules, fetchSmokeRuns, fetchSmokeBoard } from '../../../lib/supabaseOps';
import { formatCost, formatDateTime } from '../lib/format';

export default function OverviewPage() {
  const [schedules, setSchedules] = useState(null);
  const [runs, setRuns] = useState(null);
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchSmokeSchedules(), fetchSmokeRuns(), fetchSmokeBoard()])
      .then(([s, r, b]) => {
        if (cancelled) return;
        setSchedules(s || []);
        setRuns(r || []);
        setBoard(b || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load smoke-client data');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = !error && (schedules === null || runs === null || board === null);

  const latestGreen = useMemo(() => {
    if (!schedules?.length) return null;
    return schedules
      .map((s) => s.last_green_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0] || null;
  }, [schedules]);

  const totalCost = useMemo(() => {
    if (!runs?.length) return 0;
    return runs.reduce((sum, r) => sum + (Number(r.total_cost_usd) || 0), 0);
  }, [runs]);

  const cards = [
    { label: 'Schedules', value: schedules?.length ?? 0, detail: 'Cron lanes registered for this tenant', icon: CalendarClock },
    { label: 'Runs', value: runs?.length ?? 0, detail: 'Recent scheduler ticks captured', icon: Activity },
    { label: 'Board cards', value: board?.length ?? 0, detail: 'Latest-per-task board state', icon: LayoutGrid },
    { label: 'Smoke cost', value: formatCost(totalCost), detail: 'Total spend across captured runs', icon: CircleDollarSign },
  ];

  return (
    <OpsPageShell
      eyebrow="Smoke Client"
      title="Tenant Overview"
      meta={
        <span className="gb-chip gb-chip-green">
          <ShieldCheck className="h-3.5 w-3.5" />
          Read-only
        </span>
      }
    >
      <div className="space-y-3">
        <CollapsibleSection
          eyebrow="01"
          title="Summary"
          meta={<span className="gb-pill">smoke-client</span>}
          defaultOpen
        >
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>
          )}
          {!error && loading && <p className="text-sm text-[#191919]/60">Loading smoke-client telemetry…</p>}
          {!error && !loading && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.label}
                    className="glass-panel reveal rounded-md border border-[#D6D4C8] bg-white/45 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="gb-eyebrow text-[#191919]/45">{card.label}</p>
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#E6E4D9]">
                        <Icon className="h-4 w-4 text-[#D97757]" />
                      </span>
                    </div>
                    <p className="mt-3 font-serif text-4xl text-[#191919]">{card.value}</p>
                    <p className="mt-3 text-sm leading-6 text-[#191919]/65">{card.detail}</p>
                  </article>
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="02"
          title={
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D97757]" />
              Latest Green
            </span>
          }
          meta={
            latestGreen ? (
              <span className="gb-chip gb-chip-green">Healthy</span>
            ) : (
              <span className="gb-chip gb-chip-amber">No data</span>
            )
          }
        >
          <div className="rounded-md border border-[#D6D4C8] bg-[#191919] p-5 text-[#F3F1E7]">
            <p className="gb-eyebrow text-[#F3F1E7]/50">Most recent successful schedule run</p>
            <p className="mt-2 font-serif text-3xl text-[#F3F1E7]">
              {latestGreen ? formatDateTime(latestGreen) : 'No green runs recorded yet'}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F3F1E7]/70">
              Derived from the latest <span className="font-mono">last_green_at</span> across all
              smoke-client schedules. Empty states are expected while the tenant warms up.
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="03"
          title="Navigate"
          meta={<span className="gb-pill">10 views</span>}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Schedules', detail: 'Cron lanes, state, and last green time.' },
              { label: 'Runs', detail: 'Per-tick outcomes with per-run drill-down.' },
              { label: 'Board', detail: 'Cards grouped by their current status.' },
              { label: 'Catalog', detail: 'PRD spine, taxonomy, sprint links, and dossiers.' },
              { label: 'Jobs', detail: 'Skill runs, host jobs, render gates, and builds.' },
              { label: 'Traces', detail: 'Langfuse trace spine and daily cost rollup.' },
              { label: 'Lineage', detail: 'PRD lifecycle, dispatch edges, and self-improve.' },
              { label: 'Visual', detail: 'Browser-harness capture receipts.' },
              { label: 'Data', detail: 'Full curated dataset explorer — search, sort, export.' },
            ].map((item) => (
              <div
                key={item.label}
                className="glass-panel rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#D97757]" aria-hidden="true" />
                  <p className="font-serif text-lg text-[#191919]">{item.label}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#191919]/65">{item.detail}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
