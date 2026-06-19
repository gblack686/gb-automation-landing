import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { BookOpen, FileText, RefreshCw, Search } from 'lucide-react';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';
import { vaultDocList } from '../lib/capabilitiesClient';

// Markdown body styling — mirrors the VaultDoc viewer in src/pages/Blockers.jsx
// and src/ops/pages/OpsCapabilities.jsx.
const PROSE =
  'prose prose-sm max-w-none text-[#191919] prose-headings:font-serif prose-headings:text-[#191919] ' +
  'prose-a:text-[#D97757] prose-code:text-[#D97757] prose-code:bg-[#E6E4D9] prose-code:px-1 prose-code:rounded';

// Top-level path segment is the brain "section" (e.g. "knowledge/concepts/x.md" -> "knowledge").
function folderOf(path) {
  const i = (path || '').indexOf('/');
  return i === -1 ? '(root)' : path.slice(0, i);
}

function titleOf(doc) {
  return doc.title || (doc.path || '').split('/').pop() || doc.path;
}

export default function OpsSecondBrain() {
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [selectedPath, setSelectedPath] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDocs(await vaultDocList());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const rows = docs || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((d) =>
      [d.path, d.title].filter(Boolean).join(' ').toLowerCase().includes(needle),
    );
  }, [docs, q]);

  // Group the (filtered) docs by their top-level brain section for the sidebar.
  const groups = useMemo(() => {
    const byFolder = new Map();
    for (const d of filtered) {
      const f = folderOf(d.path);
      if (!byFolder.has(f)) byFolder.set(f, []);
      byFolder.get(f).push(d);
    }
    return [...byFolder.entries()]
      .map(([folder, items]) => [folder, items.slice().sort((a, b) => titleOf(a).localeCompare(titleOf(b)))])
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const selected = useMemo(() => {
    const rows = docs || [];
    return rows.find((d) => d.path === selectedPath) || null;
  }, [docs, selectedPath]);

  // Auto-select the first visible doc once data lands (or after a filter change drops the selection).
  useEffect(() => {
    if (filtered.length && !filtered.some((d) => d.path === selectedPath)) {
      setSelectedPath(filtered[0].path);
    }
  }, [filtered, selectedPath]);

  return (
    <OpsPageShell
      eyebrow="Second Brain"
      title="Second Brain"
      meta={<span className="gb-pill">{(docs || []).length} docs</span>}
    >
      <p className="max-w-2xl text-sm text-[#191919]/70">
        Browsable mirror of the smoke-client second-brain vault — CLAUDE.md, knowledge, capabilities,
        and agent personas published by GitHub Action on push. Bodies are Cognito-gated (the repo is
        private); GitHub markdown stays canonical and edits flow through the PR-gated write path.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#191919]/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vault…"
            className="w-full rounded-md border border-[#D6D4C8] bg-white py-2 pl-9 pr-3 text-sm text-[#191919] placeholder:text-[#191919]/40 focus:border-[#D97757] focus:outline-none"
          />
        </label>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#191919]/60 transition-colors hover:text-[#D97757] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && !docs && <p className="text-sm text-[#191919]/60">Loading…</p>}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="mb-1 font-medium">Could not load second-brain docs</p>
          <p className="font-mono text-xs">{error}</p>
          <p className="mt-2 text-xs">
            If this is a fresh deploy, the publish-second-brain GitHub Action may not have run yet.
          </p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-[#191919]/60">
          No vault docs {q ? 'match your search' : 'published yet'}.
        </p>
      )}

      {!error && filtered.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <nav className="space-y-3">
            {groups.map(([folder, items]) => (
              <CollapsibleSection
                key={folder}
                title={folder}
                defaultOpen
                meta={<span className="gb-pill">{items.length}</span>}
              >
                <ul className="space-y-1">
                  {items.map((d) => {
                    const active = d.path === selectedPath;
                    return (
                      <li key={d.path}>
                        <button
                          type="button"
                          onClick={() => setSelectedPath(d.path)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                            active
                              ? 'bg-[#191919] text-[#F3F1E7]'
                              : 'text-[#191919]/70 hover:bg-[#E6E4D9] hover:text-[#191919]'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          <span className="truncate">{titleOf(d)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleSection>
            ))}
          </nav>

          <article className="rounded-lg border border-[#D6D4C8] bg-white p-6">
            {selected ? (
              <>
                <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#D6D4C8]/60 pb-4">
                  <div>
                    <h3 className="flex items-center gap-2 font-serif text-xl text-[#191919]">
                      <BookOpen className="h-4 w-4 text-[#D97757]" />
                      {titleOf(selected)}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] text-[#191919]/45">{selected.path}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {selected.sha && (
                      <p className="font-mono text-[10px] text-[#191919]/40">
                        sha {selected.sha.slice(0, 7)}
                      </p>
                    )}
                    {selected.updatedAt && (
                      <p className="mt-0.5 text-xs text-[#191919]/60">
                        Updated {new Date(selected.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                {selected.bodyMd ? (
                  <div className={PROSE}>
                    <ReactMarkdown>{selected.bodyMd}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-[#191919]/50">No body published.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-[#191919]/60">Select a document to read it.</p>
            )}
          </article>
        </div>
      )}
    </OpsPageShell>
  );
}
