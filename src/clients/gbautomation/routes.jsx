import { Navigate, Route, Routes } from 'react-router-dom';
import ClientPortalLayout from '../shared/ClientPortalLayout';
import { getTenantConfig } from '../shared/tenantConfig';
import DashboardPage from './pages/DashboardPage';
import SyncPage from './pages/SyncPage';
import ValidationPage from './pages/ValidationPage';
import TenantDashboardPage from './pages/TenantDashboardPage';
import AppsPage from './pages/AppsPage';
import ArtifactsPage from './pages/ArtifactsPage';
import ArtifactDetailPage from './pages/ArtifactDetailPage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';

const SLUG = 'gbautomation';

export default function GbautomationPortal() {
  const tenant = getTenantConfig(SLUG);
  return (
    <ClientPortalLayout tenant={tenant}>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<TenantDashboardPage slug={SLUG} />} />
        <Route path="apps" element={<AppsPage slug={SLUG} />} />
        <Route path="artifacts" element={<ArtifactsPage slug={SLUG} />} />
        <Route
          path="artifacts/:artifactId"
          element={<ArtifactDetailPage slug={SLUG} />}
        />
        <Route path="reports" element={<ReportsPage slug={SLUG} />} />
        <Route path="reports/:reportId" element={<ReportDetailPage slug={SLUG} />} />
        <Route path="sync" element={<SyncPage />} />
        <Route path="validation" element={<ValidationPage />} />
        <Route path="*" element={<Navigate to="/clients/gbautomation" replace />} />
      </Routes>
    </ClientPortalLayout>
  );
}
