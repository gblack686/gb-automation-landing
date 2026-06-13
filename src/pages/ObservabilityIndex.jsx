import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const TYPE_COLORS = {
  agent: '#8A5FBF',
  approval: '#C08A3E',
  tool: '#06b6d4',
  artifact: '#4F9D69',
  data: '#6b6b6b',
  gate: '#B94A48',
};

function pillStyle(color, filled = true) {
  return {
    display: 'inline-block',
    padding: '3px 10px',
    background: filled ? color : 'transparent',
    color: filled ? '#fff' : color,
    border: filled ? 'none' : `1px solid ${color}`,
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontFamily: 'Inter, system-ui, sans-serif',
  };
}

function DagCard({ dag }) {
  const typeEntries = Object.entries(dag.types || {}).sort((a, b) => b[1] - a[1]);

  return (
    <Link
      to={`/observability/${dag.slug}`}
      className="block glass-panel rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
      style={{ minHeight: 'auto' }}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <h2
          className="font-serif-display text-lg leading-snug text-[#191919] group-hover:text-[#D97757] transition-colors"
          style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600 }}
        >
          {dag.title}
        </h2>
        <span style={{ ...pillStyle('#8A5FBF', false), flexShrink: 0 }}>
          {dag.node_count} nodes
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {typeEntries.map(([type, count]) => (
          <span key={type} style={pillStyle(TYPE_COLORS[type] || '#6b6b6b')}>
            {count} {type}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-[#8C8A84]">
        <span>{dag.date}</span>
        <span className="text-[#D97757] group-hover:underline">View DAG &rarr;</span>
      </div>
    </Link>
  );
}

function ObservabilityIndex() {
  const [dags, setDags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Observability | GBAutomation';
    fetch('/observability/dags/dags-manifest.json')
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setDags(sorted);
        setLoading(false);
      })
      .catch(() => {
        setDags([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F1E7]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link to="/" className="flex items-center gap-3 mb-8 w-fit" style={{ minHeight: 'auto' }}>
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
            Agent Observability
          </h1>
          <p className="text-[#5C5C5C] text-base max-w-2xl">
            Multi-agent execution DAGs from the GBAutomation build pipeline &mdash; supervisor routing,
            specialist handoffs, approval gates, and proof artifacts, traced through Langfuse.
            Each node maps to a trace span, receipt, or file.
          </p>
        </div>

        {/* DAG grid */}
        {loading ? (
          <div className="text-center py-20 text-[#5C5C5C] italic" style={{ fontFamily: 'Newsreader, Georgia, serif' }}>
            Loading DAGs...
          </div>
        ) : dags.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#5C5C5C] italic text-lg mb-2" style={{ fontFamily: 'Newsreader, Georgia, serif' }}>
              No DAGs published yet.
            </p>
            <p className="text-[#8C8A84] text-sm">Check back after the next run.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dags.map(dag => (
              <DagCard key={dag.slug} dag={dag} />
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-16 text-center border-t border-[#D6D4C8] pt-8">
          <p className="text-[#5C5C5C] text-sm mb-3">Live execution telemetry from GBAutomation's agent harness.</p>
          <a href="/#contact" className="text-[#D97757] hover:underline text-sm" style={{ minHeight: 'auto' }}>
            Want to work together? Get in touch &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

export default ObservabilityIndex;
