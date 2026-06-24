import { useEffect, useMemo, useState } from 'react';
import { Database, Search, ShieldAlert } from 'lucide-react';
import { opsData } from '../data/opsData';
import { StatusBadge } from '../components/OpsCards';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';
import {
  AccessDistribution,
  ContractCardGrid,
  ContractSummary,
} from '../components/SupabaseContractCards';
import { loadSupabaseContracts } from '../lib/supabaseContractClient';

export default function OpsData() {
  const [contracts, setContracts] = useState(null);
  const [contractError, setContractError] = useState('');
  const [domain, setDomain] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadSupabaseContracts()
      .then((data) => { if (!cancelled) setContracts(data); })
      .catch((error) => { if (!cancelled) setContractError(error.message || 'Unable to load Supabase contracts'); });
    return () => { cancelled = true; };
  }, []);

  const domains = useMemo(() => {
    const values = new Set((contracts?.contracts || []).map((item) => item.domain).filter(Boolean));
    return [...values].sort();
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (contracts?.contracts || [])
      .filter((item) => domain === 'all' || item.domain === domain)
      .filter((item) => {
        if (!needle) return true;
        return [
          item.object_name,
          item.object_type,
          item.domain,
          item.owner_agent,
          item.lifecycle,
          item.access_model,
          item.write_path,
          item.read_path,
          item.notes,
        ].filter(Boolean).join(' ').toLowerCase().includes(needle);
      });
  }, [contracts, domain, query]);

  return (
    <OpsPageShell>
      <div className="space-y-3">
        {/* Header — Supabase Mirror eyebrow + title + intro */}
        <CollapsibleSection eyebrow="Supabase Mirror" title="Data Contracts">
          <p className="max-w-3xl text-sm leading-7 text-[#191919]/70">
            Tables, views, and index contracts from the Supabase operations spine. The browser
            consumes a sanitized readback JSON; service-role access stays in the generator process.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="00"
          title="Contract Index"
          defaultOpen
          meta={<span className="gb-pill">{contracts ? `${contracts.contracts.length} contracts` : 'loading'}</span>}
        >
          {contractError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{contractError}</div>
          ) : contracts ? (
            <div className="space-y-4">
              <ContractSummary contracts={contracts} />
              <AccessDistribution contracts={contracts} />
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDomain('all')}
                    className={`min-h-0 rounded-md px-3 py-2 text-xs font-bold uppercase ${domain === 'all' ? 'bg-[#191919] text-[#F3F1E7]' : 'bg-white/60 text-[#191919]/60 hover:text-[#191919]'}`}
                  >
                    All Domains
                  </button>
                  {domains.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDomain(item)}
                      className={`min-h-0 rounded-md px-3 py-2 text-xs font-bold uppercase ${domain === item ? 'bg-[#191919] text-[#F3F1E7]' : 'bg-white/60 text-[#191919]/60 hover:text-[#191919]'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <label className="flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] bg-white/70 px-3 py-2 text-sm text-[#191919]/65">
                  <Search className="h-4 w-4 text-[#D97757]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search contracts"
                    className="min-h-0 border-0 bg-transparent p-0 text-sm outline-none"
                  />
                </label>
              </div>
              <ContractCardGrid contracts={filteredContracts.slice(0, 24)} />
              {filteredContracts.length > 24 ? (
                <p className="text-sm text-[#191919]/55">Showing first 24 of {filteredContracts.length}. Narrow the filters to inspect deeper.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[#191919]/55">Loading contract index...</p>
          )}
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
