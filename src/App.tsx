import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Timer from './components/organisms/timer/timer';
import Files from './components/pages/files/Files';
import Documentation from './components/pages/documentation/Documentation';
import BottomNav from './components/atoms/BottomNav/BottomNav';
import Footer from './components/atoms/footer/Footer';

function App() {
  return (
    <Router>
      <div className="app-container">
        <main className="app-main">
          <Routes>
            <Route path="/timers" element={<Timer />} />
            <Route path="/files" element={<Files />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/" element={<Navigate to="/timers" replace />} />
          </Routes>
        </main>
        <BottomNav />
        <Footer />
      </div>
    </Router>
  );
}

export default App; 