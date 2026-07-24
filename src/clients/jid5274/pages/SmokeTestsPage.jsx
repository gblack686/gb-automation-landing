import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CalendarClock,
  FileText,
  GitBranch,
  Hammer,
  LayoutGrid,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Activity,
} from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import CollapsibleSection from '../../../ops/components/CollapsibleSection';
import { fetchViewMeta } from '../../../lib/supabaseOps';
import { JID5274_DATASETS, GROUPS } from '../lib/datasets';
import { formatDateTime } from '../lib/format';
import catalog from '../data/jid5274TestCatalog.json';

/**
 * SmokeTestsPage — /clients/jid5274/tests
 *
 * Read-only docs page for the jid5274 test suite. It (1) DESCRIBES the smoke tests
 * from the bundled static catalog and (2) shows the MOST RECENT
 * live activity per curated obs_jid5274 view (count + most-recent timestamp),
 * complementing the row-level data pages.
 *
 * The "Recent Smoke Results" panel reuses the registry-driven anon reader
 * (`fetchViewMeta` against the same allowlist as the data explorer). It never
 * writes; isolation is enforced server-side by each tenant-scoped view.
 */

// Stable display order + chrome for each catalog category.
const CATEGORY_META = {
  cron: { label: 'Cron', icon: CalendarClock, group: GROUPS.core },
  doc: { label: 'Doc', icon: FileText, group: GROUPS.core },
  skill: { label: 'Skill', icon: Sparkles, group: GROUPS.jobs },
  lineage: { label: 'Lineage', icon: GitBranch, group: GROUPS.lineage },
  render: { label: 'Render', icon: LayoutGrid, group: GROUPS.jobs },
  prd: { label: 'PRD', icon: FileText, group: GROUPS.catalog },
  failure: { label: 'Failure', icon: AlertTriangle, group: GROUPS.core },
  tac: { label: 'TAC', icon: Hammer, group: GROUPS.jobs },
  trace: { label: 'Trace', icon: Activity, group: GROUPS.traces },
  browser: { label: 'Browser', icon: Camera, group: GROUPS.visual },
};

const CATEGORY_ORDER = ['cron', 'skill', 'doc', 'lineage', 'render', 'prd', 'failure', 'tac', 'trace', 'browser'];

// Human label for each themed view group (mirrors the portal nav).
const GROUP_LABELS = {
  [GROUPS.core]: 'Scheduler & Board',
  [GROUPS.catalog]: 'PRD Catalog',
  [GROUPS.jobs]: 'Jobs & Builds',
  [GROUPS.traces]: 'Traces & Cost',
  [GROUPS.lineage]: 'Lineage',
  [GROUPS.visual]: 'Visual',
};

const GROUP_ORDER = [GROUPS.core, GROUPS.catalog, GROUPS.jobs, GROUPS.traces, GROUPS.lineage, GROUPS.visual];

const TS_RE = /(_at|_ts|timestamp)$|^day$/;

// Pick the column to order by (desc) so row[0] carries the most-recent time.
// Prefer the registry's defaultSort column when it is timestamp-like; otherwise
// fall back to the first timestamp-like column in the select list.
function timestampColumn(dataset) {
  const sortCol = dataset.defaultSort?.col;
  if (sortCol && TS_RE.test(sortCol)) return sortCol;
  const cols = (dataset.select || '').split(',').map((c) => c.trim());
  return cols.find((c) => TS_RE.test(c)) || null;
}

function modeBadgeClass(mode) {
  return mode === 'live-mini' ? 'gb-chip-green' : 'gb-chip-amber';
}

