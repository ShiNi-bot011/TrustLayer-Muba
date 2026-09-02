# SME Trust Layer Sui Contract

This package is the on-chain component of the MUBA Hacks 2026 demo. It stores merchant trust state, holds a SUI performance bond, enforces the challenge/slash lifecycle, and emits events for the Simulator and Consumer View.

## Current status

- Day 1 registration and bond deposit: implemented.
- Day 2 health, check-in, challenge and slash lifecycle: implemented.
- Local verification with Sui 1.78.1: build, lint and 8 tests pass.
- Day 1 package version: published on testnet.
- Completed Day 2 version: not yet upgraded or tested on-chain.
- Production readiness: no; this is a deliberately simplified demo contract.

## Merchant lifecycle

```text
register -> deposit bond -> ACTIVE
ACTIVE -> initiate slash -> PENDING_SLASH
PENDING_SLASH -> valid counter-evidence -> ACTIVE
PENDING_SLASH -> deadline expires -> SLASHED + fixed consumer payout
```

The required bond is:

```text
max(trailing_30d_revenue * (100 - health_score) / 100, 500_000_000 MIST)
```

The pending slash is always capped at the bond actually held.

## Entry-function interfaces

These are the current interfaces that the Simulator and frontend must use:

```move
register_merchant(name: vector<u8>, initial_health_score: u64, ctx: &mut TxContext)

deposit_bond(merchant: &mut Merchant, payment: Coin<SUI>, ctx: &mut TxContext)

update_health_score(
    merchant: &mut Merchant,
    new_score: u64,
    trailing_30d_revenue: u64,
    clock: &Clock,
    ctx: &mut TxContext,
)

record_checkin(merchant: &mut Merchant, clock: &Clock, ctx: &mut TxContext)

initiate_slash(
    merchant: &mut Merchant,
    reason_code: u8,
    clock: &Clock,
    ctx: &mut TxContext,
)

submit_counter_evidence(
    merchant: &mut Merchant,
    evidence_tx_hash: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
)

finalize_slash(merchant: &mut Merchant, clock: &Clock, ctx: &mut TxContext)
```

Use Sui's shared `Clock` object at `0x6` for every `clock` argument. The finalizer does not provide a payout address; the contract fixes the demo destination so callers cannot redirect funds.

## Slash reason codes

| Code | Meaning |
|---:|---|
| 1 | Attendance anomaly |
| 2 | Ticket stagnation |
| 3 | Promotional spike |
| 4 | Disappearance |
| 5 | Refund pile-up |

## Events

The frontend or indexer can consume:

- `CheckinRecorded { merchant_id, timestamp_ms }`
- `HealthScoreUpdated { merchant_id, new_score }`
- `SlashInitiated { merchant_id, reason_code, amount, timestamp_ms }`
- `ChallengeAccepted { merchant_id, evidence_hash }`
- `SlashFinalized { merchant_id, amount_deducted }`

Registration and deposits also emit `MerchantRegistered` and `BondDeposited`.

## Demo configuration

| Setting | Current value |
|---|---|
| Authorized Simulator/oracle | `@0xAD` |
| Fixed consumer payout recipient | `@0xC0` |
| Demonstration challenge window | 72 seconds |
| Stated production challenge window | 72 hours |
| Bond asset | Native SUI |
| Evidence validation | Any non-empty hash |

The oracle and payout addresses are placeholders. Confirm and replace them before the Day 2 testnet upgrade.

## Verification

Run from this directory:

```text
sui move test
sui move build
sui move lint
```

The tests cover deposit preservation, bond formula/floor, slash capping, both lifecycle outcomes, oracle restriction, owner-only evidence, evidence expiry, early-finalization rejection, duplicate-slash rejection and payout-redirection prevention.

## Recorded Day 1 deployment

`Published.toml` currently records:

- Package ID: `0x6fcff68419d9540248d34f7bbe46ab12ad1f5905bb7f94f1d1fcb083f620efd1`
- Version: 1
- Upgrade capability: `0xfffbe8f2819df851505a4bc8be7d79d9df8d4e48370fe84b014d0189da741d92`

These values describe the earlier Day 1 deployment. They do not prove that the completed Day 2 code is live.
