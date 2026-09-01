# SME Trust Layer — Proposal (v5, Pitch-Ready)
## MUBA Hacks 2026 · Sui Track 01 (Payments & Stablecoins)

---

## ⚠️ Internal Note (delete before sharing outside team)

This version narrows the positioning from "we prevent SME exit scams" to "we let trustworthy merchants prove it, and let the market sort the rest" — after concluding internally that:
- Merchants who genuinely intend to exit-scam are unlikely to be paying customers of Zenoti/Vagaro/Rezerv-class SaaS in the first place (these platforms cost money; a merchant planning to disappear has no reason to subscribe).
- **We do not have confirmation that True Fitness or 1Fit specifically used any SaaS platform we can integrate with.** The due diligence report confirmed Zenoti/Rezerv have *some* real Malaysian clients (Urban Retreat Spa, Number76) — it never linked those platforms to the True Fitness/1Fit case studies themselves. Do not imply in the pitch that our system would have caught those specific cases — use them only as *evidence the collapse pattern exists and has observable pre-signals*, not as case studies our system could have prevented.
- We do not claim to know what % of at-risk SMEs this covers, and should not invent a number if asked. See §7 for the honest answer.
- We will not claim government or consumer-body backing that doesn't exist yet — see §6 for what's real to say vs. not.

Everything below this line is the pitch-facing version.

---

## 1. Problem Statement

Malaysian service-sector SMEs (gyms, spas, education centres) run on a structurally fragile model:

- Prepaid packages/memberships account for **50–80% of monthly cash inflow** (industry benchmark).
- This creates a **negative working-capital cycle**: businesses collect years of future revenue upfront (e.g. RM8,000–9,000 lifetime gym memberships, RM2,500 annual passes) and spend it immediately on rent, capex, expansion — with no reserve.
- When growth slows, the only lever left is *more aggressive prepaid promotions* — which accelerates the eventual collapse rather than preventing it.
- When these businesses fail, they fail suddenly and totally: **True Fitness (2017)** shut all Malaysian outlets overnight, RM348,911 in confirmed losses across 90 complainants, ~10,000 members affected. **1Fit (2025)** repeated an identical "ad blitz → sudden shutdown → no refunds" playbook already used in Mexico and the UAE.
- Critically: **collapse patterns like these follow a 2-week to 3-month window of observable pre-signals** (equipment repair backlogs, staff wage arrears, promotional spikes) — but no channel surfaces them to consumers before they sign.

## 2. Why We Rejected Full Escrow (v1)

Original concept: lock 100% of consumer prepayment in a Sui Move contract, released to merchant on milestone/attendance basis.

Killed for three structural reasons:
1. **Adverse selection** — healthy merchants have no incentive to lock their own working capital; only high-risk/exit-scam merchants would tolerate it.
2. **Subjective fulfillment can't be verified on-chain** — service quality (e.g. "was the massage good") is not objectively adjudicable by smart contract logic.
3. **Regulatory exposure** — collecting and holding public funds with conditional disbursement risks classification as E-Money/Stored Value Facility under Malaysia's Financial Services Act 2013, requiring a BNM EMI/PSO license we don't have.

**Decision: keep the problem, discard the fund-custody mechanism entirely.**

## 3. Solution: Cross-Platform Merchant Fulfillment Trust Layer

**One-line positioning:**
> A neutral, cross-platform trust layer that lets merchants who want to prove they're trustworthy do so — with a tamper-resistant, cross-platform record no single SaaS platform or the merchant itself can quietly edit — surfaced to consumers at the exact moment they're most vulnerable to high-pressure upsell.

We do **not** touch consumer funds. We integrate with SaaS platforms merchants already use (Zenoti, Rezerv) via webhook/API, write tamper-resistant fulfillment records to Sui, and require merchants to stake a dynamic bond against their own fulfillment health score.

**Framing note for delivery**: we are not chasing every bad actor. We're building the infrastructure for good actors to differentiate themselves — and letting that differentiation become a market signal on its own. See §7 for exactly how far this goes and where it stops.

