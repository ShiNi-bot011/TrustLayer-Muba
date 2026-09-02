# SME Trust Layer

> **MUBA Hacks 2026 · Sui Track 01 (Payments & Stablecoins)**  
> *A neutral, cross-platform merchant fulfillment trust layer that lets trustworthy SMEs prove their track record with tamper-resistant on-chain records and dynamic bonding.*

---

## 🏗 Project Structure

```
.
├── docs/
│   ├── 01-PROPOSAL.md       # Canonical product proposal & problem framing
│   ├── 02-SPEC.md           # Software design specification & technical requirements
│   └── 04-BUILD-PLAN.md     # Implementation build plan & milestones
│
├── contracts/               # Sui Move smart contracts
│   └── sme_trust_layer/     # Package root (Move.toml, sources, tests)
│
├── simulator/               # Off-chain event simulator & webhook generator
│
├── frontend/                # React frontend (Consumer Trust Badge & Admin Demo Controls)
│
└── README.md                # Project documentation & overview
```

---

## 🏛 Architecture

```
┌─────────────────────────┐       ┌──────────────────────────┐       ┌─────────────────────────┐
│    Simulator Service    │──────▶│    Sui Move Contract     │◀──────│    Frontend (React)     │
│   (fake SaaS webhooks)  │       │     (on-chain state)     │       │  (consumer + merchant)  │
└─────────────────────────┘       └──────────────────────────┘       └─────────────────────────┘
      generates events                Merchant object & bond              reads on-chain state
     (check-ins, promos,              state machine (slash /              renders trust badge &
     refund pileups, etc.)            challenge window / payout)          admin demo controls
```

### Components

1. **Sui Move Contract (`contracts/`)**
   - Source of truth for merchant registration, health score snapshots, staked bond balance, challenge window, and slash transitions.
2. **Simulator Service (`simulator/`)**
   - Generates simulated SaaS webhook events (check-ins, promotional spikes, refund surges) and calculates off-chain health scores for demo scenarios.
3. **React Frontend (`frontend/`)**
   - **Consumer View:** Embedded trust badge showing real-time health score, bond coverage, and status before package purchase.
   - **Merchant/Admin View:** Backstage control panel to trigger deterministic failure scenarios (e.g., 1Fit case study) and view state changes live.

---

## 📖 Documentation

- [01-PROPOSAL.md](file:///Users/hui/TrustLayer-Muba/docs/01-PROPOSAL.md): Core problem statement, why full escrow was rejected, and product positioning.
- [02-SPEC.md](file:///Users/hui/TrustLayer-Muba/docs/02-SPEC.md): Move contract specifications, event schemas, bond formulas, state machines, and demo scripts.
- [04-BUILD-PLAN.md](file:///Users/hui/TrustLayer-Muba/docs/04-BUILD-PLAN.md): Step-by-step hackathon execution plan.
