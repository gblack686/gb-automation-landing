import { FileJson, GitPullRequestArrow } from 'lucide-react';
import ClientSection from '../shared/ClientSection';
import { useClientResource } from './tenantDataAdapter';
import { WorkspaceEmpty, WorkspaceError, WorkspaceLoading } from './WorkspaceStates';

const RECEIPT_TONE = {
  pass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  passed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  fail: 'border-rose-200 bg-rose-50 text-rose-800',
  failed: 'border-rose-200 bg-rose-50 text-rose-800',
  review: 'border-amber-200 bg-amber-50 text-amber-800',
};

export default function WorkspaceReceiptsPage({ slug }) {
  const { adapter, data, error, loading } = useClientResource(slug, 'receipts.json', {
    optional: true,
    fallback: { receipts: [] },
  });

  if (!adapter) return <WorkspaceError error={`Unknown tenant: ${slug}`} />;
  if (loading) return <WorkspaceLoading label={`${adapter.tenant.name} receipts`} />;
  if (error) return <WorkspaceError title="Failed to load receipts" error={error} />;

  const receipts = data?.receipts || [];

  return (
    <ClientSection
      eyebrow="Receipts"
      title={`${adapter.tenant.name} delivery receipts`}
      description={`Release, validation, and TAC receipts exported for this tenant. Source: ${adapter.tenant.dataPath}/receipts.json.`}
    >
      {receipts.length === 0 ? (
        <WorkspaceEmpty>No receipts have been published for this tenant yet.</WorkspaceEmpty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {receipts.map((receipt) => {
            const tone = RECEIPT_TONE[receipt.status] || 'border-[#D6D4C8] bg-white/55 text-[#191919]/75';
            return (
              <article key={receipt.id || receipt.title} className={`rounded-md border p-5 ${tone}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/60">
                    <FileJson className="h-4 w-4 text-[#D97757]" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                      {receipt.status || 'receipt'} · {receipt.date || receipt.created_at?.slice(0, 10) || 'undated'}
                    </p>
                    <h3 className="mt-2 font-serif text-xl text-[#191919]">{receipt.title || receipt.id}</h3>
                    {receipt.summary && <p className="mt-2 text-sm leading-6 opacity-75">{receipt.summary}</p>}
                    {receipt.path && <p className="mt-3 break-all font-mono text-[11px] opacity-60">{receipt.path}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ClientSection>
  );
}

export function WorkspaceDecisionsPage({ slug }) {
  const { adapter, data, error, loading } = useClientResource(slug, 'decisions.json', {
    optional: true,
    fallback: { decisions: [] },
  });

  if (!adapter) return <WorkspaceError error={`Unknown tenant: ${slug}`} />;
  if (loading) return <WorkspaceLoading label={`${adapter.tenant.name} decisions`} />;
  if (error) return <WorkspaceError title="Failed to load decisions" error={error} />;

  const decisions = data?.decisions || [];

  return (
    <ClientSection
      eyebrow="Decisions"
      title={`${adapter.tenant.name} decision queue`}
      description={`Open and settled decisions exported for this tenant. Source: ${adapter.tenant.dataPath}/decisions.json.`}
    >
      {decisions.length === 0 ? (
        <WorkspaceEmpty>No tenant decisions have been published yet.</WorkspaceEmpty>
      ) : (
        <div className="divide-y divide-[#D6D4C8] rounded-md border border-[#D6D4C8] bg-white/55">
          {decisions.map((decision) => (
            <article key={decision.id || decision.title} className="grid gap-4 p-5 md:grid-cols-[10rem_1fr]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/55">
                <GitPullRequestArrow className="h-4 w-4 text-[#D97757]" />
                {decision.status || 'decision'}
              </div>
              <div>
                <h3 className="font-medium text-[#191919]">{decision.title}</h3>
                {decision.summary && <p className="mt-2 text-sm leading-6 text-[#191919]/65">{decision.summary}</p>}
                {decision.owner && <p className="mt-3 text-xs text-[#191919]/45">Owner: {decision.owner}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </ClientSection>
  );
}
