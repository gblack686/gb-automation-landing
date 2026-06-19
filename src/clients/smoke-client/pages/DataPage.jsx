import GroupExplorer from './GroupExplorer';
import { SMOKE_CLIENT_DATASETS } from '../lib/datasets';

/**
 * DataPage — /clients/smoke-client/data
 *
 * The full, curated data explorer: every allow-listed view (core + every themed
 * group) in one place. Auth is inherited from the tenant gate at the App-level
 * splat route; no per-page wrapper needed. Themed pages (Catalog, Jobs, Traces,
 * Lineage, Visual) expose scoped subsets of this same registry.
 */
export default function DataPage() {
  return (
    <GroupExplorer
      datasets={SMOKE_CLIENT_DATASETS}
      title="Data Explorer"
      eyebrow="DATA"
      pageSize={25}
    />
  );
}
