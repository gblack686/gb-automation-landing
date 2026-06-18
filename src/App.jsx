import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import Home from './pages/Home';
import Plan from './pages/Plan';
import Apps from './pages/Apps';
import Artifacts from './pages/Artifacts';
import ArtifactView from './pages/ArtifactView';
import Blockers from './pages/Blockers';
import YouTubeIntel from './pages/YouTubeIntel';
import MallScanner from './pages/MallScanner';
import UiAgents from './pages/UiAgents';
import TacCatalog from './pages/TacCatalog';
import Login from './pages/Login';
import PRDIndex from './pages/PRDIndex';
import PRDView from './pages/PRDView';
import ObservabilityIndex from './pages/ObservabilityIndex';
import DagView from './pages/DagView';
import Overview from './pages/Overview';
import Repos from './pages/Repos';
import HermesCommandLayer from './components/HermesCommandLayer';
import RequireAuth from './components/RequireAuth';
import GbautomationPortal from './clients/gbautomation/routes';
import SmokeClientPortal from './clients/smoke-client/routes';
import Jid5274Portal from './clients/jid5274/routes';
import OpsRoutes from './ops/routes';

function App() {
  return (
    <Authenticator.Provider>
      <Router>
        <HermesCommandLayer />
        <Routes>
          {/* Public — homepage + PRDs */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/prds" element={<PRDIndex />} />
          <Route path="/prds/:slug" element={<PRDView />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/repos" element={<Repos />} />
          <Route path="/observability" element={<ObservabilityIndex />} />
          <Route path="/observability/:slug" element={<DagView />} />
          <Route path="/tac" element={<TacCatalog />} />

          {/* Gated — everything behind sign-in */}
          <Route
            path="/plan"
            element={<RequireAuth><Plan /></RequireAuth>}
          />
          <Route
            path="/apps"
            element={<RequireAuth><Apps /></RequireAuth>}
          />
          <Route
            path="/artifacts"
            element={<RequireAuth><Artifacts /></RequireAuth>}
          />
          <Route
            path="/artifacts/archive"
            element={<RequireAuth><Artifacts /></RequireAuth>}
          />
          <Route
            path="/artifacts/:client/:artifactId"
            element={<RequireAuth><ArtifactView /></RequireAuth>}
          />
          <Route
            path="/blockers"
            element={<RequireAuth><Blockers /></RequireAuth>}
          />
          <Route
            path="/apps/youtube-intel"
            element={<RequireAuth><YouTubeIntel /></RequireAuth>}
          />
          <Route
            path="/apps/mall-scanner"
            element={<RequireAuth><MallScanner /></RequireAuth>}
          />
          <Route
            path="/apps/ui-agents"
            element={<RequireAuth><UiAgents /></RequireAuth>}
          />
          <Route
            path="/ops/*"
            element={
              <RequireAuth
                allowedGroups={['tenant-gbautomation']}
                allowedEmails={['gblack686@gmail.com', 'greg@gbautomation.xyz']}
              >
                <OpsRoutes />
              </RequireAuth>
            }
          />
          <Route
            path="/clients/gbautomation/*"
            element={
              <RequireAuth
                allowedGroups={['tenant-gbautomation']}
                allowedEmails={['gblack686@gmail.com']}
              >
                <GbautomationPortal />
              </RequireAuth>
            }
          />
          <Route
            path="/clients/smoke-client/*"
            element={
              <RequireAuth allowedGroups={['tenant-smoke-client']}>
                <SmokeClientPortal />
              </RequireAuth>
            }
          />
          <Route
            path="/clients/jid5274/*"
            element={
              <RequireAuth
                allowedGroups={['tenant-jid5274']}
                allowedEmails={['jid5274@gmail.com']}
              >
                <Jid5274Portal />
              </RequireAuth>
            }
          />
        </Routes>
      </Router>
    </Authenticator.Provider>
  );
}

export default App;
