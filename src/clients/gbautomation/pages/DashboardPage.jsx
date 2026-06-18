import { Activity, CheckCircle2, GitBranch, ShieldCheck } from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import CollapsibleSection from '../../../ops/components/CollapsibleSection';
import { portalData } from '../data/portalData';

export default function DashboardPage() {
  return (
    <OpsPageShell
      eyebrow={portalData.tenant.status}
      title={portalData.tenant.name}
      meta={
        <span className="gb-chip gb-chip-green">
          <ShieldCheck className="h-3.5 w-3.5" />
          Validated
        </span>
      }
    >
      <div className="space-y-3">
        {/* 01 — Tenant hero: tagline + source repository card */}
        <CollapsibleSection
          eyebrow="01"
          title="Overview"
          meta={<span className="gb-pill">{portalData.tenant.slug}</span>}
          defaultOpen
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="reveal">
              <span className="gb-eyebrow text-[#D97757]">{portalData.tenant.status}</span>
              <h3 className="mt-2 max-w-3xl font-serif text-3xl font-medium leading-tight text-[#191919] md:text-5xl">
                {portalData.tenant.name}
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#191919]/70">
                {portalData.tenant.tagline}. This route validates the client portal surface,
                authentication wrapper, and tenant sync contract before exposing it to external
                client-owned repositories.
              </p>
            </div>

            <div className="glass-panel rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#191919] text-[#F3F1E7]">
                  <GitBranch className="h-4 w-4" />
                </span>
                <div>
                  <p className="gb-eyebrow text-[#191919]/50">Source Repository</p>
                  <p className="font-mono text-sm text-[#191919]">{portalData.tenant.repository}</p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* 02 — Metrics grid */}
        <CollapsibleSection
          eyebrow="02"
          title="Metrics"
          meta={<span className="gb-pill">{portalData.metrics.length} tracked</span>}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {portalData.metrics.map((metric) => (
              <article
                key={metric.label}
                className="glass-panel reveal rounded-md border border-[#D6D4C8] bg-white/45 p-5"
              >
                <p className="gb-eyebrow text-[#191919]/45">{metric.label}</p>
                <p className="mt-3 font-serif text-4xl text-[#191919]">{metric.value}</p>
                <p className="mt-3 text-sm leading-6 text-[#191919]/65">{metric.detail}</p>
              </article>
            ))}
          </div>
        </CollapsibleSection>

        {/* 03 — Portal Activity timeline */}
        <CollapsibleSection
          eyebrow="03"
          title={
            <span className="inline-flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#D97757]" />
              Portal Activity
            </span>
          }
          meta={<span className="gb-pill">{portalData.activity.length} events</span>}
        >
          <div className="glass-panel divide-y divide-[#D6D4C8] rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60">
            {portalData.activity.map((item) => (
              <div key={item.title} className="grid gap-3 p-5 sm:grid-cols-[7rem_1fr]">
                <span className="flex items-start gap-2 gb-eyebrow text-[#191919]/45">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97757]" aria-hidden="true" />
                  {item.timestamp}
                </span>
                <div>
                  <h4 className="font-medium text-[#191919]">{item.title}</h4>
                  <p className="mt-1 text-sm leading-6 text-[#191919]/65">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* 04 — Next Steps */}
        <CollapsibleSection
          eyebrow="04"
          title={
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#D97757]" />
              Next Steps
            </span>
          }
          meta={<span className="gb-pill">{portalData.nextSteps.length} queued</span>}
        >
          <div className="glass-panel rounded-md border border-[#D6D4C8] bg-white/45 p-5">
            <ol className="space-y-4">
              {portalData.nextSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#191919] text-xs font-bold text-[#F3F1E7]">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm leading-6 text-[#191919]/70">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </CollapsibleSection>

        {/* 05 — Sync Contract (dark) */}
        <CollapsibleSection
          eyebrow="05"
          title="Sync Contract"
          meta={
            <span className="gb-chip gb-chip-green">
              <ShieldCheck className="h-3.5 w-3.5" />
              TAC Validated
            </span>
          }
        >
          <div className="rounded-md border border-[#D6D4C8] bg-[#191919] p-5 text-[#F3F1E7]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="gb-eyebrow text-[#F3F1E7]/50">Sync Contract</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#F3F1E7]/75">
                  External tenants remain isolated in their own repositories. The parent website only
                  receives a submodule SHA bump after the tenant sync workflow verifies the changed path.
                </p>
              </div>
              <span className="inline-flex min-h-0 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                TAC Validated
              </span>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
