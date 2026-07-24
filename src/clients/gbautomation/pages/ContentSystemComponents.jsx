import { CheckCircle2, ExternalLink, FileText, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ContentHero({ eyebrow, title, intro, children }) {
  return (
    <section className="grid gap-6 rounded-md border border-[#D6D4C8] bg-white/45 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
      <div>
        {eyebrow && (
          <span className="text-xs font-bold uppercase tracking-widest text-[#D97757]">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-3 max-w-4xl font-serif text-4xl font-medium leading-tight text-[#191919] md:text-6xl">
          {title}
        </h1>
        {intro && <p className="mt-4 max-w-3xl text-base leading-7 text-[#191919]/70">{intro}</p>}
      </div>
      {children && <div>{children}</div>}
    </section>
  );
}

export function NumberedSteps({ steps }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60 p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#191919] text-xs font-bold text-[#F3F1E7]">
            {index + 1}
          </span>
          <span className="pt-1 text-sm leading-6 text-[#191919]/70">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function SourceReferences({ references }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-[#D97757]" />
        <h2 className="font-serif text-2xl text-[#191919]">Source references</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {references.map((ref) => (
          <article key={ref.path} className="rounded-md border border-[#D6D4C8] bg-white/45 p-4">
            <h3 className="font-medium text-[#191919]">{ref.label}</h3>
            <p className="mt-2 break-words font-mono text-xs leading-5 text-[#191919]/55">{ref.path}</p>
            <p className="mt-3 text-sm leading-6 text-[#191919]/65">{ref.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CtaLink({ to, children, variant = 'primary' }) {
  const classes =
    variant === 'primary'
      ? 'bg-[#191919] text-[#F3F1E7] hover:bg-[#D97757]'
      : 'border border-[#D6D4C8] text-[#191919]/70 hover:border-[#D97757] hover:text-[#D97757]';
  return (
    <Link className={`inline-flex min-h-0 items-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition-colors ${classes}`} to={to}>
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  );
}

export function ChecklistTable({ rows, columns }) {
  return (
    <div className="overflow-hidden rounded-md border border-[#D6D4C8] bg-white/45">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-[#191919] text-[#F3F1E7]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 text-xs font-semibold uppercase tracking-widest">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D6D4C8]">
            {rows.map((row, index) => (
              <tr key={`${row.section || row.task}-${index}`} className="align-top">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 leading-6 text-[#191919]/70">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SafetyNote({ children }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{children}</p>
      </div>
    </div>
  );
}

export function ClaimList({ items }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60 p-4 text-sm leading-6 text-[#191919]/70">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#D97757]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
