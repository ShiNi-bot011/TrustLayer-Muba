# SME Trust Layer: Pitch Deck Content

## Slide 1: Title
**Headline:** SME Trust Layer
**Sub-headline:** Zero-Friction On-Chain Solvency for Physical Retail
**Key Visual/Action:** (Sui Logo + TrustLayer Badge)

## Slide 2: The Problem (The Malaysian Retail Context)
**Headline:** The Prepaid Liquidity Trap
**Talking Points:**
- Gyms, spas, and education centers rely on prepaid packages for cash flow.
- This creates a negative working-capital cycle with zero reserve capital.
- When macroeconomic conditions tighten, they offer deep discounts to survive.
- **The Result:** Sudden collapses (True Fitness 2017, 1Fit 2025) leaving consumers with massive, unrecoverable losses.

## Slide 3: The Traditional Web3 Failure
**Headline:** Why Blockchain Has Failed Consumer Retail
**Talking Points:**
- Complex key management (seed phrases) guarantees user attrition.
- Gas fees and network latency destroy the premium SaaS experience.
- Traditional full-escrow smart contracts face intense regulatory friction (classified as e-money by Bank Negara Malaysia).

## Slide 4: The Solution (SME Trust Layer)
**Headline:** A Deterministic Performance Bond—Not a Regulated Deposit
**Talking Points:**
- **Dynamic On-Chain Bond:** Required collateral dynamically scales based on a merchant's trailing revenue and real-time health score.
- **Off-Chain Webhook Oracle:** Integrates with existing SaaS platforms (Zenoti/Rezerv). Anomalous check-in drops or unresolved tickets trigger a penalty.
- **72-Hour Challenge Window:** A deterministic "Hot Potato" pattern ensures fairness and prevents immediate malicious slashing.

## Slide 5: Zero-Friction Architecture (Sui Overflow Playbook)
**Headline:** Invisible Blockchain Infrastructure
**Talking Points:**
- **zkLogin:** Single-Sign-On onboarding (Google Workspace) for merchants. No wallets. No seed phrases.
- **Sponsored PTBs:** Gasless administrative operations batched into single, atomic transactions via Gas Station APIs.
- **Optimistic UI:** Masking the 400ms Mysticeti consensus latency to deliver instantaneous Web2 responsiveness.
- **Object Display V2:** Transforming raw `bond_balance` integers into human-readable Trust Badges at checkout.

## Slide 6: Real-World Readiness
**Headline:** Built for the Bank Negara Regulatory Sandbox
**Talking Points:**
- We do not hold consumer funds; payment flows remain on licensed fiat rails.
- The staked collateral is strictly a commercial Performance Bond.
- Aligns perfectly with BNM Sandbox mandates for consumer protection and financial crime controls.
- **Go-to-Market Strategy:** Rapid integration into the Malaysian service-sector ecosystem with zero crypto friction for the end-consumer.
