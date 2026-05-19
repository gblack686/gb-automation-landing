import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  not_started: '#6b6b6b',
  dispatched: '#3b82f6',
  building: '#f59e0b',
  shipped: '#10b981',
  failed: '#ef4444',
};

const WAVE_COLORS = {
  1: '#8b5cf6',
  2: '#06b6d4',
  3: '#ec4899',
};

function pillStyle(color) {
  return {
    display: 'inline-block',
    padding: '3px 10px',
    background: color,
    color: '#fff',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontFamily: 'Inter, system-ui, sans-serif',
  };
}

function PRDCard({ prd }) {
  const statusColor = STATUS_COLORS[prd.status] || '#6b6b6b';
  const waveNum = Number(prd.wave);
  const waveColor = WAVE_COLORS[waveNum] || '#D97757';

  return (
    <Link
      to={`/prds/${prd.slug}`}
      className="block glass-panel rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
      style={{ minHeight: 'auto' }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h2
          className="font-serif-display text-lg leading-snug text-[#191919] group-hover:text-[#D97757] transition-colors"
          style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600 }}
        >
          {prd.title}
        </h2>
        {prd.linear_id && (
          <span
            style={{
              ...pillStyle('transparent'),
              color: '#D97757',
              border: '1px solid #D97757',
              flexShrink: 0,
            }}
          >
            {prd.linear_id}
          </span>
        )}
      </div>

      {prd.description && (
        <p className="text-[#5C5C5C] text-sm mb-4 line-clamp-2">{prd.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {prd.status && (
          <span style={pillStyle(statusColor)}>{prd.status.replace('_', ' ')}</span>
        )}
        {prd.wave && (
          <span style={pillStyle(waveColor)}>Wave {prd.wave}</span>
        )}
        {prd.purpose && (
          <span style={pillStyle('#D97757')}>{prd.purpose}</span>
        )}
        {prd.priority && (
          <span style={pillStyle(prd.priority === 'high' ? '#ef4444' : prd.priority === 'urgent' ? '#ec4899' : '#f59e0b')}>
            {prd.priority}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#8C8A84]">
        <span>{prd.date}</span>
        <span className="text-[#D97757] group-hover:underline">View PRD &rarr;</span>
      </div>
    </Link>
  );
}

function PRDIndex() {
  const [prds, setPrds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'PRDs | GBAutomation';
    fetch('/prds/prds-manifest.json')
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setPrds(sorted);
        setLoading(false);
      })
      .catch(() => {
        setPrds([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F1E7]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            to="/"
            className="flex items-center gap-3 mb-8 w-fit"
            style={{ minHeight: 'auto' }}
          >
            <div
              style={{ background: 'linear-gradient(135deg,#D97757 0%,#B85a3e 100%)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <span style={{ color: '#fff', fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '16px' }}>gb</span>
            </div>
            <span style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '18px', color: '#191919' }}>GBAutomation</span>
          </Link>

          <h1
            className="text-4xl text-[#191919] mb-3"
            style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600 }}
          >
            Product Requirement Documents
          </h1>
          <p className="text-[#5C5C5C] text-base max-w-2xl">
            Strategy artifacts from the GBAutomation build pipeline. Each PRD represents a dispatched build, visible to prospects, partners, and investors.
          </p>
        </div>

        {/* PRD grid */}
        {loading ? (
          <div className="text-center py-20 text-[#5C5C5C] italic" style={{ fontFamily: 'Newsreader, Georgia, serif' }}>
            Loading PRDs...
          </div>
        ) : prds.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#5C5C5C] italic text-lg mb-2" style={{ fontFamily: 'Newsreader, Georgia, serif' }}>
              No PRDs published yet.
            </p>
            <p className="text-[#8C8A84] text-sm">Check back after the next dispatch.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {prds.map(prd => (
              <PRDCard key={prd.slug} prd={prd} />
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-16 text-center border-t border-[#D6D4C8] pt-8">
          <p className="text-[#5C5C5C] text-sm mb-3">These are live strategy artifacts from GBAutomation's build pipeline.</p>
          <a
            href="/#contact"
            className="text-[#D97757] hover:underline text-sm"
            style={{ minHeight: 'auto' }}
          >
            Want to work together? Get in touch &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

export default PRDIndex;
