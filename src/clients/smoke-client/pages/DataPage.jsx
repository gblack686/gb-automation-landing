import { useCallback } from 'react';
import DataExplorer from '../../../ops/components/DataExplorer';
import { fetchView } from '../../../lib/supabaseOps';
import { SMOKE_CLIENT_DATASETS, findDataset } from '../lib/datasets';

/**
 * DataPage — /clients/smoke-client/data
 *
 * Feeds the smoke-client dataset registry (the allowlist) and an anon view-fetch
 * into the generic <DataExplorer>. Auth is inherited from the tenant gate at the
 * App-level splat route; no per-page wrapper needed.
 */
export default function DataPage() {
  // Registry-validated anon reader. A view is only ever fetched if it is present
  // in the allowlist; isolation itself is enforced server-side by the view.
  const fetchDataset = useCallback(async (dataset) => {
    const entry = findDataset(dataset?.view);
    if (!entry) {
      throw new Error(`View not in allowlist: ${dataset?.view}`);
    }
    const order = entry.defaultSort
      ? `${entry.defaultSort.col}.${entry.defaultSort.dir}`
      : undefined;
    return fetchView(entry.view, { select: entry.select, order, limit: 500 });
  }, []);

  return (
    <DataExplorer
      datasets={SMOKE_CLIENT_DATASETS}
      fetchDataset={fetchDataset}
      title="Data Explorer"
      eyebrow="DATA"
      pageSize={25}
    />
  );
}
