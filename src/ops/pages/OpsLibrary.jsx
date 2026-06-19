import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Boxes, FileText, RefreshCw, Search, Terminal } from 'lucide-react';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';
import { listCapabilities } from '../lib/capabilitiesClient';

// The library unions Capability rows across kinds. Canopy prompts are modeled as
// Capability rows with kind='prompt' (no separate model). `kind` matches
// Capability.kind in Supabase/AppSync.
const LIBRARY_KINDS = [
  { kind: 'skill', label: 'Skills', icon: Boxes, blurb: 'resources/skills/*/SKILL.md' },
  { kind: 'command', label: 'Commands', icon: Terminal, blurb: '.claude/commands/*' },
  { kind: 'agent', label: 'Agents', icon: Bot, blurb: 'agent definitions' },
  { kind: 'prompt', label: 'Prompts', icon: FileText, blurb: 'Canopy prompt snippets' },
];

// Markdown body styling — mirrors src/ops/pages/OpsCapabilities.jsx.
const PROSE =
  'prose prose-sm max-w-none text-[#191919] prose-headings:font-serif prose-headings:text-[#191919] ' +
  'prose-a:text-[#D97757] prose-code:text-[#D97757] prose-code:bg-[#E6E4D9] prose-code:px-1 prose-code:rounded';

export default function OpsLibrary() {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Union every library kind; each row already carries its `kind`.
      const batches = await Promise.all(LIBRARY_KINDS.map((k) => listCapabilities(k.kind)));
      setItems(batches.flat());
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
    const rows = items || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((it) =>
      [it.slug, it.description, it.triggers, it.path, it.owner]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [items, q]);

  // Group the (filtered) rows by kind, preserving the LIBRARY_KINDS order.
  const groups = useMemo(() => {
    return LIBRARY_KINDS.map((def) => ({
      def,
      rows: filtered.filter((it) => it.kind === def.kind),
    })).filter((g) => g.rows.length > 0);
  }, [filtered]);

  return (
    <OpsPageShell
      eyebrow="Library"
      title="Capability Library"
      meta={<span className="gb-pill">{(items || []).length} total</span>}
    >
      <p className="max-w-2xl text-sm text-[#191919]/70">
        Unified read surface over the capability registry — skills, commands, agents, and Canopy
        prompts mirrored from the gbautomation repo. Published by GitHub Action on push; bodies are
        Cognito-gated (the repo is private). Inline create/edit is agent-mediated through the
        PR-gated write path.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#191919]/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search library…"
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

      {loading && !items && <p className="text-sm text-[#191919]/60">Loading…</p>}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="mb-1 font-medium">Could not load the library</p>
          <p className="font-mono text-xs">{error}</p>
          <p className="mt-2 text-xs">
            If this is a fresh deploy, the publish-capabilities GitHub Action may not have run yet.
          </p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-[#191919]/60">
          No capabilities {q ? 'match your search' : 'published yet'}.
        </p>
      )}

      <div className="space-y-10">
        {groups.map(({ def, rows }) => {
          const Icon = def.icon;
          return (
            <section key={def.kind} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#D6D4C8] bg-[#191919]">
                  <Icon className="h-3.5 w-3.5 text-[#F3F1E7]" />
                </span>
                <h3 className="font-serif text-lg text-[#191919]">{def.label}</h3>
                <span className="gb-pill">{rows.length}</span>
                <span className="font-mono text-[11px] text-[#191919]/40">{def.blurb}</span>
              </div>

              {rows.map((it) => (
                <CollapsibleSection
                  key={it.id}
                  title={it.slug}
                  meta={it.owner ? <span className="gb-pill">{it.owner}</span> : null}
                >
                  {it.description && it.description !== '—' && (
                    <p className="mb-3 text-sm text-[#191919]/70">{it.description}</p>
                  )}
                  <p className="mb-4 font-mono text-[11px] text-[#191919]/45">
                    {it.path}
                    {it.updatedAt ? ` · updated ${new Date(it.updatedAt).toLocaleDateString()}` : ''}
                  </p>
                  {it.bodyMd ? (
                    <div className={PROSE}>
                      <ReactMarkdown>{it.bodyMd}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-[#191919]/50">No body published.</p>
                  )}
                </CollapsibleSection>
              ))}
            </section>
          );
        })}
      </div>
    </OpsPageShell>
  );
}
