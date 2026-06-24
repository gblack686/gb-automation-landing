import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Database, Search } from 'lucide-react';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';
import {
  AccessDistribution,
  ContractCardGrid,
  ContractSummary,
} from '../components/SupabaseContractCards';
import { contractsByDomain, loadSupabaseContracts } from '../lib/supabaseContractClient';

function formatDate(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function matchesContract(contract, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    contract.object_name,
    contract.object_type,
    contract.domain,
    contract.owner_agent,
    contract.lifecycle,
    contract.access_model,
    contract.write_path,
    contract.read_path,
    contract.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

export default function OpsSupabase() {
  const [contracts, setContracts] = useState(null);
  const [error, setError] = useState('');
  const [domain, setDomain] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadSupabaseContracts()
      .then((data) => {
        if (!cancelled) setContracts(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load Supabase contracts');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const domains = useMemo(() => {
    const groups = contractsByDomain(contracts);
    return Object.entries(groups)
      .map(([name, rows]) => ({ name, count: rows.length }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contracts]);

  const filteredContracts = useMemo(() => (
    (contracts?.contracts || [])
      .filter((contract) => domain === 'all' || contract.domain === domain)
      .filter((contract) => matchesContract(contract, query))
  ), [contracts, domain, query]);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-5 text-red-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <strong>Supabase contract index failed</strong>
        </div>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  if (!contracts) {
    return <p className="text-sm text-[#191919]/55">Loading Supabase contract index...</p>;
  }

  return (
    <OpsPageShell>
      <div className="space-y-3">
        <CollapsibleSection
          eyebrow="Supabase Mirror"
          title="Data Contracts"
          meta={<span className="gb-chip gb-chip-blue">Generated {formatDate(contracts.generated_at)}</span>}
        >
          <p className="max-w-3xl text-sm leading-7 text-[#191919]/70">
            Sanitized table, view, and index contracts from the Supabase operations spine.
            Row-level operational snapshots stay out of the public static bundle until the
            page reads them through an authenticated server path.
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="01"
          title="Summary"
          defaultOpen
          meta={<span className="gb-pill">{contracts.contracts?.length || 0} contracts</span>}
        >
          <div className="space-y-4">
            <ContractSummary contracts={contracts} />
            <AccessDistribution contracts={contracts} />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="02"
          title="Filters"
          meta={<span className="gb-pill">{filteredContracts.length} visible</span>}
        >
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
                  key={item.name}
                  type="button"
                  onClick={() => setDomain(item.name)}
                  className={`min-h-0 rounded-md px-3 py-2 text-xs font-bold uppercase ${domain === item.name ? 'bg-[#191919] text-[#F3F1E7]' : 'bg-white/60 text-[#191919]/60 hover:text-[#191919]'}`}
                >
                  {item.name} ({item.count})
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
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="03"
          title="Contracts"
          defaultOpen
          meta={<span className="gb-pill">{filteredContracts.length} rows</span>}
        >
          <ContractCardGrid contracts={filteredContracts} />
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="04"
          title="Data Boundary"
          meta={<span className="gb-chip gb-chip-amber">Boundary</span>}
        >
          <div className="rounded-md border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <h3 className="font-serif text-xl">Public Static Boundary</h3>
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6">
              This page serves contract metadata only. Live Supabase reads, AWS Secrets
              Manager access, service-role keys, raw logs, and row snapshots stay outside
              the browser bundle.
            </p>
          </div>
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
