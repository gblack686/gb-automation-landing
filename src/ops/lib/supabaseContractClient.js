let contractPromise;

export async function loadSupabaseContracts() {
  if (!contractPromise) {
    contractPromise = fetch('/ops/supabase/contracts.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Supabase contracts unavailable (${response.status})`);
        return response.json();
      });
  }
  return contractPromise;
}

export function indexContracts(contracts) {
  const rows = contracts?.contracts || [];
  return new Map(rows.map((row) => [row.object_name, row]));
}

export function contractsByDomain(contracts) {
  return (contracts?.contracts || []).reduce((groups, row) => {
    const key = row.domain || 'uncategorized';
    groups[key] = groups[key] || [];
    groups[key].push(row);
    return groups;
  }, {});
}

export function contractStats(contracts) {
  const rows = contracts?.contracts || [];
  const objectCounts = rows.reduce((counts, row) => {
    const key = row.object_type || 'object';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const accessCounts = rows.reduce((counts, row) => {
    const key = row.access_model || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const domains = contractsByDomain(contracts);

  return {
    contracts: rows.length,
    databaseObjects: contracts?.database_objects?.length || 0,
    skills: contracts?.skill_registry?.length || 0,
    domains: Object.keys(domains).length,
    objectCounts,
    accessCounts,
    domainCounts: Object.fromEntries(
      Object.entries(domains)
        .map(([domain, items]) => [domain, items.length])
        .sort((a, b) => b[1] - a[1]),
    ),
  };
}

const kindTerms = {
  agent: ['agent', 'kanban', 'host', 'trace', 'lineage'],
  skill: ['skill', 'capability', 'registry'],
  command: ['cron', 'host', 'run', 'dispatch'],
  expert: ['schema', 'governance', 'tac', 'observability'],
  prompt: ['prompt', 'canopy', 'profile'],
};

export function contractsForCapabilityKind(contracts, kind) {
  const terms = kindTerms[kind] || [];
  return (contracts?.contracts || [])
    .filter((row) => {
      const haystack = [
        row.object_name,
        row.domain,
        row.owner_agent,
        row.write_path,
        row.read_path,
        row.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.some((term) => haystack.includes(term));
    })
    .slice(0, 8);
}

export function freshnessLabel(iso) {
  if (!iso) return 'unknown';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 'unknown';
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day old';
  return `${days} days old`;
}

