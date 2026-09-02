# TrustLayer-Muba Agent Guide

Read this file before changing the repository.

## Project scope

This repository implements the MUBA Hacks 2026 SME Trust Layer demo. It is a hackathon prototype, not a production financial system. The canonical product and contract requirements are:

- `docs/02-SPEC.md`
- `docs/04-BUILD-PLAN.md`
- `contracts/sme_trust_layer/README.md`

Do not introduce real third-party integrations, decentralized oracle infrastructure, a custom stablecoin, lending, credit scoring, or unrelated features unless the team explicitly changes the scope.

## Contract source of truth

- Move module: `contracts/sme_trust_layer/sources/merchant.move`
- Tests: `contracts/sme_trust_layer/tests/merchant_tests.move`
- Package manifest: `contracts/sme_trust_layer/Move.toml`
- Publication metadata: `contracts/sme_trust_layer/Published.toml`

Preserve the `Merchant` field layout and public interfaces unless all Simulator and frontend consumers are updated together. Never infer an interface from an older prompt; read the current Move source.

## Required verification

From `contracts/sme_trust_layer`, run:

```text
sui move test
sui move build
sui move lint
```

Do not report the contract as verified unless all three commands pass. Add a negative test for every authorization or timing guard.

## Security invariants

- Only the configured demo oracle can update scores, record check-ins, or initiate slashes.
- Only an `ACTIVE` merchant can enter `PENDING_SLASH`.
- Only the merchant owner can submit counter-evidence, and only before the deadline.
- Finalization must be impossible before the deadline.
- A slash must never exceed the available bond.
- A finalizer must never be able to select or redirect the payout recipient.
- Bond deposits must preserve their complete value.
- Every non-terminal demo state must have a defined exit.

## Demo-only settings

The current module deliberately contains replaceable demo configuration:

- Oracle: `@0xAD`
- Payout recipient: `@0xC0`
- Challenge window: 72 seconds
- Bond asset: native SUI
- Counter-evidence validation: any non-empty hash

Confirm the two addresses with the team before testnet deployment. Do not describe these controls as production-ready.

## Testnet status

The package metadata records a Day 1 testnet publication. The completed Day 2 contract has passed local verification but has not yet been upgraded or exercised on testnet. Do not claim otherwise, and do not publish or upgrade without explicit team approval and control of the recorded `UpgradeCap`.
