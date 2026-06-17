import { Link } from 'react-router-dom';
import { FileText, FileJson, Image as ImageIcon, FileCode, ArrowUpRight } from 'lucide-react';

const KIND_ICON = {
  prd: FileText,
  brief: FileText,
  report: FileText,
  json: FileJson,
  html: FileCode,
  image: ImageIcon,
};

function iconFor(kind) {
  const key = (kind || '').toLowerCase();
  return KIND_ICON[key] || FileText;
}

const STATUS_TONE = {
  shipped: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  draft: 'border-amber-200 bg-amber-50 text-amber-800',
  review: 'border-[#191919]/15 bg-[#E6E4D9] text-[#191919]/80',
  archived: 'border-[#D6D4C8] bg-white/55 text-[#191919]/55',
};

export default function ClientArtifactList({
  artifacts = [],
  detailBaseUrl,
}) {
  if (artifacts.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[#D6D4C8] bg-white/40 p-6 text-sm text-[#191919]/55">
        No artifacts yet for this tenant.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#D6D4C8] bg-white/55">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#D6D4C8] bg-[#E6E4D9]/60 text-[10px] uppercase tracking-widest text-[#191919]/55">
            <th className="px-5 py-3 text-left font-semibold">Artifact</th>
            <th className="px-5 py-3 text-left font-semibold">Kind</th>
            <th className="px-5 py-3 text-left font-semibold">Owner</th>
            <th className="px-5 py-3 text-left font-semibold">Updated</th>
            <th className="px-5 py-3 text-left font-semibold">Status</th>
            <th className="px-5 py-3 text-right font-semibold">Open</th>
          </tr>
        </thead>
        <tbody>
          {artifacts.map((a) => {
            const Icon = iconFor(a.kind);
            const tone = STATUS_TONE[a.status] || STATUS_TONE.review;
            return (
              <tr
                key={a.id}
                className="border-t border-[#D6D4C8]/60 align-top hover:bg-[#F3F1E7]/60"
              >
                <td className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-[#E6E4D9]">
                      <Icon className="h-3.5 w-3.5 text-[#D97757]" />
                    </span>
                    <div>
                      <p className="font-medium text-[#191919]">{a.title}</p>
                      {a.summary && (
                        <p className="mt-1 text-xs text-[#191919]/55">{a.summary}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-[#191919]/65">
                  {a.kind}
                </td>
                <td className="px-5 py-4 text-xs text-[#191919]/65">{a.owner || '—'}</td>
                <td className="px-5 py-4 font-mono text-xs text-[#191919]/55">
                  {a.updated_at?.slice(0, 10) || '—'}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tone}`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  {detailBaseUrl ? (
                    <Link
                      to={`${detailBaseUrl}/${a.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-[#D97757] hover:underline"
                    >
                      View
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    a.asset_url && (
                      <a
                        href={a.asset_url}
                        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-[#D97757] hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
