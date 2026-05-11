import { GitCommitHorizontal, GitPullRequestArrow, LockKeyhole, Workflow } from 'lucide-react';

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

export default function SyncPage() {
  return (
    <div className="space-y-8">
      <section>
        <span className="text-xs font-bold uppercase tracking-widest text-[#D97757]">
          Repository Sync
        </span>
        <h1 className="mt-3 font-serif text-4xl font-medium text-[#191919] md:text-5xl">
          Tenant-owned content, parent-owned deployment.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#191919]/70">
          The production pattern keeps each client in a separate repository. The website repo only
          stores a reviewed pointer to the tenant content and owns the shared auth, shell, and
          deployment pipeline.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {syncSteps.map((step) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#E6E4D9]">
                <Icon className="h-4 w-4 text-[#D97757]" />
              </span>
              <h2 className="mt-5 font-serif text-2xl text-[#191919]">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#191919]/65">{step.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60 p-5">
        <h2 className="font-serif text-2xl text-[#191919]">Workflow Files</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-4">
            <p className="font-mono text-sm text-[#191919]">.github/workflows/tenant-sync.yml</p>
            <p className="mt-2 text-sm leading-6 text-[#191919]/65">
              Parent workflow that receives dispatch events, bumps the tenant submodule, validates
              the path boundary, builds, commits, and pushes.
            </p>
          </div>
          <div className="rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-4">
            <p className="font-mono text-sm text-[#191919]">docs/tenant-source-notify-parent.yml</p>
            <p className="mt-2 text-sm leading-6 text-[#191919]/65">
              Template workflow for each client source repo. Install it after the client repo and
              fine-grained parent PAT are created.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
