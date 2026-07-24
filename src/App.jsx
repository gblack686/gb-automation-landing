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
import OnboardingDocs from './pages/OnboardingDocs';
import PRDIndex from './pages/PRDIndex';
import PRDView from './pages/PRDView';
import SalesHowItWorks from './pages/SalesHowItWorks';
import RequireAuth from './components/RequireAuth';
import WelcomePage from './clients/gbautomation/pages/WelcomePage';
import ClientHubPage from './clients/gbautomation/pages/ClientHubPage';
import GbautomationPortal from './clients/gbautomation/routes';
import Jid5274Portal from './clients/jid5274/routes';
import OpsRoutes from './ops/routes';

function App() {
  return (
    <Authenticator.Provider>
      <Router>
        <Routes>
          {/* Public - homepage + PRDs */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/hub" element={<ClientHubPage />} />
          <Route path="/sales/how-it-works" element={<SalesHowItWorks />} />
          <Route path="/docs/onboarding" element={<OnboardingDocs />} />
          <Route path="/docs/onboarding/:sectionId" element={<OnboardingDocs />} />
          <Route path="/prds" element={<PRDIndex />} />
          <Route path="/prds/:slug" element={<PRDView />} />

          {/* Gated - everything behind sign-in */}
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
