import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ArrowRight } from 'lucide-react';

const STATUS_STYLE = {
  experimental: 'bg-[#D97757]/15 text-[#D97757] border-[#D97757]/30',
  live: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  placeholder: 'bg-[#E6E4D9] text-[#191919]/50 border-[#D6D4C8]',
  archived: 'bg-[#191919]/10 text-[#191919]/60 border-[#191919]/20',
};

export default function AppsGallery() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/portfolio/apps-registry.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load registry (${r.status})`);
        return r.json();
      })
      .then((data) => {
        setApps(data.apps || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="text-sm text-[#191919]/60">Loading appsâ€¦</p>;
  }
  if (error) {
    return <p className="text-sm text-red-700">Could not load apps: {error}</p>;
  }
  if (apps.length === 0) {
    return <p className="text-sm text-[#191919]/60">No apps published yet.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {apps.map((app) => (
        <article
          key={app.slug}
          className="group flex flex-col bg-white border border-[#D6D4C8] rounded-lg overflow-hidden hover:border-[#D97757] transition-colors"
        >
          <div className="aspect-[4/3] bg-[#E6E4D9] overflow-hidden">
            {app.thumbnail ? (
              <img
                src={app.thumbnail}
                alt={app.name}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#191919]/30 text-xs uppercase tracking-widest">
                No preview
              </div>
            )}
          </div>

          <div className="p-5 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-xl font-serif font-medium text-[#191919]">
                {app.name}
              </h3>
              <span
                className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 border rounded-full whitespace-nowrap ${
                  STATUS_STYLE[app.status] || STATUS_STYLE.archived
                }`}
              >
                {app.status}
              </span>
            </div>

            <p className="text-sm text-[#191919]/70 mb-3 leading-relaxed">
              {app.tagline}
            </p>

            {app.tech_stack && app.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {app.tech_stack.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] uppercase tracking-wider text-[#191919]/60 bg-[#F3F1E7] px-2 py-0.5 rounded"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-[#D6D4C8]/60">
              {app.latest_run ? (
                <span className="text-xs text-[#191919]/60">
                  Latest:{' '}
                  <span className="font-mono text-[#191919]/80">
                    {app.latest_run.job_id}
                  </span>
                  {app.latest_run.logo_score != null && (
                    <span className="ml-2 text-[#D97757] font-bold">
                      {app.latest_run.logo_score}/100
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-xs text-[#191919]/40 italic">No runs yet</span>
              )}

              <div className="flex items-center gap-3">
                {app.app_path && (
                  <Link
                    to={app.app_path}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97757] hover:text-[#191919] transition-colors"
                    aria-label={`Launch ${app.name}`}
                  >
                    Launch <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
                {app.repo && (
                  <a
                    href={app.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#191919]/60 hover:text-[#D97757] transition-colors"
                    aria-label={`Open ${app.name} repo`}
                  >
                    Repo <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