### 3.1 What goes on-chain vs. off-chain

| Layer | On-chain? | Rationale |
|---|---|---|
| Merchant fulfillment events (check-ins, complaints, refund requests) | **Yes** | Platform has fee-revenue conflict of interest in not making merchant health scores look bad — needs tamper resistance |
| Merchant bond stake / slash / release state machine | **Yes** | Rules must be publicly auditable and immutable once deployed |
| Health score calculation | No | Ordinary statistics — no consensus value, adds gas cost for nothing |
| Consumer-facing UI, platform data ingestion | No | Standard front/backend engineering |

### 3.2 Merchant Bond Mechanism

```
Required Bond = (Unredeemed prepaid revenue, trailing 30 days) × (100 − Health Score)%
```

- Absolute floor regardless of score (prevents a high-trust brand from ever approaching near-zero exposure — directly answers the "a trusted brand can still collapse" critique).
- Health score 95 → stake ~5% of exposure. Health score 60 → stake up to ~40%.
- Design goal stated explicitly: **this converts a total-loss event into a partial-loss event. It does not guarantee full consumer recovery.** We do not claim to solve this — only to mitigate it, maximally.

### 3.3 Triple Composite Trigger (v4 upgrade — replaces single refund-based trigger)

The original design relied solely on "refund requests pile up" as a trigger — vulnerable to a merchant that vanishes before consumers even get a chance to request refunds. v4 adds two independent paths, each mapped to a documented pattern in real collapse cases:

| Signal | Trigger condition | Pattern observed in |
|---|---|---|
| Attendance/check-in anomaly | Drops >30% vs. trailing 30-day baseline | True Fitness: equipment failures, member attrition pre-collapse |
| Maintenance/ticket stagnation | Repair tickets unresolved >14 days | True Fitness: equipment reported broken, unrepaired for months |
| Promotional spike alert | Discount rate + short-window sales volume both spike sharply | 1Fit: aggressive discounting 2–3 weeks pre-collapse — same playbook repeated in Mexico, UAE, then Malaysia |
| Disappearance (independent of refund requests) | Zero check-ins across entire merchant user base for N consecutive days | Catches "vanish before anyone can request a refund" scenario |

**Important framing distinction**: these cases demonstrate the *pattern* is real and observable — not that our specific data pipeline would have caught these specific companies. We have not confirmed what systems True Fitness or 1Fit actually ran on. Use these cases to establish "this kind of collapse leaves a trail" — not "we would have stopped this exact one."

### 3.4 Dispute / Anti-Gaming Layer

- Only verified paying accounts (matched to on-chain payment proof hash) can file a complaint — blocks external brigading.
- Complaint weight is deduplicated per unique account, not raw complaint count — blocks a small number of colluding accounts from inflating signal.
- **72-hour Challenge Window**: objective trigger conditions do not instantly slash. Contract enters `PENDING_SLASH`; merchant can submit counter-evidence (on-chain refund tx hash where possible) to reverse it within the window.
- Honest disclosure: for off-chain refunds (bank transfer), some human/oracle attestation is unavoidable. This is the *one* place a constrained human-review step exists — bounded by requiring matching bank reference + consumer confirmation, not unilateral platform discretion.

### 3.5 Platform Incentive Alignment & Cold-Start (reframed as a growth flywheel, not a dependency)

We do not wait for platform permission to start:

> "We're not asking Zenoti or Rezerv to hand us access before we can exist. Phase one runs on a standalone iPad self-attestation kiosk + consumer QR multi-sig confirmation — merchants can onboard directly, with zero platform involvement. That gets us real on-chain fulfillment data from day one. *That* data is our leverage when we go to a platform later: 'we already have N merchants and M verified fulfillment records — plug in your API and the network gets stronger for everyone already on it.' We don't need permission to start. We need traction to be worth partnering with."

Business model: B2B SaaS licensing fee to the platform (once partnered), billed by merchant count/API volume — not a per-transaction cut. In the meantime, merchant-side "verified trust badge" subscription is the near-term revenue path that doesn't depend on any platform deal closing first.

