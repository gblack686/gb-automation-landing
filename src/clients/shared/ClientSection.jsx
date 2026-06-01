export default function ClientSection({ eyebrow, title, description, children, action }) {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow && (
            <span className="text-xs font-bold uppercase tracking-widest text-[#D97757]">
              {eyebrow}
            </span>
          )}
          {title && (
            <h2 className="mt-2 font-serif text-3xl font-medium text-[#191919]">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#191919]/65">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}
