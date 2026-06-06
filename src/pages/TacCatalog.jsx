import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Boxes,
  Code2,
  Database,
  Filter,
  GitBranch,
  Layers,
  RefreshCw,
  Search,
  Tags,
} from 'lucide-react';
import Footer from '../components/Footer';

const numberFormat = new Intl.NumberFormat('en-US');

function fmt(value) {
  return numberFormat.format(Number(value || 0));
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function Metric({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-[#D6D4C8] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#191919]/50">{label}</span>
        <Icon className="h-4 w-4 text-[#D97757]" />
      </div>
      <div className="font-serif text-3xl text-[#191919]">{fmt(value)}</div>
      {sub && <div className="mt-1 text-xs text-[#191919]/55">{sub}</div>}
    </div>
  );
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="min-w-0 text-[11px] font-bold uppercase tracking-widest text-[#191919]/50">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input-field mt-1 h-11 w-full rounded-md px-3 normal-case tracking-normal"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function TagPill({ children }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-[#D6D4C8] bg-[#F8F7F0] px-2 py-1 text-[11px] text-[#191919]/65">
      <span className="truncate">{children}</span>
    </span>
  );
}

function sourceHref(component) {
  const raw = component.raw_source;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  return raw.html_url || '';
}

export default function TacCatalog() {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [repoFilter, setRepoFilter] = useState('');
  const [primitiveFilter, setPrimitiveFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/tac/catalog.json');
        if (!response.ok) throw new Error(`Catalog fetch failed (${response.status})`);
        const data = await response.json();
        if (!cancelled) setCatalog(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load TAC catalog');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const repoOptions = useMemo(() => (catalog?.repos || []).map((repo) => repo.name), [catalog]);
  const primitiveOptions = useMemo(() => (catalog?.primitive_counts || []).map((item) => item.name), [catalog]);
  const tagOptions = useMemo(() => (catalog?.tag_counts || []).slice(0, 80).map((item) => item.name), [catalog]);

  const filteredComponents = useMemo(() => {
    const components = catalog?.components || [];
    const q = query.trim().toLowerCase();
    return components.filter((component) => {
      if (repoFilter && component.repo !== repoFilter) return false;
      if (primitiveFilter && component.primitive !== primitiveFilter) return false;
      if (tagFilter && !component.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return [
        component.repo,
        component.path,
        component.name,
        component.primitive,
        component.why_use,
        ...(component.tags || []),
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    });
  }, [catalog, primitiveFilter, query, repoFilter, tagFilter]);

  const selectedRepoData = useMemo(() => {
    if (!catalog?.repos?.length) return null;
    return catalog.repos.find((repo) => repo.name === selectedRepo) || catalog.repos[0];
  }, [catalog, selectedRepo]);

  useEffect(() => {
    if (!selectedRepo && catalog?.repos?.length) {
      setSelectedRepo(catalog.repos[0].name);
    }
  }, [catalog, selectedRepo]);

  const topUsedIds = useMemo(() => new Set((catalog?.top_components_used || []).map((item) => `${item.repo}:${item.path}`)), [catalog]);

  return (
    <div className="min-h-screen bg-[#F3F1E7] text-[#191919] selection:bg-[#D97757] selection:text-white">
      <header className="border-b border-[#D6D4C8]/70 bg-[#F3F1E7]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center gap-3 hover-mini" aria-label="GB Automation home">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D6D4C8] bg-white">
              <GitBranch className="h-4 w-4 text-[#D97757]" />
            </span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#D97757]">GB Automation</span>
              <span className="block font-serif text-xl font-semibold">TAC Catalog</span>
            </span>
          </Link>

          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <Link to="/prds" className="text-[#191919]/60 hover:text-[#D97757]">PRDs</Link>
            <Link to="/apps" className="text-[#191919]/60 hover:text-[#D97757]">Apps</Link>
            <a href="/tac/catalog.json" className="text-[#191919]/60 hover:text-[#D97757]">JSON</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <section className="mb-6 grid gap-6 lg:grid-cols-[1fr,380px] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D6D4C8] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#191919]/55">
              <Database className="h-3.5 w-3.5 text-[#D97757]" />
              Tactical Agentic Coding
            </div>
            <h1 className="max-w-4xl font-serif text-4xl font-medium leading-tight tracking-normal text-[#191919] md:text-5xl">
              Component, repo, and reuse inventory
            </h1>
          </div>
          <div className="rounded-lg border border-[#D6D4C8] bg-white p-4 text-sm text-[#191919]/65">
            <div className="mb-2 flex items-center gap-2 font-semibold text-[#191919]">
              <RefreshCw className="h-4 w-4 text-[#D97757]" />
              Snapshot
            </div>
            {loading ? 'Loading catalog...' : error ? error : (
              <>
                Generated {catalog?.generated_at ? new Date(catalog.generated_at).toLocaleString() : 'unknown'} from local TAC inventory and scale receipts.
              </>
            )}
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={GitBranch} label="Repos" value={catalog?.summary?.repositories} />
          <Metric icon={Boxes} label="Components" value={catalog?.summary?.components} />
          <Metric icon={Tags} label="Tags" value={catalog?.summary?.tags} />
          <Metric icon={Layers} label="Used Components" value={catalog?.summary?.unique_components_used} sub={`${fmt(catalog?.summary?.total_component_usage_refs)} usage refs`} />
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(360px,0.8fr)]">
          <div className="rounded-lg border border-[#D6D4C8] bg-white p-4">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#D97757]" />
              <h2 className="font-serif text-2xl">Catalog Controls</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-[1.4fr,1fr,1fr,1fr]">
              <label className="min-w-0 text-[11px] font-bold uppercase tracking-widest text-[#191919]/50">
                Search
                <span className="relative mt-1 block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#191919]/35" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="input-field h-11 w-full rounded-md pl-9 pr-3 normal-case tracking-normal"
                    placeholder="agent, hook, schema, playwright"
                  />
                </span>
              </label>
              <SelectFilter label="Repo" value={repoFilter} options={repoOptions} onChange={setRepoFilter} />
              <SelectFilter label="Primitive" value={primitiveFilter} options={primitiveOptions} onChange={setPrimitiveFilter} />
              <SelectFilter label="Tag" value={tagFilter} options={tagOptions} onChange={setTagFilter} />
            </div>
          </div>

          <div className="rounded-lg border border-[#D6D4C8] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl">Primitive Mix</h2>
              <span className="text-xs text-[#191919]/50">{fmt(catalog?.summary?.primitives)} types</span>
            </div>
            <div className="grid gap-2">
              {(catalog?.primitive_counts || []).slice(0, 6).map((item) => (
                <div key={item.name} className="grid grid-cols-[120px,1fr,52px] items-center gap-2 text-xs">
                  <span className="truncate text-[#191919]/70">{item.name}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-[#E6E4D9]">
                    <span
                      className="block h-full rounded-full bg-[#D97757]"
                      style={{ width: `${Math.max(8, (item.count / (catalog?.summary?.components || 1)) * 100)}%` }}
                    />
                  </span>
                  <span className="text-right font-semibold">{fmt(item.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[360px,1fr]">
          <div className="rounded-lg border border-[#D6D4C8] bg-white">
            <div className="border-b border-[#D6D4C8] p-4">
              <h2 className="font-serif text-2xl">Repositories</h2>
            </div>
            <div className="max-h-[520px] overflow-auto">
              {(catalog?.repos || []).map((repo) => (
                <button
                  type="button"
                  key={repo.name}
                  onClick={() => setSelectedRepo(repo.name)}
                  className={cx(
                    'grid min-h-0 w-full grid-cols-[1fr,56px] gap-3 border-b border-[#D6D4C8]/70 px-4 py-3 text-left transition hover:bg-[#F8F7F0]',
                    selectedRepoData?.name === repo.name && 'bg-[#F8F7F0]'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{repo.name}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {repo.primitive_counts.slice(0, 3).map((item) => <TagPill key={item.name}>{item.name}</TagPill>)}
                    </span>
                  </span>
                  <span className="rounded-md bg-[#191919] px-2 py-2 text-center text-sm font-bold text-white">{fmt(repo.component_count)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#D6D4C8] bg-white p-5">
            {selectedRepoData ? (
              <>
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-[#D97757]">Selected Repo</div>
                    <h2 className="mt-1 font-serif text-3xl">{selectedRepoData.name}</h2>
                  </div>
                  <div className="rounded-md border border-[#D6D4C8] bg-[#F8F7F0] px-3 py-2 text-sm">
                    <strong>{fmt(selectedRepoData.component_count)}</strong> components
                  </div>
                </div>
                <div className="mb-5 flex flex-wrap gap-2">
                  {selectedRepoData.stack.map((item) => <TagPill key={item}>{item}</TagPill>)}
                  {selectedRepoData.top_tags.slice(0, 10).map((item) => <TagPill key={item.name}>{item.name}</TagPill>)}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#191919]/50">Primitives</h3>
                    <div className="grid gap-2">
                      {selectedRepoData.primitive_counts.slice(0, 8).map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-md border border-[#D6D4C8] px-3 py-2 text-sm">
                          <span>{item.name}</span>
                          <strong>{fmt(item.count)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#191919]/50">Top Tags</h3>
                    <div className="grid gap-2">
                      {selectedRepoData.top_tags.slice(0, 8).map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-3 rounded-md border border-[#D6D4C8] px-3 py-2 text-sm">
                          <span className="truncate">{item.name}</span>
                          <strong>{fmt(item.count)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-[#191919]/55">Loading repository index...</div>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-lg border border-[#D6D4C8] bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-[#D6D4C8] p-4 md:flex-row md:items-center">
            <div>
              <h2 className="font-serif text-2xl">Top Components Used</h2>
              <p className="mt-1 text-sm text-[#191919]/60">Ranked from TAC receipts, retrieval artifacts, and plan citations.</p>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#191919]/45">
              {fmt(catalog?.summary?.total_component_usage_refs)} refs
            </span>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {(catalog?.top_components_used || []).slice(0, 9).map((component) => (
              <div key={`${component.repo}:${component.path}`} className="rounded-md border border-[#D6D4C8] bg-[#F8F7F0] p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{component.name || component.path}</div>
                    <div className="mt-1 truncate text-xs text-[#191919]/55">{component.repo}</div>
                  </div>
                  <span className="rounded-md bg-[#D97757] px-2 py-1 text-xs font-bold text-white">{fmt(component.count)}</span>
                </div>
                <div className="mb-3 truncate font-mono text-xs text-[#191919]/55">{component.path}</div>
                <div className="flex flex-wrap gap-1">
                  <TagPill>{component.primitive}</TagPill>
                  {(component.tags || []).slice(0, 3).map((tag) => <TagPill key={tag}>{tag}</TagPill>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#D6D4C8] bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-[#D6D4C8] p-4 md:flex-row md:items-center">
            <div>
              <h2 className="font-serif text-2xl">Components</h2>
              <p className="mt-1 text-sm text-[#191919]/60">{fmt(filteredComponents.length)} matching components</p>
            </div>
            <Code2 className="h-5 w-5 text-[#D97757]" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#E6E4D9]/60 text-[11px] uppercase tracking-widest text-[#191919]/50">
                <tr>
                  <th className="px-4 py-3 text-left">Component</th>
                  <th className="px-4 py-3 text-left">Repo</th>
                  <th className="px-4 py-3 text-left">Primitive</th>
                  <th className="px-4 py-3 text-left">Tags</th>
                  <th className="px-4 py-3 text-left">Why Use</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-[#191919]/55">Loading TAC catalog...</td></tr>
                ) : filteredComponents.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-8 text-[#191919]/55">No components match these filters.</td></tr>
                ) : filteredComponents.slice(0, 250).map((component) => {
                  const href = sourceHref(component);
                  const used = topUsedIds.has(`${component.repo}:${component.path}`);
                  return (
                    <tr key={component.id} className="border-t border-[#D6D4C8]/70 align-top">
                      <td className="min-w-[280px] px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0">
                            <div className="break-words font-semibold">{component.name}</div>
                            <div className="mt-1 break-all font-mono text-xs text-[#191919]/45">{component.path}</div>
                          </div>
                          {href && (
                            <a href={href} target="_blank" rel="noreferrer" className="mt-0.5 shrink-0 text-[#D97757]" aria-label="Open source">
                              <ArrowUpRight className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="min-w-[180px] px-4 py-3">{component.repo}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <TagPill>{component.primitive}</TagPill>
                          {used && <span className="rounded-full bg-[#D97757]/10 px-2 py-1 text-[11px] font-semibold text-[#B75F43]">top-used</span>}
                        </div>
                      </td>
                      <td className="min-w-[240px] px-4 py-3">
                        <div className="flex max-w-md flex-wrap gap-1">
                          {(component.tags || []).slice(0, 5).map((tag) => <TagPill key={tag}>{tag}</TagPill>)}
                        </div>
                      </td>
                      <td className="min-w-[360px] px-4 py-3 text-[#191919]/65">
                        <p className="line-clamp-3">{component.why_use || 'No usage note captured yet.'}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredComponents.length > 250 && (
            <div className="border-t border-[#D6D4C8] px-4 py-3 text-sm text-[#191919]/55">
              Showing first 250 matches. Narrow the filters to inspect deeper.
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
