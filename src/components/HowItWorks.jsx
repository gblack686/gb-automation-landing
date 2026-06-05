import { FileText, GitBranch, GitPullRequest, Inbox } from 'lucide-react';

const stages = [
  {
    label: 'Inbox',
    subtitle: 'Gmail / Telegram',
    Icon: Inbox,
    copy: 'A Google Meet ends. The transcript lands in Gmail. The transcript app extracts every action item and files structured Linear issues.',
  },
  {
    label: 'Linear',
    subtitle: 'Issue queue',
    Icon: FileText,
    copy: 'Issues live in Linear. The autonomous agent scores them, picks the next batch, and spins up isolated git worktrees.',
  },
  {
    label: 'Autonomous Build',
    subtitle: 'Agent worktree',
    Icon: GitBranch,
    copy: 'Claude Code reads the issue, edits code, commits, and retries failed checks inside a bounded execution lane.',
  },
  {
    label: 'Pull Request',
    subtitle: 'Reviewed + merged',
    Icon: GitPullRequest,
    copy: 'The agent opens a PR with a summary. A verifier scores the diff so you review what matters.',
  },
];

export default function HowItWorks() {
  return (
    <section id="automation-loop" className="border-y border-[#D6D4C8]/60 bg-[#F3F1E7] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-widest text-[#D97757]">
            The Automation Loop
          </span>
          <h2 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#191919] md:text-5xl">
            Meeting notes become shipped code.
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#5C5C5C] md:text-base">
            GBAutomation connects the messy operating layer to the development layer: transcripts, queues,
            coding agents, verifier reports, and pull requests in one repeatable system.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-4">
          {stages.map((stage, index) => {
            const Icon = stage.Icon;
            return (
              <div key={stage.label} className="relative">
                {index < stages.length - 1 && (
                  <div className="pointer-events-none absolute left-10 top-10 hidden h-px w-[calc(100%+1rem)] bg-[#D97757]/35 md:block" />
                )}
                <div className="relative h-full rounded-lg border border-[#D6D4C8] bg-white/65 p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md border border-[#D6D4C8] bg-[#F3F1E7] text-[#D97757]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C8A84]">
                      {stage.subtitle}
                    </span>
                    <h3 className="mt-2 font-serif text-2xl font-medium text-[#191919]">{stage.label}</h3>
                    <p className="mt-4 text-sm leading-6 text-[#5C5C5C]">{stage.copy}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-lg border border-[#D97757]/30 bg-[#D97757]/10 px-5 py-4 text-sm font-semibold text-[#191919]">
          From transcript to open PR in under 15 minutes when the queue and credentials are already wired.
        </div>
      </div>
    </section>
  );
}
