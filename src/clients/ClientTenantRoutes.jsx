import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import ClientPortalLayout from './shared/ClientPortalLayout';
import { getTenantConfig } from './shared/tenantConfig';
import DashboardPage from './gbautomation/pages/DashboardPage';
import TenantDashboardPage from './gbautomation/pages/TenantDashboardPage';
import AppsPage from './gbautomation/pages/AppsPage';
import ArtifactsPage from './gbautomation/pages/ArtifactsPage';
import ArtifactDetailPage from './gbautomation/pages/ArtifactDetailPage';
import ReportsPage from './gbautomation/pages/ReportsPage';
import ReportDetailPage from './gbautomation/pages/ReportDetailPage';
import SyncPage from './gbautomation/pages/SyncPage';
import ValidationPage from './gbautomation/pages/ValidationPage';
import Jid5274Portal from './jid5274/routes';

function UnknownTenant({ slug }) {
  return (
    <div className="min-h-screen bg-[#F3F1E7] px-6 py-20 text-[#191919]">
      <div className="mx-auto max-w-2xl rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#D97757]">Unknown client</p>
        <h1 className="mt-3 font-serif text-3xl">No portal registry entry</h1>
        <p className="mt-4 text-sm leading-6 text-[#191919]/65">
          The client slug <span className="font-semibold">{slug}</span> is not present in the tenant registry.
        </p>
      </div>
    </div>
  );
}

function GenericTenantPortal({ slug }) {
  const tenant = getTenantConfig(slug);

  if (!tenant) {
    return <UnknownTenant slug={slug} />;
  }

  if (tenant.adapter === 'static-bundle') {
    return <Jid5274Portal />;
  }

  return (
    <ClientPortalLayout tenant={tenant}>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<TenantDashboardPage slug={slug} />} />
        <Route path="apps" element={<AppsPage slug={slug} />} />
        <Route path="artifacts" element={<ArtifactsPage slug={slug} />} />
        <Route path="artifacts/:artifactId" element={<ArtifactDetailPage slug={slug} />} />
        <Route path="reports" element={<ReportsPage slug={slug} />} />
        <Route path="reports/:reportId" element={<ReportDetailPage slug={slug} />} />
        <Route path="sync" element={<SyncPage />} />
        <Route path="validation" element={<ValidationPage />} />
        <Route path="*" element={<Navigate to={`/clients/${slug}`} replace />} />
      </Routes>
    </ClientPortalLayout>
  );
}

export default function ClientTenantRoutes({ tenantSlug }) {
  const params = useParams();
  const slug = tenantSlug || params.clientSlug;
  return <GenericTenantPortal slug={slug} />;
}
