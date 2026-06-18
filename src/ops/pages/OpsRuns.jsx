import { ExternalLink } from 'lucide-react';
import { opsData } from '../data/opsData';
import { RunRow } from '../components/OpsCards';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';

export default function OpsRuns() {
  return (
    <OpsPageShell
      number="01"
      title="Agent Runs"
      meta={<span className="gb-pill">{opsData.agentRuns.length} runs</span>}
    >
      <div className="space-y-3">
        {/* Header / context — kept open so the page isn't empty on load */}
        <CollapsibleSection
          eyebrow="01"
          title="Execution evidence"
          defaultOpen
          meta={<span className="gb-chip gb-chip-amber">Mock data</span>}
        >
          <p className="max-w-3xl text-sm leading-7 text-[#191919]/70">
            Recent and scheduled agent workflows. Live mode should read from Supabase run
            receipts and <strong>Langfuse</strong> summaries.
          </p>
          <a
            href="https://us.cloud.langfuse.com"
            className="mt-4 inline-flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] bg-white/45 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#191919]/60 transition-colors hover:border-[#D97757] hover:text-[#D97757]"
            target="_blank"
            rel="noreferrer"
          >
            Open Langfuse
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </CollapsibleSection>

        {/* Run log */}
        <CollapsibleSection
          eyebrow="02"
          title="Recent & scheduled runs"
          meta={<span className="gb-pill">{opsData.agentRuns.length} entries</span>}
        >
          <section className="glass-panel reveal overflow-hidden rounded-md border border-[#D6D4C8]">
            {opsData.agentRuns.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </section>
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
