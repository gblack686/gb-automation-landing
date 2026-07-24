import {
  AlertTriangle,
  Archive,
  Blocks,
  CheckCircle2,
  ClipboardList,
  FileText,
  GitMerge,
  Lightbulb,
  RadioTower,
  ShieldCheck,
} from 'lucide-react';
import { useTenantData } from '../../shared/useTenantData';

const DATA_PATH = '/clients/gbautomation/client-hub-index.json';

const surfaceConfig = {
  prd_index: { label: 'PRD Index', icon: FileText, description: 'Current PRD inventory with schema, status, and safe source path.' },
  artifact_index: { label: 'Artifact Index', icon: Archive, description: 'Public-safe artifact registry with local/public lag surfaced.' },
  prd_merge_state: { label: 'PRD State', icon: GitMerge, description: 'Merged, unmerged, superseded, and review-state PRD evidence.' },
  pickup_ideas: { label: 'Pickup Ideas', icon: Lightbulb, description: 'Ready-to-route work seeds from the parent audit lane.' },
  kanban_portfolio: { label: 'Kanban Portfolio', icon: Blocks, description: 'Board-level counts and blocker titles only; card bodies stay private.' },
  drafts_review_queue: { label: 'Drafts & Review', icon: ClipboardList, description: 'PRDs and portfolio rows needing draft or review attention.' },
  blocked_work: { label: 'Blocked Work', icon: AlertTriangle, description: 'Blocked board work with safe IDs, titles, and blocker taxonomies.' },
  latest_plans_reports: { label: 'Latest Plans & Reports', icon: RadioTower, description: 'Recent public-safe plan/report artifacts from the registry.' },
  recently_merged_work: { label: 'Recently Merged', icon: CheckCircle2, description: 'Recent merged work sampled from Git/GitHub receipts.' },
};

const surfaceOrder = Object.keys(surfaceConfig);

function getSurface(data, key) {
  return (data?.surfaces || []).find((surface) => surface.surface === key) || { rows: [] };
}

function rowsFor(surface, limit = 6) {
  return (surface.rows || []).slice(0, limit);
}

function compactPath(path = '') {
  if (!path) return 'No public path';
  if (path.length <= 74) return path;
  return `…${path.slice(-71)}`;
}

