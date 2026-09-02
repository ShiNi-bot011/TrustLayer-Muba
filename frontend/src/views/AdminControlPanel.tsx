/**
 * AdminControlPanel.tsx
 *
 * Demo operator interface (SDD §5.2 / §4.2).
 *
 * PURPOSE:
 *   This is the "backstage" view driven live during the pitch.
 *   It exposes controls corresponding to the Simulator Service scenarios.
 *   It needs to be reliable and fast to use under pitch pressure.
 *
 * SIMULATOR INTEGRATION:
 *   Jiakai owns the Simulator Service implementation.
 *   This panel defines a SimulatorAdapter interface and uses MOCK handlers
 *   until Jiakai provides the real HTTP endpoint / SDK interface.
 *
 *   To integrate with the real Simulator:
 *     1. Replace the MOCK_SIMULATOR_ADAPTER with real HTTP calls in simulatorAdapter.ts.
 *     2. No changes to this component needed — only the adapter module changes.
 *
 * CONTROLS (SDD §4.2):
 *   1. Seed healthy history (Merchant B) — bulk generates ~30 days normal check-ins
 *   2. Trigger True Fitness scenario — maintenance tickets + attendance drop
 *   3. Trigger 1Fit scenario — promo spike → health score drop → bond recalculation
 *   4. Submit counter-evidence — merchant submits a fake refund tx hash
 *
 * DEPENDENCY NOTE:
 *   The actual calls to initiate_slash, update_health_score on the contract
 *   belong to Jiakai's Simulator. This panel surfaces those controls;
 *   it does NOT implement the contract call logic itself.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getMerchantState,
  formatSui,
  statusLabel,
  STATUS,
  MOCK_MODE,
  type MerchantState,
} from '../lib/suiClient'

// ---------------------------------------------------------------------------
// Simulator adapter interface
// ---------------------------------------------------------------------------

/**
 * SimulatorAdapter — the interface Jiakai's Simulator Service must satisfy.
 *
 * All four functions correspond to the demo controls in SDD §4.2.
 * Return type is a human-readable result string for the log display.
 *
 * DEPENDENCY: Replace MOCK_SIMULATOR_ADAPTER below with a real implementation
 * once Jiakai posts the Simulator endpoint/SDK interface.
 */
interface SimulatorAdapter {
  seedHealthyHistory(merchantObjectId: string): Promise<string>
  triggerTrueFitnessScenario(merchantObjectId: string): Promise<string>
  trigger1FitScenario(merchantObjectId: string): Promise<string>
  submitCounterEvidence(merchantObjectId: string, evidenceHash: string): Promise<string>
}

/**
 * MOCK_SIMULATOR_ADAPTER — placeholder handlers.
 *
 * These do NOT call the real contract or Simulator.
 * They simulate what a successful call would log, so the UI is exercisable
 * before Jiakai's Simulator is ready.
 *
 * DO NOT present these as real transactions. The log output includes
 * "[MOCK]" prefix so it is never mistaken for a real on-chain result.
 */
const MOCK_SIMULATOR_ADAPTER: SimulatorAdapter = {
  async seedHealthyHistory(merchantObjectId: string): Promise<string> {
    await new Promise(r => setTimeout(r, 800))
    return `[MOCK] Seeded 30 days of healthy check-in history for ${merchantObjectId.slice(0, 10)}…\nHealth score → ~92. Bond requirement → minimum floor.\nIntegration point: Jiakai's /simulator/seed-history endpoint.`
  },

  async triggerTrueFitnessScenario(merchantObjectId: string): Promise<string> {
    await new Promise(r => setTimeout(r, 1200))
    return `[MOCK] True Fitness scenario triggered for ${merchantObjectId.slice(0, 10)}…\nSimulating: maintenance tickets unresolved (14+ days) → attendance drop >30%.\nHealth score → ~45. Status should transition to PENDING_SLASH.\nIntegration point: Jiakai's /simulator/trigger-true-fitness endpoint.`
  },

  async trigger1FitScenario(merchantObjectId: string): Promise<string> {
    await new Promise(r => setTimeout(r, 1000))
    return `[MOCK] 1Fit scenario triggered for ${merchantObjectId.slice(0, 10)}…\nSimulating: promo spike (discount rate + sales volume surge) → health score drops.\nHealth score → ~58. Required bond recalculates upward.\nIntegration point: Jiakai's /simulator/trigger-1fit endpoint.`
  },

  async submitCounterEvidence(merchantObjectId: string, evidenceHash: string): Promise<string> {
    await new Promise(r => setTimeout(r, 600))
    return `[MOCK] Counter-evidence submitted for ${merchantObjectId.slice(0, 10)}…\nEvidence hash: ${evidenceHash || '0xDEMO_FAKE_REFUND_TX_HASH'}\nIf status is PENDING_SLASH and within 72h window → status → CHALLENGED_OK.\nIntegration point: Adam's submit_counter_evidence Move function.`
  },
}

