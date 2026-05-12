import { Database, ShieldAlert } from 'lucide-react';
import { opsData } from '../data/opsData';
import { StatusBadge } from '../components/OpsCards';

export default function OpsData() {
  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-bold uppercase text-[#D97757]">Supabase Mirror</span>
        <h1 className="mt-3 font-serif text-4xl text-[#191919] md:text-5xl">Data Contracts</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#191919]/70">
          Tables and storage surfaces planned for the curated website mirror. The browser
          should use user-scoped reads only; service-role access stays on the server side.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {opsData.dataStores.map((store) => (
          <article key={store.name} className="rounded-md border border-[#D6D4C8] bg-white/45 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#E6E4D9]">
                  <Database className="h-4 w-4 text-[#D97757]" />
                </span>
                <div>
                  <h2 className="font-mono text-base text-[#191919]">{store.name}</h2>
                  <p className="mt-1 text-xs font-semibold uppercase text-[#191919]/45">{store.type}</p>
                </div>
              </div>
              <StatusBadge state={store.state} />
            </div>
            <p className="mt-4 text-sm leading-6 text-[#191919]/65">{store.detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <h2 className="font-serif text-2xl">Frontend Safety Rule</h2>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-6">
          Do not expose Supabase service-role keys, AWS credentials, SSH commands, raw logs,
          or environment values to this route. Browser actions should create reviewed intent
          records only.
        </p>
      </section>
    </div>
  );
}
