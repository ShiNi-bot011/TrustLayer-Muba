# SME Trust Layer — Software Design Specification (SDD)
## For implementation via Claude Code · 5-day hackathon build
## Version: v4 · Target: MUBA Hacks 2026, Sui Track 01

---

## 0. Document Purpose & How to Use This With Claude Code

This spec is written to be handed to Claude Code as the primary build reference. Structure:
- §1–2: system overview and architecture — read first, establishes shared vocabulary.
- §3: Move contract spec — exact enough to implement without further product decisions.
- §4: off-chain simulator spec — the fake "SaaS webhook" data generator.
- §5: frontend spec — consumer + merchant-admin views.
- §6: end-to-end demo script — the exact sequence to wire up and rehearse.
- §7: explicit non-goals — things Claude Code should NOT build, to prevent scope creep during agentic execution.
- §8: file/repo layout — suggested structure to keep multi-agent or multi-session work organized.
- §9: task checklist by day — hand this section to Claude Code as a running TODO.

When prompting Claude Code, feed it one numbered section at a time rather than the whole document, and ask it to implement + self-review against the "Security/Correctness Review Checklist" in §3.7 before moving to the next section.

---

## 1. System Overview

Three components, deliberately decoupled:

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Simulator Service   │────▶│   Sui Move Contract    │◀────│   Frontend (React)   │
│  (fake SaaS webhook) │     │   (on-chain state)     │     │  consumer + merchant  │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
      generates                  Merchant object              reads on-chain state
      check-in/refund/            + event log                 renders trust badge
      promo events                + bond state machine         + admin demo controls
```

- **No real third-party API integration in the 5-day build.** The Simulator Service impersonates Zenoti/Rezerv-style webhook payloads. This is a stated, disclosed design decision (see Proposal §3.7, §6), not a shortcut to hide.
- All business logic that needs tamper-resistance lives in the Move contract. Health-score *calculation* happens off-chain (in the simulator or a lightweight backend) and is submitted to the contract as a plain number — the contract only enforces the bond/slash state machine on the number it's given, it does not recompute the score.

---

## 2. Actors & Core Objects

| Actor | Role in demo |
|---|---|
| **Consumer** | Views merchant trust badge before purchasing a package. Can file a complaint (with proof-of-payment hash). |
| **Merchant** | Has a `Merchant` object on-chain: health score, bond balance, status. Can submit counter-evidence during challenge window. |
| **Trust Layer Admin (demo operator)** | Triggers simulated events via the Simulator Service UI to walk judges through the failure scenario live. |
| **Sui Move Contract** | Source of truth for bond state, health score snapshot, and slash/release logic. |

### Core on-chain object: `Merchant`

```
struct Merchant has key, store {
    id: UID,
    owner: address,                  // merchant's wallet
    name: String,
    health_score: u64,               // 0-100, submitted off-chain, stored on-chain
    bond_balance: Balance<SUI>,       // staked collateral (use SUI or mock stablecoin — see §3.1)
    trailing_30d_prepaid_revenue: u64, // used in bond formula, submitted off-chain
    status: u8,                      // see status enum below
    pending_slash_amount: u64,
    pending_slash_started_at_ms: u64, // for 72h challenge window
    last_checkin_event_ms: u64,       // for disappearance trigger
    event_log: vector<FulfillmentEvent>, // or use Sui events instead of inline vector — see §3.4
}
```

### Status enum

```
0 = ACTIVE
1 = PENDING_SLASH   // objective trigger fired, 72h challenge window open
2 = SLASHED         // challenge window expired without valid counter-evidence, bond deducted
3 = CHALLENGED_OK   // merchant successfully submitted counter-evidence, reverted to ACTIVE
```

---

## 3. Move Contract Specification

### 3.1 Settlement Asset

Use native `SUI` coin type for the demo (do not attempt to mint a custom mock-MYR stablecoin unless time permits after core logic is done and tested — this is a nice-to-have, not core). If judges ask, state clearly: *"Demo uses native SUI for the bond asset; production would use a BNM DAIH-sandbox-aligned MYR-pegged stablecoin."*

### 3.2 Module Layout

Suggested single-module structure for a 5-day build (do not over-modularize):

```
sme_trust_layer::merchant
```

Functions to implement:

```move
// Create a new merchant object, called once per merchant onboarding
public entry fun register_merchant(
    name: vector<u8>,
    initial_health_score: u64,
    ctx: &mut TxContext
)

// Merchant deposits/tops up bond
public entry fun deposit_bond(
    merchant: &mut Merchant,
    payment: Coin<SUI>,
    ctx: &mut TxContext
)

// Off-chain simulator submits an updated health score + trailing revenue figure
// (In production this would be permissioned to an oracle address; for demo, keep it
// callable by a designated "oracle" address stored at publish time, NOT by the merchant itself)
public entry fun update_health_score(
    merchant: &mut Merchant,
    new_score: u64,
    trailing_30d_revenue: u64,
    clock: &Clock,
    ctx: &mut TxContext
)