// Export the adapter type so Jiakai can write a real implementation against it.
export type { SimulatorAdapter }

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
// AdminControlPanel component
// ---------------------------------------------------------------------------

/** Target merchant for admin scenarios (currently Merchant B — the "about to fail" one). */
const TARGET_MERCHANT_LABEL = 'Merchant B'

export default function AdminControlPanel() {
  const [merchantA, setMerchantA] = useState<MerchantState | null>(null)
  const [merchantB, setMerchantB] = useState<MerchantState | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [evidenceHash, setEvidenceHash] = useState('0xFAKE_REFUND_TX_HASH_DEMO')

  // Use the mock adapter — replace with real adapter once Jiakai provides it
  const simulator: SimulatorAdapter = MOCK_SIMULATOR_ADAPTER

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
    } finally {
      setLoading(false)
    }
  }, [appendLog])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 5000)
    return () => clearInterval(interval)
  }, [fetchState])

  // Generic action runner with busy guard and logging
  async function runAction(actionName: string, fn: () => Promise<string>) {
    if (busy) return
    setBusy(true)
    appendLog(actionName, 'Running…')
    try {
      const result = await fn()
      appendLog(actionName, result)
      await fetchState() // refresh merchant state after action
    } catch (err) {
      appendLog(actionName, err instanceof Error ? err.message : String(err), true)
    } finally {
      setBusy(false)
    }
  }

  const targetId = merchantB?.objectId ?? TARGET_MERCHANT_LABEL

  return (
    <section className="admin-panel" aria-labelledby="admin-panel-heading">
      <h1 id="admin-panel-heading" className="admin-panel__heading">
        Demo Control Panel
        <span className="admin-panel__badge">Backstage</span>
      </h1>
      <p className="admin-panel__description">
        Drive the live demo from here. Switch to Consumer View to show judges what changes.
        {MOCK_MODE && (
          <span className="admin-panel__mock-notice">
            {' '}[MOCK_MODE] — Simulator calls are mocked. Real Jiakai integration replaces <code>MOCK_SIMULATOR_ADAPTER</code>.
          </span>
        )}
      </p>

      {/* --- Current State Summary --- */}
      <div className="admin-state-grid">
        {loading ? (
          <div className="admin-loading">Loading merchant state…</div>
        ) : (
          <>
            <MerchantStateCard label="Merchant A (Healthy)" merchant={merchantA} />
            <MerchantStateCard label="Merchant B (Demo target)" merchant={merchantB} />
          </>
        )}
      </div>

      {/* --- Demo Controls --- */}
      <div className="admin-controls" aria-label="Demo scenario controls">
        <h2 className="admin-controls__heading">Demo Scenarios</h2>
        <p className="admin-controls__note">
          All controls target <strong>{TARGET_MERCHANT_LABEL}</strong>.
          Switch to Consumer View after each action to see the badge update.
        </p>

        <div className="control-grid">
          <ControlButton
            id="ctrl-seed"
            label="1. Seed Healthy History"
            description="Generate 30 days of normal check-in data. Health score → ~92."
            icon="🌱"
            busy={busy}
            onClick={() =>
              runAction('Seed Healthy History', () =>
                simulator.seedHealthyHistory(targetId)
              )
            }
          />

          <ControlButton
            id="ctrl-true-fitness"
            label="2. True Fitness Scenario"
            description="Simulate ticket stagnation + attendance drop. Health score drops, PENDING_SLASH triggered."
            icon="🏋️"
            busy={busy}
            variant="warning"
            onClick={() =>
              runAction('Trigger True Fitness Scenario', () =>
                simulator.triggerTrueFitnessScenario(targetId)
              )
            }
          />

          <ControlButton
            id="ctrl-1fit"
            label="3. 1Fit Scenario"
            description="Simulate promo spike. Health score drops, required bond increases."
            icon="📣"
            busy={busy}
            variant="warning"
            onClick={() =>
              runAction('Trigger 1Fit Scenario', () =>
                simulator.trigger1FitScenario(targetId)
              )
            }
          />

          <div className="control-card control-card--evidence">
            <div className="control-card__header">
              <span className="control-card__icon">📋</span>
              <div>
                <h3 className="control-card__label">4. Submit Counter-Evidence</h3>
                <p className="control-card__desc">
                  Merchant submits a refund tx hash to challenge PENDING_SLASH within the 72h window.
                </p>
              </div>
            </div>
            <div className="evidence-input-row">
              <label htmlFor="evidence-hash-input" className="evidence-label">Evidence hash:</label>
              <input
                id="evidence-hash-input"
                type="text"
                className="evidence-input"
                value={evidenceHash}
                onChange={e => setEvidenceHash(e.target.value)}
                placeholder="0x… refund tx hash"
                aria-label="Counter-evidence transaction hash"
              />
            </div>
            <button
              id="ctrl-counter-evidence"
              className={`ctrl-btn ctrl-btn--secondary ${busy ? 'ctrl-btn--busy' : ''}`}
              disabled={busy || !merchantB || merchantB.status !== STATUS.PENDING_SLASH}
              onClick={() =>
                runAction('Submit Counter-Evidence', () =>
                  simulator.submitCounterEvidence(targetId, evidenceHash)
                )
              }
            >
              {busy ? 'Running…' : 'Submit Counter-Evidence'}
            </button>
            {merchantB && merchantB.status !== STATUS.PENDING_SLASH && (
              <p className="control-card__warning">
                Only available when Merchant B status is PENDING_SLASH.
                Current: {statusLabel(merchantB.status)}
              </p>
            )}
          </div>
        </div>

        {/* Manual refresh */}
        <button
          id="ctrl-refresh"
          className="refresh-btn"
          onClick={fetchState}
          disabled={busy}
        >
          ↻ Refresh State
        </button>
      </div>

      {/* --- Action Log --- */}
      <div className="admin-log" aria-label="Action log" aria-live="polite">
        <h2 className="admin-log__heading">Action Log</h2>
        {log.length === 0 ? (
          <p className="admin-log__empty">No actions yet — use the controls above.</p>
        ) : (
          <ol className="log-list">
            {log.map((entry, i) => (
              <li key={i} className={`log-entry ${entry.isError ? 'log-entry--error' : ''}`}>
                <span className="log-entry__time">{entry.timestamp}</span>
                <span className="log-entry__action">{entry.action}</span>
                <pre className="log-entry__result">{entry.result}</pre>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Dependency notes for integration */}
      <details className="admin-deps">
        <summary>Integration dependencies (for team reference)</summary>
        <ul>
          <li>
            <strong>Jiakai:</strong> Replace <code>MOCK_SIMULATOR_ADAPTER</code> in this file
            with a real HTTP adapter once the Simulator endpoint is running.
            The <code>SimulatorAdapter</code> interface is exported — implement against it directly.
          </li>
          <li>
            <strong>Adam:</strong> <code>submit_counter_evidence</code> Move call is needed for
            real challenge-window testing. The mock adapter simulates its effect for now.
          </li>
          <li>
            <strong>suiClient.ts:</strong> Set <code>MOCK_MODE = false</code> and populate
            <code>MERCHANT_OBJECT_IDS</code> once real Merchant objects are registered on testnet.
          </li>
        </ul>
      </details>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MerchantStateCard({ label, merchant }: { label: string; merchant: MerchantState | null }) {
  if (!merchant) return <div className="state-card state-card--loading">{label}: loading…</div>

  return (
    <div
      className={`state-card ${merchant.status === STATUS.PENDING_SLASH ? 'state-card--pending' : ''} ${merchant.status === STATUS.SLASHED ? 'state-card--slashed' : ''}`}
      aria-label={`Current state for ${label}`}
    >
      <h3 className="state-card__name">{label}</h3>
      <dl className="state-card__details">
        <div className="state-card__row">
          <dt>Status</dt>
          <dd className={`status-badge status-badge--${merchant.status}`}>{statusLabel(merchant.status)}</dd>
        </div>
        <div className="state-card__row">
          <dt>Health Score</dt>
          <dd className="state-card__score">{merchant.healthScore}/100</dd>
        </div>
        <div className="state-card__row">
          <dt>Bond Staked</dt>
          <dd>{formatSui(merchant.bondBalanceMist)}</dd>
        </div>
        <div className="state-card__row">
          <dt>Required Bond</dt>
          <dd>{formatSui(merchant.requiredBondMist)}</dd>
        </div>
      </dl>
      {merchant.isMockData && <span className="state-card__mock">🧪 mock</span>}
    </div>
  )
}

interface ControlButtonProps {
  id: string
  label: string
  description: string
  icon: string
  busy: boolean
  variant?: 'default' | 'warning'
  onClick: () => void
}

function ControlButton({ id, label, description, icon, busy, variant = 'default', onClick }: ControlButtonProps) {
  return (
    <div className={`control-card ${variant === 'warning' ? 'control-card--warning' : ''}`}>
      <div className="control-card__header">
        <span className="control-card__icon">{icon}</span>
        <div>
          <h3 className="control-card__label">{label}</h3>
          <p className="control-card__desc">{description}</p>
        </div>
      </div>
      <button
        id={id}
        className={`ctrl-btn ${variant === 'warning' ? 'ctrl-btn--warning' : 'ctrl-btn--primary'} ${busy ? 'ctrl-btn--busy' : ''}`}
        disabled={busy}
        onClick={onClick}
      >
        {busy ? 'Running…' : 'Run'}
      </button>
    </div>
  )
}
