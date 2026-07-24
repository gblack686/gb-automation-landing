import ClientSection from '../../shared/ClientSection';
import ClientAppsList from '../../shared/ClientAppsList';
import { useTenantData } from '../../shared/useTenantData';
import { getTenantConfig } from '../../shared/tenantConfig';

export default function AppsPage({ slug = 'gbautomation' }) {
  const tenant = getTenantConfig(slug);
  const { data, error, loading } = useTenantData(`${tenant.dataPath}/apps.json`);

  if (loading) {
    return <p className="text-sm text-[#191919]/60">Loading {tenant.name} apps…</p>;
  }
  if (error) {
    return (
      <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Failed to load apps: <code className="font-mono">{error}</code>
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <ClientSection
        eyebrow="Apps"
        title={`${tenant.name} portfolio`}
        description={`Tenant-scoped slice of the apps registry. Source: ${tenant.dataPath}/apps.json.`}
      >
        <ClientAppsList apps={data.apps} />
      </ClientSection>

      <section className="rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#191919]/55">
          Registry pattern
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#191919]/70">
          Every tenant publishes <code className="font-mono">apps.json</code> at{' '}
          <code className="font-mono">{tenant.dataPath}/apps.json</code>. The global{' '}
          <code className="font-mono">/portfolio/apps-registry.json</code> remains the public source
          of truth. Tenant files are a curated, branded subset.
        </p>
      </section>
    </div>
  );
}
