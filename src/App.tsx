// import { useState } from 'react'
// import viteLogo from '/sb-logo.png'
import './App.css'
import Timer from './components/organisms/timer/timer'
import Footer from './components/atoms/footer/Footer';

function App() {
  return (
    <div className="app-container">
      <main className="app-main">
        <Timer />
      </main>
      <Footer />
    </div>
  );
}

export default App
