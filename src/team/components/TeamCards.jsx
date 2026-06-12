import { ExternalLink } from 'lucide-react';

const stateStyles = {
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  mirrored: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  running: 'border-sky-200 bg-sky-50 text-sky-700',
  planned: 'border-[#D6D4C8] bg-[#E6E4D9] text-[#191919]/65',
  deferred: 'border-amber-200 bg-amber-50 text-amber-700',
  'in-review': 'border-[#D97757]/25 bg-[#D97757]/10 text-[#B75F43]',
};

export function TeamStatusBadge({ state }) {
  const normalized = String(state || 'planned').toLowerCase();
  const className = stateStyles[normalized] || stateStyles.planned;
  return (
    <span className={`inline-flex min-h-0 items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase ${className}`}>
      {state || 'planned'}
    </span>
  );
}

export function TeamMetricCard({ label, value, detail }) {
  return (
    <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
      <p className="text-xs font-semibold uppercase text-[#191919]/45">{label}</p>
      <p className="mt-3 font-serif text-4xl text-[#191919]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-[#191919]/65">{detail}</p>
    </article>
  );
}

export function TeamListCard({ title, eyebrow, description, state, children }) {
  return (
    <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow && <p className="text-xs font-semibold uppercase text-[#191919]/45">{eyebrow}</p>}
          <h3 className="mt-1 font-serif text-2xl text-[#191919]">{title}</h3>
          {description && <p className="mt-2 text-sm leading-6 text-[#191919]/65">{description}</p>}
        </div>
        <TeamStatusBadge state={state} />
      </div>
      {children && <div className="mt-5">{children}</div>}
    </article>
  );
}

export function ReceiptLink({ href, children }) {
  if (!href) return null;

  return (
    <a
      href={href}
      className="inline-flex min-h-0 items-center gap-1.5 rounded-md border border-[#D6D4C8] bg-[#F3F1E7] px-2.5 py-1 text-xs font-semibold uppercase text-[#191919]/55 hover:border-[#D97757] hover:text-[#D97757]"
    >
      {children || 'Open'}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
