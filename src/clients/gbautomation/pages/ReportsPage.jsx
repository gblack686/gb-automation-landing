import ClientSection from '../../shared/ClientSection';
import ClientReportList from '../../shared/ClientReportList';
import { useTenantData } from '../../shared/useTenantData';
import { getTenantConfig } from '../../shared/tenantConfig';

export default function ReportsPage({ slug = 'gbautomation' }) {
  const tenant = getTenantConfig(slug);
  const { data, error, loading } = useTenantData(`${tenant.dataPath}/reports.json`);

  if (loading) {
    return <p className="text-sm text-[#191919]/60">Loading {tenant.name} reports…</p>;
  }
  if (error) {
    return (
      <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Failed to load reports: <code className="font-mono">{error}</code>
      </p>
    );
  }

  const detailBase = `/clients/${tenant.slug}/reports`;
  const all = data.reports || [];
  const weekly = all.filter((r) => r.period === 'weekly');
  const monthly = all.filter((r) => r.period === 'monthly');
  const incident = all.filter((r) => r.period === 'incident');

  return (
    <div className="space-y-12">
      {monthly.length > 0 && (
        <ClientSection
          eyebrow="Monthly"
          title="Monthly roll-ups"
          description="One per calendar month. Includes the four weekly reports and any incidents."
        >
          <ClientReportList reports={monthly} detailBaseUrl={detailBase} />
        </ClientSection>
      )}

      <ClientSection
        eyebrow="Weekly"
        title="TAC weekly reports"
        description="Standing weekly TAC cadence: wins, blockers, numbers, next week."
      >
        <ClientReportList reports={weekly} detailBaseUrl={detailBase} />
      </ClientSection>

      {incident.length > 0 && (
        <ClientSection
          eyebrow="Incidents"
          title="Incident postmortems"
          description="Written same day when anything operational breaks."
        >
          <ClientReportList reports={incident} detailBaseUrl={detailBase} />
        </ClientSection>
      )}
    </div>
  );
}
