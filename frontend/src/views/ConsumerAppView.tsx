import { useState, useEffect } from 'react'
import { getMerchantState, type MerchantState } from '../lib/suiClient'

export default function ConsumerAppView() {
  const [activeTab, setActiveTab] = useState<'home' | 'scanner' | 'history'>('home')
  const [scanned, setScanned] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkinComplete, setCheckinComplete] = useState(false)
  const [merchantState, setMerchantState] = useState<MerchantState | null>(null)
  const [readError, setReadError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    // Fetch Merchant B (1Fit Premium) for the consumer's wallet view
    getMerchantState('Merchant B')
      .then(state => {
        if (mounted) setMerchantState(state)
      })
      .catch(err => {
        if (mounted) setReadError(err instanceof Error ? err.message : String(err))
      })
    return () => { mounted = false }
  }, [])

  // Hardcoded mock data for the wallet view to look populated
  const activePackage = {
    gym: merchantState ? merchantState.name : 'Loading...',
    name: 'ELITE MEMBERSHIP',
    remaining: '5 months',
    healthScore: merchantState ? merchantState.healthScore : 0,
  }

  const handleScan = () => {
    setScanned(true)
  }

  const handleApprove = async () => {
    setCheckingIn(true)
    // Simulate transaction delay
    await new Promise(r => setTimeout(r, 1500))
    setCheckingIn(false)
    setCheckinComplete(true)
  }

  return (
    <div className="mobile-view-wrapper">
        <div className="phone-frame">
          <div className="phone-notch"></div>

        {/* Header */}
        <header className="app-header-mobile">
          <div className="app-header-mobile__title">TrustLayer Wallet</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Sui Network</span>
          </div>
          </header>

          {readError ? (
            <div role="alert" style={{ margin: '0.5rem', padding: '0.5rem', color: '#991b1b', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 8, fontSize: '0.7rem' }}>
              LIVE SUI READ FAILED — no mock state shown.
            </div>
          ) : merchantState?.isMockData ? (
            <div role="alert" style={{ margin: '0.5rem', padding: '0.5rem', color: '#991b1b', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 8, fontSize: '0.7rem' }}>
              EXPLICIT MOCK MODE — NOT LIVE BLOCKCHAIN DATA
            </div>
          ) : null}

        {/* Content */}
        <div className="mobile-content scrollbar-thin">
          {activeTab === 'home' && (
            <>
              <div style={{ marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>My Packages</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Protected by on-chain bonds</p>
              </div>

              <div className="mobile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div className="mobile-card__title" style={{ marginBottom: '0.1rem' }}>{activePackage.gym}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activePackage.name}</div>
                  </div>
                  <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>
                    ACTIVE
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Remaining</span>
                  <span style={{ fontWeight: 600 }}>{activePackage.remaining}</span>
                </div>

                <div style={{ background: 'var(--bg-page)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Merchant Health</span>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>{activePackage.healthScore}/100</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--bg-sidebar)', borderRadius: '2px' }}>
                    <div style={{ width: `${activePackage.healthScore}%`, height: '100%', background: 'var(--success)', borderRadius: '2px' }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button className="mobile-btn mobile-btn--danger">
                  🧪 Preview Complaint / Refund Request
                </button>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem', lineHeight: 1.4 }}>
                  Presentational control only. This button does not file an on-chain complaint.
                </p>
              </div>
            </>
          )}

          {activeTab === 'scanner' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Scan Kiosk QR</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verify your attendance on-chain</p>
              </div>

              {!scanned ? (
                <div 
                  onClick={handleScan}
                  style={{ flex: 1, border: '2px dashed var(--accent)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--accent-dim)' }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>Tap to simulate scanning</div>
                  </div>
                </div>
              ) : !checkinComplete ? (
                <div className="mobile-card" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📍</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>1Fit Premium</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Location: Pavilion KL</div>
                  </div>

                  <div style={{ background: 'var(--bg-page)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Action</span>
                      <span style={{ fontWeight: 600 }}>Preview Attendance</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Network Fee</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Not submitted</span>
                    </div>
                  </div>

                  <button 
                    className="mobile-btn mobile-btn--primary" 
                    onClick={handleApprove}
                    disabled={checkingIn}
                  >
                    {checkingIn ? 'Simulating approval…' : 'Simulate Check-in'}
                  </button>
                  <button 
                    style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', cursor: 'pointer' }}
                    onClick={() => setScanned(false)}
                    disabled={checkingIn}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>
                  <div style={{ width: 80, height: 80, background: 'var(--success-bg)', color: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto 1.5rem' }}>
                    ✓
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Simulation Complete</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>No attendance transaction was submitted to Sui.</p>
                  <button className="mobile-btn mobile-btn--primary" onClick={() => { setScanned(false); setCheckinComplete(false); setActiveTab('home'); }}>
                    Done
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Simulated History</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3].map((_, i) => (
                  <div key={i} style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Attendance Verified</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Prototype</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>1Fit Premium</span>
                      <span>{i === 0 ? 'Today' : `${i + 2} days ago`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Nav */}
        <nav className="mobile-nav">
          <button 
            className={`mobile-nav-item ${activeTab === 'home' ? 'mobile-nav-item--active' : ''}`}
            onClick={() => setActiveTab('home')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '1.25rem', marginBottom: '2px' }}>🏠</span>
            Home
          </button>
          <button 
            className={`mobile-nav-item ${activeTab === 'scanner' ? 'mobile-nav-item--active' : ''}`}
            onClick={() => setActiveTab('scanner')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '1.25rem', marginBottom: '2px' }}>📷</span>
            Scan
          </button>
          <button 
            className={`mobile-nav-item ${activeTab === 'history' ? 'mobile-nav-item--active' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '1.25rem', marginBottom: '2px' }}>⏱️</span>
            History
          </button>
        </nav>
      </div>
    </div>
  )
}
