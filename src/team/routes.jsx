import { useEffect, useMemo, useState, createElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Activity, Boxes, ClipboardCheck, GitPullRequest, PackageCheck } from 'lucide-react';
import TeamHeader from './TeamHeader';
import { ReceiptLink, TeamListCard, TeamMetricCard, TeamStatusBadge } from './components/TeamCards';
import { fallbackTeamCockpit } from './data/teamCockpitData';
import { getMirrorFreshness, freshnessTone } from '../ops/data/mirrorFreshness';

function formatGeneratedAt(value) {
  if (!value) return 'Static fallback';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function useTeamCockpitData() {
  const [data, setData] = useState(fallbackTeamCockpit);
  const [loadState, setLoadState] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/team/cockpit.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Team cockpit returned ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
          setLoadState('static');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState('fallback');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loadState };
}

function EmptyState({ label }) {
  return (
    <div className="rounded-md border border-dashed border-[#D6D4C8] bg-white/35 p-6 text-center text-sm text-[#191919]/45">
      No {label} mirrored yet.
    </div>
  );
}

function OverviewPage({ data, loadState }) {
  const freshness = useMemo(
    () => getMirrorFreshness(data.generatedAt, { maxAgeMinutes: data.maxAgeMinutes || 90 }),
    [data.generatedAt, data.maxAgeMinutes],
  );
  const mirrorLabel = loadState === 'loading'
    ? 'Loading mirror'
    : freshness.label;
  const metrics = useMemo(() => [
    {
      label: 'Approved PRDs',
      value: data.approvedPrds?.length || 0,
      detail: 'Queue items mirrored from generated PRD receipts.',
    },
    {
      label: 'Active tasks',
      value: data.buildStatus?.activeTasks?.length || 0,
      detail: 'Kanban task projection with no browser mutation path.',
    },
    {
      label: 'Artifacts',
      value: data.artifactReceipts?.length || 0,
      detail: 'Links to generated previews, manifests, or deliverables.',
    },
    {
      label: 'Run receipts',
      value: data.runReceipts?.length || 0,
      detail: 'Hermes run evidence mirrored from generated receipts.',
    },
    {
      label: 'Release receipts',
      value: data.releaseReceipts?.length || 0,
      detail: 'Release readiness and deferral evidence.',
    },
  ], [data]);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <span className="text-xs font-bold uppercase text-[#D97757]">Read-only teammate surface</span>
          <h1 className="mt-3 font-serif text-4xl text-[#191919] md:text-5xl">Build cockpit</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#191919]/70">
            Approved PRDs, active Kanban tasks, run receipts, artifact receipts, and release evidence from static mirrored JSON.
            Dispatch and Kanban mutation controls are intentionally absent until a signed server-side action path exists.
          </p>
        </div>
        <div className="rounded-md border border-[#D6D4C8] bg-white/45 p-4">
          <p className="text-xs font-semibold uppercase text-[#191919]/45">
            {mirrorLabel}
          </p>
          <p className="mt-2 font-mono text-sm text-[#191919]">{formatGeneratedAt(data.generatedAt)}</p>
          <p className="mt-2 text-xs text-[#191919]/55">{data.source?.mode}</p>
        </div>
      </section>

      {loadState !== 'loading' && freshness.state !== 'current' && (
        <section className={`rounded-md border p-4 text-sm leading-6 ${freshnessTone(freshness.state)}`}>
          <strong>{freshness.label}:</strong> {freshness.detail}
        </section>
      )}

      <section className="rounded-md border border-[#D97757]/25 bg-[#D97757]/10 p-4 text-sm leading-6 text-[#8F472F]">
        <strong>Read-only contract:</strong> this route fetches static JSON files only. Use Hermes Kanban, Linear, or signed server actions outside this browser surface for approvals and dispatch.
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <TeamMetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {(data.approvedPrds || []).slice(0, 3).map((prd) => (
          <TeamListCard
            key={prd.id}
            eyebrow={prd.priority ? `${prd.priority} priority` : 'PRD'}
            title={prd.title}
            description={prd.receipt}
            state={prd.status}
          >
            <ReceiptLink href={prd.url}>Open PRD</ReceiptLink>
          </TeamListCard>
        ))}
      </section>
    </div>
  );
}

function PrdsPage({ data }) {
  const prds = data.approvedPrds || [];
  return (
    <SectionPage
      icon={ClipboardCheck}
      eyebrow="Approved queue"
      title="PRDs"
      description="PRD records are projected from generated manifests and approval receipts. This page does not approve, reject, or dispatch work."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        {prds.map((prd) => (
          <TeamListCard
            key={prd.id}
            eyebrow={`${prd.owner || 'Queue'} · ${prd.priority || 'unranked'}`}
            title={prd.title}
            description={prd.receipt}
            state={prd.status}
          >
            <ReceiptLink href={prd.url}>Open PRD</ReceiptLink>
          </TeamListCard>
        ))}
        {prds.length === 0 && <EmptyState label="PRDs" />}
      </div>
    </SectionPage>
  );
}

