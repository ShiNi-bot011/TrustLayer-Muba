# SME Trust Layer — Build Plan
(9/1 → 9/5 midnight)

MUBA Hacks 2026 · Sui Track 01 (Payments & Stablecoins)
Repo: https://github.com/ShiNi-bot011/TrustLayer-Muba.git

**v6 changes:** added an "AI build tips" block to each person's Day 1 section — how to actually use Claude Code (or another AI coding agent) for their specific piece, not generic advice. Also added the Sui MCP server setup as a Day 1 pre-task for Adam and Jiakai, and a shared "how we all use AI on this project" section (§0.5). Everything else carried over from v4 unchanged.

v4 changes: swapped Figma for Google Stitch (stitch.withgoogle.com) — free, no install, generates UI from text prompts and exports straight to HTML/React code, which saves Shi Ni frontend-building time vs. a static Figma mockup. Also added literal step-by-step "how to" instructions for Day 1, since that's what everyone acts on today. Days 2–5 "how to" steps will be added once Day 1's interfaces are locked (Adam's function signatures, Jiakai's event data shape) — writing exact steps for later days before those are fixed would just create instructions that don't match what actually got built.

## 1. What we're building (one paragraph, for anyone joining late)

Malaysian service-sector SMEs (gyms, spas, tuition centres) run 50–80% of cash flow on prepaid packages. When they collapse, it's sudden and total (True Fitness 2017, 1Fit 2025). We don't touch consumer funds. We record merchant fulfillment events (check-ins, complaints, refunds) and a dynamic bond stake on Sui — tamper-resistant because the SaaS platforms merchants use have a conflict of interest in keeping health scores looking good. A health score (calculated off-chain, submitted on-chain) drives a bond formula; low score = higher required bond. This turns a total-loss collapse into a partial-loss one. Full logic in /docs/01-PROPOSAL.md and /docs/02-SPEC.md in the repo — this build plan doesn't repeat the "why," only the "what to build" and "how."

## 2. The three components (SDD §1) — who owns what

```
┌─────────────────────┐      ┌──────────────────────┐
│ Simulator Service    │─────▶│ Sui Move Contract     │◀─
│ (fake SaaS webhook)  │      │ (on-chain state)      │
│ OWNER: Jiakai         │      │ OWNER: Adam           │
└─────────────────────┘      └──────────────────────┘
 generates events              reads on-chain state,
 + admin demo controls          enforces bond/slash logic

 Junquan: UI mockups via Google Stitch, video editing, and deck visuals
```

Interfaces to lock on Day 1 so nobody blocks anybody:
- Adam posts exact function signatures (register_merchant, update_health_score, record_checkin, initiate_slash, submit_counter_evidence, finalize_slash) — Jiakai and Shi Ni build against these with mocks until the real contract is deployed.
- Jiakai posts the event/data shape the Simulator will emit — Shi Ni's Consumer View can be built against mock Simulator output in parallel.

## 3. Repo structure

```
/contracts
  /sme_trust_layer
    Move.toml
    sources/merchant.move
    tests/merchant_tests.move
/simulator                          ← Jiakai
/frontend
  /src
    /views
      ConsumerView.tsx              ← Shi Ni (logic/wiring) + Junquan (styling)
      AdminControlPanel.tsx         ← Shi Ni
    /lib
      suiClient.ts                  ← Shi Ni
/docs
  01-PROPOSAL.md
  02-SPEC.md
  03-TEAM-ROLES.md
  04-BUILD-PLAN.md (this file)
/pitch
  deck/                             ← Shi Ni (content) + Junquan (visuals)
  video/                            ← Junquan (editing), Shi Ni (voiceover)
```

## 0.5 How we're all using AI on this build (read once, applies every day)

Everyone's using Claude Code (or a similar AI coding agent) to write most of the actual code this week. A few shared habits that make it faster instead of slower — don't skip this, it's the difference between AI saving you hours and AI creating bugs you don't understand under deadline pressure:

