import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const CLIENT_COLORS = {
  gbautomation: '#D97757', 'fish-group': '#8A5FBF', 'jason-diaz': '#06b6d4',
  'the-mall': '#ec4899', 'greg-trading': '#4F9D69', 'eagle-app': '#C08A3E', ecom: '#3b82f6',
};
const clientColor = (c) => CLIENT_COLORS[c] || '#6b6b6b';

function relTime(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function StatCard({ label, value, sub, to, accent }) {
  const inner = (
    <div className="glass-panel rounded-xl p-5 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="text-3xl text-[#191919]" style={{ fontFamily: 'Newsreader, Georgia, serif', fontWeight: 600 }}>{value}</div>
      <div className="text-sm font-semibold mt-1" style={{ color: accent || '#191919' }}>{label}</div>
      {sub && <div className="text-xs text-[#8C8A84] mt-0.5">{sub}</div>}
    </div>
  );
  return to ? <Link to={to} style={{ minHeight: 'auto' }}>{inner}</Link> : inner;
}

const SPOKES = [
  { to: '/repos', label: 'Repos & Commits', desc: 'Plan → commit → PR traceability' },
  { to: '/prds', label: 'Documents', desc: 'PRDs, plans, deliverables' },
  { to: '/observability', label: 'Observability', desc: 'Agent DAGs & Langfuse traces' },
  { to: '/tac', label: 'TAC Catalog', desc: 'Reusable component evidence' },
  { to: '/apps', label: 'Apps', desc: 'Client & internal mini-apps' },
];

function Overview() {
  const [repos, setRepos] = useState(null);
  const [prds, setPrds] = useState(null);
  const [dags, setDags] = useState(null);

  useEffect(() => {
    document.title = 'Overview | GBAutomation';
    fetch('/repos/repos-manifest.json').then((r) => r.json()).then(setRepos).catch(() => setRepos(null));
    fetch('/prds/prds-manifest.json').then((r) => r.json()).then(setPrds).catch(() => setPrds(null));
    fetch('/observability/dags/dags-manifest.json').then((r) => r.json()).then(setDags).catch(() => setDags(null));
  }, []);

  const prdCount = Array.isArray(prds) ? prds.length : (prds?.count ?? null);

  return (
    <div className="min-h-screen bg-[#F3F1E7]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div style={{ background: 'linear-gradient(135deg,#D97757 0%,#B85a3e 100%)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '16px' }}>gb</span>
            </div>
            <span style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '18px', color: '#191919' }}>GBAutomation</span>
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97757] mb-2">Hermes hub</div>
          <h1 className="text-4xl md:text-5xl text-[#191919] mb-3" style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600 }}>
            Operations Overview
          </h1>
          <p className="text-[#5C5C5C] text-base max-w-2xl">
            Live status across the build pipeline — what shipped, what's tracked, and where the work is happening. Every number links to its source index.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Commits" value={repos ? repos.commit_count : '—'} sub={repos ? `last ${repos.window_days}d` : ''} to="/repos" accent="#D97757" />
          <StatCard label="Repos" value={repos ? repos.repo_count : '—'} sub={repos ? `${repos.client_count} clients` : ''} to="/repos" accent="#8A5FBF" />
          <StatCard label="PRDs & Plans" value={prdCount ?? '—'} sub="strategy artifacts" to="/prds" accent="#06b6d4" />
          <StatCard label="Agent DAGs" value={Array.isArray(dags) ? dags.length : '—'} sub="Langfuse traces" to="/observability" accent="#4F9D69" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Spokes */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97757] mb-4">Workspace</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {SPOKES.map((s) => (
                <Link key={s.to} to={s.to} className="block glass-panel rounded-xl p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group" style={{ minHeight: 'auto' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[#191919] group-hover:text-[#D97757] transition-colors" style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: 18 }}>{s.label}</h3>
                    <span className="text-[#D97757]">&rarr;</span>
                  </div>
                  <p className="text-[#5C5C5C] text-sm mt-1">{s.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <aside className="lg:sticky lg:top-6 h-fit">
            <div className="glass-panel rounded-xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97757] mb-4">Recent activity</p>
              {!repos ? (
                <p className="text-[#8C8A84] text-sm">Loading...</p>
              ) : (
                <ul className="space-y-3">
                  {repos.recent_activity.slice(0, 14).map((c) => (
                    <li key={c.sha} className="text-xs">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span style={{ width: 7, height: 7, borderRadius: 999, background: clientColor(c.client), display: 'inline-block', flexShrink: 0 }} />
                        <span className="text-[#8C8A84] truncate">{c.repo}</span>
                        <span className="text-[#C9C7BC] ml-auto shrink-0">{relTime(c.date)}</span>
                      </div>
                      <p className="text-[#5C5C5C] pl-3.5 leading-snug">{c.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Overview;