Acknowledged residual conflict (once a platform partnership exists): platforms who sell us this now have incentive to keep their merchant base "healthy-scored." Mitigation: **webhook non-delivery past an SLA window (48h) itself counts as a negative signal** — turns data suppression into a cost, not a benefit, for the platform.

### 3.6 Regulatory Positioning

- Consumer funds are never custodied by us — flows through merchant's existing payment rails, unchanged.
- Merchant bond stake is characterized as a **Performance Bond** (commercial contractual security deposit) under Malaysian commercial law, not a regulated Deposit under FSA 2013 §137, and not E-Money/SVF since no consumer value is stored or issued by us.
- **Framing for delivery**: *"We didn't build this and hope regulators don't notice. We designed the architecture to sit inside a Performance Bond structure from day one — that's not our finish line, that's the starting point for a real conversation with BNM's Fintech Sandbox or legal counsel. Most Web3 projects die from building first and asking forgiveness later. We're doing the opposite."*
- ⚠️ **Verification status (internal — do not say this part on stage)**: this legal characterization comes from AI-assisted due diligence, not verified primary legal sources. Confirm FSA 2013 §137 wording against the official Malaysian legislation portal before treating it as settled. If asked a question you can't back up with a verified source, use the fallback: *"our legal analysis points in this direction, pending formal legal opinion — that's next on our list, not something we're claiming is closed."*

### 3.6.1 Yield on Bonded Funds — Considered, Deliberately Not Implemented

We considered routing staked bonds into a yield-bearing protocol (e.g. NAVI, Suilend, Scallop) so merchants earn passive yield on locked collateral instead of treating it as dead capital. Deliberately excluded from both the demo and the near-term roadmap claim:

- **Regulatory**: our entire compliance position rests on "we never touch or manage consumer/merchant funds — we just hold a bond per fixed contract rules." Actively routing pooled funds into a lending protocol converts us into something closer to a fund manager taking investment decisions on third-party capital — this moves us *toward* the SVF/E-money-style scrutiny we structured the whole product to avoid, not away from it. It also introduces protocol/liquidation/depeg risk that a Performance Bond framing doesn't currently have to answer for.
- **Scope**: real DeFi protocol integration adds meaningful build complexity for a 5-day team, working against "Complete > Complexity."

**Pitch framing if asked**: *"We know locking capital has an opportunity cost for merchants — that's part of why the bond percentage is small and dynamic. Routing it into yield is a direction we've thought about, but it would push our compliance posture from 'Performance Bond' toward something closer to fund management, which needs its own licensing review. We chose to get the core trust mechanism right first rather than take on that risk before we've earned it."*

### 3.7 Integration Path

- **Zenoti**: has a Malaysian regional presence; reported local enterprise clients (Urban Retreat Spa Group, Number76 Hair Salon) — ⚠️ unverified, confirm before citing by name.
- **Rezerv**: reported Beta API access covering transaction data, class schedules, staff/location lists, bulk schedule updates; reported hardware-level integration with Igloohome smart locks (auto-generates door PIN on booking — turns "check-in" into a physical access record, not a software button press) — ⚠️ unverified, confirm before citing.
- **Vagaro / WellnessLiving**: low/no confirmed Malaysian penetration — deprioritized for MY market entry.
- **Cold-start path (fully within our control, no dependency)**: standalone iPad self-attestation kiosk + consumer QR multi-sig confirmation — this is Phase 1, not a fallback we're embarrassed about. Platform API integration is Phase 2, pursued *after* we have traction to offer in return.

## 4. What We Explicitly Do NOT Solve

Stated up front in the pitch, not extracted under cross-examination:

> "We do not eliminate fraud or platform collusion. We raise the cost of both and shrink the loss window from total to partial."

- Cannot fully cover a mass-exodus payout for a large chain (would require full escrow, which we already rejected as commercially unviable).
- Cannot force a platform to generate data it doesn't want to generate.
- Off-chain refund verification still requires a bounded human step.
- **We do not claim broad coverage of the "exit scam" population.** Merchants planning to disappear have little reason to be paying SaaS customers or to volunteer for a transparency badge. We are not trying to catch every bad actor — see §7.

