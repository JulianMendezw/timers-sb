// import { useState } from 'react'
// import viteLogo from '/sb-logo.png'
import './App.css'
import Timer from './components/organisms/timer/timer'
import Footer from './components/atoms/footer/Footer';
import { ToastContainer } from 'react-toastify';

function App() {
  return (
    <div className="app-container">
      <main className="app-main">
        <Timer />
      </main>
      <Footer />
      <ToastContainer
        position="bottom-center"
        className="app-toast-container"
        toastClassName="app-toast"
        progressClassName="app-toast-progress"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default App
