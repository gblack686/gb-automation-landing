import GroupExplorer from './GroupExplorer';
import { datasetsByGroup } from '../lib/datasets';

/**
 * LineagePage — /clients/smoke-client/lineage
 *
 * Per-PRD lifecycle presence map, dispatch edges, and the self-improve queue.
 */
export default function LineagePage() {
  return (
    <GroupExplorer
      datasets={datasetsByGroup('lineage')}
      title="Lineage"
      eyebrow="LINEAGE"
    />
  );
}
