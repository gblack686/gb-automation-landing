import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Bot, Boxes, GraduationCap, RefreshCw, Search, Terminal } from 'lucide-react';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';
import { listCapabilities } from '../lib/capabilitiesClient';

// Route slug -> catalog definition. `kind` matches Capability.kind in Supabase/AppSync.
const KINDS = {
  skills: { kind: 'skill', label: 'Skills', icon: Boxes, blurb: 'resources/skills/*/SKILL.md' },
  commands: { kind: 'command', label: 'Commands', icon: Terminal, blurb: 'resources/skills/*/COMMAND.md' },
  experts: { kind: 'expert', label: 'Experts', icon: GraduationCap, blurb: 'TAC ACT→LEARN→REUSE expert bundles' },
  agents: { kind: 'agent', label: 'Agents', icon: Bot, blurb: 'agent definitions' },
};

// Markdown body styling — mirrors the VaultDoc viewer in src/pages/Blockers.jsx.
const PROSE =
  'prose prose-sm max-w-none text-[#191919] prose-headings:font-serif prose-headings:text-[#191919] ' +
  'prose-a:text-[#D97757] prose-code:text-[#D97757] prose-code:bg-[#E6E4D9] prose-code:px-1 prose-code:rounded';

function CatalogIndex() {
  return (
    <OpsPageShell
      eyebrow="Capabilities"
      title="Capability Catalog"
      meta={<span className="gb-pill">read-only</span>}
    >
      <p className="max-w-2xl text-sm text-[#191919]/70">
        Browsable mirror of the capability registry — skills, commands, TAC experts, and agent
        definitions from the gbautomation repo. Published by GitHub Action on push; bodies are
        Cognito-gated (the repo is private). Inline create/edit is agent-mediated and coming next.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(KINDS).map(([slug, k]) => {
          const Icon = k.icon;
          return (
            <Link
              key={slug}
              to={`/ops/capabilities/${slug}`}
              className="group rounded-lg border border-[#D6D4C8] bg-white p-5 transition-colors hover:border-[#D97757]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D6D4C8] bg-[#191919]">
                  <Icon className="h-4 w-4 text-[#F3F1E7]" />
                </span>
                <span className="font-serif text-lg text-[#191919]">{k.label}</span>
              </div>
              <p className="mt-3 font-mono text-[11px] text-[#191919]/50">{k.blurb}</p>
            </Link>
          );
        })}
      </div>
    </OpsPageShell>
  );
}

function Catalog({ def }) {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await listCapabilities(def.kind));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.kind]);

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

  const label = def.label.toLowerCase();

  return (
    <OpsPageShell
      eyebrow={
        <Link to="/ops/capabilities" className="hover:text-[#D97757]">
          Capabilities
        </Link>
      }
      title={def.label}
      meta={<span className="gb-pill">{(items || []).length} total</span>}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#191919]/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${label}…`}
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
          <p className="mb-1 font-medium">Could not load {label}</p>
          <p className="font-mono text-xs">{error}</p>
          <p className="mt-2 text-xs">
            If this is a fresh deploy, the publish-capabilities GitHub Action may not have run yet.
          </p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-[#191919]/60">
          No {label} {q ? 'match your search' : 'published yet'}.
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((it) => (
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
      </div>
    </OpsPageShell>
  );
}

export default function OpsCapabilities() {
  const { kind } = useParams();
  if (!kind) return <CatalogIndex />;
  const def = KINDS[kind];
  if (!def) return <Navigate to="/ops/capabilities" replace />;
  return <Catalog def={def} />;
}
