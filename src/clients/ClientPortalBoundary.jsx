import { Navigate, useParams } from 'react-router-dom';
import RequireAuth from '../components/RequireAuth';
import Jid5274Portal from './jid5274/routes';
import { getTenantAuthPolicy, getTenantConfig } from './shared/tenantConfig';
import { ClientWorkspaceRoutes } from './workspace/ClientWorkspaceRoutes';

export default function ClientPortalBoundary() {
  const { clientSlug } = useParams();
  const tenant = getTenantConfig(clientSlug);

  if (!tenant) {
    return <Navigate to="/" replace />;
  }

  const authPolicy = getTenantAuthPolicy(clientSlug) || { allowedGroups: [], allowedEmails: [] };
  const portal = tenant.routes?.routeModule === 'jid5274Archon'
    ? <Jid5274Portal />
    : <ClientWorkspaceRoutes slug={tenant.slug} />;

  return (
    <RequireAuth
      allowedGroups={authPolicy.allowedGroups}
      allowedEmails={authPolicy.allowedEmails}
    >
      {portal}
    </RequireAuth>
  );
}
