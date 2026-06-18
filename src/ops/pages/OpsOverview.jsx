import { Activity, Database, GitBranch, ShieldCheck } from 'lucide-react';
import { opsData } from '../data/opsData';
import { MetricGrid } from '../components/OpsCards';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';

export default function OpsOverview() {
  return (
    <OpsPageShell
      number="OVERVIEW"
      title="Ops Mirror"
      meta={<span className="gb-chip gb-chip-amber">Read-only mirror</span>}
    >
      <div className="space-y-3">
        {/* Summary section — opened by default so the page isn't empty on load. */}
        <CollapsibleSection
          eyebrow="01"
          title={opsData.mirror.name}
          meta={
            <span className="gb-chip gb-chip-green">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#D97757]" aria-hidden="true" />
              {opsData.mirror.status}
            </span>
          }
          defaultOpen
        >
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="reveal">
              <span className="gb-eyebrow text-[#D97757]">{opsData.mirror.status}</span>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[#191919]/70">
                Authenticated operations surface for the Mac Mini agent host, Hermes work queue,
                agent-run evidence, and Supabase-backed dashboard state.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="gb-pill">{opsData.mirror.host}</span>
                <span className="gb-pill">{opsData.mirror.role}</span>
              </div>
            </div>

            <div className="glass-panel reveal rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#191919] text-[#F3F1E7]">
                  <GitBranch className="h-4 w-4" />
                </span>
                <div>
                  <p className="gb-eyebrow text-[#191919]/50">Mirror Path</p>
                  <p className="mt-1 text-sm leading-6 text-[#191919]/70">{opsData.mirror.syncPath}</p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="02"
          title="Metrics"
          meta={<span className="gb-pill">{opsData.metrics.length} signals</span>}
        >
          <MetricGrid metrics={opsData.metrics} />
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="03"
          title="Control Boundary"
          meta={
            <span className="inline-flex items-center gap-2 text-[#191919]/55">
              <ShieldCheck className="h-4 w-4 text-[#D97757]" aria-hidden="true" />
            </span>
          }
        >
          <article className="glass-panel reveal rounded-md border border-[#D6D4C8] bg-white/45 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#D97757]" />
              <h3 className="font-serif text-2xl text-[#191919]">Control Boundary</h3>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#191919]/70">{opsData.mirror.policy}</p>
            <div className="mt-5 rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-4">
              <p className="gb-eyebrow text-[#191919]/45">Current Host</p>
              <p className="mt-2 font-mono text-sm text-[#191919]">{opsData.mirror.host}</p>
              <p className="mt-2 text-sm text-[#191919]/60">{opsData.mirror.role}</p>
            </div>
          </article>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="04"
          title="Next Data Step"
          meta={<span className="gb-pill">{opsData.actionQueue.length} queued</span>}
        >
          <article className="reveal rounded-md border border-[#D6D4C8] bg-[#191919] p-5 text-[#F3F1E7]">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#D97757]" />
              <h3 className="font-serif text-2xl">Next Data Step</h3>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#F3F1E7]/75">
              Add Supabase mirror tables for service snapshots, Hermes Kanban tasks, action
              requests, and run receipts. Mac Mini writers should publish sanitized rows;
              the website should never hold service-role keys or shell access.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {opsData.actionQueue.map((item) => (
                <div key={item.action} className="rounded-md border border-[#F3F1E7]/15 bg-white/5 p-3">
                  <p className="gb-eyebrow text-[#F3F1E7]/50">{item.status}</p>
                  <p className="mt-2 text-sm leading-5">{item.action}</p>
                </div>
              ))}
            </div>
          </article>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="05"
          title="Ops Contract"
          meta={
            <span className="inline-flex items-center gap-2 text-[#191919]/55">
              <Activity className="h-4 w-4 text-[#D97757]" aria-hidden="true" />
            </span>
          }
        >
          <article className="glass-panel reveal rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60 p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#D97757]" />
              <h3 className="font-serif text-2xl text-[#191919]">Ops Contract</h3>
            </div>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-[#191919]/70">
              This route is the website surface. It intentionally starts as a read-only mirror.
              Future action buttons should create reviewed intent records in Supabase for agents
              to process from the Mini, not invoke commands from the browser.
            </p>
          </article>
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