## 5. Out of Scope (v1 / hackathon demo)

- Consumer fund custody or settlement (stays with merchant's existing licensed rails)
- Subjective service-quality judgment (aesthetics, teaching quality) — only objectively verifiable check-in/attendance-class events
- Real fiat on/off-ramp integration
- Credit scoring / lending features
- Any claim of government or consumer-body endorsement (see §6)

## 6. Government & Consumer-Body Positioning — What's Real to Say

**Do not say**: that a government body or consumer group will require, mandate, or has agreed to promote merchant adoption of this system. We have no such relationship, and a private startup does not have the standing to make platform-neutral certification mandatory — that's a legislative or regulatory decision, not something "convinced" into existence.

**Honest and usable framing:**
> "We're not seeking anyone's authority to make this mandatory. We believe that once enough merchants who want to be trusted start using a verified badge as a differentiator, the *absence* of that badge becomes the signal consumers notice — the market does the sorting, not us. Longer term, we'd like to explore partnerships with consumer protection bodies for credibility, or public-record data sources like SSM company-registry filings — but that's roadmap, not something we're claiming today."

## 7. What Percentage of the Real Problem Does This Actually Address? (Have This Answer Ready, Don't Wait to Be Asked)

State this proactively, don't wait to be cornered into it:

> "We're honest that this doesn't cover most of the exit-scam population — those merchants typically aren't paying for the SaaS systems we integrate with in the first place, and they have no incentive to opt into a transparency badge. What we *do* cover is a narrower, real slice: merchants who want to differentiate themselves as trustworthy, and mid-size or chain operators already running on digitized systems where operational decline — not premeditated fraud — is the more common failure mode. We're not claiming to solve SME exit scams broadly. We're building the piece of infrastructure that lets the honest side of that market prove itself, and letting that grow from there."

## 8. Judging Rubric Alignment

MUBA Hacks rubric: Product UX / Solves Real World Problem + Real World Readiness / Technical Implementation (Complete > Complexity) / Presentation.

- **Real World Readiness**: triple composite trigger + bond floor + SLA-based platform incentive fix + honest, bounded scope claim (§7) — this candor is itself evidence of "real builder" judgment, not a weakness to hide.
- **Complete > Complexity**: demo scope deliberately narrow (see spec doc) — full on-chain state machine, simulated webhook ingestion, working consumer-facing trust badge UI, live slash demo. No real third-party API integration attempted in the 5-day build.
- **Product UX**: dedicated workstream, not an afterthought (see spec doc §7).

## 9. Anticipated Judge Questions — One-Line Anchors

1. "Is the bond enough to cover losses?" → *"It prevents incremental loss, not historical stock loss — we don't claim otherwise."*
2. "How do you stop fake check-in data?" → *"Hardware door-lock integration + triple composite signal — faking now requires forging physical access records, not clicking a button."*
3. "Doesn't charging the SaaS platform reintroduce the conflict of interest?" → *"Non-delivery of webhook data past SLA is itself a negative signal — silence costs the platform, it doesn't help them."*
4. "Can you actually integrate with Rezerv/Zenoti?" → *"Rezerv has open Beta API access; demo uses simulated data to prove the logic — and we don't need that integration to start, we start on our own kiosk flow and bring traction to the negotiation."*
5. "Is this a regulated financial product?" → *"Merchants stake their own funds — legally a Performance Bond, not a Deposit or E-Money instrument — designed that way from day one, not retrofitted."*
6. "Would this have caught True Fitness or 1Fit?" → *"We can't claim that — we don't know what systems they ran on. What we can say is the collapse pattern they show is real and observable, and that's what our trigger logic is built around."*
7. "What % of the exit-scam problem does this actually solve?" → *"Honestly, not most of it — that population mostly isn't on the systems we integrate with. We solve a narrower, real problem: giving trustworthy merchants a way to prove it."*
