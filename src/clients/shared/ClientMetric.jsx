export function ClientStatusRail({ children }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</section>
  );
}

export default function ClientMetric({ label, value, detail, accent }) {
  const tone =
    accent === 'good'
      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
      : accent === 'warn'
        ? 'border-amber-200 bg-amber-50/80 text-amber-900'
        : 'border-[#D6D4C8] bg-white/55 text-[#191919]';

  return (
    <article className={`rounded-md border p-5 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-50">
        {label}
      </p>
      <p className="mt-3 font-serif text-4xl">{value}</p>
      {detail && (
        <p className="mt-3 text-sm leading-6 opacity-70">{detail}</p>
      )}
    </article>
  );
}
