import { Link } from 'react-router-dom';

export default function MallScanner() {
  return (
    <main className="min-h-screen bg-[#F3F1E7] px-6 py-16 text-[#191919]">
      <section className="mx-auto max-w-4xl rounded-2xl border border-[#D6D4C8] bg-[#E6E4D9]/70 p-8 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D97757]">
          App scaffold
        </p>
        <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight md:text-5xl">
          Mall Scanner
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-[#5C5C5C]">
          This route is intentionally scaffold-only for the Day 1 portal sprint. The full app
          surface should be wired by the portal UI/data lanes after route ownership is finalized.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/apps"
            className="rounded-lg bg-[#191919] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#F3F1E7] hover:bg-[#333]"
          >
            Back to apps
          </Link>
          <Link
            to="/ops/runs"
            className="rounded-lg border border-[#D6D4C8] bg-[#F3F1E7]/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#191919] hover:border-[#D97757] hover:text-[#D97757]"
          >
            Ops runs
          </Link>
        </div>
      </section>
    </main>
  );
}
