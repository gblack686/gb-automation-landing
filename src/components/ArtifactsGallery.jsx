import { useEffect, useMemo, useState } from 'react';
import ArtifactPlayer from './ArtifactPlayer';

const TYPE_LABEL = {
  video: 'Video',
  gif: 'GIF',
  image: 'Image',
  html: 'HTML',
  json: 'JSON',
  placeholder: 'Pending',
};

function fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function ArtifactsGallery() {
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [appFilter, setAppFilter] = useState('all');

  useEffect(() => {
    fetch('/portfolio/artifacts-feed.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load feed (${r.status})`);
        return r.json();
      })
      .then((data) => {
        const sorted = [...(data.artifacts || [])].sort((a, b) =>
          (b.created_at || '').localeCompare(a.created_at || '')
        );
        setArtifacts(sorted);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const types = useMemo(
    () => Array.from(new Set(artifacts.map((a) => a.type))),
    [artifacts]
  );
  const apps = useMemo(
    () => Array.from(new Set(artifacts.map((a) => a.app_slug))),
    [artifacts]
  );

  const filtered = artifacts.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (appFilter !== 'all' && a.app_slug !== appFilter) return false;
    return true;
  });

  if (loading) return <p className="text-sm text-[#191919]/60">Loading artifacts…</p>;
  if (error) return <p className="text-sm text-red-700">Could not load feed: {error}</p>;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-[#D6D4C8]/60">
        <FilterGroup
          label="Type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { v: 'all', l: 'All' },
            ...types.map((t) => ({ v: t, l: TYPE_LABEL[t] || t })),
          ]}
        />
        <FilterGroup
          label="App"
          value={appFilter}
          onChange={setAppFilter}
          options={[
            { v: 'all', l: 'All' },
            ...apps.map((a) => ({ v: a, l: a })),
          ]}
        />
        <span className="ml-auto text-xs text-[#191919]/50">
          {filtered.length} of {artifacts.length}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[#191919]/60">No artifacts match the current filter.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <article
              key={a.id}
              className="group flex flex-col bg-white border border-[#D6D4C8] rounded-lg overflow-hidden hover:border-[#D97757] transition-colors"
            >
              <div className="aspect-square bg-[#E6E4D9]">
                <ArtifactPlayer artifact={a} />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-medium text-[#191919] leading-tight">
                    {a.title}
                  </h3>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#D97757] whitespace-nowrap">
                    {TYPE_LABEL[a.type] || a.type}
                  </span>
                </div>
                {a.subtitle && (
                  <p className="text-xs text-[#191919]/60 mb-2 leading-relaxed">{a.subtitle}</p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-[#D6D4C8]/60">
                  <span className="text-[10px] uppercase tracking-wider text-[#191919]/50">
                    {a.app_name}
                  </span>
                  <span className="text-[10px] text-[#191919]/40">
                    {fmtDate(a.created_at)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-[#191919]/50">{label}</span>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              value === o.v
                ? 'bg-[#191919] text-[#F3F1E7] border-[#191919]'
                : 'bg-white text-[#191919]/70 border-[#D6D4C8] hover:border-[#D97757]'
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}
