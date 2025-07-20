import { useState } from 'react'
import viteLogo from '/sb-logo.png'
import './App.css'
import Timer from './components/organisms/timer'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      {/* <div>
        <a href="" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
      </div> */}
      <h1>Timers SB</h1>
      <div className="card">
        <Timer />
      </div>

    </>
  )
}

export default App
