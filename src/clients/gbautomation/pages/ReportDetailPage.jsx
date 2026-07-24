import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import ClientSection from '../../shared/ClientSection';
import { useTenantData } from '../../shared/useTenantData';
import { getTenantConfig } from '../../shared/tenantConfig';

const PERIOD_TONE = {
  weekly: 'bg-[#E6E4D9] text-[#191919]/75',
  monthly: 'bg-[#191919] text-[#F3F1E7]',
  incident: 'bg-amber-100 text-amber-900',
};

export default function ReportDetailPage({ slug = 'gbautomation' }) {
  const tenant = getTenantConfig(slug);
  const { reportId } = useParams();
  const { data, error, loading } = useTenantData(
    `${tenant.dataPath}/reports/${reportId}.json`,
  );

  if (loading) {
    return <p className="text-sm text-[#191919]/60">Loading report…</p>;
  }
  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to={`/clients/${tenant.slug}/reports`}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/60 hover:text-[#D97757]"
        >
          <ArrowLeft className="h-3 w-3" />
          Reports
        </Link>
        <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Could not load report <code className="font-mono">{reportId}</code>: {error}
        </p>
      </div>
    );
  }

  const tone = PERIOD_TONE[data.period] || PERIOD_TONE.weekly;

  return (
    <div className="space-y-10">
      <Link
        to={`/clients/${tenant.slug}/reports`}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/60 hover:text-[#D97757]"
      >
        <ArrowLeft className="h-3 w-3" />
        All reports
      </Link>

      <ClientSection
        eyebrow={
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tone}`}
          >
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
              {section.bullets.map((b) => (
                <li
                  key={b}
                  className="flex gap-3 text-sm leading-6 text-[#191919]/75"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97757]" />
                  {b}
                </li>
              ))}
            </ul>
          )}
          {section.rows && (
            <div className="overflow-hidden rounded-md border border-[#D6D4C8] bg-white/55">
              <table className="w-full text-sm">
                <tbody>
                  {section.rows.map((row) => (
                    <tr
                      key={row.metric}
                      className="border-b border-[#D6D4C8]/60 last:border-b-0"
                    >
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