// Records a check-in event timestamp (for disappearance trigger)
public entry fun record_checkin(
    merchant: &mut Merchant,
    clock: &Clock,
    ctx: &mut TxContext
)

// Called by oracle/simulator when a trigger condition fires objectively
// (refund pileup, attendance anomaly, ticket stagnation, promo spike, or disappearance)
public entry fun initiate_slash(
    merchant: &mut Merchant,
    reason_code: u8,          // see reason codes below
    clock: &Clock,
    ctx: &mut TxContext
)
// - Requires merchant.status == ACTIVE
// - Computes required_bond via formula in §3.3, sets pending_slash_amount
// - Sets status = PENDING_SLASH, pending_slash_started_at_ms = clock.timestamp_ms()
// - Emits SlashInitiated event

// Merchant submits counter-evidence within 72h window
public entry fun submit_counter_evidence(
    merchant: &mut Merchant,
    evidence_tx_hash: vector<u8>,  // e.g. on-chain refund tx hash
    clock: &Clock,
    ctx: &mut TxContext
)
// - Requires merchant.status == PENDING_SLASH
// - Requires clock.timestamp_ms() - pending_slash_started_at_ms <= CHALLENGE_WINDOW_MS
// - Sets status = CHALLENGED_OK (demo: accept any submitted evidence — real validation is
//   out of scope for 5-day build, but STATE THIS EXPLICITLY as a stub in code comments)

