import GroupExplorer from './GroupExplorer';
import { datasetsByGroup } from '../lib/datasets';

/**
 * JobsPage — /clients/jid5274/jobs
 *
 * Skill runs, daily skill metrics, host jobs, render gates, and build runs.
 */
export default function JobsPage() {
  return (
    <GroupExplorer
      datasets={datasetsByGroup('jobs')}
      title="Jobs & Builds"
      eyebrow="JOBS"
    />
  );
}