export default function SmokeTestsPage() {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');

  // Per-view freshness probes (count + most-recent timestamp) across the whole
  // curated allowlist. Reuses the same anon reader the data explorer uses.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      JID5274_DATASETS.map(async (dataset) => {
        const tsCol = timestampColumn(dataset);
        const order = tsCol ? `${tsCol}.desc` : undefined;
        const select = tsCol || undefined;
        try {
          const { count, row } = await fetchViewMeta(dataset.view, { select, order });
          return { view: dataset.view, count, latest: tsCol && row ? row[tsCol] : null, error: null };
        } catch (err) {
          return { view: dataset.view, count: null, latest: null, error: err?.message || 'fetch failed' };
        }
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const byView = {};
        for (const r of results) byView[r.view] = r;
        setMeta(byView);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Unable to load smoke results');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadingResults = !error && meta === null;

  const testsByCategory = useMemo(() => {
    const map = {};
    for (const t of catalog.tests) {
      (map[t.category] ||= []).push(t);
    }
    return map;
  }, []);

  const datasetsByGroup = useMemo(() => {
    const map = {};
    for (const d of JID5274_DATASETS) {
      (map[d.group] ||= []).push(d);
    }
    return map;
  }, []);

  const categoryCount = Object.keys(catalog.by_category).length;
  const totalLiveRows = useMemo(() => {
    if (!meta) return null;
    return Object.values(meta).reduce((sum, m) => sum + (Number(m.count) || 0), 0);
  }, [meta]);

  const summaryCards = [
    { label: 'Total tests', value: catalog.total, detail: `${categoryCount} categories across the suite`, icon: ListChecks },
    { label: 'Live-mini', value: catalog.by_mode['live-mini'] ?? 0, detail: 'Exercise live Mac-mini telemetry', icon: Activity },
    { label: 'Offline-CI', value: catalog.by_mode['offline-ci'] ?? 0, detail: 'Run hermetically in CI, no host', icon: ShieldCheck },
    { label: 'Live views', value: JID5274_DATASETS.length, detail: 'Curated obs_jid5274 surfaces probed', icon: LayoutGrid },
  ];

  return (
    <OpsPageShell
      number="TESTS"
      title="Smoke Test Suite"
      meta={
        <span className="gb-chip gb-chip-green">
          <ShieldCheck className="h-3.5 w-3.5" />
          Read-only
        </span>
      }
    >
      <div className="space-y-3">
        {/* 01 — Summary */}
        <CollapsibleSection
          eyebrow="01"
          title="Summary"
          meta={<span className="gb-pill">{catalog.total} tests</span>}
          defaultOpen
        >
          <p className="mb-4 max-w-3xl text-sm leading-6 text-[#191919]/65">
            The smoke suite exercises the Carlos/jid5274 tenant rails — every test executes a real
            command and asserts its output. This page is the
            human-readable catalog of all <span className="font-mono">{catalog.total}</span> tests
            plus a live freshness read of the curated <span className="font-mono">obs_jid5274</span>{' '}
            views they write into. Generated from{' '}
            <span className="font-mono text-xs">{catalog.generated_from}</span>.
          </p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
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

          <div className="mt-5">
            <p className="gb-eyebrow mb-2 text-[#191919]/45">By category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ORDER.map((cat) => {
                const Icon = CATEGORY_META[cat]?.icon ?? ListChecks;
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#D6D4C8] bg-[#F3F1E7] px-3 py-1.5 text-xs font-semibold text-[#191919]/75"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#D97757]" />
                    {CATEGORY_META[cat]?.label ?? cat}
                    <span className="font-mono text-[#191919]/50">{catalog.by_category[cat] ?? 0}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </CollapsibleSection>

        {/* 02 — Recent smoke results (live per-view freshness) */}
        <CollapsibleSection
          eyebrow="02"
          title={
            <span className="inline-flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#D97757]" />
              Recent Smoke Results
            </span>
          }
          meta={
            error ? (
              <span className="gb-chip gb-chip-red">Error</span>
            ) : loadingResults ? (
              <span className="gb-chip gb-chip-blue">Loading</span>
            ) : (
              <span className="gb-pill">
                {totalLiveRows ?? 0} rows · {JID5274_DATASETS.length} views
              </span>
            )
          }
          defaultOpen
        >
          <p className="mb-4 max-w-3xl text-sm leading-6 text-[#191919]/65">
            Live row counts and the most-recent timestamp for each curated{' '}
            <span className="font-mono">obs_jid5274</span> view, read anonymously through the same
            allowlist the data explorer uses. This shows which surfaces are currently producing{' '}
            <span className="font-mono">tenant:jid5274</span> data and how fresh it is.
          </p>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>
          )}
          {loadingResults && <p className="text-sm text-[#191919]/60">Probing jid5274 views…</p>}

          {!error && !loadingResults && (
            <div className="space-y-6">
              {GROUP_ORDER.map((group) => {
                const datasets = datasetsByGroup[group] || [];
                if (!datasets.length) return null;
                return (
                  <div key={group}>
                    <p className="gb-eyebrow mb-2 text-[#191919]/45">{GROUP_LABELS[group] ?? group}</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {datasets.map((d) => {
                        const m = meta[d.view] || {};
                        const hasRows = Number(m.count) > 0;
                        return (
                          <article
                            key={d.view}
                            className="glass-panel rounded-md border border-[#D6D4C8] bg-white/45 p-4"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-serif text-lg text-[#191919]">{d.label}</p>
                                <p className="truncate font-mono text-xs text-[#191919]/50">{d.view}</p>
                              </div>
                              {m.error ? (
                                <span className="gb-chip gb-chip-red shrink-0">err</span>
                              ) : hasRows ? (
                                <span className="gb-chip gb-chip-green shrink-0">live</span>
                              ) : (
                                <span className="gb-chip gb-chip-amber shrink-0">empty</span>
                              )}
                            </div>
                            <div className="mt-3 flex items-end justify-between gap-2">
                              <p className="font-serif text-3xl text-[#191919]">
                                {m.count == null ? '—' : m.count}
                                <span className="ml-1 text-sm font-sans text-[#191919]/45">rows</span>
                              </p>
                              <p className="text-right text-xs text-[#191919]/55">
                                <span className="block gb-eyebrow text-[#191919]/40">Latest</span>
                                {m.latest ? formatDateTime(m.latest) : '—'}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        {/* 03+ — Test catalog, one collapsible per category */}
        {CATEGORY_ORDER.map((cat, idx) => {
          const tests = testsByCategory[cat] || [];
          if (!tests.length) return null;
          const cm = CATEGORY_META[cat] || {};
          const Icon = cm.icon ?? ListChecks;
          const relatedGroup = GROUP_LABELS[cm.group];
          return (
            <CollapsibleSection
              key={cat}
              eyebrow={String(idx + 3).padStart(2, '0')}
              title={
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#D97757]" />
                  {cm.label ?? cat} Tests
                </span>
              }
              meta={
                <span className="inline-flex items-center gap-2">
                  {relatedGroup && (
                    <span className="hidden text-xs text-[#191919]/45 sm:inline">→ {relatedGroup}</span>
                  )}
                  <span className="gb-pill">{tests.length}</span>
                </span>
              }
            >
              <div className="overflow-x-auto rounded-md border border-[#D6D4C8]">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#D6D4C8] bg-[#E6E4D9]/60 text-[11px] uppercase tracking-widest text-[#191919]/55">
                      <th className="px-4 py-3 font-semibold">Key</th>
                      <th className="px-4 py-3 font-semibold">Mode</th>
                      <th className="px-4 py-3 font-semibold">Title</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold">Expect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr
                        key={t.key}
                        className="border-b border-[#D6D4C8]/60 align-top last:border-b-0 hover:bg-white/50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#191919]/80">
                          {t.key}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`gb-chip ${modeBadgeClass(t.mode)}`}>{t.mode}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-[#191919]">{t.title}</td>
                        <td className="px-4 py-3 text-[#191919]/65">{t.description || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#191919]/60">
                          {t.expect ? t.expect : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          );
        })}
      </div>
    </OpsPageShell>
  );
}
