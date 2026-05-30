import { Navigate, Route, Routes } from 'react-router-dom';
import PortalHeader from './components/PortalHeader';
import DashboardPage from './pages/DashboardPage';
import SyncPage from './pages/SyncPage';
import ValidationPage from './pages/ValidationPage';
import ArtifactsPage from './pages/ArtifactsPage';

export default function GbautomationPortal() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <PortalHeader />
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="sync" element={<SyncPage />} />
          <Route path="validation" element={<ValidationPage />} />
          <Route path="artifacts" element={<ArtifactsPage />} />
          <Route path="*" element={<Navigate to="/clients/gbautomation" replace />} />
        </Routes>
      </main>
    </div>
  );
}
