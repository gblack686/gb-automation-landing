import { Navigate, Route, Routes } from 'react-router-dom';
import OpsHeader from './components/OpsHeader';
import OpsOverview from './pages/OpsOverview';
import OpsSystems from './pages/OpsSystems';
import OpsRuns from './pages/OpsRuns';
import HermesKanban from './pages/HermesKanban';
import OpsData from './pages/OpsData';
import OpsSupabase from './pages/OpsSupabase';
import OpsObservability from './pages/OpsObservability';

export default function OpsRoutes() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <OpsHeader />
      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <Routes>
          <Route index element={<OpsOverview />} />
          <Route path="systems" element={<OpsSystems />} />
          <Route path="runs" element={<OpsRuns />} />
          <Route path="kanban" element={<HermesKanban />} />
          <Route path="data" element={<OpsData />} />
          <Route path="supabase" element={<OpsSupabase />} />
          <Route path="observability" element={<OpsObservability />} />
          <Route path="observability/traces" element={<OpsObservability />} />
          <Route path="observability/sessions" element={<OpsObservability />} />
          <Route path="observability/agents" element={<OpsObservability />} />
          <Route path="observability/reports" element={<OpsObservability />} />
          <Route path="observability/live" element={<OpsObservability />} />
          <Route path="*" element={<Navigate to="/ops" replace />} />
        </Routes>
      </main>
    </div>
  );
}