function formatDate(value) {
  if (!value) return 'No timestamp';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function FreshnessPill({ surface }) {
  const stale = Boolean(surface?.stale);
  const label = surface?.freshness_label || 'unknown';
  return (
    <span
      className={`inline-flex min-h-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest ${
        stale
          ? 'border-amber-300 bg-amber-50 text-amber-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
      title={surface?.stale_reason || `freshness_label: ${label}`}
    >
      {stale ? 'stale' : 'fresh'} · {label}
    </span>
  );
}

function SurfaceCard({ surfaceKey, surface }) {
  const config = surfaceConfig[surfaceKey];
  const Icon = config.icon;
  const count = surface.row_count ?? surface.rows?.length ?? 0;
  return (
    <a
      href={`#${surfaceKey}`}
      className="min-w-0 rounded-md border border-[#D6D4C8] bg-white/50 p-4 transition hover:-translate-y-0.5 hover:border-[#D97757] hover:bg-white/70"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#191919] text-[#F3F1E7]">
          <Icon className="h-4 w-4" />
        </span>
        <FreshnessPill surface={surface} />
      </div>
      <h3 className="mt-4 break-words font-serif text-2xl text-[#191919]">{config.label}</h3>
      <p className="mt-2 break-words text-sm leading-6 text-[#191919]/65">{config.description}</p>
      <p className="mt-4 font-mono text-xs uppercase tracking-widest text-[#191919]/45">
        {count} rows
      </p>
    </a>
  );
}

function SectionShell({ id, surface, children }) {
  const config = surfaceConfig[id];
  const Icon = config.icon;
  return (
    <section id={id} className="min-w-0 scroll-mt-24 overflow-hidden rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/55 p-5 md:p-6">
      <div className="mb-5 flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#191919] text-[#F3F1E7]">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[#D97757]">GBA Client Hub</p>
            <h2 className="mt-1 break-words font-serif text-3xl text-[#191919]">{config.label}</h2>
            <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-[#191919]/65">{config.description}</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-2 md:shrink-0 md:items-end">
          <FreshnessPill surface={surface} />
          <p className="max-w-full break-words font-mono text-[11px] text-[#191919]/45">freshness_label: {surface?.freshness_label || 'unknown'}</p>
          <p className="max-w-xs text-left text-[11px] leading-5 text-[#191919]/45 md:text-right">
            stale_reason: {surface?.stale_reason || 'none'}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyRows() {
  return <p className="rounded-md border border-[#D6D4C8] bg-white/45 p-4 text-sm text-[#191919]/60">No rows reported by this surface.</p>;
}

function PRDIndexSection({ surface }) {
  const rows = rowsFor(surface, 8);
  return (
    <SectionShell id="prd_index" surface={surface}>
      {rows.length === 0 ? <EmptyRows /> : (
        <div className="overflow-hidden rounded-md border border-[#D6D4C8] bg-white/50">
          {rows.map((row) => (
            <article key={row.id || row.path} className="grid gap-3 border-b border-[#D6D4C8] p-4 last:border-b-0 md:grid-cols-[9rem_1fr]">
              <div className="space-y-2">
                <span className="inline-flex rounded-full bg-[#191919] px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#F3F1E7]">{row.status || 'unknown'}</span>
                <p className="font-mono text-[11px] text-[#191919]/45">{row.schema_status || 'schema unknown'}</p>
              </div>
              <div>
                <h3 className="font-medium text-[#191919]">{row.title}</h3>
                <p className="mt-2 font-mono text-xs text-[#191919]/50">{compactPath(row.path)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function ArtifactIndexSection({ surface }) {
  const rows = rowsFor(surface, 8);
  return (
    <SectionShell id="artifact_index" surface={surface}>
      {rows.length === 0 ? <EmptyRows /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <a
              key={row.artifact_id || row.filename}
              href={row.web_route || '#'}
              className="rounded-md border border-[#D6D4C8] bg-white/50 p-4 hover:border-[#D97757]"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-[#191919]/45">{row.client || 'unknown'} · {row.type || 'artifact'}</p>
              <h3 className="mt-2 font-medium text-[#191919]">{row.filename || row.artifact_id}</h3>
              <p className="mt-2 text-xs text-[#191919]/55">{formatDate(row.created_at)} · {row.archived ? 'archived' : 'active'}</p>
            </a>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function MergeStateSection({ surface }) {
  const rows = rowsFor(surface, 8);
  return (
    <SectionShell id="prd_merge_state" surface={surface}>
      {rows.length === 0 ? <EmptyRows /> : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <article key={`${row.state}-${row.path || row.title}`} className="rounded-md border border-[#D6D4C8] bg-white/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#D97757]/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#B75F43]">{row.state || 'unknown'}</span>
                <span className="text-xs text-[#191919]/45">{row.evidence || 'audit evidence unavailable'}</span>
              </div>
              <h3 className="mt-2 font-medium text-[#191919]">{row.title || compactPath(row.path)}</h3>
              <p className="mt-2 font-mono text-xs text-[#191919]/50">{compactPath(row.path)}</p>
            </article>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function PickupIdeasSection({ surface }) {
  const rows = rowsFor(surface, 9);
  return (
    <SectionShell id="pickup_ideas" surface={surface}>
      {rows.length === 0 ? <EmptyRows /> : (
        <ol className="grid gap-3 md:grid-cols-3">
          {rows.map((row, index) => (
            <li key={`${row.title}-${index}`} className="rounded-md border border-[#D6D4C8] bg-white/50 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#D97757]">{row.priority || 'triage'}</p>
              <h3 className="mt-2 font-medium text-[#191919]">{row.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#191919]/65">{row.next_action || 'Route to the right TAC lane.'}</p>
              <p className="mt-3 font-mono text-[11px] text-[#191919]/45">{row.origin || row.source}</p>
            </li>
          ))}
        </ol>
      )}
    </SectionShell>
  );
}

function KanbanPortfolioSection({ surface }) {
  const rows = rowsFor(surface, 8);
  return (
    <SectionShell id="kanban_portfolio" surface={surface}>
      {rows.length === 0 ? <EmptyRows /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <article key={row.board} className="rounded-md border border-[#D6D4C8] bg-white/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-[#191919]">{row.board}</h3>
                <span className="rounded-full bg-[#191919] px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#F3F1E7]">{row.blocked || 0} blocked</span>
              </div>
              <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                {[['open', row.open], ['running', row.running], ['blocked', row.blocked], ['done 7d', row.done_7d]].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-[#F3F1E7] p-2">
                    <dt className="text-[10px] uppercase tracking-widest text-[#191919]/45">{label}</dt>
                    <dd className="mt-1 font-serif text-xl text-[#191919]">{value ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function DraftsReviewSection({ surface }) {
  const rows = rowsFor(surface, 8);
  return (
    <SectionShell id="drafts_review_queue" surface={surface}>
      {rows.length === 0 ? <EmptyRows /> : (
        <div className="divide-y divide-[#D6D4C8] rounded-md border border-[#D6D4C8] bg-white/50">
          {rows.map((row) => (
            <article key={row.id || row.path} className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#191919]/45">{row.client || 'client unknown'} · {row.status || 'review'}</p>
              <h3 className="mt-2 font-medium text-[#191919]">{row.title}</h3>
              <p className="mt-2 font-mono text-xs text-[#191919]/50">{compactPath(row.path)}</p>
            </article>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function BlockedWorkSection({ surface }) {
  const rows = rowsFor(surface, 8);
  return (
    <SectionShell id="blocked_work" surface={surface}>
      {rows.length === 0 ? <EmptyRows /> : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <article key={row.board} className="rounded-md border border-[#D6D4C8] bg-white/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium text-[#191919]">{row.board}</h3>
                <span className="text-xs font-bold uppercase tracking-widest text-rose-700">{row.blocked || 0} blocked cards</span>
              </div>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {(row.blocked_cards || []).slice(0, 4).map((card) => (
                  <li key={card.id} className="rounded-md bg-[#F3F1E7] p-3 text-sm text-[#191919]/70">
                    <span className="font-mono text-xs text-[#191919]/45">{card.id}</span> {card.title}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function LatestPlansReportsSection({ surface }) {
  const rows = rowsFor(surface, 8);
  return (
    <SectionShell id="latest_plans_reports" surface={surface}>
      {rows.length === 0 ? <EmptyRows /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <a key={row.artifact_id || row.filename} href={row.web_route || '#'} className="rounded-md border border-[#D6D4C8] bg-white/50 p-4 hover:border-[#D97757]">
              <p className="text-xs font-bold uppercase tracking-widest text-[#191919]/45">{row.project || row.client || 'gbautomation'} · {row.type || 'report'}</p>
              <h3 className="mt-2 font-medium text-[#191919]">{row.filename || row.artifact_id}</h3>
              <p className="mt-2 text-xs text-[#191919]/55">{formatDate(row.created_at)} · {row.archived ? 'archived' : 'active'}</p>
            </a>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function RecentlyMergedSection({ surface }) {
  const rows = rowsFor(surface, 8);
  return (
    <SectionShell id="recently_merged_work" surface={surface}>
      {rows.length === 0 ? <EmptyRows /> : (
        <div className="divide-y divide-[#D6D4C8] rounded-md border border-[#D6D4C8] bg-white/50">
          {rows.map((row) => (
            <article key={row.sha || row.title} className="p-4">
              <p className="font-mono text-xs text-[#191919]/45">{row.sha ? row.sha.slice(0, 12) : 'merge receipt'} · {row.state || 'merged'}</p>
              <h3 className="mt-2 font-medium text-[#191919]">{row.title}</h3>
            </article>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

export default function ClientHubPage() {
  const { data, error, loading } = useTenantData(DATA_PATH);

  if (loading) {
    return <p className="text-sm text-[#191919]/60">Loading GBAutomation Client Hub…</p>;
  }

  if (error) {
    return (
      <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Failed to load GBAutomation Client Hub: <code className="font-mono">{error}</code>
      </p>
    );
  }

  const surfaces = Object.fromEntries(surfaceOrder.map((key) => [key, getSurface(data, key)]));
  const totalRows = surfaceOrder.reduce((total, key) => total + (surfaces[key].row_count ?? surfaces[key].rows?.length ?? 0), 0);

  return (
    <div className="w-full min-w-0 max-w-full space-y-10 overflow-x-hidden">
      <section className="grid w-full min-w-0 max-w-full gap-8 overflow-hidden rounded-md border border-[#D6D4C8] bg-[#191919] p-6 text-[#F3F1E7] md:p-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
        <div className="w-full min-w-0 max-w-full">
          <a href="/hub" className="inline-flex min-h-0 items-center gap-3 text-[#F3F1E7]" aria-label="GB Automation Client Hub home">
            <img src="/gb-logo.png" alt="GB logo" className="h-11 w-11 rounded-md border border-[#F3F1E7]/15 bg-[#F3F1E7] object-contain p-1" />
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.28em] text-[#F3F1E7]/55">GBauto logo door</span>
              <span className="block font-serif text-2xl">GBAutomation</span>
            </span>
          </a>
          <p className="mt-8 text-xs font-bold uppercase tracking-widest text-[#D97757]">Public-safe operator surface</p>
          <h1 className="mt-3 max-w-full break-words font-serif text-3xl font-medium leading-tight [overflow-wrap:anywhere] sm:text-4xl md:text-6xl">
            GBAutomation Client Hub
          </h1>
          <p className="mt-5 max-w-full break-words text-base leading-7 text-[#F3F1E7]/72 [overflow-wrap:anywhere] md:max-w-3xl">
            A generated index of PRDs, artifacts, Kanban boards, review queues, blockers,
            reports, and merged work. The payload carries generated_at, source paths,
            freshness_label, and stale_reason fields so the UI shows gaps instead of inventing rows.
          </p>
        </div>
        <div className="w-full min-w-0 max-w-full rounded-md border border-[#F3F1E7]/15 bg-[#F3F1E7]/8 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#F3F1E7]/50">Payload receipt</p>
          <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#F3F1E7]/45">generated_at</dt>
              <dd className="mt-1 break-all font-mono text-sm">{data.generated_at}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#F3F1E7]/45">schema</dt>
              <dd className="mt-1 break-all font-mono text-sm">{data.schema}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#F3F1E7]/45">surfaces</dt>
              <dd className="mt-1 font-serif text-3xl">{surfaceOrder.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#F3F1E7]/45">indexed rows</dt>
              <dd className="mt-1 font-serif text-3xl">{totalRows}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {surfaceOrder.map((surfaceKey) => (
          <SurfaceCard key={surfaceKey} surfaceKey={surfaceKey} surface={surfaces[surfaceKey]} />
        ))}
      </section>

      <PRDIndexSection surface={surfaces.prd_index} />
      <ArtifactIndexSection surface={surfaces.artifact_index} />
      <MergeStateSection surface={surfaces.prd_merge_state} />
      <PickupIdeasSection surface={surfaces.pickup_ideas} />
      <KanbanPortfolioSection surface={surfaces.kanban_portfolio} />
      <DraftsReviewSection surface={surfaces.drafts_review_queue} />
      <BlockedWorkSection surface={surfaces.blocked_work} />
      <LatestPlansReportsSection surface={surfaces.latest_plans_reports} />
      <RecentlyMergedSection surface={surfaces.recently_merged_work} />
    </div>
  );
}
