/**
 * CheckoutPage.tsx
 *
 * Simulates a real Zenoti/Rezerv gym booking checkout page.
 * The TrustLayer verification widget is embedded naturally in the payment flow.
 *
 * DATA FLOW: reads live Merchant state from suiClient → renders trust badge.
 * The consumer has NO direct access to the Admin controls.
 */

import { useState, useEffect } from 'react'
import {
  getAllMerchants,
  STATUS,
  type MerchantState,
} from '../lib/suiClient'

// ---------------------------------------------------------------------------
// Merchant catalog (booking page content — mirrors the two on-chain merchants)
// ---------------------------------------------------------------------------
const MERCHANT_CATALOG = [
  {
    label: 'Merchant A',
    displayName: 'True Fitness',
    location: 'KLCC, Kuala Lumpur',
    package: 'UNLIMITED MONTHLY PACKAGE',
    duration: '12-month prepaid commitment',
    price: 349,
    currency: 'RM',
    features: ['Unlimited Classes', 'Gym Access 24/7', 'Swimming Pool', 'Personal Locker'],
    emoji: '🏋️',
  },
  {
    label: 'Merchant B',
    displayName: '1Fit Premium',
    location: 'Pavilion KL, Bukit Bintang',
    package: 'ELITE MEMBERSHIP',
    duration: '6-month prepaid commitment',
    price: 229,
    currency: 'RM',
    features: ['Group Classes', 'Gym Access', 'Yoga Studio', 'Sauna'],
    emoji: '⚡',
  },
]

// ---------------------------------------------------------------------------
// Health score color
// ---------------------------------------------------------------------------
function healthColor(score: number): string {
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#d97706'
  if (score >= 40) return '#ea580c'
  return '#dc2626'
}

