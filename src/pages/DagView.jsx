import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

// The DAG reports are self-contained HTML (inline SVG + inline <head> CSS), so we
// iframe the standalone file to preserve full fidelity rather than body-injecting
// (which would strip the report's <head> styles). See PRDView.jsx for the
// body-injection pattern used where the host page supplies the chrome.
function DagView() {
  const { slug } = useParams();
  const [title, setTitle] = useState('Agent DAG');
  const [exists, setExists] = useState(true);

  useEffect(() => {
    fetch(`/observability/dags/${slug}.html`, { method: 'GET' })
      .then(r => {
        if (!r.ok) { setExists(false); return ''; }
        return r.text();
      })
      .then(html => {
        const m = html.match(/<title[^>]*>(.*?)<\/title>/i);
        if (m) setTitle(m[1]);
      })
      .catch(() => setExists(false));
  }, [slug]);

  useEffect(() => {
    const prev = document.title;
    document.title = title + ' | GBAutomation';
    return () => { document.title = prev; };
  }, [title]);

  if (!exists) {
    return (
      <div className="min-h-screen bg-[#F3F1E7] flex flex-col items-center justify-center gap-6 px-4">
        <div
          style={{ background: 'linear-gradient(135deg,#D97757 0%,#B85a3e 100%)' }}
          className="w-12 h-12 rounded-full flex items-center justify-center"
        >
          <span style={{ color: '#fff', fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '18px' }}>gb</span>
        </div>
        <p className="text-[#191919] font-serif-display italic text-xl">DAG not found</p>
        <Link to="/observability" className="text-[#D97757] hover:underline text-sm" style={{ minHeight: 'auto' }}>
          &larr; Back to all DAGs
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F1E7]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          to="/observability"
          className="text-[#D97757] hover:underline text-sm mb-6 inline-flex items-center gap-1"
          style={{ minHeight: 'auto' }}
        >
          &larr; All DAGs
        </Link>
        <div className="glass-panel rounded-2xl overflow-hidden">
          <iframe
            src={`/observability/dags/${slug}.html`}
            title={title}
            className="w-full"
            style={{ height: '88vh', border: 0, display: 'block', background: '#F3F1E7' }}
          />
        </div>
        <div className="mt-8 text-center">
          <a
            href={`/observability/dags/${slug}.html`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#8C8A84] hover:text-[#D97757] transition-colors"
            style={{ minHeight: 'auto' }}
          >
            View standalone page &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}

export default DagView;
