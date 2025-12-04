import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import NintendoSwitchGameLibrary from './NintendoSwitchGameLibrary';
import PcGameLibrary from './PcGameLibrary';

function App() {
  return (
    <Router>
      <div className="App">
          <Routes>
            <Route path="/pc" element={<PcGameLibrary />} />
            <Route path="/" element={<NintendoSwitchGameLibrary />} />
            {/* Add a catch-all route for 404 */}
            <Route path="*" element={<h1>404 - Page Not Found</h1>} />
          </Routes>
      </div>
    </Router>
  );
}

export default App;