import ClientSection from '../../shared/ClientSection';
import ClientArtifactList from '../../shared/ClientArtifactList';
import { useTenantData } from '../../shared/useTenantData';
import { getTenantConfig } from '../../shared/tenantConfig';

export default function ArtifactsPage({ slug = 'gbautomation' }) {
  const tenant = getTenantConfig(slug);
  const { data, error, loading } = useTenantData(`${tenant.dataPath}/artifacts.json`);

  if (loading) {
    return <p className="text-sm text-[#191919]/60">Loading {tenant.name} artifacts…</p>;
  }
  if (error) {
    return (
      <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Failed to load artifacts: <code className="font-mono">{error}</code>
      </p>
    );
  }

  const detailBase = `/clients/${tenant.slug}/artifacts`;
  const items = data.artifacts || [];
  const open = items.filter((a) => a.status !== 'archived');
  const archived = items.filter((a) => a.status === 'archived');

  return (
    <div className="space-y-10">
      <ClientSection
        eyebrow="Artifacts"
        title={`${tenant.name} artifact registry`}
        description={`PRDs, briefs, and reports tied to the ${tenant.name} tenant. Source: ${tenant.dataPath}/artifacts.json.`}
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