- **Feed it one section of the spec at a time, not the whole document.** The SDD (02-SPEC.md) is already split into numbered sections for exactly this reason (§0 says so explicitly). Paste only the section relevant to what you're building right now. An AI agent's output quality drops the more unrelated context you cram in — keep its "head" focused on one task.
- **Research → Plan → Implement, as separate steps, especially for the contract.** Ask it to first read/summarize what exists and confirm it understands the spec section, then propose a plan you can sanity-check in plain English, then implement. Don't let it jump straight to code on anything non-trivial — a wrong plan costs you a re-prompt; a wrong implementation costs your afternoon.
- **Get it real, current docs instead of letting it guess.** Sui/Move is less common in general AI training data than something like Solidity, so an agent working from memory alone will confidently produce outdated or wrong API calls. Use the Sui MCP server (setup below) or point it at docs.sui.io / sui.mcp.kapa.ai directly.
- **Verify, don't just trust.** Compile it, run it, test it, look at it (render the frontend, run the Move tests) before moving to the next piece. An agent that "looks confident" and an agent that's "actually correct" are not the same thing — especially on the contract, where a wrong state guard might not show up until Day 4's full demo run.
- **Ask it to explain the "why" in code comments as it goes.** The spec already calls for this in a few places (e.g. labeling the demo-mode timer override, labeling the single-admin "oracle" stub). This isn't just hygiene — those comments become your Day 5 judge-answer prep, already written.

**One-time setup (do this before writing any contract or simulator code):**
Give Claude Code the Sui MCP server so it reads live Sui docs instead of guessing:
`docs.sui.io/getting-started/sui-mcp-server` — about four lines of config. Adam and Jiakai should both do this first thing Day 1, before scaffolding anything.

## 4. Day 1 — 9/1 (today) — task + literal how-to

### Adam — Move contract scaffold

**Before you start coding:** set up the Sui MCP server per §0.5 above. Two minutes now saves you fighting outdated Move syntax later.

1. Confirm the Sui CLI is installed (`sui --version`). If not, install it — ping Sebastian if you get stuck.
2. `sui move new sme_trust_layer` — this scaffolds the package folder structure.
3. Open `sources/merchant.move` and copy the Merchant struct exactly as given in SDD §3.2 — don't rename fields.
4. Write `register_merchant(name, initial_health_score, ctx)` per the signature in SDD §3.2.
5. Write `deposit_bond(merchant, payment, ctx)` per the same section.
6. `sui client publish` to deploy to testnet — note the package ID it returns.
7. Manually call `register_merchant` once to confirm a Merchant object gets created successfully.
8. Post the package ID + these two function signatures to the team channel.

**AI build tips for Adam:**
- Paste SDD §3 into Claude Code as its own message — not the whole spec. Ask it to scaffold the `Move.toml` and the `Merchant` struct only, no function logic yet, and confirm it compiles before you ask for anything else.
- Do the six entry functions **one at a time**, each in its own prompt/session if you can — `register_merchant` and `deposit_bond` today, the rest on Day 2. Trying to get all six in one shot is where subtle state-machine bugs sneak in.
- After each function, ask it to write a matching test in `tests/merchant_tests.move` immediately — don't wait until "the contract is done" to start testing. Catching a broken guard today costs you ten minutes; catching it on Day 4 costs you the demo.
- When you get to Day 2's full function set, literally paste the §3.7 checklist and ask Claude Code to self-review its own output against every item, explaining the answer in a code comment. This is already the spec's intended workflow (SDD §0) — use it as a prompt verbatim.
- If Claude Code proposes something that doesn't match SDD §3.2's exact field names or function signatures, correct it and re-paste the relevant section — don't let it "improve" the interface Jiakai and Shi Ni are already building against.

### Jiakai — Simulator skeleton

**Before you start coding:** set up the Sui MCP server per §0.5 above — you'll need it once you start wiring to the real contract on Day 3.

