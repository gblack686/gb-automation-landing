import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import Home from './pages/Home';
import Plan from './pages/Plan';
import Apps from './pages/Apps';
import Artifacts from './pages/Artifacts';
import Login from './pages/Login';
import RequireAuth from './components/RequireAuth';

function App() {
  return (
    <Authenticator.Provider>
      <Router>
        <Routes>
          {/* Public — only the homepage */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

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
        </Routes>
      </Router>
    </Authenticator.Provider>
  );
}

export default App;
