import { useCallback } from 'react';
import DataExplorer from '../../../ops/components/DataExplorer';
import { fetchView } from '../../../lib/supabaseOps';
import { findDataset } from '../lib/datasets';

/**
 * GroupExplorer — thin wrapper that feeds a (subset of the) smoke-client dataset
 * registry into the generic, read-only <DataExplorer>.
 *
 * Every themed portal page (Catalog, Jobs, Traces, Lineage, Visual) and the full
 * Data explorer reuse this so the registry-validated anon reader lives in ONE
 * place. A view is only ever fetched if it is present in the allowlist
 * (`findDataset`); tenant isolation itself is enforced server-side by the view.
 *
 * Props:
 *   - datasets (array, required) Registry entries to expose in this explorer.
 *   - title    (node)   Page title.
 *   - eyebrow  (node)   Page eyebrow/number.
 *   - pageSize (number) Rows per table page. Default 25.
 */
export default function GroupExplorer({ datasets, title, eyebrow, pageSize = 25 }) {
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
      datasets={datasets}
      fetchDataset={fetchDataset}
      title={title}
      eyebrow={eyebrow}
      pageSize={pageSize}
    />
  );
}
