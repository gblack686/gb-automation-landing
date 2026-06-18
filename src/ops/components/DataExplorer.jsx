import { useEffect, useState } from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import OpsPageShell from './OpsPageShell';
import CollapsibleSection from './CollapsibleSection';
import DataTable from './DataTable';

/**
 * DataExplorer — generic, themed, read-only Supabase view explorer.
 *
 * Tenant-agnostic: it takes a dataset registry + a fetch function as props, so
 * any tenant portal can reuse it. The registry doubles as the security
 * allowlist (the explorer only ever asks for views it was handed). All reads go
 * through `fetchDataset`, which the host wires to the curated, tenant-scoped
 * anon views — no raw SQL, no client-side filters for isolation.
 *
 * Props:
 *   - datasets     (array, required) Registry entries: { view, label, description, ... }.
 *   - fetchDataset (fn, required)    async (dataset) => row[]  (registry-validated by caller).
 *   - title        (node)   Page title. Default 'Data Explorer'.
 *   - eyebrow      (node)   Page eyebrow/number. Default 'DATA'.
 *   - pageSize     (number) Rows per table page. Default 25.
 */
export default function DataExplorer({
  datasets = [],
  fetchDataset,
  title = 'Data Explorer',
  eyebrow = 'DATA',
  pageSize = 25,
}) {
  const [activeView, setActiveView] = useState(datasets[0]?.view ?? null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const active = datasets.find((d) => d.view === activeView) || datasets[0] || null;

  useEffect(() => {
    if (!active || typeof fetchDataset !== 'function') return undefined;
    let cancelled = false;
    setRows(null);
    setError('');
    fetchDataset(active)
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Unable to load dataset');
      });
    return () => {
      cancelled = true;
    };
  }, [active, fetchDataset]);

  const loading = !error && rows === null;
  const empty = !error && !loading && rows.length === 0;

  const sectionMeta = error ? (
    <span className="gb-chip gb-chip-red">Error</span>
  ) : loading ? (
    <span className="gb-chip gb-chip-blue">Loading</span>
  ) : empty ? (
    <span className="gb-chip gb-chip-amber">Empty</span>
  ) : (
    <span className="gb-pill">{rows.length} rows</span>
  );

  return (
    <OpsPageShell
      number={eyebrow}
      title={title}
      meta={
        <span className="gb-chip gb-chip-green">
          <ShieldCheck className="h-3.5 w-3.5" />
          Read-only
        </span>
      }
    >
      <div className="space-y-3">
        {/* Dataset picker */}
        <nav className="flex flex-wrap gap-1 rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-1 text-xs font-semibold uppercase tracking-widest">
          {datasets.map((d) => {
            const isActive = d.view === active?.view;
            return (
              <button
                key={d.view}
                type="button"
                onClick={() => setActiveView(d.view)}
                className={`inline-flex min-h-0 items-center gap-1.5 rounded px-3 py-2 transition-colors ${
                  isActive
                    ? 'bg-[#191919] text-[#F3F1E7]'
                    : 'text-[#191919]/60 hover:bg-white/50 hover:text-[#191919]'
                }`}
              >
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                {d.label}
              </button>
            );
          })}
        </nav>

        <CollapsibleSection
          eyebrow="01"
          title={active?.label || 'Dataset'}
          meta={sectionMeta}
          defaultOpen
        >
          {active?.description && (
            <p className="mb-4 max-w-3xl text-sm leading-6 text-[#191919]/65">{active.description}</p>
          )}
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>
          )}
          {loading && <p className="text-sm text-[#191919]/60">Loading {active?.label || 'data'}…</p>}
          {empty && (
            <p className="rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60 p-5 text-sm text-[#191919]/60">
              No rows yet for this dataset. Empty states are expected while the tenant warms up.
            </p>
          )}
          {!error && !loading && !empty && (
            <DataTable rows={rows} pageSize={pageSize} exportName={active?.view || 'export'} />
          )}
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="02"
          title="About this explorer"
          meta={<span className="gb-pill">{datasets.length} datasets</span>}
        >
          <div className="space-y-3 text-sm leading-6 text-[#191919]/70">
            <p>
              This explorer is read-only. It queries a curated allowlist of{' '}
              <span className="font-mono">{datasets.length}</span> Supabase views, each already
              scoped to this tenant on the server. The browser only issues anonymous{' '}
              <span className="font-mono">SELECT</span>-style REST reads — there is no raw SQL and no
              client-side filtering used for isolation.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {datasets.map((d) => (
                <li key={d.view}>
                  <span className="font-medium text-[#191919]">{d.label}</span>{' '}
                  <span className="font-mono text-xs text-[#191919]/55">{d.view}</span>
                  {d.description ? <> — {d.description}</> : null}
                </li>
              ))}
            </ul>
            <p className="text-[#191919]/55">
              Use the search box to filter the loaded rows, click a column header to sort, and export
              the current view to CSV.
            </p>
          </div>
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
