/**
 * ConsumerView.tsx
 *
 * The primary consumer-facing trust badge (SDD §5.1).
 * This is the single most important UI surface for the demo.
 *
 * WHAT IT SHOWS:
 *   - Merchant name
 *   - Bond staked ("X SUI staked")
 *   - Health score (0–100, large, color-coded)
 *   - Status: ACTIVE / PENDING_SLASH (⚠️ Under review) / SLASHED / CHALLENGED_OK
 *
 * DATA FLOW:
 *   ConsumerView → getMerchantState() / getAllMerchants() in suiClient.ts → Sui testnet (or mock).
 *   This component does NOT contain any RPC or SDK logic — all reads are in suiClient.ts.
 *
 * MOCK DATA:
 *   Currently running in MOCK_MODE=true (suiClient.ts). Mock data is clearly labelled.
 *   Once Adam registers real Merchant objects, flip MOCK_MODE to false and add object IDs.
 *
 * STYLING:
 *   Junquan owns visual polish. This file provides clean semantic structure and data binding.
 *   Do NOT add Stitch-generated layout here without coordinating with Junquan.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  formatSui,
  statusLabel,
  STATUS,
  MOCK_MODE,
  type MerchantState,
} from '../lib/suiClient'

// ---------------------------------------------------------------------------
// Health score color — from green (high) to red (low)
// Junquan should replace this with the Stitch gradient implementation.
// ---------------------------------------------------------------------------
function healthScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'  // green
  if (score >= 60) return '#eab308'  // yellow
  if (score >= 40) return '#f97316'  // orange
  return '#ef4444'                   // red
}

// ---------------------------------------------------------------------------
// Sub-component: individual merchant trust card
// ---------------------------------------------------------------------------
interface TrustCardProps {
  label: string
  state: MerchantState
}

function TrustCard({ label, state }: TrustCardProps) {
  const isPendingSlash = state.status === STATUS.PENDING_SLASH
  const isSlashed = state.status === STATUS.SLASHED
  const isRecovered = state.status === STATUS.CHALLENGED_OK
  const isWarning = isPendingSlash || isSlashed

  return (
    <article
      className={`trust-card ${isPendingSlash ? 'trust-card--pending' : ''} ${isSlashed ? 'trust-card--slashed' : ''} ${isRecovered ? 'trust-card--recovered' : ''}`}
      aria-label={`Trust badge for ${state.name}`}
      data-merchant-label={label}
    >
      {/* Mock data label — must be visible when data is not real on-chain */}
      {state.isMockData && (
        <div className="mock-banner" role="note">
          🧪 Demo data — not real on-chain state
        </div>
      )}

      {/* Status warning banner — shown for non-ACTIVE states */}
      {isWarning && (
        <div
          className={`status-banner ${isSlashed ? 'status-banner--slashed' : 'status-banner--pending'}`}
          role="alert"
        >
          {isPendingSlash && '⚠️ Under Review — Challenge Window Open'}
          {isSlashed && '🚫 Merchant Slashed — Bond Partially Distributed'}
        </div>
      )}
      {isRecovered && (
        <div className="status-banner status-banner--recovered" role="status">
          ✅ Challenge Accepted — Merchant Recovered
        </div>
      )}

      {/* Merchant identity */}
      <header className="trust-card__header">
        <h2 className="trust-card__name">{state.name}</h2>
        <span
          className={`trust-badge ${isWarning ? 'trust-badge--warning' : isRecovered ? 'trust-badge--recovered' : 'trust-badge--active'}`}
          aria-label={`Status: ${statusLabel(state.status)}`}
        >
          {statusLabel(state.status)}
        </span>
      </header>

      {/* Health score — Circular SVG Gauge */}
      <section className="trust-card__score-section" aria-label="Health score">
        <div className="health-score-gauge">
          <svg className="gauge-svg" viewBox="0 0 100 100" width="120" height="120">
            <circle
              className="gauge-bg"
              cx="50"
              cy="50"
              r="40"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              className="gauge-fill"
              cx="50"
              cy="50"
              r="40"
              strokeWidth="8"
              fill="transparent"
              stroke={healthScoreColor(state.healthScore)}
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * state.healthScore) / 100}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="gauge-text" style={{ color: healthScoreColor(state.healthScore) }}>
            <span className="health-score__number">{state.healthScore}</span>
            <span className="health-score__label">/100</span>
          </div>
        </div>
        <p className="health-score__caption">Fulfillment Health Score</p>
      </section>

      {/* Bond details */}
      <section className="trust-card__bond" aria-label="Bond information">
        <div className="bond-item">
          <span className="bond-item__label">Secured Performance Bond</span>
          <span className="bond-item__value bond-item__value--staked">
            {formatSui(state.bondBalanceMist)}
            <small className="bond-item__fiat"> (~RM {(Number(state.bondBalanceMist) / 1e9 * 10).toFixed(2)})</small>
          </span>
        </div>
        <div className="bond-item">
          <span className="bond-item__label">Required Bond</span>
          <span className="bond-item__value">
            {formatSui(state.requiredBondMist)}
            <small className="bond-item__fiat"> (~RM {(Number(state.requiredBondMist) / 1e9 * 10).toFixed(2)})</small>
          </span>
        </div>
        {state.bondBalanceMist < state.requiredBondMist && (
          <p className="bond-undercollateral" role="alert">
            ⚠️ Bond below required floor — top-up needed
          </p>
        )}
      </section>

      {/* Bond formula explainer — helps judges understand the mechanism */}
      <footer className="trust-card__formula">
        <details>
          <summary>How is the bond calculated?</summary>
          <p>
            Required bond = Trailing 30-day prepaid revenue × (100 − health score)%,
            with a minimum floor of 0.50 SUI.
            Higher health score → smaller required bond.
            Health score 95 → ~5% exposure staked.
            Health score 60 → ~40% exposure staked.
          </p>
          <p className="formula-note">
            Demo uses SUI. Production would use a BNM DAIH-aligned MYR-pegged stablecoin.
          </p>
        </details>
      </footer>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Main ConsumerView
