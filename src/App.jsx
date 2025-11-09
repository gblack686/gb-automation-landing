import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Plan from './pages/Plan';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/plan" element={<Plan />} />
      </Routes>
    </Router>
  );
}

export default App;
