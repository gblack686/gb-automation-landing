import { useEffect, useMemo, useState } from 'react';
import { Activity, ExternalLink, GitBranch } from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import CollapsibleSection from '../../../ops/components/CollapsibleSection';
import { fetchSmokeRuns, fetchSmokeRunOutputs } from '../../../lib/supabaseOps';
import { formatCost, formatDateTime, formatDuration, formatSeconds, statusChipClass } from '../lib/format';

export default function RunsPage() {
  const [runs, setRuns] = useState(null);
  const [outputs, setOutputs] = useState(null);
  const [selectedTick, setSelectedTick] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchSmokeRuns(), fetchSmokeRunOutputs()])
      .then(([r, o]) => {
        if (cancelled) return;
        const runList = r || [];
        setRuns(runList);
        setOutputs(o || []);
        if (runList.length) setSelectedTick(runList[0].tick_id);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load runs');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = !error && (runs === null || outputs === null);
  const empty = !error && !loading && runs.length === 0;

  const outputsByTick = useMemo(() => {
    const map = new Map();
    for (const o of outputs || []) {
      const key = o.tick_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(o);
    }
    return map;
  }, [outputs]);

  const selectedRun = runs?.find((r) => r.tick_id === selectedTick) || null;
  const selectedOutputs = selectedTick ? outputsByTick.get(selectedTick) || [] : [];

  return (
    <OpsPageShell
      number="RUNS"
      title="Scheduler Runs"
      meta={<span className="gb-pill">{runs?.length ?? 0} ticks</span>}
    >
      <div className="space-y-3">
        <CollapsibleSection
          eyebrow="01"
          title="Run Activity"
          meta={
            error ? (
              <span className="gb-chip gb-chip-red">Error</span>
            ) : loading ? (
              <span className="gb-chip gb-chip-blue">Loading</span>
            ) : empty ? (
              <span className="gb-chip gb-chip-amber">Empty</span>
            ) : (
              <span className="gb-pill">{runs.length}</span>
            )
          }
          defaultOpen
        >
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>
          )}
          {loading && <p className="text-sm text-[#191919]/60">Loading runs…</p>}
          {empty && <p className="text-sm text-[#191919]/60">No runs captured for this tenant yet.</p>}

          {!error && !loading && !empty && (
            <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
              <aside className="glass-panel reveal max-h-[680px] overflow-auto rounded-md border border-[#D6D4C8]">
                {runs.map((run) => {
                  const active = run.tick_id === selectedTick;
                  return (
                    <button
                      key={run.tick_id}
                      type="button"
                      onClick={() => setSelectedTick(run.tick_id)}
                      className={`block w-full border-b border-[#D6D4C8] px-4 py-4 text-left transition last:border-b-0 ${
                        active ? 'bg-[#191919] text-[#F3F1E7]' : 'text-[#191919] hover:bg-white/70'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-semibold">
                          {run.cron_name || run.tick_id}
                        </span>
                        <span className="shrink-0 text-xs font-mono">
                          {formatDuration(run.elapsed_ms)}
                        </span>
                      </span>
                      <span className={`mt-1 block text-xs ${active ? 'text-[#F3F1E7]/60' : 'text-[#191919]/50'}`}>
                        {formatDateTime(run.started_at)}
                      </span>
                      <span className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                        <span className={active ? 'text-emerald-300' : 'text-emerald-700'}>
                          {run.ok_count ?? 0} ok
                        </span>
                        <span className={active ? 'text-red-300' : 'text-red-700'}>
                          {run.fail_count ?? 0} fail
                        </span>
                        <span className={active ? 'text-[#F3F1E7]/60' : 'text-[#191919]/50'}>
                          {run.skipped_count ?? 0} skip
                        </span>
                        <span className={active ? 'text-[#F3F1E7]/60' : 'text-[#191919]/50'}>
                          {formatCost(run.total_cost_usd)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </aside>

              <section className="glass-panel reveal min-w-0 rounded-md border border-[#D6D4C8] p-5">
                {selectedRun ? (
                  <>
                    <div className="flex flex-col gap-3 border-b border-[#D6D4C8] pb-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="gb-eyebrow text-[#191919]/45">Tick {selectedRun.tick_id}</p>
                        <h2 className="mt-2 break-words font-serif text-3xl font-medium text-[#191919]">
                          {selectedRun.cron_name || 'Run'}
                        </h2>
                        <p className="mt-2 text-sm text-[#191919]/55">
                          {formatDateTime(selectedRun.started_at)} → {formatDateTime(selectedRun.ended_at)}
                          {selectedRun.host ? ` · ${selectedRun.host}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="gb-chip gb-chip-green uppercase">{selectedRun.ok_count ?? 0} ok</span>
                        <span className="gb-chip gb-chip-red uppercase">{selectedRun.fail_count ?? 0} fail</span>
                        <span className="gb-chip gb-chip-amber uppercase">{selectedRun.skipped_count ?? 0} skip</span>
                      </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        { label: 'Picked', value: selectedRun.picked_count ?? 0 },
                        { label: 'Elapsed', value: formatDuration(selectedRun.elapsed_ms) },
                        { label: 'Cost', value: formatCost(selectedRun.total_cost_usd) },
                        { label: 'Outputs', value: selectedOutputs.length },
                      ].map((stat) => (
                        <div key={stat.label}>
                          <dt className="gb-eyebrow text-[#191919]/45">{stat.label}</dt>
                          <dd className="mt-1 font-serif text-2xl text-[#191919]">{stat.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-6">
                      <p className="gb-eyebrow flex items-center gap-2 text-[#191919]/45">
                        <Activity className="h-3.5 w-3.5 text-[#D97757]" />
                        Per-output drill-down
                      </p>
                      {selectedOutputs.length === 0 ? (
                        <p className="mt-3 text-sm text-[#191919]/60">No outputs recorded for this run.</p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {selectedOutputs.map((o) => (
                            <article
                              key={o.output_id}
                              className="rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`gb-chip ${statusChipClass(o.status)} uppercase`}>
                                    {o.status || 'unknown'}
                                  </span>
                                  {o.issue_id && (
                                    <span className="font-mono text-xs text-[#191919]/55">#{o.issue_id}</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-[#191919]/55">
                                  <span>{o.turns ?? 0} turns</span>
                                  <span>{formatSeconds(o.duration_s)}</span>
                                  <span>{formatCost(o.cost_usd)}</span>
                                </div>
                              </div>
                              {o.agent_summary && (
                                <p className="mt-3 text-sm leading-6 text-[#191919]/70">{o.agent_summary}</p>
                              )}
                              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                                {o.branch && (
                                  <span className="inline-flex items-center gap-1 font-mono text-[#191919]/55">
                                    <GitBranch className="h-3.5 w-3.5 text-[#D97757]" />
                                    {o.branch}
                                  </span>
                                )}
                                {o.pr_url && (
                                  <a
                                    href={o.pr_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-[#D97757] hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    PR
                                  </a>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#191919]/60">Select a run to see its outputs.</p>
                )}
              </section>
            </div>
          )}
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
