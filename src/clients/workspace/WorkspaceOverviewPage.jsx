import { GitBranch, ShieldCheck } from 'lucide-react';
import ClientSection from '../shared/ClientSection';
import { useClientResource, tenantWorkspacePath } from './tenantDataAdapter';
import { WorkspaceError, WorkspaceLoading } from './WorkspaceStates';

function fallbackOverview(adapter) {
  const tenant = adapter.tenant;
  return {
    tenant: {
      slug: tenant.slug,
      name: tenant.name,
      tagline: tenant.tagline || `${tenant.name} client workspace`,
      status: tenant.productLabel || 'Client workspace',
      repository: tenant.repository,
    },
    metrics: [],
    activity: [],
    nextSteps: [],
  };
}

export default function WorkspaceOverviewPage({ slug }) {
  const { adapter, data, error, loading } = useClientResource(slug, 'profile.json', {
    optional: true,
  });

  if (!adapter) return <WorkspaceError error={`Unknown tenant: ${slug}`} />;
  if (loading) return <WorkspaceLoading label={`${adapter.tenant.name} overview`} />;
  if (error) return <WorkspaceError title="Failed to load profile" error={error} />;

  const overview = data || fallbackOverview(adapter);
  const tenantProfile = overview.tenant || fallbackOverview(adapter).tenant;
  const metrics = overview.metrics || [];
  const activity = overview.activity || [];
  const nextSteps = overview.nextSteps || overview.next_steps || [];

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D97757]">
            {tenantProfile.status}
          </span>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl font-medium leading-tight text-[#191919] md:text-6xl">
            {tenantProfile.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#191919]/70">
            {tenantProfile.tagline}. This shared workspace is rendered from the tenant slug and static data adapter.
          </p>
        </div>

        <div className="rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#191919] text-[#F3F1E7]">
              <GitBranch className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#191919]/50">
                Source Repository
              </p>
              <p className="font-mono text-sm text-[#191919]">{tenantProfile.repository || adapter.tenant.repository}</p>
            </div>
          </div>
        </div>
      </section>

      {metrics.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#191919]/45">
                {metric.label}
              </p>
              <p className="mt-3 font-serif text-4xl text-[#191919]">{metric.value}</p>
              <p className="mt-3 text-sm leading-6 text-[#191919]/65">{metric.detail}</p>
            </article>
          ))}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <ClientSection eyebrow="Activity" title="Recent events">
          <div className="divide-y divide-[#D6D4C8] rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60">
            {activity.length === 0 ? (
              <p className="p-5 text-sm text-[#191919]/60">No workspace activity published yet.</p>
            ) : (
              activity.map((item) => (
                <div key={item.title} className="grid gap-3 p-5 sm:grid-cols-[7rem_1fr]">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#191919]/45">
                    {item.timestamp}
                  </span>
                  <div>
                    <h3 className="font-medium text-[#191919]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#191919]/65">{item.detail}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ClientSection>

        <ClientSection eyebrow="Next" title="Next steps">
          <div className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
            {nextSteps.length === 0 ? (
              <p className="text-sm text-[#191919]/60">No next steps published yet.</p>
            ) : (
              <ol className="space-y-4">
                {nextSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#191919] text-xs font-bold text-[#F3F1E7]">
                      {index + 1}
                    </span>
                    <span className="pt-1 text-sm leading-6 text-[#191919]/70">{step}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </ClientSection>
      </section>

      <section className="rounded-md border border-[#D6D4C8] bg-[#191919] p-5 text-[#F3F1E7]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#F3F1E7]/50">
              Workspace Contract
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#F3F1E7]/75">
              Shared pages read tenant-scoped JSON from <code>{adapter.tenant.dataPath}</code> and link through <code>{tenantWorkspacePath(slug)}</code>.
            </p>
          </div>
          <span className="inline-flex min-h-0 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Adapter backed
          </span>
        </div>
      </section>
    </div>
  );
}
