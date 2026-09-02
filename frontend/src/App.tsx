import { useState } from 'react'
import { ConnectButton } from '@mysten/dapp-kit-react/ui'
import ConsumerView from './views/ConsumerView'
import AdminControlPanel from './views/AdminControlPanel'
import './App.css'

type ActiveView = 'consumer' | 'admin'

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('consumer')

  return (
    <div className="app">
      {/* ---------- Header ---------- */}
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-logo">⛓</span>
          <span className="app-title">SME Trust Layer</span>
          <span className="app-subtitle">· MUBA Hacks 2026 · Sui Testnet</span>
        </div>
        <nav className="app-nav">
          <button
            id="nav-consumer"
            className={`nav-btn ${activeView === 'consumer' ? 'nav-btn--active' : ''}`}
            onClick={() => setActiveView('consumer')}
          >
            Consumer View
          </button>
          <button
            id="nav-admin"
            className={`nav-btn ${activeView === 'admin' ? 'nav-btn--active' : ''}`}
            onClick={() => setActiveView('admin')}
          >
            Admin / Demo
          </button>
        </nav>
        <div className="app-wallet">
          <ConnectButton />
        </div>
      </header>

      {/* ---------- Main ---------- */}
      <main className="app-main">
        {activeView === 'consumer' ? <ConsumerView /> : <AdminControlPanel />}
      </main>
    </div>
  )
}

export default App
