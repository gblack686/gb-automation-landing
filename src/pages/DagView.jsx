import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AgentDag from '../components/AgentDag';

// Render the Langfuse agent DAG natively from its dag-nodes.json (the
// gbauto-archon-dag.v1 contract) via <AgentDag>. The standalone report HTML is
// still hosted under /observability/dags/<slug>.html and linked at the bottom.
function DagView() {
  const { slug } = useParams();
  const [nodes, setNodes] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/observability/dags/${slug}.dag-nodes.json`).then((r) => {
        if (!r.ok) throw new Error(`DAG data not found (${r.status})`);
        return r.json();
      }),
      fetch('/observability/dags/dags-manifest.json')
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ])
      .then(([dag, manifest]) => {
        setNodes(Array.isArray(dag.nodes) ? dag.nodes : []);
        setMeta((Array.isArray(manifest) ? manifest : []).find((m) => m.slug === slug) || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  const title = meta?.title || 'Agent DAG';

  useEffect(() => {
    const prev = document.title;
    document.title = title + ' | GBAutomation';
    return () => { document.title = prev; };
  }, [title]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F1E7] flex items-center justify-center">
        <div className="text-[#5C5C5C] font-serif-display italic text-lg">Loading DAG...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F3F1E7] flex flex-col items-center justify-center gap-6 px-4">
        <div style={{ background: 'linear-gradient(135deg,#D97757 0%,#B85a3e 100%)' }} className="w-12 h-12 rounded-full flex items-center justify-center">
          <span style={{ color: '#fff', fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '18px' }}>gb</span>
        </div>
        <p className="text-[#191919] font-serif-display italic text-xl">DAG not found</p>
        <p className="text-[#5C5C5C] text-sm">{error}</p>
        <Link to="/observability" className="text-[#D97757] hover:underline text-sm" style={{ minHeight: 'auto' }}>
          &larr; Back to all DAGs
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F1E7]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/observability" className="text-[#D97757] hover:underline text-sm mb-6 inline-flex items-center gap-1" style={{ minHeight: 'auto' }}>
          &larr; All DAGs
        </Link>

        <div className="mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A5FBF] mb-2">Archon DAG · Langfuse trace</div>
          <h1 className="text-3xl md:text-4xl text-[#191919] leading-tight" style={{ fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600 }}>
            {title}
          </h1>
          <p className="text-[#5C5C5C] text-sm mt-2">
            Top-to-bottom layout derived from <code className="text-[#8A5FBF]">depends_on</code>. Status-colored nodes and edges; every node maps to a trace span, receipt, or file.
            {meta?.node_count ? ` ${meta.node_count} nodes.` : ''}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-4 md:p-6">
          <AgentDag nodes={nodes} />
        </div>

        <div className="mt-8 text-center">
          <a href={`/observability/dags/${slug}.html`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-[#8C8A84] hover:text-[#D97757] transition-colors" style={{ minHeight: 'auto' }}>
            View original rendered report &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

export default DagView;
