import ClientSection from '../shared/ClientSection';
import ClientAppsList from '../shared/ClientAppsList';
import { useClientResource } from './tenantDataAdapter';
import { WorkspaceError, WorkspaceLoading } from './WorkspaceStates';

export default function WorkspaceAppsPage({ slug }) {
  const { adapter, data, error, loading } = useClientResource(slug, 'apps.json', {
    optional: true,
    fallback: { apps: [] },
  });

  if (!adapter) return <WorkspaceError error={`Unknown tenant: ${slug}`} />;
  if (loading) return <WorkspaceLoading label={`${adapter.tenant.name} apps`} />;
  if (error) return <WorkspaceError title="Failed to load apps" error={error} />;

  return (
    <div className="space-y-10">
      <ClientSection
        eyebrow="Apps"
        title={`${adapter.tenant.name} portfolio`}
        description={`Tenant-scoped slice of the apps registry. Source: ${adapter.tenant.dataPath}/apps.json.`}
      >
        <ClientAppsList apps={data?.apps || []} />
      </ClientSection>

      <section className="rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#191919]/55">
          Registry pattern
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#191919]/70">
          Every standard tenant publishes <code className="font-mono">apps.json</code> at{' '}
          <code className="font-mono">{adapter.tenant.dataPath}/apps.json</code>. Shared workspace pages render it without tenant-specific page copies.
        </p>
      </section>
    </div>
  );
}
