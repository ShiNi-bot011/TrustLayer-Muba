import { useState } from 'react'
import { ConnectButton } from '@mysten/dapp-kit-react/ui'
import CheckoutPage from './views/CheckoutPage'
import AdminControlPanel from './views/AdminControlPanel'
import KioskView from './views/KioskView'
import ConsumerAppView from './views/ConsumerAppView'
import './App.css'

type RoleMode = 'checkout' | 'app' | 'kiosk' | 'merchant'

function App() {
  const [roleMode, setRoleMode] = useState<RoleMode>('checkout')

  return (
    <div className="app-shell">
      {/* Top Role-Selection Bar */}
      <header className="role-nav">
        <div className="role-nav__brand">
          <div className="role-nav__logo">🛡️</div>
          <span className="role-nav__name">SME Trust Layer</span>
          <span className="role-nav__network">Sui Testnet</span>
        </div>

        {/* View Switcher Tabs */}
        <div className="role-nav__tabs">
          <button
            className={`role-tab ${roleMode === 'checkout' ? 'role-tab--active' : ''}`}
            onClick={() => setRoleMode('checkout')}
          >
            🛒 Checkout (Phase 2)
          </button>
          <button
            className={`role-tab ${roleMode === 'app' ? 'role-tab--active' : ''}`}
            onClick={() => setRoleMode('app')}
          >
            📱 Consumer Wallet
          </button>
          <button
            className={`role-tab ${roleMode === 'kiosk' ? 'role-tab--active' : ''}`}
            onClick={() => setRoleMode('kiosk')}
          >
            📟 iPad Kiosk (Phase 1)
          </button>
          <button
            className={`role-tab ${roleMode === 'merchant' ? 'role-tab--active' : ''}`}
            onClick={() => setRoleMode('merchant')}
          >
            📊 Merchant Portal
          </button>
        </div>

        <div className="role-nav__actions">
          <ConnectButton />
        </div>
      </header>

      {/* View Content */}
      <main style={{ flex: 1 }}>
        {roleMode === 'checkout' && <CheckoutPage />}
        {roleMode === 'app' && <ConsumerAppView />}
        {roleMode === 'kiosk' && <KioskView />}
        {roleMode === 'merchant' && <AdminControlPanel />}
      </main>
    </div>
  )
}

export default App
