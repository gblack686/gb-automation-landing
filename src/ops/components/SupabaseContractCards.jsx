import { createElement } from 'react';
import { Database, KeyRound, Route, ShieldCheck } from 'lucide-react';
import { contractStats, freshnessLabel } from '../lib/supabaseContractClient';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function accessTone(access) {
  const value = String(access || '').toLowerCase();
  if (value.includes('anon')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value.includes('authenticated')) return 'border-sky-200 bg-sky-50 text-sky-700';
  if (value.includes('service_role')) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-[#D6D4C8] bg-[#E6E4D9] text-[#191919]/65';
}

export function ContractPill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-[#D6D4C8] bg-white/45 text-[#191919]/65',
    ink: 'border-[#191919] bg-[#191919] text-[#F3F1E7]',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={cx('inline-flex min-h-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold', tones[tone])}>
      {children}
    </span>
  );
}

export function ContractMetric({ icon: MetricIcon = Database, label, value, detail }) {
  return (
    <article className="rounded-md border border-[#D6D4C8] bg-white/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase text-[#191919]/45">{label}</p>
        {createElement(MetricIcon, { className: 'h-4 w-4 text-[#D97757]' })}
      </div>
      <p className="mt-2 font-serif text-3xl text-[#191919]">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-[#191919]/55">{detail}</p> : null}
    </article>
  );
}

export function ContractSummary({ contracts }) {
  const stats = contractStats(contracts);
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <ContractMetric icon={Database} label="Cataloged Contracts" value={stats.contracts} detail={`${stats.databaseObjects} database objects visible to the readback`} />
      <ContractMetric icon={ShieldCheck} label="Domains" value={stats.domains} detail="Grouped by ownership and operational purpose" />
      <ContractMetric icon={KeyRound} label="Skill Registry" value={stats.skills} detail="Rows from ops_skills_registry" />
      <ContractMetric icon={Route} label="Generated" value={freshnessLabel(contracts?.generated_at)} detail={contracts?.generated_at ? new Date(contracts.generated_at).toLocaleString() : 'No generated timestamp'} />
    </section>
  );
}

export function AccessDistribution({ contracts }) {
  const { accessCounts, domainCounts } = contractStats(contracts);
  const accessEntries = Object.entries(accessCounts).sort((a, b) => b[1] - a[1]);
  const domainEntries = Object.entries(domainCounts).slice(0, 10);
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-md border border-[#D6D4C8] bg-white/50 p-4">
        <p className="text-xs font-bold uppercase text-[#191919]/45">Access Models</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {accessEntries.map(([access, count]) => (
            <span key={access} className={cx('inline-flex min-h-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold', accessTone(access))}>
              {access}: {count}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-[#D6D4C8] bg-white/50 p-4">
        <p className="text-xs font-bold uppercase text-[#191919]/45">Top Domains</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {domainEntries.map(([domain, count]) => (
            <ContractPill key={domain}>{domain}: {count}</ContractPill>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContractCard({ contract, compact = false }) {
  if (!contract) return null;
  return (
    <article className="rounded-md border border-[#D6D4C8] bg-white/55 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="gb-eyebrow text-[#D97757]">{contract.domain || 'schema'}</p>
          <h4 className="mt-1 break-words font-mono text-sm font-semibold text-[#191919]">{contract.object_name}</h4>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ContractPill tone="ink">{contract.object_type}</ContractPill>
          <span className={cx('inline-flex min-h-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold', accessTone(contract.access_model))}>
            {contract.access_model}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#191919]/65">{contract.notes || 'No contract notes captured yet.'}</p>

      {!compact ? (
        <div className="mt-4 grid gap-3 text-xs text-[#191919]/60 md:grid-cols-2">
          <p><span className="font-semibold text-[#191919]">Owner:</span> {contract.owner_agent}</p>
          <p><span className="font-semibold text-[#191919]">Lifecycle:</span> {contract.lifecycle}</p>
          <p><span className="font-semibold text-[#191919]">Write:</span> {contract.write_path || 'not documented'}</p>
          <p><span className="font-semibold text-[#191919]">Read:</span> {contract.read_path || 'not documented'}</p>
          <p><span className="font-semibold text-[#191919]">Retention:</span> {contract.retention_policy || 'not documented'}</p>
          <p><span className="font-semibold text-[#191919]">Updated:</span> {contract.updated_at ? new Date(contract.updated_at).toLocaleDateString() : 'unknown'}</p>
        </div>
      ) : null}
    </article>
  );
}

export function ContractCardGrid({ contracts = [], compact = false }) {
  if (!contracts.length) {
    return <p className="text-sm text-[#191919]/55">No matching Supabase contract rows in the current index.</p>;
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {contracts.map((contract) => (
        <ContractCard key={contract.object_name} contract={contract} compact={compact} />
      ))}
    </div>
  );
}
