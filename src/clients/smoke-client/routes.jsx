import { Navigate, Route, Routes } from 'react-router-dom';
import PortalHeader from './components/PortalHeader';
import OverviewPage from './pages/OverviewPage';
import SchedulesPage from './pages/SchedulesPage';
import RunsPage from './pages/RunsPage';
import BoardPage from './pages/BoardPage';
import DataPage from './pages/DataPage';

export default function SmokeClientPortal() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <PortalHeader />
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <Routes>
          <Route index element={<OverviewPage />} />
          <Route path="schedules" element={<SchedulesPage />} />
          <Route path="runs" element={<RunsPage />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="*" element={<Navigate to="/clients/smoke-client" replace />} />
        </Routes>
      </main>
    </div>
  );
}