function BuildsPage({ data }) {
  const tasks = data.buildStatus?.activeTasks || [];
  return (
    <SectionPage
      icon={GitPullRequest}
      eyebrow={data.buildStatus?.queueLabel || 'Build queue'}
      title="Build status"
      description={data.buildStatus?.summary || 'Read-only Kanban task projection.'}
    >
      <div className="grid gap-4">
        {tasks.map((task) => (
          <article key={task.id} className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-[#191919]/45">{task.id} · priority {task.priority}</p>
                <h3 className="mt-2 font-serif text-2xl text-[#191919]">{task.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#191919]/65">{task.receipt}</p>
              </div>
              <TeamStatusBadge state={task.status} />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase text-[#191919]/45">Assignee: {task.assignee}</p>
          </article>
        ))}
        {tasks.length === 0 && <EmptyState label="active tasks" />}
      </div>
    </SectionPage>
  );
}

function ArtifactsPage({ data }) {
  const artifacts = data.artifactReceipts || [];
  return (
    <SectionPage
      icon={Boxes}
      eyebrow="Deliverable links"
      title="Artifacts"
      description="Artifact links point to static previews, manifests, and generated receipts. Downloads or private files need a separate signed action path."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        {artifacts.map((artifact) => (
          <TeamListCard
            key={artifact.id}
            eyebrow={artifact.kind}
            title={artifact.title}
            description={artifact.receipt}
            state={artifact.status}
          >
            <ReceiptLink href={artifact.url}>Open artifact</ReceiptLink>
          </TeamListCard>
        ))}
        {artifacts.length === 0 && <EmptyState label="artifacts" />}
      </div>
    </SectionPage>
  );
}

function RunsPage({ data }) {
  const runs = data.runReceipts || [];
  return (
    <SectionPage
      icon={Activity}
      eyebrow="Run evidence"
      title="Run receipts"
      description="Run receipts summarize completed or active automation evidence from mirrored files. This cockpit does not retry, unblock, or dispatch work."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        {runs.map((run) => (
          <TeamListCard
            key={run.id}
            eyebrow={run.actor || 'Hermes run'}
            title={run.title}
            description={run.receipt}
            state={run.status}
          >
            <ul className="space-y-2 text-sm leading-6 text-[#191919]/65">
              {(run.evidence || []).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </TeamListCard>
        ))}
        {runs.length === 0 && <EmptyState label="run receipts" />}
      </div>
    </SectionPage>
  );
}

function ReceiptsPage({ data }) {
  const receipts = data.releaseReceipts || [];
  return (
    <SectionPage
      icon={PackageCheck}
      eyebrow="Release evidence"
      title="Receipts"
      description="Release receipts explain what shipped, what is still deferred, and which evidence supports the current surface."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        {receipts.map((receipt) => (
          <TeamListCard
            key={receipt.id}
            eyebrow={`${receipt.version || 'version'} · ${receipt.date || 'undated'}`}
            title={receipt.title}
            state={receipt.status}
          >
            <ul className="space-y-2 text-sm leading-6 text-[#191919]/65">
              {(receipt.evidence || []).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </TeamListCard>
        ))}
        {receipts.length === 0 && <EmptyState label="release receipts" />}
      </div>
    </SectionPage>
  );
}

function SectionPage({ icon, eyebrow, title, description, children }) {
  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#D6D4C8] bg-white/45">
          {createElement(icon, { className: 'h-5 w-5 text-[#D97757]' })}
        </span>
        <div>
          <span className="text-xs font-bold uppercase text-[#D97757]">{eyebrow}</span>
          <h1 className="mt-2 font-serif text-4xl text-[#191919] md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#191919]/70">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function TeamRoutes() {
  const { data, loadState } = useTeamCockpitData();

  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <TeamHeader />
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <Routes>
          <Route index element={<OverviewPage data={data} loadState={loadState} />} />
          <Route path="prds" element={<PrdsPage data={data} />} />
          <Route path="builds" element={<BuildsPage data={data} />} />
          <Route path="runs" element={<RunsPage data={data} />} />
          <Route path="artifacts" element={<ArtifactsPage data={data} />} />
          <Route path="receipts" element={<ReceiptsPage data={data} />} />
          <Route path="dispatch" element={<Navigate to="/team/builds" replace />} />
          <Route path="*" element={<Navigate to="/team" replace />} />
        </Routes>
      </main>
    </div>
  );
}
