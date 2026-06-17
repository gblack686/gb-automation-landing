import { useParams } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';
import ClientSection from '../shared/ClientSection';
import ClientReportList from '../shared/ClientReportList';
import { useClientResource, tenantWorkspacePath } from './tenantDataAdapter';
import { WorkspaceBackLink, WorkspaceError, WorkspaceLoading } from './WorkspaceStates';

const PERIOD_TONE = {
  weekly: 'bg-[#E6E4D9] text-[#191919]/75',
  monthly: 'bg-[#191919] text-[#F3F1E7]',
  incident: 'bg-amber-100 text-amber-900',
};

export function WorkspaceReportsPage({ slug }) {
  const { adapter, data, error, loading } = useClientResource(slug, 'reports.json', {
    optional: true,
    fallback: { reports: [] },
  });

  if (!adapter) return <WorkspaceError error={`Unknown tenant: ${slug}`} />;
  if (loading) return <WorkspaceLoading label={`${adapter.tenant.name} reports`} />;
  if (error) return <WorkspaceError title="Failed to load reports" error={error} />;

  const detailBase = tenantWorkspacePath(adapter.tenant.slug, 'reports');
  const all = data?.reports || [];
  const monthly = all.filter((report) => report.period === 'monthly');
  const weekly = all.filter((report) => report.period === 'weekly');
  const incident = all.filter((report) => report.period === 'incident');
  const uncategorized = all.filter(
    (report) => !['monthly', 'weekly', 'incident'].includes(report.period),
  );

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
        description={`Standing weekly TAC cadence for ${adapter.tenant.name}: wins, blockers, numbers, next week.`}
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

      {uncategorized.length > 0 && (
        <ClientSection eyebrow="Other" title="Other reports">
          <ClientReportList reports={uncategorized} detailBaseUrl={detailBase} />
        </ClientSection>
      )}
    </div>
  );
}

export function WorkspaceReportDetailPage({ slug }) {
  const { reportId } = useParams();
  const { adapter, data, error, loading } = useClientResource(
    slug,
    `reports/${reportId}.json`,
  );

  if (!adapter) return <WorkspaceError error={`Unknown tenant: ${slug}`} />;
  if (loading) return <WorkspaceLoading label="report" />;
  if (error) {
    return (
      <div className="space-y-4">
        <WorkspaceBackLink slug={adapter.tenant.slug} to="reports" label="Reports" />
        <WorkspaceError title={`Could not load report ${reportId}`} error={error} />
      </div>
    );
  }

  const tone = PERIOD_TONE[data.period] || PERIOD_TONE.weekly;

  return (
    <div className="space-y-10">
      <WorkspaceBackLink slug={adapter.tenant.slug} to="reports" label="All reports" />

      <ClientSection
        eyebrow={
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tone}`}>
            {data.period}
          </span>
        }
        title={data.title}
        description={data.summary}
      >
        <div className="flex flex-wrap items-center gap-4 rounded-md border border-[#D6D4C8] bg-white/55 px-5 py-3 text-xs text-[#191919]/65">
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#D97757]" />
            <span className="font-mono">{data.window}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-[#D97757]" />
            {data.author}
          </span>
          <span className="font-mono text-[#191919]/45">
            Published {data.published_at?.slice(0, 10)}
          </span>
        </div>
      </ClientSection>

      {data.sections?.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h2 className="font-serif text-2xl text-[#191919]">{section.heading}</h2>
          {section.bullets && (
            <ul className="space-y-2 rounded-md border border-[#D6D4C8] bg-white/55 p-5">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3 text-sm leading-6 text-[#191919]/75">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97757]" />
                  {bullet}
                </li>
              ))}
            </ul>
          )}
          {section.rows && (
            <div className="overflow-hidden rounded-md border border-[#D6D4C8] bg-white/55">
              <table className="w-full text-sm">
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.metric} className="border-b border-[#D6D4C8]/60 last:border-b-0">
                      <td className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[#191919]/55">
                        {row.metric}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[#191919]">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