1. Read SDD §4.1 and §4.2 fully before writing any code.
2. Create a `/simulator` folder. Pick Node/Express or Python/FastAPI — whichever you're faster in, don't overthink the choice.
3. Initialize the project (`npm init -y` or `python -m venv env`).
4. Write four stub functions that return hardcoded fake data for now (no real logic yet): `generateCheckin()`, `generateRefund()`, `generateMaintenanceTicket()`, `generatePromoEvent()`.
5. Shape each return value's fields per SDD §4.1 (merchant_id, timestamp, etc.).
6. Run each function once to confirm it executes without errors.
7. Post the JSON shape of all four to Shi Ni so she can build the frontend against it.

**AI build tips for Jiakai:**
- Paste SDD §4.1 and §4.2 together (they're both short and directly related) and ask Claude Code to generate all four stub functions in one go — this piece is low-risk, so batching is fine here, unlike Adam's contract work.
- Explicitly tell it "hardcoded fake data only, no real calculation logic yet" — otherwise it may try to get clever and jump ahead to §4.3's health-score math, which isn't due until Day 2.
- Ask it to print/log the exact JSON shape each function returns as part of the script output — that's what you're posting to Shi Ni, so having it auto-printed saves you writing it up by hand.
- When Day 2's health-score calculation (§4.3) comes around, tell Claude Code explicitly: "simple and deterministic, not sophisticated — it needs to reliably produce a score drop from ~90s to ~40s for the two demo scenarios, not be a real algorithm." Left unguided, an AI agent will often over-engineer a weighting system you don't need this week.

### Shi Ni — Frontend shell + deck outline

1. `npm create vite@latest frontend -- --template react`
2. `npm install @mysten/dapp-kit @mysten/sui`
3. In App.jsx, add dapp-kit's built-in ConnectButton component — it just needs to open the wallet popup today, doesn't need to fully connect yet.
4. Create `/docs/deck-content.md` and write the text (no layout) for the first 3 slides: the problem (True Fitness/1Fit), why it matters, and a one-paragraph version of the solution.

**AI build tips for Shi Ni:**
- For the Vite/dapp-kit scaffold, Claude Code is fast and reliable here — you can hand it steps 1–3 together as one prompt, this isn't contract-risk territory.
- Once Jiakai posts the Simulator's JSON shape and Junquan hands off Stitch screens/code, feed Claude Code both together when building ConsumerView.tsx — ask it to wire against the real shapes, not invent its own mock data, so you don't end up reconciling two different fake formats later.
- For the deck content (step 4), AI is useful for drafting/tightening prose, but keep the judge-facing "honesty" lines (§4, §7 of the proposal — "we don't eliminate fraud, we shrink the loss window") in your own words. Those are meant to sound like founder conviction in the room, not generated copy.
- When wiring on-chain reads later (Day 2–3), keep suiClient.ts in its own focused prompt/session — don't mix "read on-chain state" logic into the same session as UI styling work; it's easier to debug connection issues when they're isolated.

### Junquan — Google Stitch mockups + deck template

1. Go to stitch.withgoogle.com, sign in with your Google account.
2. Choose Standard mode (faster iteration than Experimental for a first draft).
3. First prompt: "Mobile-friendly consumer trust badge screen showing a merchant name, a large color-coded health score (0-100), a bond amount staked in RM, and a status badge that can show 'Verified' or 'Under Review'"
4. Refine with follow-up prompts in the chat panel, e.g. "make the health score number bigger and add a green-to-red gradient background based on score".
5. Once satisfied, generate the second screen: "Admin control panel with four buttons: Seed Healthy History, Trigger True Fitness Scenario, Trigger 1Fit Scenario, Submit Counter-Evidence — plus a live health score display"
6. Export: if Shi Ni wants to use generated code directly, export as React/HTML. If it's just a visual reference, a screenshot posted to the team channel is enough.
7. Separately (Stitch doesn't do slide decks): set up a deck color/font template in Google Slides or Canva, ready for Shi Ni's text to drop into once she sends it.

**AI build tips for Junquan:**
- Stitch works best with one clear visual ask per prompt — resist stacking multiple changes into one message ("make the score bigger AND add the gradient AND move the badge") since it's harder to tell which change caused a regression if the result looks worse.
- If you export React/HTML for Shi Ni, tell her which parts are placeholder (fake data, static states) vs. structural (layout, styling) — that's the difference between something she can wire live data into directly vs. something she has to partially rebuild.
- For the deck template, once Shi Ni's text lands, an AI slide/design tool can speed up formatting consistency (font sizes, spacing) — but keep the actual argument structure (what goes on which slide, in what order) as a human call between you two; that's pitch strategy, not a formatting task.

Checkpoints tonight (each person confirms their own):
- ☐ Adam: register_merchant deployed and callable on testnet
- ☐ Jiakai: all four Simulator stub functions run and return fake data
- ☐ Shi Ni: ConnectButton renders; 3-slide content draft written
- ☐ Junquan: both Stitch screens generated; deck template started

## 5. Day 2 — 9/2 — the critical day for Adam

| Person | Task |
|---|---|
| Adam | Implement update_health_score (oracle-restricted), record_checkin, initiate_slash (reason codes §3.4), submit_counter_evidence (72h window + demo-mode override), finalize_slash; bond formula + ABSOLUTE_FLOOR (§3.3); all 5 Sui events (§3.6); run full §3.7 checklist, fix everything that fails |
| Jiakai | Finish all four event generators with real fake-data generation incl. bulk "simulate 30 days" button; implement health score calculation (§4.3), weights tuned so True Fitness / 1Fit scenarios drop score ~90s → ~40s; mock the contract call for now if Adam isn't done |
| Shi Ni | Wire wallet-connect to on-chain reads (mock data if contract isn't ready); write full text content for remaining deck slides (commercial viability, real-world readiness, judge Q&A) — text only |
| Junquan | Finalize both Stitch screens, hand assets/code to Shi Ni; take Shi Ni's deck text and build it into actual slide visuals |

§3.7 checklist — Adam self-reviews, explains each in code comments:
- ☐ initiate_slash blocked if already PENDING_SLASH or SLASHED
- ☐ finalize_slash blocked before challenge window expires
- ☐ submit_counter_evidence blocked after window expires / for non-owners
- ☐ update_health_score restricted to oracle address only
- ☐ pending_slash_amount capped at bond_balance
- ☐ Every state has a valid exit (ACTIVE → PENDING_SLASH → {SLASHED, CHALLENGED_OK} → ACTIVE)
- ☐ deposit_bond merges Coin<SUI> into Balance<SUI> without leaking value

Checkpoints tonight:
- ☐ Adam: contract fully implemented, full §3.7 checklist passing — flag immediately if not done, don't sit on it overnight
- ☐ Jiakai: all four event generators + health score calc working (against mock contract if needed)
- ☐ Shi Ni: on-chain read wiring works with mock data; all deck slide text finished and handed to Junquan
- ☐ Junquan: Stitch assets handed off; deck slides through Problem/Why/How visually built

Detailed step-by-step "how to" for Day 2 will be added once Day 1's outputs (Adam's live function signatures, Jiakai's real event shapes) are confirmed — so the steps match what's actually deployed, not what was planned.

## 6. Day 3 — 9/3

| Person | Task |
|---|---|
| Adam | Support Jiakai + Shi Ni wiring to the deployed contract; fix integration issues; hand off final package ID if anything changed |
| Jiakai | Wire Simulator's health score output to call update_health_score on the real deployed contract; build Demo Control Panel (§4.2): "Seed healthy history", "Trigger True Fitness scenario", "Trigger 1Fit scenario", "Submit counter-evidence" buttons |
| Shi Ni | Build Consumer View core data binding (§5.1) to real on-chain state: merchant name, bond staked, health score value, status field — logic and wiring only |
| Junquan | Implement the specific UI pieces from §5.1 on Shi Ni's Consumer View shell: health score color gradient, "⚠ Under review" status badge styling, bond amount formatting; continue deck visuals for remaining slides |

Checkpoints tonight:
- ☐ Adam: any integration bugs from Jiakai/Shi Ni resolved same-day
- ☐ Jiakai: clicking a control panel button updates health score on-chain
- ☐ Shi Ni: Consumer View pulls and displays real on-chain data (unstyled is OK)
- ☐ Junquan: color gradient + status badge + bond formatting implemented and merged; deck ~80% visually built

## 7. Day 4 — 9/4

| Person | Task |
|---|---|
| All | Run the full demo script (SDD §6) end-to-end together at least once |
| Adam | Bug fixes only — no new features |
| Jiakai | Bug fixes only — no new features |
| Shi Ni | Build Admin/Merchant View (§5.2) if not already functional; finalize judge Q&A talking points |
| Junquan | Finish deck visuals completely; build the video storyboard/shot list so Day 5 recording is fast, not improvised |

Checkpoints tonight:
- ☐ Adam: contract steps of the demo script run reliably, no crashes
- ☐ Jiakai: simulator trigger steps of the demo script run reliably
- ☐ Shi Ni: Admin View functional; judge Q&A content finalized
- ☐ Junquan: deck 100% visually done; video storyboard ready to shoot

## 8. Day 5 — 9/5 (submission night)

| Person | Task |
|---|---|
| Adam | Critical-path bug fixes only |
| Jiakai | Critical-path bug fixes only |
| Shi Ni | Record voiceover/narration content for demo video; verify ⚠ unconfirmed facts (named Zenoti/Rezerv clients, FSA 2013 §137 — use if confirmed, else fallback phrasing from proposal §3.6); own judge questions 1 and 2 below |
| Junquan | Edit and export the 2–3 min demo video using Day 4's storyboard + Shi Ni's voiceover; own judge question 3 below |
| All | Full rehearsal per SDD §6 script, timed, at least twice; final submit |

Checkpoints tonight:
- ☐ Adam: passes final full rehearsal with no contract-side errors
- ☐ Jiakai: passes final full rehearsal with no simulator-side errors
- ☐ Shi Ni: voiceover recorded; unconfirmed facts verified or downgraded; can answer Q1–Q2 without notes
- ☐ Junquan: video exported and playable; can answer Q3 without notes
- ☐ All: submission complete before deadline

## 9. The 5 judge questions — split across the team

| Question | One-line anchor | Owner |
|---|---|---|
| "Is the bond enough to cover losses?" | "It prevents incremental loss, not historical stock loss — we don't claim otherwise." | Shi Ni |
| "How do you stop fake check-in data?" | "Hardware door-lock integration + triple composite signal — faking now requires forging physical access records, not clicking a button." | Adam |
| "Doesn't charging the SaaS platform reintroduce the conflict of interest?" | "Non-delivery of webhook data past SLA is itself a negative signal — silence costs the platform, it doesn't help them." | Shi Ni |
| "Can you actually integrate with Rezerv/Zenoti?" | "Rezerv has open Beta API access; demo uses simulated data to prove the logic, production requires a partner integration process." | Jiakai |
| "Is this a regulated financial product?" | "Merchants stake their own funds — legally a Performance Bond, not a Deposit or E-Money instrument." | Junquan |

## 10. Hard constant: the one thing that can't slip

Day 2 night — Adam's contract must be fully working and pass the full §3.7 checklist. Jiakai's Simulator (Day 3) and Shi Ni's frontend integration (Day 3–4) both depend on calling the real deployed contract. If Adam hits a wall, ping Sebastian immediately — don't wait until Day 3 to discover it's blocking everyone else.

## 11. Explicit non-goals (SDD §7) — don't let scope creep in

- No real integration with Zenoti, Rezerv, or any actual third-party API — Simulator only
- No real fiat on/off-ramp or stablecoin issuance — use native SUI
- No subjective quality scoring — only the objective event types in §3.4/§4.1
- No credit-scoring or lending features
- No mobile-responsive frontend
- No production-grade oracle decentralization — a single demo/admin address as "oracle" is fine, label it as such in code
- No AI/LLM component of any kind — not in the proposal or spec
