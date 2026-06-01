import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, FileText, Palette, ListTree, AlertCircle, Download, ExternalLink, Layers } from 'lucide-react';
import Footer from '../components/Footer';
import SignOutButton from '../components/SignOutButton';
import {
  actionColor,
  groupPagesByHeader,
  severityColor,
  sortBySeverity,
  summarizeInventory,
  summarizeSurfaceGroups,
} from '../lib/uiAgent/audit';

const BRAND_URL = '/ui-agent/gbautomation-brand.json';
const INVENTORY_URL = '/ui-agent/page-inventory.json';

function SwatchTile({ label, value }) {
  const isColor = typeof value === 'string' && value.startsWith('#');
  return (
    <div className="rounded-lg border border-[#D6D4C8] bg-white/70 p-3">
      <div
        className="h-10 w-full rounded-md border border-[#D6D4C8]"
        style={{ background: isColor ? value : '#fff' }}
        aria-hidden="true"
      />
      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#191919]/55">
        {label}
      </p>
      <p className="font-mono text-xs text-[#191919]/80">{value}</p>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-[#D6D4C8] bg-white/70 p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/55">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl text-[#191919]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#191919]/55">{hint}</p>}
    </div>
  );
}

export default function UiAgent() {
  const [brand, setBrand] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(BRAND_URL, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`Brand spec ${r.status}`);
        return r.json();
      }),
      fetch(INVENTORY_URL, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`Inventory ${r.status}`);
        return r.json();
      }),
    ])
      .then(([b, i]) => {
        if (cancelled) return;
        setBrand(b);
        setInventory(i);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
        <div className="max-w-3xl mx-auto px-6 py-24 text-sm text-[#191919]/70">
          <p className="font-serif text-2xl text-[#191919]">UI Agent could not load.</p>
          <p className="mt-4 font-mono text-xs">{error}</p>
        </div>
      </div>
    );
  }

  if (!brand || !inventory) {
    return (
      <div className="min-h-screen bg-[#F3F1E7] flex items-center justify-center text-sm text-[#191919]/60">
        Loading UI Agent…
      </div>
    );
  }

  const findings = sortBySeverity(inventory.uniformityFindings || []);
  const summary = summarizeInventory(inventory.pages || []);
  const headerGroups = groupPagesByHeader(inventory.pages || []);
  const surfaceGroups = inventory.surfaceGroups || [];
  const surfaceSummary = summarizeSurfaceGroups(surfaceGroups);

  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <header className="py-10 border-b border-[#D6D4C8]/60">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 hover-mini"
            aria-label="GB Automation home"
          >
            <div className="w-4 h-4 bg-[#D97757]/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-[#D97757] rounded-full"></div>
            </div>
            <span className="text-xs font-serif font-semibold text-[#191919] tracking-widest uppercase">
              GB Automation
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-xs uppercase tracking-widest">
            <Link to="/apps" className="text-[#191919]/60 hover:text-[#D97757]">Apps</Link>
            <Link to="/artifacts" className="text-[#191919]/60 hover:text-[#D97757]">Artifacts</Link>
            <Link to="/ui-agent" className="text-[#191919] font-bold border-b border-[#D97757] pb-0.5">
              UI Agent
            </Link>
            <Link to="/plan" className="text-[#191919]/60 hover:text-[#D97757]">Plan</Link>
            <span className="w-px h-3 bg-[#D6D4C8]" aria-hidden="true" />
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 space-y-16">
        <section className="space-y-4">
          <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            UI Agent
          </span>
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] tracking-tight">
            Brand-consistent UI audit for GBAutomation
          </h1>
          <p className="text-base text-[#191919]/70 max-w-3xl leading-relaxed">
            Bridges the{' '}
            <a
              href="https://github.com/gblack686-openclaw/ui-agents"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D97757] hover:underline inline-flex items-center gap-1"
            >
              ui-agents repo
              <ExternalLink className="h-3 w-3" />
            </a>{' '}
            into this site. Loads the canonical{' '}
            <code className="bg-[#E6E4D9] px-1.5 py-0.5 rounded text-sm">gbautomation</code> brand
            spec, walks every route, and flags uniformity gaps so the rest of the site can be
            brought in line. The plain-text report is at{' '}
            <a
              href="/docs/ui-agent-page-map.md"
              className="text-[#D97757] hover:underline inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/ui-agent-page-map.md
              <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <a
              href={BRAND_URL}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D6D4C8] px-4 py-2 uppercase tracking-widest text-[#191919]/65 hover:border-[#D97757] hover:text-[#D97757]"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-3 w-3" /> Brand JSON
            </a>
            <a
              href={INVENTORY_URL}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D6D4C8] px-4 py-2 uppercase tracking-widest text-[#191919]/65 hover:border-[#D97757] hover:text-[#D97757]"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-3 w-3" /> Inventory JSON
            </a>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Surface groups"
            value={surfaceSummary.total || '—'}
            hint={
              surfaceSummary.totalEntries
                ? `${surfaceSummary.totalEntries} routes + static + data entries`
                : undefined
            }
          />
          <StatCard label="React routes catalogued" value={summary.total} />
          <StatCard
            label="Header families"
            value={Object.keys(summary.headerCounts).length}
            hint="Lower is more uniform"
          />
          <StatCard
            label="Open findings"
            value={findings.filter((f) => f.severity !== 'info').length}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[#D97757]" />
            <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
              Brand spec
            </span>
          </div>
          <h2 className="font-serif text-2xl text-[#191919]">
            {brand.name} — {brand.tagline}
          </h2>
          <p className="text-sm text-[#191919]/70 max-w-3xl">{brand.identity?.mission}</p>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Object.entries(brand.palette || {}).map(([label, value]) => (
              <SwatchTile key={label} label={label} value={value} />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-lg border border-[#D6D4C8] bg-white/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/55">
                Heading font
              </p>
              <p
                className="mt-2 text-xl text-[#191919]"
                style={{ fontFamily: brand.typography?.heading }}
              >
                Newsreader serif headline
              </p>
              <p className="mt-1 font-mono text-[11px] text-[#191919]/55">
                {brand.typography?.heading}
              </p>
            </div>
            <div className="rounded-lg border border-[#D6D4C8] bg-white/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/55">
                Body font
              </p>
              <p className="mt-2 text-base text-[#191919]" style={{ fontFamily: brand.typography?.body }}>
                Inter, the workhorse of body copy.
              </p>
              <p className="mt-1 font-mono text-[11px] text-[#191919]/55">
                {brand.typography?.body}
              </p>
            </div>
            <div className="rounded-lg border border-[#D6D4C8] bg-white/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/55">
                Voice
              </p>
              <p className="mt-2 text-sm text-[#191919]/80">{brand.identity?.voice}</p>
              <p className="mt-2 text-[11px] text-[#191919]/55">
                Avoid: {brand.identity?.avoid?.join(', ')}
              </p>
            </div>
          </div>
        </section>

        {surfaceGroups.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#D97757]" />
              <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
                Surface taxonomy
              </span>
            </div>
            <h2 className="font-serif text-2xl text-[#191919]">
              Site organized by surface group
            </h2>
            <p className="text-sm text-[#191919]/70 max-w-3xl">
              Seven distinct surface families. Each carries its own auth class, source data, and
              recommended UI-agent action. Use this as the unit of work for design uniformity runs
              rather than individual routes.
            </p>
            <div className="space-y-4">
              {surfaceGroups.map((group) => {
                const ac = actionColor(group.recommendedAction);
                const routes = group.routes || [];
                const statics = group.staticPages || [];
                const data = group.dataSources || [];
                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-[#D6D4C8] bg-white/70 p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#D97757]">
                          {group.id}
                        </p>
                        <h3 className="font-serif text-xl text-[#191919]">
                          {group.label}{' '}
                          <span className="text-sm text-[#191919]/55">
                            ({routes.length + statics.length + data.length} entries)
                          </span>
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#E6E4D9] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#191919]/65">
                          {group.authClass}
                        </span>
                        <span
                          className={`rounded-full ${ac.bg} ${ac.text} ${ac.border} border px-3 py-1 text-[10px] font-bold uppercase tracking-widest`}
                        >
                          {group.recommendedAction}
                        </span>
                      </div>
                    </div>
                    {group.summary && (
                      <p className="mt-3 text-sm text-[#191919]/70">{group.summary}</p>
                    )}
                    {group.groupNotes && (
                      <p className="mt-2 text-xs italic text-[#191919]/55">{group.groupNotes}</p>
                    )}

                    {routes.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45 mb-2">
                          React routes ({routes.length})
                        </p>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-[10px] uppercase tracking-widest text-[#191919]/45">
                                <th className="text-left font-semibold py-1 pr-4">Path</th>
                                <th className="text-left font-semibold py-1 pr-4">Source</th>
                                <th className="text-left font-semibold py-1 pr-4">Action</th>
                                <th className="text-left font-semibold py-1 pr-4">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {routes.map((r) => {
                                const rac = actionColor(r.recommendedAction);
                                return (
                                  <tr
                                    key={r.path || r.pattern}
                                    className="border-t border-[#D6D4C8]/60 align-top"
                                  >
                                    <td className="py-1.5 pr-4 font-mono text-[12px] text-[#191919]">
                                      {r.path || r.pattern}
                                    </td>
                                    <td className="py-1.5 pr-4 font-mono text-[11px] text-[#191919]/65">
                                      {r.source}
                                    </td>
                                    <td className="py-1.5 pr-4">
                                      <span
                                        className={`rounded-full ${rac.bg} ${rac.text} px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest`}
                                      >
                                        {r.recommendedAction || '—'}
                                      </span>
                                    </td>
                                    <td className="py-1.5 pr-4 text-[#191919]/65 max-w-md">
                                      {r.notes || ''}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {statics.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45 mb-2">
                          Static HTML ({statics.length})
                        </p>
                        <ul className="space-y-1.5">
                          {statics.map((s) => {
                            const sac = actionColor(s.recommendedAction);
                            return (
                              <li
                                key={s.path}
                                className="flex flex-wrap items-baseline gap-2 text-sm"
                              >
                                <code className="font-mono text-[12px] text-[#191919]">
                                  {s.path}
                                </code>
                                <span
                                  className={`rounded-full ${sac.bg} ${sac.text} px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest`}
                                >
                                  {s.recommendedAction || '—'}
                                </span>
                                {s.notes && (
                                  <span className="text-xs text-[#191919]/60">{s.notes}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {data.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45 mb-2">
                          Data sources ({data.length})
                        </p>
                        <ul className="space-y-1.5">
                          {data.map((d) => {
                            const dac = actionColor(d.recommendedAction);
                            return (
                              <li
                                key={d.path}
                                className="flex flex-wrap items-baseline gap-2 text-sm"
                              >
                                <code className="font-mono text-[12px] text-[#191919]">
                                  {d.path}
                                </code>
                                <span
                                  className={`rounded-full ${dac.bg} ${dac.text} px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest`}
                                >
                                  {d.recommendedAction || '—'}
                                </span>
                                {d.feeds && (
                                  <span className="text-xs text-[#191919]/60">
                                    → {Array.isArray(d.feeds) ? d.feeds.join(', ') : d.feeds}
                                  </span>
                                )}
                                {d.notes && (
                                  <span className="text-xs text-[#191919]/55 italic">
                                    {d.notes}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ListTree className="h-4 w-4 text-[#D97757]" />
            <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
              Page inventory
            </span>
          </div>
          <h2 className="font-serif text-2xl text-[#191919]">All React routes by header family</h2>
          {[...headerGroups.entries()].map(([headerId, pages]) => {
            const pattern = inventory.headerPatterns?.[headerId];
            return (
              <div key={headerId} className="rounded-xl border border-[#D6D4C8] bg-white/60 p-5">
                <div className="flex items-baseline justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#D97757]">
                      Header family
                    </p>
                    <h3 className="font-serif text-xl text-[#191919]">
                      {pattern?.label || headerId}{' '}
                      <span className="text-sm text-[#191919]/55">
                        ({pages.length} {pages.length === 1 ? 'page' : 'pages'})
                      </span>
                    </h3>
                  </div>
                  {pattern?.example && (
                    <code className="text-[11px] bg-[#E6E4D9] px-2 py-1 rounded text-[#191919]/70">
                      {pattern.example}
                    </code>
                  )}
                </div>
                {pattern?.summary && (
                  <p className="mt-2 text-sm text-[#191919]/70">{pattern.summary}</p>
                )}
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-[#191919]/45">
                        <th className="text-left font-semibold py-2 pr-4">Route</th>
                        <th className="text-left font-semibold py-2 pr-4">File</th>
                        <th className="text-left font-semibold py-2 pr-4">Auth</th>
                        <th className="text-left font-semibold py-2 pr-4">Footer</th>
                        <th className="text-left font-semibold py-2 pr-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map((page) => (
                        <tr key={page.path} className="border-t border-[#D6D4C8]/60 align-top">
                          <td className="py-2 pr-4 font-mono text-[#191919]">{page.path}</td>
                          <td className="py-2 pr-4 font-mono text-[11px] text-[#191919]/65">
                            {page.file}
                          </td>
                          <td className="py-2 pr-4 text-[#191919]/70">{page.auth}</td>
                          <td className="py-2 pr-4 text-[#191919]/70">
                            {page.footer ? 'yes' : 'no'}
                          </td>
                          <td className="py-2 pr-4 text-[#191919]/65 max-w-xl">{page.notes || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#D97757]" />
            <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
              Uniformity findings
            </span>
          </div>
          <h2 className="font-serif text-2xl text-[#191919]">What to fix and why</h2>
          <ul className="space-y-3">
            {findings.map((f) => {
              const c = severityColor(f.severity);
              return (
                <li
                  key={f.id}
                  className={`rounded-xl border ${c.border} bg-white/70 p-5`}
                >
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span
                      className={`rounded-full ${c.bg} ${c.text} px-3 py-1 text-[10px] font-bold uppercase tracking-widest`}
                    >
                      {f.severity}
                    </span>
                    <h3 className="font-serif text-lg text-[#191919]">{f.title}</h3>
                    <code className="text-[11px] text-[#191919]/45 font-mono">{f.id}</code>
                  </div>
                  <p className="mt-3 text-sm text-[#191919]/75">{f.detail}</p>
                  <p className="mt-2 text-sm text-[#191919]">
                    <span className="font-bold text-[#D97757]">Recommendation: </span>
                    {f.recommendation}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-[#D6D4C8] bg-white/60 p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#D97757]" />
            <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
              Source
            </span>
          </div>
          <p className="mt-3 text-sm text-[#191919]/70">
            Brand spec mirrors{' '}
            <code className="bg-[#E6E4D9] px-1.5 py-0.5 rounded">{brand.source}</code> from the
            ui-agents repo. To regenerate after a brand change there:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-[#191919] p-4 text-xs text-[#F3F1E7]">
{`# in ~/repos/ui-agents — edit src/brands/gbautomation/brand.yaml
# then re-export tokens into this site:
cp ~/repos/ui-agents/apps/infinite-ui/src/brands/gbautomation/brand.yaml \\
   ~/repos/gb-automation-landing/.ui-agent-source.yaml
# convert to JSON via your preferred tool (yq, python, etc.) and overwrite
# public/ui-agent/gbautomation-brand.json`}
          </pre>
        </section>
      </main>

      <Footer />
    </div>
  );
}