// Anyone (or a keeper/cron simulated by the demo operator) can call this after window expires
public entry fun finalize_slash(
    merchant: &mut Merchant,
    consumer_payout_pool: &mut Balance<SUI>,  // or a simple recipient address for demo
    clock: &Clock,
    ctx: &mut TxContext
)
// - Requires merchant.status == PENDING_SLASH
// - Requires clock.timestamp_ms() - pending_slash_started_at_ms > CHALLENGE_WINDOW_MS
// - Deducts pending_slash_amount from bond_balance (capped at available balance)
// - Transfers deducted amount to payout pool/address
// - Sets status = SLASHED
// - Emits SlashFinalized event
```

### 3.3 Bond Formula (implement as a pure function, callable from `update_health_score` or as a view function)

```
required_bond = trailing_30d_prepaid_revenue * (100 - health_score) / 100
required_bond = max(required_bond, ABSOLUTE_FLOOR)   // ABSOLUTE_FLOOR is a module constant, e.g. 500 SUI-equivalent for demo — pick a visible, explainable number
```

State this floor explicitly as answering the "high-trust brands get near-zero protection" critique — make sure it's visible in a judge-facing view (frontend badge or contract constant with a comment).

### 3.4 Reason Codes (for `initiate_slash`)

```
1 = ATTENDANCE_ANOMALY      // checkin rate dropped >30% vs 30d baseline
2 = TICKET_STAGNATION       // maintenance ticket unresolved >14 days
3 = PROMO_SPIKE             // discount rate + short-window sales volume both spiked
4 = DISAPPEARANCE           // zero checkins across entire merchant base for N consecutive days
5 = REFUND_PILEUP           // legacy/simplest trigger — refund requests > threshold, unresolved
```

Only `REFUND_PILEUP` and `DISAPPEARANCE` are Must-Have for the 5-day build (see §9). The other three can be stubbed as callable-but-not-auto-computed reason codes if time runs short — i.e., the simulator can manually fire them for demo purposes even if the "detect this automatically" logic isn't built.

### 3.5 Constants

```move
const CHALLENGE_WINDOW_MS: u64 = 259200000; // 72 hours in ms for production
// DEMO OVERRIDE: use a much shorter window (e.g. 72_000 ms = 72 seconds) behind a
// feature flag or separate demo-mode constant, so the live judge demo doesn't require
// waiting 3 days. Make this override OBVIOUS in code comments — do not silently ship
// demo timing as if it were the real value.
const ABSOLUTE_FLOOR: u64 = 500_000_000; // in MIST (SUI's smallest unit) — pick a real, explainable number
```

### 3.6 Events (use Sui's native event system rather than an inline vector on the Merchant struct — cheaper, and the frontend can subscribe to these for the live demo)

```move
public struct CheckinRecorded has copy, drop { merchant_id: ID, timestamp_ms: u64 }
public struct HealthScoreUpdated has copy, drop { merchant_id: ID, new_score: u64 }
public struct SlashInitiated has copy, drop { merchant_id: ID, reason_code: u8, amount: u64, timestamp_ms: u64 }
public struct SlashFinalized has copy, drop { merchant_id: ID, amount_deducted: u64 }
public struct ChallengeAccepted has copy, drop { merchant_id: ID, evidence_hash: vector<u8> }
```

### 3.7 Security/Correctness Review Checklist (run this against Claude Code's own output before moving on)

Ask Claude Code explicitly to self-review against each item and explain its answer in code comments:

- [ ] Can `initiate_slash` be called on a merchant already in `PENDING_SLASH` or `SLASHED` state? (Should be blocked — verify the status guard.)
- [ ] Can `finalize_slash` be called before the challenge window expires? (Should be blocked.)
- [ ] Can `submit_counter_evidence` be called after the window expires, or by someone other than the merchant owner? (Should be blocked on both counts.)
- [ ] Is `update_health_score` restricted to the oracle/simulator address, or can the merchant call it on themselves? (Must be restricted — merchant self-scoring defeats the entire design.)
- [ ] Does `pending_slash_amount` ever exceed `bond_balance`? (Cap it — don't let the contract try to deduct more than exists.)
- [ ] Is there any state the `Merchant` object can get stuck in with no valid exit transition? (Walk through ACTIVE → PENDING_SLASH → {SLASHED, CHALLENGED_OK} → back to ACTIVE and confirm every state has a way out.)
- [ ] Does `deposit_bond` correctly merge incoming `Coin<SUI>` into the existing `Balance<SUI>` without leaking value?

This checklist doubles as your answer if a judge asks about contract security — you should be able to walk through each point live.

---

## 4. Simulator Service Specification

**Purpose**: stand in for a real Zenoti/Rezerv webhook, and give the demo operator a control panel to manually fire scenarios during the live pitch.

**Stack recommendation**: simplest possible — a small Node/Express or Python/FastAPI backend, or even a script directly callable from the frontend admin panel via a Sui SDK client-side call (skip the backend entirely if the frontend can call the contract directly with a demo/admin keypair — simpler is better for 5 days).

### 4.1 Simulated Event Types

Match the reason codes in §3.4. Each event type needs a data generator:

- **Check-in event**: `{merchant_id, timestamp}` — bulk-generatable ("simulate 30 days of normal check-ins" button)
- **Refund request event**: `{merchant_id, amount, timestamp, resolved: bool}`
- **Maintenance ticket event**: `{merchant_id, opened_at, resolved_at | null}`
- **Promo event**: `{merchant_id, discount_pct, sales_volume, timestamp}`

### 4.2 Demo Control Panel Requirements

The operator (you, presenting) needs buttons/controls to:
1. "Seed healthy history" — bulk-generate 30 days of normal check-in data for a merchant, health score settles ~90-95.
2. "Trigger True Fitness scenario" — simulate the real timeline: maintenance tickets stop resolving → check-ins drop → (optionally skip straight to) disappearance trigger fires.
3. "Trigger 1Fit scenario" — simulate promo spike (discount % and volume jump) → health score drops → bond requirement increases.
4. "Submit counter-evidence" — as the merchant, submit a fake refund tx hash to demonstrate the challenge window working correctly.
5. "Fast-forward challenge window" — only needed if you're not using the shortened demo-mode timer from §3.5; prefer the short timer instead so this button isn't needed.

### 4.3 Health Score Calculation (off-chain, simple, deterministic — do not over-engineer)

```
health_score = 100
  - (checkin_anomaly_pct * WEIGHT_1)
  - (unresolved_ticket_days_over_14 * WEIGHT_2)
  - (promo_spike_severity * WEIGHT_3)
  - (unresolved_refund_count * WEIGHT_4)
