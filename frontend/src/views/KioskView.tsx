import { useState, useEffect } from 'react'

export default function KioskView() {
  const [feed, setFeed] = useState<{ id: string; time: string; user: string }[]>([
    { id: '1', time: 'Just now', user: '0x3f...9a12 verified' },
    { id: '2', time: '2m ago', user: '0x7e...b411 verified' },
    { id: '3', time: '15m ago', user: '0x1a...cc90 verified' },
  ])

  // Presentational activity feed only; no Sui transaction is submitted here.
  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() > 0.7) {
        setFeed(prev => [
          {
            id: Date.now().toString(),
            time: 'Just now',
            user: `0x${Math.floor(Math.random() * 16777215).toString(16).padEnd(4, '0')}...${Math.floor(Math.random() * 16777215).toString(16).substring(0, 4)} verified`,
          },
          ...prev.slice(0, 4),
        ])
      }
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="kiosk-page">
      <div className="kiosk-container">
        {/* Left Side: Branding & Feed */}
        <div className="kiosk-left">
          <h1 className="kiosk-title">Welcome to<br />1Fit Premium</h1>
          <p className="kiosk-subtitle">Presentation prototype for a future attendance flow. Use Consumer Wallet → Scan to run the labelled simulation; this kiosk display does not submit Sui transactions.</p>

          <div className="kiosk-live-feed">
            <div className="kiosk-feed-title">🧪 Simulated Check-In Activity — Not On-Chain</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {feed.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>✓ {item.user}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: QR Code */}
        <div className="kiosk-right">
          <div className="kiosk-qr-container">
            <div className="kiosk-qr-placeholder">
              📱
            </div>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Simulated Scanner</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Visual prototype only; no QR payload or blockchain write is active.</p>
        </div>
      </div>
    </div>
  )
}
