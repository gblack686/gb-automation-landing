import { useParams } from 'react-router-dom';
import RequireAuth from '../components/RequireAuth';
import { getTenantConfig } from './shared/tenantConfig';
import ClientTenantRoutes from './ClientTenantRoutes';

export default function ClientPortalBoundary({ tenantSlug }) {
  const params = useParams();
  const slug = tenantSlug || params.clientSlug;
  const tenant = getTenantConfig(slug);
  const auth = tenant?.auth || {};

  return (
    <RequireAuth
      allowedGroups={auth.allowedGroups || [`tenant-${slug}`]}
      allowedEmails={auth.allowedEmails || []}
    >
      <ClientTenantRoutes tenantSlug={slug} />
    </RequireAuth>
  );
}
