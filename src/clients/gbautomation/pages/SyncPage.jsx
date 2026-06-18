import { GitCommitHorizontal, GitPullRequestArrow, LockKeyhole, Workflow } from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import CollapsibleSection from '../../../ops/components/CollapsibleSection';

const syncSteps = [
  {
    icon: GitCommitHorizontal,
    title: 'Tenant push',
    detail: 'A tenant source repo, such as gbauto/jid5274-portal, receives a push to main.',
  },
  {
    icon: Workflow,
    title: 'Dispatch parent',
    detail: 'The tenant repo sends repository_dispatch to gbauto/gb-automation-landing with tenant, ref, and SHA.',
  },
  {
    icon: LockKeyhole,
    title: 'Path guard',
    detail: 'The parent workflow updates only src/clients/<slug> and refuses changes outside that tenant folder.',
  },
  {
    icon: GitPullRequestArrow,
    title: 'Amplify rebuild',
    detail: 'The parent repo commits the submodule bump to the selected branch and Amplify deploys the portal.',
  },
];

const workflowFiles = [
  {
    path: '.github/workflows/tenant-sync.yml',
    detail:
      'Parent workflow that receives dispatch events, bumps the tenant submodule, validates the path boundary, builds, commits, and pushes.',
  },
  {
    path: 'docs/tenant-source-notify-parent.yml',
    detail:
      'Template workflow for each client source repo. Install it after the client repo and fine-grained parent PAT are created.',
  },
];

export default function SyncPage() {
  return (
    <OpsPageShell
      number="SYNC"
      title="Repository Sync"
      meta={<span className="gb-chip gb-chip-green">Production pattern</span>}
    >
      <div className="space-y-3">
        <CollapsibleSection
          eyebrow="01"
          title="Tenant-owned content, parent-owned deployment."
          meta={<span className="gb-pill">Overview</span>}
          defaultOpen
        >
          <p className="max-w-3xl text-base leading-7 text-[#191919]/70">
            The production pattern keeps each client in a separate repository. The website repo only
            stores a reviewed pointer to the tenant content and owns the shared auth, shell, and
            deployment pipeline.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="02"
          title="Sync Flow"
          meta={<span className="gb-pill">4 steps</span>}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {syncSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.title}
                  className="glass-panel reveal rounded-md border border-[#D6D4C8] bg-white/45 p-5"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#E6E4D9]">
                      <Icon className="h-4 w-4 text-[#D97757]" />
                    </span>
                    <span className="gb-tag key">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h2 className="mt-5 font-serif text-2xl text-[#191919]">{step.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#191919]/65">{step.detail}</p>
                </article>
              );
            })}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="03"
          title="Workflow Files"
          meta={<span className="gb-pill">2 files</span>}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {workflowFiles.map((file) => (
              <div
                key={file.path}
                className="glass-panel rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#D97757]" aria-hidden="true" />
                  <p className="font-mono text-sm text-[#191919]">{file.path}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#191919]/65">{file.detail}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
