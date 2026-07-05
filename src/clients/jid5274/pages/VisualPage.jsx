import GroupExplorer from './GroupExplorer';
import { datasetsByGroup } from '../lib/datasets';

/**
 * VisualPage — /clients/jid5274/visual
 *
 * Browser-harness capture receipts (screenshots, target URLs, status, timing).
 */
export default function VisualPage() {
  return (
    <GroupExplorer
      datasets={datasetsByGroup('visual')}
      title="Visual Captures"
      eyebrow="VISUAL"
    />
  );
}
