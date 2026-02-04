import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
          <p className='credits'>Made by <a href="https://frontend-erik.se" target='_blank' rel="noopener noreferrer">Erik Karlsson</a></p>
      </div>
    </Router>
  );
}

export default App;