// ---------------------------------------------------------------------------
// TrustLayer Widget — the embedded verification badge
// ---------------------------------------------------------------------------
function TrustWidget({ state }: { state: MerchantState | null }) {
  if (!state) {
    return (
      <div className="trust-layer-widget">
        <div className="trust-widget-header">
          <span className="trust-widget-title">TrustLayer Verification</span>
          <span className="trust-widget-powered">
            <span className="sui-icon">S</span> Powered by Sui
          </span>
        </div>
        <div className="trust-widget-body" style={{ textAlign: 'center', padding: '1.5rem', color: '#9ca3af', fontSize: '0.8rem' }}>
          <div className="spinner" style={{ margin: '0 auto 0.5rem', borderTopColor: '#6b7280' }}></div>
          Verifying merchant on-chain…
        </div>
      </div>
    )
  }

  const isActive  = state.status === STATUS.ACTIVE
  const isPending = state.status === STATUS.PENDING_SLASH
  const isSlashed = state.status === STATUS.SLASHED

  const statusConfig = isActive
    ? { icon: '✅', label: 'Verified & Protected', sub: 'Performance Bond secured on Sui blockchain', cls: '' }
    : isPending
    ? { icon: '⚠️', label: 'Under Review', sub: 'Challenge window open — proceed with caution', cls: 'trust-layer-widget--warning' }
    : { icon: '🚫', label: 'Bond Deducted', sub: 'Merchant security deposit has been utilized', cls: 'trust-layer-widget--danger' }

  const bondSui = (Number(state.bondBalanceMist) / 1e9).toFixed(2)
  const bondMyr = (Number(state.bondBalanceMist) / 1e9 * 10).toFixed(2)

  return (
    <div className={`trust-layer-widget ${statusConfig.cls}`}>
      <div className="trust-widget-header">
        <span className="trust-widget-title">TrustLayer Verification</span>
        <span className="trust-widget-powered">
          <span className="sui-icon">S</span> Powered by Sui
        </span>
      </div>
      <div className="trust-widget-body">
        <div className="trust-status-row">
          <div className={`trust-status-icon trust-status-icon--${isActive ? 'active' : isPending ? 'warning' : isSlashed ? 'danger' : 'danger'}`}>
            {statusConfig.icon}
          </div>
          <div className="trust-status-text">
            <strong>{statusConfig.label}</strong>
            <span>{statusConfig.sub}</span>
          </div>
        </div>

        <div className="trust-metrics">
          <div className="trust-metric">
            <span className="trust-metric__label">Bond Protected</span>
            <span className="trust-metric__value" style={{ color: isActive ? '#16a34a' : '#d97706' }}>
              {bondSui} SUI <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.7rem' }}>(~RM {bondMyr})</span>
            </span>
          </div>

          <div className="trust-metric">
            <span className="trust-metric__label">Fulfillment Score</span>
            <span className="trust-metric__value">
              <div className="health-mini-bar">
                <div
                  className="health-mini-bar__fill"
                  style={{ width: `${state.healthScore}%`, backgroundColor: healthColor(state.healthScore) }}
                />
              </div>
              <span style={{ color: healthColor(state.healthScore), fontSize: '0.8rem', fontWeight: 700 }}>
                {state.healthScore}/100
              </span>
            </span>
          </div>

          <div className="trust-metric">
            <span className="trust-metric__label">Merchant Name</span>
            <span className="trust-metric__value" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
              {state.name}
            </span>
          </div>

          {state.isMockData && (
            <div style={{ fontSize: '0.7rem', color: '#991b1b', background: '#fee2e2', padding: '6px 8px', border: '1px solid #ef4444', borderRadius: 4 }}>
              🧪 EXPLICIT MOCK MODE — NOT LIVE BLOCKCHAIN DATA
            </div>
          )}
        </div>
      </div>
      <div className="trust-widget-footer">
        <span>{state.isMockData ? 'Mock object reference' : 'Verified live on-chain'} · Object: {state.objectId.slice(0, 10)}…</span>
        {!state.isMockData && (
          <a href={`https://testnet.suivision.xyz/object/${state.objectId}`} target="_blank" rel="noreferrer">
            View on-chain →
          </a>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main CheckoutPage
// ---------------------------------------------------------------------------
export default function CheckoutPage() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [merchants, setMerchants] = useState<Record<string, MerchantState>>({})
  const [loading, setLoading] = useState(true)
  const [readError, setReadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      try {
        const data = await getAllMerchants()
        if (!cancelled) { setMerchants(data); setReadError(null); setLoading(false) }
      } catch (err) {
        if (!cancelled) {
          setMerchants({})
          setReadError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      }
    }
    fetch()
    const iv = setInterval(fetch, 5000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  const catalog = MERCHANT_CATALOG[selectedIndex]
  const state   = merchants[catalog.label] ?? null

  const isPending = state?.status === STATUS.PENDING_SLASH
  const isSlashed = state?.status === STATUS.SLASHED
  const canProceed = !loading && !readError && Boolean(state) && !isPending && !isSlashed

  const subtotal = catalog.price
  const tax      = +(catalog.price * 0.06).toFixed(2)
  const total    = +(subtotal + tax).toFixed(2)

  return (
    <div className="checkout-page">
      {/* Booking platform header */}
      <header className="checkout-header">
        <div className="checkout-header__logo">
          <div className="checkout-header__brand">{catalog.emoji}</div>
          <div className="checkout-header__text">
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginBottom: '0.2rem' }}>🛍️ Web2 Checkout Simulation</div>
            <strong>{catalog.displayName}</strong>
            <span>{catalog.location}</span>
          </div>
        </div>
        <div className="checkout-header__steps">
          <div className="checkout-step checkout-step--active">
            <div className="checkout-step__num">1</div>
            Package
          </div>
          <span className="checkout-step__divider">›</span>
          <div className="checkout-step">
            <div className="checkout-step__num">2</div>
            Payment
          </div>
          <span className="checkout-step__divider">›</span>
          <div className="checkout-step">
            <div className="checkout-step__num">3</div>
            Confirm
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          🔒 Secured by TrustLayer · Sui Blockchain
        </div>
      </header>

      <div className="checkout-body">
        {/* Left: Package Details */}
        <div className="checkout-package">
          <div>
            <div className="checkout-section-title">Select Merchant</div>
            <div className="merchant-selector">
              {MERCHANT_CATALOG.map((m, i) => (
                <button
                  key={m.label}
                  className={`merchant-tab ${selectedIndex === i ? 'merchant-tab--active' : ''}`}
                  onClick={() => setSelectedIndex(i)}
                >
                  <div className="merchant-tab__name">{m.displayName}</div>
                  <div className="merchant-tab__location">{m.location}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="checkout-section-title">Package Details</div>
            <div className="package-card">
              <div className="package-card__hero">
                <div className="package-card__gym">{catalog.displayName} · {catalog.location}</div>
                <div className="package-card__name">{catalog.package}</div>
                <div className="package-card__tags">
                  {catalog.features.map(f => (
                    <span key={f} className="package-tag">✓ {f}</span>
                  ))}
                </div>
              </div>
              <div className="package-card__details">
                <div className="package-row">
                  <span className="package-row__label">Commitment</span>
                  <span className="package-row__value">{catalog.duration}</span>
                </div>
                <div className="package-row">
                  <span className="package-row__label">Monthly Rate</span>
                  <span className="package-row__value package-row__value--price">
                    {catalog.currency} {catalog.price.toFixed(2)}/mo
                  </span>
                </div>
                <div className="package-row">
                  <span className="package-row__label">Auto-renewal</span>
                  <span className="package-row__value">Yes — cancel anytime with 30-day notice</span>
                </div>
              </div>
            </div>
          </div>

          {/* Consumer protection explainer */}
          <div style={{ padding: '1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, fontSize: '0.8rem', color: '#1e40af' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>🛡️ How you're protected by TrustLayer</div>
            <div style={{ lineHeight: 1.6 }}>
              TrustLayer displays the merchant's actual testnet bond and status from Sui.
              Simulated risk inputs can open an on-chain pending-slash challenge window; this presentation demonstrates
              the merchant challenge path, not completed consumer liquidation.
            </div>
          </div>
        </div>

        {/* Right: Trust Badge + Payment Summary */}
        <div className="checkout-sidebar">
          <div className="checkout-section-title">Merchant Verification</div>
          {readError && (
            <div role="alert" style={{ padding: '0.8rem', marginBottom: '0.75rem', color: '#991b1b', background: '#fee2e2', border: '2px solid #ef4444', borderRadius: 8 }}>
              <strong>LIVE SUI READ FAILED</strong><br />No mock data is being shown. {readError}
            </div>
          )}
          <TrustWidget state={state} />

          {isPending && (
            <div className="checkout-trust-warning" style={{ border: '2px solid #ef4444', backgroundColor: '#fee2e2' }}>
              <span style={{ fontSize: '2rem' }}>🛑</span>
              <div>
                <strong style={{ color: '#b91c1c', fontSize: '1.1rem', display: 'block', marginBottom: '0.2rem' }}>Transaction Blocked</strong>
                <span style={{ color: '#991b1b' }}>TrustLayer has detected high-risk merchant behavior. Payment disabled to protect your funds.</span>
              </div>
            </div>
          )}

          {isSlashed && (
            <div className="checkout-trust-blocked" style={{ border: '2px solid #b91c1c', backgroundColor: '#fef2f2' }}>
              <span style={{ fontSize: '2rem' }}>🚫</span>
              <div>
                <strong style={{ color: '#7f1d1d', fontSize: '1.1rem', display: 'block', marginBottom: '0.2rem' }}>Payment Permanently Blocked</strong>
                <span style={{ color: '#991b1b' }}>This merchant has been penalised by the TrustLayer protocol. We strongly recommend choosing a different provider.</span>
              </div>
            </div>
          )}

          <div className="checkout-section-title" style={{ marginTop: '0.25rem' }}>Order Summary</div>
          <div className="payment-summary">
            <div className="payment-summary__title">Monthly Payment Breakdown</div>
            <div className="payment-row">
              <span>{catalog.package}</span>
              <span>{catalog.currency} {subtotal.toFixed(2)}</span>
            </div>
            <div className="payment-row">
              <span>SST (6%)</span>
              <span>{catalog.currency} {tax.toFixed(2)}</span>
            </div>
            <hr className="payment-divider" />
            <div className="payment-total">
              <span>Total / month</span>
              <span>{catalog.currency} {total.toFixed(2)}</span>
            </div>

            <button
              className="checkout-btn"
              disabled={!canProceed}
              style={{ opacity: (isPending || isSlashed) ? 0.5 : 1, filter: (isPending || isSlashed) ? 'grayscale(100%)' : 'none' }}
              title={(isSlashed || isPending) ? 'Blocked by TrustLayer' : 'Proceed to payment'}
            >
              {loading ? (
                <>Verifying merchant… <span className="spinner" /></>
              ) : isSlashed ? (
                '🚫 Payment Blocked by TrustLayer'
              ) : isPending ? (
                '⚠️ Proceed with Caution'
              ) : (
                'Proceed to Payment →'
              )}
            </button>

            <div className="checkout-secure-note">
              🔒 Protected by TrustLayer · Sui Testnet
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
