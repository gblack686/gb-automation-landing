import { useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import ClientSection from '../shared/ClientSection';
import ClientArtifactList from '../shared/ClientArtifactList';
import { useClientResource, tenantWorkspacePath } from './tenantDataAdapter';
import { WorkspaceBackLink, WorkspaceError, WorkspaceLoading } from './WorkspaceStates';

export function WorkspaceArtifactsPage({ slug }) {
  const { adapter, data, error, loading } = useClientResource(slug, 'artifacts.json', {
    optional: true,
    fallback: { artifacts: [] },
  });

  if (!adapter) return <WorkspaceError error={`Unknown tenant: ${slug}`} />;
  if (loading) return <WorkspaceLoading label={`${adapter.tenant.name} artifacts`} />;
  if (error) return <WorkspaceError title="Failed to load artifacts" error={error} />;

  const detailBase = tenantWorkspacePath(adapter.tenant.slug, 'artifacts');
  const items = data?.artifacts || [];
  const open = items.filter((artifact) => artifact.status !== 'archived');
  const archived = items.filter((artifact) => artifact.status === 'archived');

  return (
    <div className="space-y-10">
      <ClientSection
        eyebrow="Artifacts"
        title={`${adapter.tenant.name} artifact registry`}
        description={`PRDs, briefs, and reports tied to the ${adapter.tenant.name} tenant. Source: ${adapter.tenant.dataPath}/artifacts.json.`}
      >
        <ClientArtifactList artifacts={open} detailBaseUrl={detailBase} />
      </ClientSection>

      {archived.length > 0 && (
        <ClientSection
          eyebrow="Archive"
          title="Archived artifacts"
          description="Past artifacts kept for traceability. Reuse rather than restart when possible."
        >
          <ClientArtifactList artifacts={archived} detailBaseUrl={detailBase} />
        </ClientSection>
      )}
    </div>
  );
}

export function WorkspaceArtifactDetailPage({ slug }) {
  const { artifactId } = useParams();
  const { adapter, data, error, loading } = useClientResource(slug, 'artifacts.json', {
    optional: true,
    fallback: { artifacts: [] },
  });

  if (!adapter) return <WorkspaceError error={`Unknown tenant: ${slug}`} />;
  if (loading) return <WorkspaceLoading label="artifact" />;
  if (error) return <WorkspaceError title="Failed to load artifacts" error={error} />;

  const artifact = (data?.artifacts || []).find((item) => item.id === artifactId);
  if (!artifact) {
    return (
      <div className="space-y-4">
        <WorkspaceBackLink slug={adapter.tenant.slug} to="artifacts" label="Artifacts" />
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No artifact with id <code className="font-mono">{artifactId}</code> in {adapter.tenant.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <WorkspaceBackLink slug={adapter.tenant.slug} to="artifacts" label="All artifacts" />

      <ClientSection
        eyebrow={artifact.kind}
        title={artifact.title}
        description={artifact.summary}
        action={
          artifact.asset_url && (
            <a
              href={artifact.asset_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-[#D6D4C8] bg-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/70 hover:border-[#D97757] hover:text-[#D97757]"
            >
              Open asset
              <ExternalLink className="h-3 w-3" />
            </a>
          )
        }
      >
        <dl className="grid gap-4 rounded-md border border-[#D6D4C8] bg-white/55 p-5 md:grid-cols-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45">Status</dt>
            <dd className="mt-1 text-sm text-[#191919]">{artifact.status}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45">Owner</dt>
            <dd className="mt-1 text-sm text-[#191919]">{artifact.owner || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45">Updated</dt>
            <dd className="mt-1 font-mono text-sm text-[#191919]">{artifact.updated_at?.slice(0, 10) || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45">Asset</dt>
            <dd className="mt-1 break-all font-mono text-xs text-[#191919]/60">
              {artifact.asset_url || '—'}
            </dd>
          </div>
        </dl>
      </ClientSection>
    </div>
  );
}
