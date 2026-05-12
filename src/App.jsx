import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import Home from './pages/Home';
import Plan from './pages/Plan';
import Apps from './pages/Apps';
import Artifacts from './pages/Artifacts';
import Blockers from './pages/Blockers';
import YouTubeIntel from './pages/YouTubeIntel';
import Login from './pages/Login';
import RequireAuth from './components/RequireAuth';
import GbautomationPortal from './clients/gbautomation/routes';
import Jid5274Portal from './clients/jid5274/routes';
import OpsRoutes from './ops/routes';

function App() {
  return (
    <Authenticator.Provider>
      <Router>
        <Routes>
          {/* Public â€” only the homepage */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Gated â€” everything behind sign-in */}
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
            path="/blockers"
            element={<RequireAuth><Blockers /></RequireAuth>}
          />
          <Route
            path="/apps/youtube-intel"
            element={<RequireAuth><YouTubeIntel /></RequireAuth>}
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

