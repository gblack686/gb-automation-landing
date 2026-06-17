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
import UiAgent from './pages/UiAgent';
import Login from './pages/Login';
import PRDIndex from './pages/PRDIndex';
import PRDView from './pages/PRDView';
import TacCatalog from './pages/TacCatalog';
import Welcome from './pages/Welcome';
import SalesHowItWorks from './pages/SalesHowItWorks';
import RequireAuth from './components/RequireAuth';
import ClientPortalBoundary from './clients/ClientPortalBoundary';
import OpsRoutes from './ops/routes';
import TeamRoutes from './team/routes';
import { getRouteAuthPolicy } from './clients/shared/tenantConfig';

function App() {
  const opsAuthPolicy = getRouteAuthPolicy('ops');
  const teamAuthPolicy = getRouteAuthPolicy('team');

  return (
    <Authenticator.Provider>
      <Router>
        <Routes>
          {/* Public — homepage + PRDs */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/prds" element={<PRDIndex />} />
          <Route path="/prds/:slug" element={<PRDView />} />
          <Route path="/tac" element={<TacCatalog />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/sales/how-it-works" element={<SalesHowItWorks />} />

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
            path="/ui-agent"
            element={<RequireAuth><UiAgent /></RequireAuth>}
          />
          <Route
            path="/ops/*"
            element={
              <RequireAuth
                allowedGroups={opsAuthPolicy.allowedGroups}
                allowedEmails={opsAuthPolicy.allowedEmails}
              >
                <OpsRoutes />
              </RequireAuth>
            }
          />
          <Route
            path="/team/*"
            element={
              <RequireAuth
                allowedGroups={teamAuthPolicy.allowedGroups}
                allowedEmails={teamAuthPolicy.allowedEmails}
              >
                <TeamRoutes />
              </RequireAuth>
            }
          />
          <Route path="/clients/:clientSlug/*" element={<ClientPortalBoundary />} />
        </Routes>
      </Router>
    </Authenticator.Provider>
  );
}

export default App;
