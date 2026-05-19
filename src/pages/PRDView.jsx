import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';

function PRDView() {
  const { slug } = useParams();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('PRD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/prds/${slug}.html`)
      .then(r => {
        if (!r.ok) throw new Error(`PRD not found (${r.status})`);
        return r.text();
      })
      .then(html => {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        if (titleMatch) setTitle(titleMatch[1]);
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        setContent(bodyMatch ? bodyMatch[1] : html);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    const prev = document.title;
    document.title = title + ' | GBAutomation';
    return () => { document.title = prev; };
  }, [title]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F1E7] flex items-center justify-center">
        <div className="text-[#5C5C5C] font-serif-display italic text-lg">Loading PRD...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F3F1E7] flex flex-col items-center justify-center gap-6 px-4">
        <div
          style={{ background: 'linear-gradient(135deg,#D97757 0%,#B85a3e 100%)' }}
          className="w-12 h-12 rounded-full flex items-center justify-center"
        >
          <span style={{ color: '#fff', fontFamily: 'Newsreader, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '18px' }}>gb</span>
        </div>
        <p className="text-[#191919] font-serif-display italic text-xl">PRD not found</p>
        <p className="text-[#5C5C5C] text-sm">{error}</p>
        <Link
          to="/prds"
          className="text-[#D97757] hover:underline text-sm flex items-center gap-1"
          style={{ minHeight: 'auto' }}
        >
          &larr; Back to all PRDs
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F1E7]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          to="/prds"
          className="text-[#D97757] hover:underline text-sm mb-6 inline-flex items-center gap-1"
          style={{ minHeight: 'auto' }}
        >
          &larr; All PRDs
        </Link>
        <div
          ref={contentRef}
          className="glass-panel rounded-2xl overflow-hidden"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <div className="mt-8 text-center">
          <a
            href={`/prds/${slug}.html`}
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

export default PRDView;
