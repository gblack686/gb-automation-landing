import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateClient } from 'aws-amplify/data';
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Footer from '../components/Footer';
import SignOutButton from '../components/SignOutButton';

const BLOCKERS_PATH = 'tasks/blockers.md';

function formatRelative(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const minutes = Math.round((now - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function Blockers() {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchDoc() {
    setLoading(true);
    setError(null);
    try {
      const client = generateClient();
      const { data, errors } = await client.queries.vaultDocByPath({ path: BLOCKERS_PATH });
      if (errors && errors.length) throw new Error(errors[0].message);
      setDoc(data && data.length ? data[0] : null);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDoc();
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <header className="py-10 border-b border-[#D6D4C8]/60">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 hover-mini" aria-label="GB Automation home">
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
            <Link to="/blockers" className="text-[#191919] font-bold border-b border-[#D97757] pb-0.5">
              Blockers
            </Link>
            <span className="w-px h-3 bg-[#D6D4C8]" aria-hidden="true" />
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Blockers Feed
            </span>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] tracking-tight mt-2 mb-3">
              Active Blockers
            </h1>
            <p className="text-base text-[#191919]/70 max-w-2xl leading-relaxed">
              Live mirror of <code className="text-sm bg-[#E6E4D9] px-1.5 py-0.5 rounded">second-brain/tasks/blockers.md</code>.
              Updated by GitHub Action on every push.
            </p>
          </div>
          <button
            onClick={fetchDoc}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#191919]/60 hover:text-[#D97757] transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading && !doc && (
          <p className="text-sm text-[#191919]/60">Loading…</p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
            <p className="font-medium mb-1">Could not load blockers</p>
            <p className="font-mono text-xs">{error}</p>
            <p className="mt-2 text-xs">
              If this is a fresh deploy, the GitHub Action may not have pushed
              <code className="mx-1 px-1 bg-red-100 rounded">tasks/blockers.md</code>
              to AppSync yet.
            </p>
          </div>
        )}

        {!loading && !error && !doc && (
          <div className="bg-white border border-[#D6D4C8] rounded-lg p-8 text-center">
            <p className="text-sm text-[#191919]/60 mb-2">No blockers published yet.</p>
            <p className="text-xs text-[#191919]/50">
              Once the GitHub Action runs against the gbautomation repo, this page will populate.
            </p>
          </div>
        )}

        {doc && (
          <article className="bg-white border border-[#D6D4C8] rounded-lg p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#D6D4C8]/60">
              <div>
                <p className="text-[10px] font-mono text-[#191919]/50">{doc.path}</p>
                {doc.sha && (
                  <p className="text-[10px] font-mono text-[#191919]/40 mt-0.5">
                    sha {doc.sha.slice(0, 7)}
                  </p>
                )}
              </div>
              {doc.updatedAt && (
                <p className="text-xs text-[#191919]/60">
                  Updated {formatRelative(doc.updatedAt)}
                </p>
              )}
            </div>

            <div className="prose prose-sm max-w-none text-[#191919] prose-headings:font-serif prose-headings:text-[#191919] prose-a:text-[#D97757] prose-code:text-[#D97757] prose-code:bg-[#E6E4D9] prose-code:px-1 prose-code:rounded">
              <ReactMarkdown>{doc.bodyMd}</ReactMarkdown>
            </div>
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
}
