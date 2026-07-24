import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
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
import UiAgent from './pages/UiAgent';
import TacCatalog from './pages/TacCatalog';
import Login from './pages/Login';
import OnboardingDocs from './pages/OnboardingDocs';
import PRDIndex from './pages/PRDIndex';
import PRDView from './pages/PRDView';
import SalesHowItWorks from './pages/SalesHowItWorks';
import ObservabilityIndex from './pages/ObservabilityIndex';
import DagView from './pages/DagView';
import SankeyView from './pages/SankeyView';
import Overview from './pages/Overview';
import Repos from './pages/Repos';
import HermesCommandLayer from './components/HermesCommandLayer';
import RequireAuth from './components/RequireAuth';
import WelcomePage from './clients/gbautomation/pages/WelcomePage';
import ClientHubPage from './clients/gbautomation/pages/ClientHubPage';
import GbautomationPortal from './clients/gbautomation/routes';
import SmokeClientPortal from './clients/smoke-client/routes';
import SmokeClientChat from './clients/smoke-client/pages/ChatPage';
import Jid5274Portal from './clients/jid5274/routes';
import OpsRoutes from './ops/routes';

// The ElevenLabs convai voice widget is mounted statically in index.html and floats
// bottom-right on every route. Hide it on the authed dashboards (/ops, /clients/*) where
// it overlaps controls like bottom-right pagination; keep it on the marketing pages.
function ConvaiVisibility() {
  const { pathname } = useLocation();
  useEffect(() => {
    const widget = document.querySelector('elevenlabs-convai');
    if (!widget) return;
    const onDashboard = /^\/(ops|clients)(\/|$)/.test(pathname);
    widget.style.display = onDashboard ? 'none' : '';
  }, [pathname]);
  return null;
}

function CommandLayerVisibility() {
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  return <HermesCommandLayer />;
}

function ChatRedirect() {
  useEffect(() => {
    window.location.replace('/clients/gbautomation/chat');
  }, []);
  return null;
}

function App() {
  return (
    <Authenticator.Provider>
      <Router>
        <ConvaiVisibility />
        <CommandLayerVisibility />
        <Routes>
          {/* Public — homepage + PRDs */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/chat" element={<ChatRedirect />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/hub" element={<ClientHubPage />} />
          <Route path="/sales/how-it-works" element={<SalesHowItWorks />} />
          <Route path="/docs/onboarding" element={<OnboardingDocs />} />
          <Route path="/docs/onboarding/:sectionId" element={<OnboardingDocs />} />
          <Route path="/prds" element={<PRDIndex />} />
          <Route path="/prds/:slug" element={<PRDView />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/repos" element={<Repos />} />
          <Route path="/observability" element={<ObservabilityIndex />} />
          <Route path="/observability/:slug" element={<DagView />} />
          <Route path="/sankey" element={<SankeyView />} />
          <Route path="/viz" element={<SankeyView />} />
          <Route path="/tac" element={<TacCatalog />} />
          <Route
            path="/chatv0"
            element={
              <RequireAuth allowedGroups={['tenant-smoke-client']}>
                <SmokeClientChat />
              </RequireAuth>
            }
          />

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
                allowedEmails={['gblack686@gmail.com', 'greg@gbautomation.xyz']}
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
