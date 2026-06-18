import { CheckCircle2, FileJson, FileText, ShieldCheck } from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import CollapsibleSection from '../../../ops/components/CollapsibleSection';

const validations = [
  { label: 'Frontmatter', status: 'pass' },
  { label: 'Roadmap', status: 'pass' },
  { label: 'Client', status: 'pass' },
  { label: 'TAC reuse', status: 'pass' },
];

export default function ValidationPage() {
  return (
    <OpsPageShell>
      <div className="space-y-3">
        <CollapsibleSection
          eyebrow="01"
          title="Validation"
          meta={<span className="gb-chip gb-chip-green">Passed</span>}
          defaultOpen
        >
          <span className="gb-eyebrow text-[#D97757]">Validation</span>
          <h1 className="mt-3 font-serif text-4xl font-medium text-[#191919] md:text-5xl">
            Internal run passed before external rollout.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#191919]/70">
            The portal pattern was validated against the GBAutomation repository so the first live
            route exercises the shared shell before client-owned repositories are connected.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="02"
          title="Validation checks"
          meta={<span className="gb-pill">4 checks</span>}
        >
          <div className="grid gap-4 md:grid-cols-4">
            {validations.map((item) => (
              <article
                key={item.label}
                className="reveal glass-panel rounded-md border border-[#D6D4C8] p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span className="gb-chip gb-chip-green uppercase">{item.status}</span>
                </div>
                <p className="mt-3 font-serif text-lg text-[#191919]">{item.label}</p>
              </article>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="03"
          title="Plan + receipt"
          meta={<span className="gb-pill">2 artifacts</span>}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="reveal glass-panel rounded-md border border-[#D6D4C8] p-5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#D97757]" />
                <h2 className="font-serif text-2xl text-[#191919]">Plan</h2>
              </div>
              <p className="mt-4 font-mono text-sm leading-6 text-[#191919]/70">
                second-brain/plans/2026-05-10-client-portal-validation-gbautomation.md
              </p>
            </article>
            <article className="reveal glass-panel rounded-md border border-[#D6D4C8] p-5">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-[#D97757]" />
                <h2 className="font-serif text-2xl text-[#191919]">Receipt</h2>
              </div>
              <p className="mt-4 font-mono text-sm leading-6 text-[#191919]/70">
                second-brain/intelligence/tac-validations/2026-05-10-client-portal-validation-gbautomation.json
              </p>
            </article>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="04"
          title="Rollout gate"
          meta={<span className="gb-chip gb-chip-amber">Next</span>}
        >
          <section className="reveal rounded-md border border-[#D6D4C8] bg-[#191919] p-5 text-[#F3F1E7]">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-[#D97757]" />
              <div>
                <h2 className="font-serif text-2xl">Rollout Gate</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#F3F1E7]/75">
                  The next safe rollout is a real external tenant source repository, installed as a
                  submodule and connected through the checked-in dispatch workflow template.
                </p>
              </div>
            </div>
          </section>
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
