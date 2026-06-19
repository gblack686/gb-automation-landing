import GroupExplorer from './GroupExplorer';
import { datasetsByGroup } from '../lib/datasets';

/**
 * CatalogPage — /clients/smoke-client/catalog
 *
 * PRD spine + taxonomy + sprint links + execution dossiers for this tenant.
 */
export default function CatalogPage() {
  return (
    <GroupExplorer
      datasets={datasetsByGroup('catalog')}
      title="Catalog"
      eyebrow="CATALOG"
    />
  );
}
