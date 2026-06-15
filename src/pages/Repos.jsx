import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const CLIENT_COLORS = {
  gbautomation: '#D97757',
  'fish-group': '#8A5FBF',
  'jason-diaz': '#06b6d4',
  'the-mall': '#ec4899',
  'greg-trading': '#4F9D69',
  'eagle-app': '#C08A3E',
  ecom: '#3b82f6',
};

function clientColor(c) {
  return CLIENT_COLORS[c] || '#6b6b6b';
}

function pill(color, filled = true) {
  return {
    display: 'inline-block', padding: '2px 9px',
    background: filled ? color : 'transparent', color: filled ? '#fff' : color,
    border: filled ? 'none' : `1px solid ${color}`, borderRadius: '12px',
    fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em',
    fontFamily: 'Inter, system-ui, sans-serif',
  };
}

function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function RepoCard({ repo }) {
  const cc = clientColor(repo.client);
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-[#191919]" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: 15 }}>
          {repo.repo}
        </h2>
        <span style={pill(cc, false)}>{repo.client}</span>
      </div>
      <p className="text-[#8C8A84] text-xs mb-3">{repo.role}</p>
      <div className="flex items-center gap-3 text-xs text-[#5C5C5C] mb-3">
        <span><strong className="text-[#191919]">{repo.commit_count}</strong> commits</span>
        <span className="text-[#D6D4C8]">·</span>
        <span>{repo.branch}</span>
        <span className="text-[#D6D4C8]">·</span>
        <span>{relTime(repo.last_commit_at)}</span>
      </div>
      <ul className="space-y-1.5 border-t border-[#D6D4C8] pt-3">
        {repo.recent_commits.slice(0, 4).map((c) => (
          <li key={c.sha} className="flex items-start gap-2 text-xs">
            <code className="text-[#8A5FBF] shrink-0" style={{ fontFamily: 'JetBrains Mono, Consolas, monospace' }}>{c.short_sha.slice(0, 7)}</code>
            <span className="text-[#5C5C5C] truncate">{c.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Repos() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Repos & Commits | GBAutomation';
    fetch('/repos/repos-manifest.json')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F1E7]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link to="/overview" className="flex items-center gap-3 mb-8 w-fit" style={{ minHeight: 'auto' }}>
            <div style={{ background: 'linear-gradient(135deg,#D97757 0%,#B85a3e 100%)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '16px' }}>gb</span>
            </div>
            <span style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '18px', color: '#191919' }}>GBAutomation</span>
          </Link>
          <h1 className="text-4xl text-[#191919] mb-3" style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600 }}>
            Repos &amp; Commits
          </h1>
          {data && (
            <p className="text-[#5C5C5C] text-base">
              <strong className="text-[#191919]">{data.commit_count}</strong> commits across{' '}
              <strong className="text-[#191919]">{data.repo_count}</strong> repos and{' '}
              <strong className="text-[#191919]">{data.client_count}</strong> clients, last {data.window_days} days.
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#5C5C5C] italic" style={{ fontFamily: 'Newsreader, Georgia, serif' }}>Loading commits...</div>
        ) : !data ? (
          <div className="text-center py-20 text-[#5C5C5C] italic">Commit index unavailable.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Repo grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {data.repos.map((r) => <RepoCard key={r.repo} repo={r} />)}
            </div>

            {/* Recent activity rail */}
            <aside className="lg:sticky lg:top-6 h-fit">
              <div className="glass-panel rounded-xl p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97757] mb-4">Recent activity</p>
                <ul className="space-y-3">
                  {data.recent_activity.slice(0, 16).map((c) => (
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
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

export default Repos;
