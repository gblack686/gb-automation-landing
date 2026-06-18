import { Database, ShieldAlert } from 'lucide-react';
import { opsData } from '../data/opsData';
import { StatusBadge } from '../components/OpsCards';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';

export default function OpsData() {
  return (
    <OpsPageShell>
      <div className="space-y-3">
        {/* Header — Supabase Mirror eyebrow + title + intro */}
        <CollapsibleSection eyebrow="Supabase Mirror" title="Data Contracts">
          <p className="max-w-3xl text-sm leading-7 text-[#191919]/70">
            Tables and storage surfaces planned for the curated website mirror. The browser
            should use user-scoped reads only; service-role access stays on the server side.
          </p>
        </CollapsibleSection>

        {/* Data stores grid */}
        <CollapsibleSection
          eyebrow="01"
          title="Data Stores"
          defaultOpen
          meta={<span className="gb-pill">{opsData.dataStores.length} stores</span>}
        >
          <section className="grid gap-4 lg:grid-cols-2">
            {opsData.dataStores.map((store) => (
              <article key={store.name} className="glass-panel reveal rounded-md p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#D6D4C8] bg-[#E6E4D9]">
                      <Database className="h-4 w-4 text-[#D97757]" />
                    </span>
                    <div>
                      <h3 className="font-mono text-base text-[#191919]">{store.name}</h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#191919]/45">
                        {store.type}
                      </p>
                    </div>
                  </div>
                  <StatusBadge state={store.state} />
                </div>
                <p className="mt-4 text-sm leading-6 text-[#191919]/65">{store.detail}</p>
              </article>
            ))}
          </section>
        </CollapsibleSection>

        {/* Frontend Safety Rule callout (amber) */}
        <CollapsibleSection
          eyebrow="02"
          title="Frontend Safety Rule"
          meta={<span className="gb-chip gb-chip-amber">Guardrail</span>}
        >
          <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <h3 className="font-serif text-2xl">Frontend Safety Rule</h3>
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6">
              Do not expose Supabase service-role keys, AWS credentials, SSH commands, raw logs,
              or environment values to this route. Browser actions should create reviewed intent
              records only.
            </p>
          </section>
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
