import { ArrowUpRight, CheckCircle2, CircleDashed } from 'lucide-react';

const STATUS_TONE = {
  validated: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  experimental: 'border-[#D6D4C8] bg-[#E6E4D9] text-[#191919]/75',
  placeholder: 'border-[#D6D4C8] bg-white/55 text-[#191919]/55',
  private: 'border-[#191919]/15 bg-[#191919]/[0.04] text-[#191919]/70',
};

function statusIcon(status) {
  if (status === 'validated') return CheckCircle2;
  return CircleDashed;
}

export default function ClientAppsList({ apps = [] }) {
  if (apps.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[#D6D4C8] bg-white/40 p-6 text-sm text-[#191919]/55">
        No apps assigned to this tenant yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {apps.map((app) => {
        const Icon = statusIcon(app.status);
        const tone = STATUS_TONE[app.status] || STATUS_TONE.experimental;
        return (
          <article
            key={app.slug}
            className="flex flex-col rounded-md border border-[#D6D4C8] bg-white/55 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#191919]/45">
                  {app.surface || 'App'}
                </p>
                <h3 className="mt-2 font-serif text-2xl text-[#191919]">{app.name}</h3>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${tone}`}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {app.status}
              </span>
            </div>
            <p className="mt-3 flex-1 text-sm leading-6 text-[#191919]/70">
              {app.tagline}
            </p>
            {app.tech_stack && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {app.tech_stack.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[#E6E4D9] px-2 py-0.5 font-mono text-[10px] text-[#191919]/65"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between border-t border-[#D6D4C8]/70 pt-3 text-xs text-[#191919]/55">
              <span className="font-mono">{app.app_path || '—'}</span>
              {app.app_path && (
                <a
                  href={app.app_path}
                  className="inline-flex items-center gap-1 font-semibold uppercase tracking-widest text-[#D97757] hover:underline"
                >
                  Open
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
