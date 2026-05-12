import { Activity, Database, GitBranch, ShieldCheck } from 'lucide-react';
import { opsData } from '../data/opsData';
import { MetricGrid } from '../components/OpsCards';

export default function OpsOverview() {
  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <span className="text-xs font-bold uppercase text-[#D97757]">{opsData.mirror.status}</span>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-medium leading-tight text-[#191919] md:text-6xl">
            {opsData.mirror.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#191919]/70">
            Authenticated operations surface for the Mac Mini agent host, Hermes work queue,
            agent-run evidence, and Supabase-backed dashboard state.
          </p>
        </div>

        <div className="rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#191919] text-[#F3F1E7]">
              <GitBranch className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-[#191919]/50">Mirror Path</p>
              <p className="mt-1 text-sm leading-6 text-[#191919]/70">{opsData.mirror.syncPath}</p>
            </div>
          </div>
        </div>
      </section>

      <MetricGrid metrics={opsData.metrics} />

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#D97757]" />
            <h2 className="font-serif text-2xl text-[#191919]">Control Boundary</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#191919]/70">{opsData.mirror.policy}</p>
          <div className="mt-5 rounded-md border border-[#D6D4C8] bg-[#F3F1E7] p-4">
            <p className="text-xs font-semibold uppercase text-[#191919]/45">Current Host</p>
            <p className="mt-2 font-mono text-sm text-[#191919]">{opsData.mirror.host}</p>
            <p className="mt-2 text-sm text-[#191919]/60">{opsData.mirror.role}</p>
          </div>
        </article>

        <article className="rounded-md border border-[#D6D4C8] bg-[#191919] p-5 text-[#F3F1E7]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#D97757]" />
            <h2 className="font-serif text-2xl">Next Data Step</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#F3F1E7]/75">
            Add Supabase mirror tables for service snapshots, Hermes Kanban tasks, action
            requests, and run receipts. Mac Mini writers should publish sanitized rows;
            the website should never hold service-role keys or shell access.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {opsData.actionQueue.map((item) => (
              <div key={item.action} className="rounded-md border border-[#F3F1E7]/15 bg-white/5 p-3">
                <p className="text-xs font-semibold uppercase text-[#F3F1E7]/50">{item.status}</p>
                <p className="mt-2 text-sm leading-5">{item.action}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/60 p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#D97757]" />
          <h2 className="font-serif text-2xl text-[#191919]">Ops Contract</h2>
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-[#191919]/70">
          This route is the website surface. It intentionally starts as a read-only mirror.
          Future action buttons should create reviewed intent records in Supabase for agents
          to process from the Mini, not invoke commands from the browser.
        </p>
      </section>
    </div>
  );
}
