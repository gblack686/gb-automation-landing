import { ExternalLink } from 'lucide-react';
import { opsData } from '../data/opsData';
import { RunRow } from '../components/OpsCards';

export default function OpsRuns() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-xs font-bold uppercase text-[#D97757]">Execution Evidence</span>
          <h1 className="mt-3 font-serif text-4xl text-[#191919] md:text-5xl">Agent Runs</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#191919]/70">
            Recent and scheduled agent workflows. Live mode should read from Supabase run
            receipts and Langfuse summaries.
          </p>
        </div>
        <a
          href="https://us.cloud.langfuse.com"
          className="inline-flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] px-3 py-2 text-xs font-semibold uppercase text-[#191919]/60 hover:border-[#D97757] hover:text-[#D97757]"
          target="_blank"
          rel="noreferrer"
        >
          Langfuse
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <section className="overflow-hidden rounded-md border border-[#D6D4C8] bg-white/45">
        {opsData.agentRuns.map((run) => (
          <RunRow key={run.id} run={run} />
        ))}
      </section>
    </div>
  );
}