clamp to [0, 100]
```

Pick simple weights (e.g. all equal, or hand-tuned so the two demo scenarios produce a visually satisfying score drop from ~90s to ~40s). This does not need to be sophisticated — it needs to be legible and produce the right demo outcome reliably.

---

## 5. Frontend Specification

Two views minimum. Build with React (per environment defaults) or plain HTML/JS if the team is more comfortable there — either is fine for a hackathon demo.

### 5.1 Consumer View — "Checkout Trust Badge" (this is the single most important UI surface — judges will remember this)

Shown at the moment a consumer would purchase a prepaid package:

- Merchant name
- **Bond staked**: "RM X staked" (pull from `bond_balance`, format clearly)
- **Health score**: large, visual (e.g. 0-100 with a color gradient, not just a number)
- Optional: small trend indicator (up/down vs. last known score) — nice-to-have, skip if time-constrained
- Status badge if not ACTIVE (e.g. "⚠️ Under review" if PENDING_SLASH — this is actually a strong demo moment, showing the badge change live)

### 5.2 Merchant/Admin View — Demo Control Panel

This is the "backstage" view you'll drive live during presentation (see §4.2). Doesn't need to be pretty — needs to be reliable and fast to operate under pitch pressure. Consider putting this on a separate screen/tab from the consumer view so you can flip between "what the judge sees as a consumer" and "what's happening under the hood."

### 5.3 Explicitly Out of Scope for Frontend

- Health score historical trend charts (nice-to-have only, per Proposal §5)
- Any real payment flow / wallet-connect UX polish beyond what's needed to demo
- Mobile responsiveness (demo will run on a laptop/projector)

---

## 6. End-to-End Demo Script (rehearse this exact sequence)

1. **Setup (before judges arrive)**: two merchants registered on-chain — "Merchant A" (healthy, ~92 score, small bond %) and "Merchant B" (about to be walked through collapse).
2. **Open on Consumer View**: show Merchant A's trust badge — healthy, low bond requirement. One sentence: *"This is what a consumer sees before paying for a package — a bond amount and a live health score, not marketing copy."*
3. **Switch to Admin/Control Panel**: *"Now let's watch what happens to a merchant on the same platform starting to fail — using the real 1Fit playbook."*
4. **Fire promo spike event** for Merchant B via control panel → health score visibly drops on-chain → bond requirement recalculates.
5. **Fire disappearance/refund pileup trigger** → contract enters `PENDING_SLASH`, emits event → **switch back to Consumer View** → Merchant B's badge now shows "⚠️ Under review" in real time.
6. **(Optional, if time)**: show the 72-hour (demo-mode: 72-second) challenge window ticking down, then either let it expire (slash finalizes, funds move to payout pool — show the on-chain tx) or submit counter-evidence live to show the reversal path.
7. **Close on the honesty statement**: *"We don't eliminate fraud. We shrink the loss window from total to partial, and give the consumer a signal that didn't exist before."*

Rehearse this at least twice before presenting — the on-chain calls have real latency (even on testnet), factor that into pacing.

---

## 7. Explicit Non-Goals — Do Not Build These

Tell Claude Code this section verbatim if it starts expanding scope on its own:

- No real integration with Zenoti, Rezerv, or any actual third-party API. Simulator only.
- No real fiat on/off-ramp or stablecoin issuance — use native SUI.
- No subjective quality scoring (nail art, coaching quality, etc.) — only the objective event types in §3.4/§4.1.
- No credit-scoring or lending features.
- No mobile-responsive frontend.
- No production-grade oracle decentralization — a single demo/admin address playing "oracle" is fine and should be labeled as such in code comments.
- No attempt to build the "App Marketplace official partner" integration described as roadmap in the Proposal — that is pitch narrative, not a build target.
- No historical trend visualization beyond a single current health-score display.

---

## 8. Suggested Repo Layout

```
/contracts
  /sme_trust_layer
    Move.toml
    sources/merchant.move
    tests/merchant_tests.move        <- write basic tests for the state machine transitions in §3.7
/simulator
  (backend or scripts for event generation — structure per chosen stack)
/frontend
  /src
    /views
      ConsumerView.tsx (or .jsx)
      AdminControlPanel.tsx
    /lib
      suiClient.ts                    <- wraps Sui SDK calls to contract functions
/docs
  01-PROPOSAL.md
  02-SPEC.md
  (this file)
```

---

## 9. Day-by-Day Task Checklist (hand to Claude Code as a running TODO, check off as completed)

### Day 1
- [ ] Lock business logic constants with the team: `ABSOLUTE_FLOOR`, health score weights, demo challenge-window duration
- [ ] Scaffold Move package (`sui move new sme_trust_layer`), get `register_merchant` deployed and callable on testnet — confirm environment works end-to-end before writing more logic
- [ ] Implement `Merchant` struct + status enum + `deposit_bond`

### Day 2
- [ ] Implement `update_health_score`, `record_checkin`, `initiate_slash`, `submit_counter_evidence`, `finalize_slash`
- [ ] Implement bond formula per §3.3, including absolute floor
- [ ] Implement all 5 Sui events per §3.6
- [ ] Write and run tests against every checklist item in §3.7 — do not proceed to Day 3 with unresolved checklist items

### Day 3
- [ ] Build Simulator Service event generators (§4.1) and control panel (§4.2)
- [ ] Wire health score calculation (§4.3) end-to-end: simulator computes score → calls `update_health_score` on-chain
- [ ] Start Consumer View frontend (§5.1) — connect to real on-chain state, not mock data, as early as possible

### Day 4
- [ ] Complete Admin Control Panel (§5.2)
- [ ] Full integration pass: run the entire demo script (§6) end-to-end at least once
- [ ] Fix bugs surfaced by the full run-through — this day is for reliability, not new features

### Day 5
- [ ] No new code except critical-path bug fixes
- [ ] Rehearse demo script (§6) at least twice, timed
- [ ] Prepare answers to the 5 anticipated judge questions (Proposal §7) — assign one team member to own each answer
- [ ] Confirm the 🔴 unverified facts in Proposal §3.6/§3.7 have been checked, or downgrade the pitch language accordingly
