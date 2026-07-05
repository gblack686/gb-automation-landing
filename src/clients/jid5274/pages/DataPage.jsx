import GroupExplorer from './GroupExplorer';
import { JID5274_DATASETS } from '../lib/datasets';

/**
 * DataPage — /clients/jid5274/data
 *
 * The full, curated data explorer: every allow-listed view (core + every themed
 * group) in one place. Auth is inherited from the tenant gate at the App-level
 * splat route; no per-page wrapper needed. Themed pages (Catalog, Jobs, Traces,
 * Lineage, Visual) expose scoped subsets of this same registry.
 */
export default function DataPage() {
  return (
    <GroupExplorer
      datasets={JID5274_DATASETS}
      title="Data Explorer"
      eyebrow="DATA"
      pageSize={25}
    />
  );
}
