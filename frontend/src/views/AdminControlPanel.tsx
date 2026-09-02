/**
 * AdminControlPanel.tsx — Redesigned as Merchant Compliance Dashboard
 *
 * Dark professional SaaS layout (Stripe / Linear / Vercel aesthetic).
 * Gives merchant owners a clean overview of their TrustLayer compliance health,
 * while embedding collapsible Operator Demo Controls for hackathon pitch presentation.
 */

import { useState, useEffect, useCallback } from 'react'
import { useDAppKit } from '@mysten/dapp-kit-react'
import { Transaction } from '@mysten/sui/transactions'
import {
  getMerchantState,
  formatSui,
  statusLabel,
  STATUS,
  type MerchantState,
} from '../lib/suiClient'

// ---------------------------------------------------------------------------
// Countdown Timer Component
// ---------------------------------------------------------------------------
function CountdownTimer({ initialSeconds = 72 }: { initialSeconds?: number }) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  if (timeLeft <= 0) {
    return <span style={{ color: 'var(--danger)', fontWeight: 600 }}>00:00 (Window Expired)</span>
  }

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const secs = (timeLeft % 60).toString().padStart(2, '0')
  return <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--warning)' }}>{mins}:{secs}</span>
}
import {
  buildUpdateHealthScoreTx,
  buildInitiateSlashTx,
  buildSubmitCounterEvidenceTx
} from '../lib/suiTransaction'

// ---------------------------------------------------------------------------
// Log entry type
// ---------------------------------------------------------------------------
interface LogEntry {
  timestamp: string
  action: string
  result: string
  isError: boolean
}