// ---------------------------------------------------------------------------

/** Polling interval in ms for live demo (shows near-real-time updates). */
const POLL_INTERVAL_MS = 5000

export default function ConsumerView() {
  const [merchants, setMerchants] = useState<Record<string, MerchantState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const { getAllMerchants } = await import('../lib/suiClient')
      const data = await getAllMerchants()
      setMerchants(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load merchant data')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + polling for live demo
  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchAll])

  return (
    <section className="consumer-view" aria-labelledby="consumer-view-heading">
      <div className="consumer-view__intro">
        <h1 id="consumer-view-heading" className="consumer-view__heading">
          Consumer Trust Badges
        </h1>
        <p className="consumer-view__description">
          This is what you would see embedded on a booking page before purchasing a prepaid package.
          Bond amounts and health scores are sourced from the Sui blockchain — not from the merchant or the platform.
        </p>
        {MOCK_MODE && (
          <div className="consumer-view__mock-notice" role="note">
            <strong>Development mode:</strong> Displaying mock data.
            Switch <code>MOCK_MODE = false</code> in <code>suiClient.ts</code> once Adam registers
            real Merchant objects and posts their object IDs.
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="consumer-view__loading" aria-live="polite">
          Loading merchant data from Sui testnet…
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="consumer-view__error" role="alert">
          <strong>Error loading merchants:</strong> {error}
        </div>
      )}

      {/* Merchant cards */}
      {!loading && !error && (
        <div className="merchant-cards" role="list">
          {Object.entries(merchants).map(([label, state]) => (
            <div key={label} role="listitem">
              <TrustCard label={label} state={state} />
            </div>
          ))}
        </div>
      )}

      {/* Last updated timestamp */}
      {lastUpdated && (
        <p className="consumer-view__timestamp" aria-live="polite">
          Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every {POLL_INTERVAL_MS / 1000}s
        </p>
      )}
    </section>
  )
}
