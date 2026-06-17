import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import ClientPortalLayout from '../shared/ClientPortalLayout';
import WorkspaceOverviewPage from './WorkspaceOverviewPage';
import WorkspaceDashboardPage from './WorkspaceDashboardPage';
import ClientGettingStartedPage from './ClientGettingStartedPage';
import ClientRequirementsPage from './ClientRequirementsPage';
import ClientAdminChecklistsPage from './ClientAdminChecklistsPage';
import WorkspaceAppsPage from './WorkspaceAppsPage';
import { WorkspaceArtifactDetailPage, WorkspaceArtifactsPage } from './WorkspaceArtifactsPage';
import { WorkspaceReportDetailPage, WorkspaceReportsPage } from './WorkspaceReportsPage';
import WorkspaceReceiptsPage, { WorkspaceDecisionsPage } from './WorkspaceReceiptsPage';
import { getClientWorkspaceAdapter, tenantWorkspacePath } from './tenantDataAdapter';
import SyncPage from '../gbautomation/pages/SyncPage';
import ValidationPage from '../gbautomation/pages/ValidationPage';

export function ClientWorkspaceRoutes({ slug }) {
  const adapter = getClientWorkspaceAdapter(slug);

  if (!adapter) {
    return <Navigate to="/" replace />;
  }

  return (
    <ClientPortalLayout tenant={adapter.tenant}>
      <Routes>
        <Route index element={<WorkspaceOverviewPage slug={adapter.slug} />} />
        <Route path="getting-started" element={<ClientGettingStartedPage slug={adapter.slug} />} />
        <Route path="requirements" element={<ClientRequirementsPage slug={adapter.slug} />} />
        <Route path="admin-checklists" element={<ClientAdminChecklistsPage slug={adapter.slug} />} />
        <Route path="dashboard" element={<WorkspaceDashboardPage slug={adapter.slug} />} />
        <Route path="apps" element={<WorkspaceAppsPage slug={adapter.slug} />} />
        <Route path="artifacts" element={<WorkspaceArtifactsPage slug={adapter.slug} />} />
        <Route path="artifacts/:artifactId" element={<WorkspaceArtifactDetailPage slug={adapter.slug} />} />
        <Route path="reports" element={<WorkspaceReportsPage slug={adapter.slug} />} />
        <Route path="reports/:reportId" element={<WorkspaceReportDetailPage slug={adapter.slug} />} />
        <Route path="receipts" element={<WorkspaceReceiptsPage slug={adapter.slug} />} />
        <Route path="decisions" element={<WorkspaceDecisionsPage slug={adapter.slug} />} />
        {(adapter.tenant.enabledRouteModules || adapter.tenant.routes?.modules || []).includes('sync') && <Route path="sync" element={<SyncPage />} />}
        {(adapter.tenant.enabledRouteModules || adapter.tenant.routes?.modules || []).includes('validation') && <Route path="validation" element={<ValidationPage />} />}
        <Route path="*" element={<Navigate to={tenantWorkspacePath(adapter.slug)} replace />} />
      </Routes>
    </ClientPortalLayout>
  );
}

export default function ClientWorkspaceRouteBoundary() {
  const { clientSlug } = useParams();
  return <ClientWorkspaceRoutes slug={clientSlug} />;
}
