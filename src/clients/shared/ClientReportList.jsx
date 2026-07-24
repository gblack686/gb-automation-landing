import { Link } from 'react-router-dom';
import { ArrowUpRight, FileSpreadsheet } from 'lucide-react';

const PERIOD_TONE = {
  weekly: 'bg-[#E6E4D9] text-[#191919]/75',
  monthly: 'bg-[#191919] text-[#F3F1E7]',
  incident: 'bg-amber-100 text-amber-900',
};

export default function ClientReportList({ reports = [], detailBaseUrl }) {
  if (reports.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[#D6D4C8] bg-white/40 p-6 text-sm text-[#191919]/55">
        No reports published yet.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {reports.map((report) => {
        const periodTone = PERIOD_TONE[report.period] || PERIOD_TONE.weekly;
        return (
          <li
            key={report.id}
            className="rounded-md border border-[#D6D4C8] bg-white/55 p-5"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-[#E6E4D9]">
                <FileSpreadsheet className="h-4 w-4 text-[#D97757]" />
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${periodTone}`}
                  >
                    {report.period}
                  </span>
                  <span className="font-mono text-[11px] text-[#191919]/55">
                    {report.published_at?.slice(0, 10)}
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-xl text-[#191919]">
                  {report.title}
                </h3>
                {report.summary && (
                  <p className="mt-2 text-sm leading-6 text-[#191919]/65">
                    {report.summary}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-[#D6D4C8]/70 pt-3">
                  <span className="font-mono text-[11px] text-[#191919]/55">
                    {report.window || ''}
                  </span>
                  <Link
                    to={`${detailBaseUrl}/${report.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-[#D97757] hover:underline"
                  >
                    Read
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