// ---------------------------------------------------------------------------
// Main Merchant Compliance Dashboard Component
// ---------------------------------------------------------------------------
export default function AdminControlPanel() {
  const [selectedMerchant, setSelectedMerchant] = useState<'Merchant A' | 'Merchant B'>('Merchant B')
  const [merchantA, setMerchantA] = useState<MerchantState | null>(null)
  const [merchantB, setMerchantB] = useState<MerchantState | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [operatorOpen, setOperatorOpen] = useState(true)
  const [evidenceHash, setEvidenceHash] = useState('0xREFUND_TX_PROOF_DEMO_9981')
  const dAppKit = useDAppKit()

  const appendLog = useCallback((action: string, result: string, isError = false) => {
    setLog(prev => [
      {
        timestamp: new Date().toLocaleTimeString(),
        action,
        result,
        isError,
      },
      ...prev,
    ])
  }, [])

  const fetchState = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        getMerchantState('Merchant A'),
        getMerchantState('Merchant B'),
      ])
      setMerchantA(a)
      setMerchantB(b)
    } catch (err) {
      appendLog('Fetch state', err instanceof Error ? err.message : String(err), true)
    }
  }, [appendLog])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 5000)
    return () => clearInterval(interval)
  }, [fetchState])

  const activeState = selectedMerchant === 'Merchant A' ? merchantA : merchantB

  // Action runner connected to simulator/scenario endpoints or PTB calls
  async function runAction(
    actionName: string, 
    targetLabel: 'Merchant A' | 'Merchant B', 
    txBuilder: () => Transaction | Promise<Transaction>,
    successMessage: string
  ) {
    if (busy) return
    setBusy(true)
    appendLog(actionName, `Executing on ${targetLabel}…`)
    try {
      const tx = await txBuilder()
      await dAppKit.signAndExecuteTransaction({ transaction: tx })
      appendLog(actionName, `Transaction submitted!`)
      appendLog(actionName, successMessage)
      await new Promise(r => setTimeout(r, 2000)) // give RPC time to index
      await fetchState()
    } catch (err) {
      appendLog(actionName, err instanceof Error ? err.message : String(err), true)
    } finally {
      setBusy(false)
    }
  }

  // Calculate coverage %
  const bondSui = activeState ? Number(activeState.bondBalanceMist) / 1e9 : 0
  const reqSui  = activeState ? Number(activeState.requiredBondMist) / 1e9 : 0
  const coveragePct = reqSui > 0 ? Math.min(100, Math.round((bondSui / reqSui) * 100)) : 100

  const statusCls = activeState?.status === STATUS.ACTIVE
    ? 'active'
    : activeState?.status === STATUS.PENDING_SLASH
    ? 'warning'
    : 'danger'

  return (
    <div className="merchant-portal">
      {/* Sidebar Navigation */}
      <aside className="portal-sidebar">
        <div className="portal-sidebar__section-label">Navigation</div>
        <div className="portal-nav-item">
          <span className="portal-nav-item__icon">📊</span> Analytics
        </div>
        <div className="portal-nav-item">
          <span className="portal-nav-item__icon">📅</span> Bookings & Classes
        </div>
        <div className="portal-nav-item">
          <span className="portal-nav-item__icon">💳</span> Prepaid Memberships
        </div>
        <div className="portal-nav-item portal-nav-item--active">
          <span className="portal-nav-item__icon">🛡️</span> TrustLayer Compliance
          {merchantB?.status === STATUS.PENDING_SLASH && (
            <span className="portal-nav-badge">1</span>
          )}
        </div>
        <div className="portal-nav-item">
          <span className="portal-nav-item__icon">⚙️</span> Zenoti Settings
        </div>

        <hr className="portal-sidebar__divider" />

        <div className="portal-sidebar__section-label">Switch Merchant</div>
        <div
          className={`portal-nav-item ${selectedMerchant === 'Merchant A' ? 'portal-nav-item--active' : ''}`}
          onClick={() => setSelectedMerchant('Merchant A')}
          style={{ cursor: 'pointer' }}
        >
          <span className="portal-nav-item__icon">🏋️</span> True Fitness (A)
        </div>
        <div
          className={`portal-nav-item ${selectedMerchant === 'Merchant B' ? 'portal-nav-item--active' : ''}`}
          onClick={() => setSelectedMerchant('Merchant B')}
          style={{ cursor: 'pointer' }}
        >
          <span className="portal-nav-item__icon">⚡</span> 1Fit Premium (B)
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div className="portal-merchant-chip">
            <div className="portal-merchant-chip__label">Active Context</div>
            <div className="portal-merchant-chip__name">{activeState?.name ?? selectedMerchant}</div>
            <div className="portal-merchant-chip__status">
              <span className={`status-dot status-dot--${statusCls}`} />
              <span style={{ color: `var(--${statusCls === 'active' ? 'success' : statusCls})` }}>
                {activeState ? statusLabel(activeState.status) : 'Loading…'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="portal-main">
        <header className="portal-topbar">
          <div>
            <h1 className="portal-topbar__title">TrustLayer Compliance Overview</h1>
            <p className="portal-topbar__subtitle">
              On-chain solvency monitoring & dynamic bond health on Sui Testnet
            </p>
          </div>
          <div className="portal-topbar__actions">
            <button className="portal-btn portal-btn--ghost" onClick={fetchState} disabled={busy}>
              ↻ Refresh Sync
            </button>
            <button className="portal-btn portal-btn--accent" onClick={() => setOperatorOpen(!operatorOpen)}>
              ⚡ Operator Controls {operatorOpen ? '▲' : '▼'}
            </button>
          </div>
        </header>

        <div className="portal-content scrollbar-thin">
          {/* Top Metric Cards */}
          <div className="metrics-grid">
            {/* Metric 1: Health Score */}
            <div className="metric-card">
              <div className="metric-card__label">Fulfillment Health Score</div>
              <div className="dashboard-gauge-section">
                <div className="gauge-ring">
                  <svg viewBox="0 0 36 36" width="80" height="80">
                    <path
                      className="gauge-ring__bg"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="gauge-ring__fill"
                      strokeWidth="3.5"
                      strokeDasharray={`${activeState?.healthScore ?? 0}, 100`}
                      stroke={
                        (activeState?.healthScore ?? 0) >= 80
                          ? 'var(--success)'
                          : (activeState?.healthScore ?? 0) >= 60
                          ? 'var(--warning)'
                          : 'var(--danger)'
                      }
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="gauge-ring__text">
                    <span className="gauge-ring__number">{activeState?.healthScore ?? 0}</span>
                    <span className="gauge-ring__label">/ 100</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {(activeState?.healthScore ?? 0) >= 80 ? 'Optimal Performance' : 'Elevated Risk'}
                  </div>
                  <div className="metric-card__sub" style={{ marginTop: '0.2rem' }}>
                    Calculated off-chain from Zenoti check-ins & ticket velocity
                  </div>
                </div>
              </div>
            </div>

            {/* Metric 2: Bond Balance */}
            <div className="metric-card">
              <div className="metric-card__label">Secured Performance Bond</div>
              <div className="metric-card__value text-success">
                {formatSui(activeState?.bondBalanceMist ?? BigInt(0))}
              </div>
              <div className="metric-card__sub">
                ~RM {(Number(activeState?.bondBalanceMist ?? 0) / 1e9 * 10).toFixed(2)} secured on-chain
              </div>
            </div>

            {/* Metric 3: Required Bond */}
            <div className="metric-card">
              <div className="metric-card__label">Required Bond Floor</div>
              <div className="metric-card__value">
                {formatSui(activeState?.requiredBondMist ?? BigInt(0))}
              </div>
              <div className="metric-card__sub">
                Formula: Trailing Revenue × (100 - Health)%
              </div>
            </div>

            {/* Metric 4: Compliance Status */}
            <div className={`metric-card metric-card--${statusCls}`}>
              <div className="metric-card__label">On-Chain Status</div>
              <div style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
                <span className={`status-pill status-pill--${statusCls}`}>
                  ● {activeState ? statusLabel(activeState.status) : 'Loading…'}
                </span>
              </div>
              <div className="metric-card__sub">
                {activeState?.status === STATUS.ACTIVE
                  ? 'All verification checks passing'
                  : activeState?.status === STATUS.PENDING_SLASH
                  ? <span>Challenge window: <CountdownTimer /></span>
                  : 'Bond deduction finalized on Sui'}
              </div>
            </div>
          </div>

          {/* Two Panels: Activity Feed + Solvency Breakdown */}
          <div className="portal-panels">
            {/* Panel 1: Activity Feed */}
            <div className="panel-card">
              <div className="panel-card__header">
                <span className="panel-card__title">
                  ⚡ Live Fulfillment & Event Stream
                </span>
                <span className="panel-card__badge">Sui Events</span>
              </div>
              <div className="panel-card__body">
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon activity-icon--success">✓</div>
                    <div className="activity-content">
                      <div className="activity-content__title">Zenoti Check-In Event Sync</div>
                      <div className="activity-content__meta">Recorded 30 days normal check-ins</div>
                    </div>
                    <div className="activity-time">Just now</div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon activity-icon--info">ℹ</div>
                    <div className="activity-content">
                      <div className="activity-content__title">On-Chain Health Score Update</div>
                      <div className="activity-content__meta">Score evaluated at {activeState?.healthScore ?? 92}/100</div>
                    </div>
                    <div className="activity-time">5m ago</div>
                  </div>

                  {activeState?.status === STATUS.PENDING_SLASH && (
                    <div className="activity-item">
                      <div className="activity-icon activity-icon--warning">⚠️</div>
                      <div className="activity-content">
                        <div className="activity-content__title" style={{ color: 'var(--warning)', fontWeight: 700 }}>
                          Objective Trigger Fired: Disappearance / Refund Pileup
                        </div>
                        <div className="activity-content__meta">Merchant entered PENDING_SLASH state. Challenge window ticking.</div>
                      </div>
                      <div className="activity-time">1m ago</div>
                    </div>
                  )}

                  <div className="activity-item">
                    <div className="activity-icon activity-icon--muted">🔒</div>
                    <div className="activity-content">
                      <div className="activity-content__title">Shared Object Inspection</div>
                      <div className="activity-content__meta">Object ID: {activeState?.objectId.slice(0, 16)}…</div>
                    </div>
                    <div className="activity-time">Live</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 2: Solvency Summary */}
            <div className="panel-card">
              <div className="panel-card__header">
                <span className="panel-card__title">🛡️ Solvency Ratio</span>
              </div>
              <div className="panel-card__body">
                <div className="bond-detail-row">
                  <span className="bond-detail-row__label">Coverage Ratio</span>
                  <span className={`bond-detail-row__value ${coveragePct >= 100 ? 'bond-detail-row__value--green' : 'bond-detail-row__value--red'}`}>
                    {coveragePct}%
                  </span>
                </div>

                <div className="bond-coverage-bar">
                  <div
                    className="bond-coverage-bar__fill"
                    style={{
                      width: `${coveragePct}%`,
                      backgroundColor: coveragePct >= 100 ? 'var(--success)' : 'var(--danger)',
                    }}
                  />
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <div className="bond-detail-row">
                    <span className="bond-detail-row__label">Bond Floor</span>
                    <span className="bond-detail-row__value">0.50 SUI</span>
                  </div>
                  <div className="bond-detail-row">
                    <span className="bond-detail-row__label">Trailing 30d Revenue</span>
                    <span className="bond-detail-row__value bond-detail-row__value--muted">
                      {formatSui(activeState?.trailing30dRevenueMist ?? BigInt(0))}
                    </span>
                  </div>
                  <div className="bond-detail-row">
                    <span className="bond-detail-row__label">Challenge Window</span>
                    <span className="bond-detail-row__value">72 Seconds (Demo Mode)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Operator Controls for Pitch Presentation */}
          {operatorOpen && (
            <div className="operator-section">
              <div className="operator-header" onClick={() => setOperatorOpen(!operatorOpen)}>
                <div className="operator-header__left">
                  <span className="operator-label">Pitch Demo</span>
                  <span className="operator-header__title">Simulator & Operator Scenario Controls</span>
                </div>
                <span className="operator-chevron operator-chevron--open">▲</span>
              </div>

              <div className="operator-body">
                <div className="operator-merchant-tabs">
                  <button
                    className={`op-merchant-tab ${selectedMerchant === 'Merchant A' ? 'op-merchant-tab--active' : ''}`}
                    onClick={() => setSelectedMerchant('Merchant A')}
                  >
                    Target: Merchant A (Healthy)
                  </button>
                  <button
                    className={`op-merchant-tab ${selectedMerchant === 'Merchant B' ? 'op-merchant-tab--active' : ''}`}
                    onClick={() => setSelectedMerchant('Merchant B')}
                  >
                    Target: Merchant B (Failure Scenario Target)
                  </button>
                </div>

                <div className="operator-scenarios">
                  <button
                    className="scenario-btn scenario-btn--success"
                    disabled={busy || !activeState}
                    onClick={() =>
                      runAction(
                        'Seed Healthy History', 
                        selectedMerchant, 
                        () => buildUpdateHealthScoreTx(activeState!.objectId, 95, 10000000000), // ~10 SUI revenue
                        `Seeded 30 days normal check-ins for ${selectedMerchant}.\nHealth Score → 95.\nStatus → ACTIVE.`
                      )
                    }
                  >
                    <span className="scenario-btn__icon">🌱</span>
                    <span className="scenario-btn__title">1. Seed Healthy History</span>
                    <span className="scenario-btn__desc">Normal 30-day Zenoti check-ins. Score settles ~95.</span>
                  </button>

                  <button
                    className="scenario-btn scenario-btn--warning"
                    disabled={busy || !activeState}
                    onClick={() =>
                      runAction(
                        '1Fit Scenario (Promo Spike)', 
                        selectedMerchant, 
                        () => buildUpdateHealthScoreTx(activeState!.objectId, 41, 15000000000), // ~15 SUI revenue (spike)
                        `Simulated 1Fit promo spike on ${selectedMerchant}.\nPrepaid revenue surges, health score drops to ~41.\nRequired bond recalculated upward.`
                      )
                    }
                  >
                    <span className="scenario-btn__icon">⚡</span>
                    <span className="scenario-btn__title">2. Trigger 1Fit Scenario</span>
                    <span className="scenario-btn__desc">Promo discount spike → Health score drops → Bond increases.</span>
                  </button>

                  <button
                    className="scenario-btn scenario-btn--danger"
                    disabled={busy || !activeState}
                    onClick={() =>
                      runAction(
                        'True Fitness Collapse', 
                        selectedMerchant, 
                        () => buildInitiateSlashTx(activeState!.objectId, 4), // Reason code 4: DISAPPEARANCE
                        `Simulated True Fitness collapse on ${selectedMerchant}.\nUnresolved tickets + attendance drop > 30%.\nTriggered PENDING_SLASH on Sui testnet.`
                      )
                    }
                  >
                    <span className="scenario-btn__icon">🏋️</span>
                    <span className="scenario-btn__title">3. Trigger Disappearance / Slash</span>
                    <span className="scenario-btn__desc">Maintenance tickets stagnant → PENDING_SLASH initiated.</span>
                  </button>

                  <button
                    className="scenario-btn"
                    disabled={busy || activeState?.status !== STATUS.PENDING_SLASH}
                    onClick={() =>
                      runAction(
                        'Submit Counter-Evidence', 
                        selectedMerchant, 
                        () => buildSubmitCounterEvidenceTx(activeState!.objectId, evidenceHash),
                        `Submitted refund proof hash (${evidenceHash}) for ${selectedMerchant}.\nChallenge window accepted → Status reverted to ACTIVE.`
                      )
                    }
                  >
                    <span className="scenario-btn__icon">📋</span>
                    <span className="scenario-btn__title">4. Submit Counter-Evidence</span>
                    <span className="scenario-btn__desc">Merchant owner submits refund proof within challenge window.</span>
                  </button>
                </div>

                {/* Evidence Input if pending */}
                {activeState?.status === STATUS.PENDING_SLASH && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evidence Tx Hash:</label>
                    <input
                      type="text"
                      value={evidenceHash}
                      onChange={e => setEvidenceHash(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        color: 'white',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                      }}
                    />
                  </div>
                )}

                {/* Operator Console Log */}
                <div className="operator-log">
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    OPERATOR EVENT LOG
                  </div>
                  {log.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>Ready for pitch scenario actions…</div>
                  ) : (
                    log.map((entry, idx) => (
                      <div key={idx} className={`operator-log__entry ${entry.isError ? 'operator-log__entry--error' : 'operator-log__entry--success'}`}>
                        <span className="operator-log__timestamp">[{entry.timestamp}]</span>
                        <strong>{entry.action}:</strong> {entry.result}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
