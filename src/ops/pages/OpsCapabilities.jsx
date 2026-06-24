import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Bot,
  Boxes,
  ExternalLink,
  GraduationCap,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  X,
} from 'lucide-react';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';
import { ContractCardGrid } from '../components/SupabaseContractCards';
import { getCapabilityAvatar } from '../lib/avatarAssignments';
import { createSkill, editSkill, listCapabilities } from '../lib/capabilitiesClient';
import { contractsForCapabilityKind, loadSupabaseContracts } from '../lib/supabaseContractClient';

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
          const avatar = getCapabilityAvatar({ kind: k.kind, slug, title: k.label, blurb: k.blurb });
          return (
            <Link
              key={slug}
              to={`/ops/capabilities/${slug}`}
              className="group rounded-lg border border-[#D6D4C8] bg-white p-5 transition-colors hover:border-[#D97757]"
            >
              <div className="flex items-center gap-3">
                <span className="gb-card-avatar">
                  <img src={avatar.src} alt={avatar.alt} loading="lazy" />
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#D6D4C8] bg-[#191919]">
                  <Icon className="h-4 w-4 text-[#F3F1E7]" />
                </span>
                <span className="min-w-0 font-serif text-lg text-[#191919]">{k.label}</span>
              </div>
              <p className="mt-3 font-mono text-[11px] text-[#191919]/50">{k.blurb}</p>
            </Link>
          );
        })}
      </div>
    </OpsPageShell>
  );
}

// Agent-mediated, PR-gated write affordance. Renders only inside /ops (already gated to
// authenticated tenant-gbautomation users by RequireAuth in App.jsx). Submitting calls the
// createCapabilityDraft/editCapability AppSync mutations, which delegate to the
// capabilityEdit Lambda — the browser never writes GitHub/AppSync directly. On success we
// surface the returned PR URL; markdown stays canonical until a human merges the PR.
function SkillEditor({ def, existing, onClose }) {
  const isEdit = Boolean(existing);
  const [path, setPath] = useState(existing?.path || '');
  const [title, setTitle] = useState(existing?.slug || '');
  const [body, setBody] = useState(existing?.bodyMd || '');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const input = { kind: def.kind, path: path || undefined, title, body, summary: summary || undefined };
      const out = isEdit ? await editSkill(input) : await createSkill(input);
      setResult(out);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-[#D97757]/40 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-lg text-[#191919]">
          {isEdit ? `Edit ${existing.slug}` : `New ${def.label.replace(/s$/, '').toLowerCase()}`}
        </h3>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#191919]/60 transition-colors hover:text-[#D97757]"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      {result ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="mb-2 font-medium">Pull request opened — markdown stays canonical until merge.</p>
          <a
            href={result.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-[#D97757] hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {result.prUrl}
          </a>
          {result.branch && (
            <p className="mt-2 font-mono text-[11px] text-emerald-900/70">branch: {result.branch}</p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-widest text-[#191919]/50">Title / slug</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder={`my-${def.kind}`}
                className="w-full rounded-md border border-[#D6D4C8] bg-white px-3 py-2 text-sm text-[#191919] placeholder:text-[#191919]/40 focus:border-[#D97757] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-widest text-[#191919]/50">Path</span>
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                disabled={isEdit}
                placeholder={def.blurb}
                className="w-full rounded-md border border-[#D6D4C8] bg-white px-3 py-2 font-mono text-xs text-[#191919] placeholder:text-[#191919]/40 focus:border-[#D97757] focus:outline-none disabled:opacity-60"
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-widest text-[#191919]/50">Body (markdown)</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={14}
                placeholder="# Title&#10;&#10;What this capability does…"
                className="w-full rounded-md border border-[#D6D4C8] bg-white px-3 py-2 font-mono text-xs text-[#191919] placeholder:text-[#191919]/40 focus:border-[#D97757] focus:outline-none"
              />
            </label>
            <div>
              <span className="mb-1 block text-xs uppercase tracking-widest text-[#191919]/50">Preview</span>
              <div className={`min-h-[14rem] rounded-md border border-[#D6D4C8] bg-[#F3F1E7]/60 p-3 ${PROSE}`}>
                {body ? <ReactMarkdown>{body}</ReactMarkdown> : (
                  <p className="text-sm text-[#191919]/40">Nothing to preview yet.</p>
                )}
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-widest text-[#191919]/50">PR summary</span>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Short description for the PR title/body"
              className="w-full rounded-md border border-[#D6D4C8] bg-white px-3 py-2 text-sm text-[#191919] placeholder:text-[#191919]/40 focus:border-[#D97757] focus:outline-none"
            />
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-mono text-xs">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#191919] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#F3F1E7] transition-colors hover:bg-[#D97757] disabled:opacity-50"
            >
              {submitting ? 'Opening PR…' : isEdit ? 'Propose edit' : 'Open PR'}
            </button>
            <span className="text-xs text-[#191919]/50">Opens a pull request against gbautomation — no direct write.</span>
          </div>
        </form>
      )}
    </div>
  );
}

function Catalog({ def }) {
  const [items, setItems] = useState(null);
  const [contracts, setContracts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [editor, setEditor] = useState(null); // null | { existing? }

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

  useEffect(() => {
    let cancelled = false;
    loadSupabaseContracts()
      .then((data) => { if (!cancelled) setContracts(data); })
      .catch(() => { if (!cancelled) setContracts(null); });
    return () => { cancelled = true; };
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

  const label = def.label.toLowerCase();
  const relatedContracts = useMemo(
    () => contractsForCapabilityKind(contracts, def.kind),
    [contracts, def.kind],
  );

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
        <button
          onClick={() => setEditor({ existing: null })}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#191919] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#F3F1E7] transition-colors hover:bg-[#D97757]"
        >
          <Plus className="h-3.5 w-3.5" />
          New {def.label.replace(/s$/, '').toLowerCase()}
        </button>
      </div>

      {editor && (
        <SkillEditor def={def} existing={editor.existing} onClose={() => setEditor(null)} />
      )}

      <CollapsibleSection
        eyebrow="Index"
        title={`${def.label} Supabase Contract`}
        meta={<span className="gb-pill">{relatedContracts.length} related</span>}
      >
        <p className="mb-4 max-w-3xl text-sm leading-6 text-[#191919]/65">
          Related tables and views from `ops_schema_catalog`. These rows describe how this
          capability family is indexed, observed, and exposed to dashboard surfaces.
        </p>
        <ContractCardGrid contracts={relatedContracts} compact />
      </CollapsibleSection>

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
            avatar={getCapabilityAvatar(it)}
            title={it.slug}
            meta={it.owner ? <span className="gb-pill">{it.owner}</span> : null}
          >
            {it.description && it.description !== '—' && (
              <p className="mb-3 text-sm text-[#191919]/70">{it.description}</p>
            )}
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] text-[#191919]/45">
                {it.path}
                {it.updatedAt ? ` · updated ${new Date(it.updatedAt).toLocaleDateString()}` : ''}
              </p>
              <button
                onClick={() => setEditor({ existing: it })}
                className="inline-flex shrink-0 items-center gap-1 text-[11px] uppercase tracking-widest text-[#191919]/50 transition-colors hover:text-[#D97757]"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </div>
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
