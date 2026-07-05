import GroupExplorer from './GroupExplorer';
import { datasetsByGroup } from '../lib/datasets';

/**
 * TracesPage — /clients/jid5274/traces
 *
 * Langfuse trace spine and the daily trace-cost rollup for this tenant.
 */
export default function TracesPage() {
  return (
    <GroupExplorer
      datasets={datasetsByGroup('traces')}
      title="Traces & Cost"
      eyebrow="TRACES"
    />
  );
}
