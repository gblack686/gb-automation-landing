import { getSourceLabels, proofLabel } from '../../content/clientWelcomeContent';

export function ProofBadge({ proof }) {
  return (
    <span className="inline-flex rounded-full border border-[#D6D4C8] bg-[#F3F1E7] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#191919]/55">
      {proofLabel(proof)}
    </span>
  );
}

export function SourceList({ sourceRefs = [] }) {
  const labels = getSourceLabels(sourceRefs);
  if (!labels.length) return null;
  return (
    <div className="mt-3 space-y-1 text-xs text-[#191919]/45">
      <div className="font-bold uppercase tracking-[0.16em]">Source refs</div>
      {labels.map((label) => <div key={label}>{label}</div>)}
    </div>
  );
}

export function MarkdownBlock({ children }) {
  return <div className="whitespace-pre-line text-sm leading-7 text-[#191919]/70">{children}</div>;
}

export function ContentCard({ eyebrow, title, body, proof, sourceRefs, children }) {
  return (
    <article className="rounded-3xl border border-[#D6D4C8] bg-white/55 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow && <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#D97757]">{eyebrow}</div>}
          {title && <h3 className="mt-2 font-serif text-2xl text-[#191919]">{title}</h3>}
        </div>
        {proof && <ProofBadge proof={proof} />}
      </div>
      {body && <div className="mt-4"><MarkdownBlock>{body}</MarkdownBlock></div>}
      {children && <div className="mt-5">{children}</div>}
      <SourceList sourceRefs={sourceRefs || proof?.source_refs} />
    </article>
  );
}

export function ChecklistGrid({ items = [] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          eyebrow={`${item.owner_role} / ${item.due_trigger}`}
          title={item.label}
          body={item.description}
          proof={item.proof}
          sourceRefs={item.source_refs}
        >
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-[#191919]/50">
            <span>{item.category}</span>
            <span>{item.status}</span>
            {item.proof_required && <span>proof required</span>}
          </div>
        </ContentCard>
      ))}
    </div>
  );
}

export function RouteShell({ eyebrow, title, description, children }) {
  return (
    <div className="min-h-screen bg-[#F3F1E7] text-[#191919] selection:bg-[#D97757] selection:text-white">
      <main className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <header className="max-w-4xl">
          {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D97757]">{eyebrow}</p>}
          <h1 className="mt-3 font-serif text-5xl font-medium leading-tight md:text-7xl">{title}</h1>
          {description && <p className="mt-5 max-w-3xl text-lg leading-8 text-[#191919]/65">{description}</p>}
        </header>
        <div className="mt-10 space-y-8">{children}</div>
      </main>
    </div>
  );
}
