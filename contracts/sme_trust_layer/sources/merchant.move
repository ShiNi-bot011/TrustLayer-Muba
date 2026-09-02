#[allow(lint(public_entry), unused_const)]
module sme_trust_layer::merchant;

use std::string::{Self, String};
use sui::balance::{Self, Balance};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;

// Replace these demo settings with governed configuration before production.
// DEMO_ORACLE: your Sui CLI active address on testnet (sui client active-address).
// Production must replace with a governed, decentralized oracle address.
const DEMO_ORACLE: address = @0xa32b2a83afd2dc19c759d7b7db1f7c23a4abecd02279cb6cf7d73dbc74516210;
/// Fixed demo payout destination. Production must replace this with a governed payout pool.
// Using DEMO_ORACLE address as payout recipient for simplicity in the hackathon demo.
const DEMO_PAYOUT_RECIPIENT: address = @0xa32b2a83afd2dc19c759d7b7db1f7c23a4abecd02279cb6cf7d73dbc74516210;
const CHALLENGE_WINDOW_MS: u64 = 259_200_000; // Production: 72 hours.
const DEMO_CHALLENGE_WINDOW_MS: u64 = 72_000; // Demo: 72 seconds.
const ABSOLUTE_FLOOR: u64 = 500_000_000; // 0.5 SUI in MIST.

const STATUS_ACTIVE: u8 = 0;
const STATUS_PENDING_SLASH: u8 = 1;
const STATUS_SLASHED: u8 = 2;
const STATUS_CHALLENGED_OK: u8 = 3;
const REASON_ATTENDANCE_ANOMALY: u8 = 1;
const REASON_TICKET_STAGNATION: u8 = 2;
const REASON_PROMO_SPIKE: u8 = 3;
const REASON_DISAPPEARANCE: u8 = 4;
const REASON_REFUND_PILEUP: u8 = 5;

const EZeroDeposit: u64 = 1;
const EInvalidHealthScore: u64 = 2;
const ENotOracle: u64 = 3;
const EInvalidStatus: u64 = 4;
const EInvalidReasonCode: u64 = 5;
const ENotMerchantOwner: u64 = 6;
const EChallengeWindowExpired: u64 = 7;
const EChallengeWindowOpen: u64 = 8;
const EEmptyEvidence: u64 = 9;

public struct Merchant has key, store {
    id: UID, owner: address, name: String, health_score: u64,
    bond_balance: Balance<SUI>, trailing_30d_prepaid_revenue: u64,
    status: u8, pending_slash_amount: u64,
    pending_slash_started_at_ms: u64, last_checkin_event_ms: u64,
}

public struct MerchantRegistered has copy, drop { merchant_id: ID, owner: address, name: String, initial_health_score: u64 }
public struct BondDeposited has copy, drop { merchant_id: ID, amount: u64, new_bond_balance: u64 }
public struct CheckinRecorded has copy, drop { merchant_id: ID, timestamp_ms: u64 }
public struct HealthScoreUpdated has copy, drop { merchant_id: ID, new_score: u64 }
public struct SlashInitiated has copy, drop { merchant_id: ID, reason_code: u8, amount: u64, timestamp_ms: u64 }
public struct SlashFinalized has copy, drop { merchant_id: ID, amount_deducted: u64 }
public struct ChallengeAccepted has copy, drop { merchant_id: ID, evidence_hash: vector<u8> }

public entry fun register_merchant(name: vector<u8>, initial_health_score: u64, ctx: &mut TxContext) {
    assert!(initial_health_score <= 100, EInvalidHealthScore);
    let id = object::new(ctx); let merchant_id = object::uid_to_inner(&id);
    let owner = ctx.sender(); let name = string::utf8(name);
    let merchant = Merchant { id, owner, name, health_score: initial_health_score,
        bond_balance: balance::zero<SUI>(), trailing_30d_prepaid_revenue: 0,
        status: STATUS_ACTIVE, pending_slash_amount: 0,
        pending_slash_started_at_ms: 0, last_checkin_event_ms: 0 };
    event::emit(MerchantRegistered { merchant_id, owner, name, initial_health_score });
    transfer::share_object(merchant);
}

/// Section 3.7: converting and joining the complete coin balance cannot leak value.
public entry fun deposit_bond(merchant: &mut Merchant, payment: Coin<SUI>, _ctx: &mut TxContext) {
    let amount = coin::value(&payment); assert!(amount > 0, EZeroDeposit);
    balance::join(&mut merchant.bond_balance, coin::into_balance(payment));
    event::emit(BondDeposited { merchant_id: object::uid_to_inner(&merchant.id), amount,
        new_bond_balance: balance::value(&merchant.bond_balance) });
}

public entry fun update_health_score(merchant: &mut Merchant, new_score: u64,
    trailing_30d_revenue: u64, _clock: &Clock, ctx: &mut TxContext) {
    assert_oracle(ctx); assert!(new_score <= 100, EInvalidHealthScore);
    merchant.health_score = new_score; merchant.trailing_30d_prepaid_revenue = trailing_30d_revenue;
    event::emit(HealthScoreUpdated { merchant_id: object::uid_to_inner(&merchant.id), new_score });
}

public entry fun record_checkin(merchant: &mut Merchant, clock: &Clock, ctx: &mut TxContext) {
    assert_oracle(ctx); let timestamp_ms = clock::timestamp_ms(clock);
    merchant.last_checkin_event_ms = timestamp_ms;
    event::emit(CheckinRecorded { merchant_id: object::uid_to_inner(&merchant.id), timestamp_ms });
}

/// Only ACTIVE merchants enter PENDING_SLASH; pending/finalized cases cannot be overwritten.
public entry fun initiate_slash(merchant: &mut Merchant, reason_code: u8,
    clock: &Clock, ctx: &mut TxContext) {
    assert_oracle(ctx); assert!(merchant.status == STATUS_ACTIVE, EInvalidStatus);
    assert!(reason_code >= REASON_ATTENDANCE_ANOMALY && reason_code <= REASON_REFUND_PILEUP, EInvalidReasonCode);
    let calculated = required_bond(merchant.trailing_30d_prepaid_revenue, merchant.health_score);
    // Section 3.7: never promise more than the bond actually holds.
    let amount = min(calculated, balance::value(&merchant.bond_balance));
    let timestamp_ms = clock::timestamp_ms(clock);
    merchant.pending_slash_amount = amount; merchant.pending_slash_started_at_ms = timestamp_ms;
    merchant.status = STATUS_PENDING_SLASH;
    event::emit(SlashInitiated { merchant_id: object::uid_to_inner(&merchant.id), reason_code, amount, timestamp_ms });
}

/// Demo stub: any non-empty evidence hash is accepted; production must validate the referenced transaction.
public entry fun submit_counter_evidence(merchant: &mut Merchant, evidence_tx_hash: vector<u8>,
    clock: &Clock, ctx: &mut TxContext) {
    assert!(merchant.status == STATUS_PENDING_SLASH, EInvalidStatus);
    assert!(ctx.sender() == merchant.owner, ENotMerchantOwner);
    assert!(!evidence_tx_hash.is_empty(), EEmptyEvidence);
    assert!(clock::timestamp_ms(clock) - merchant.pending_slash_started_at_ms <= DEMO_CHALLENGE_WINDOW_MS, EChallengeWindowExpired);
    merchant.status = STATUS_CHALLENGED_OK; merchant.pending_slash_amount = 0;
    merchant.pending_slash_started_at_ms = 0;
    event::emit(ChallengeAccepted { merchant_id: object::uid_to_inner(&merchant.id), evidence_hash: evidence_tx_hash });
    // Immediate CHALLENGED_OK -> ACTIVE gives every demo state a valid exit.
    merchant.status = STATUS_ACTIVE;
}

/// Anyone may finalize, but the caller cannot choose or redirect the payout destination.
/// Production should replace this fixed demo address with a governed payout pool.
public entry fun finalize_slash(merchant: &mut Merchant, clock: &Clock, ctx: &mut TxContext) {
    assert!(merchant.status == STATUS_PENDING_SLASH, EInvalidStatus);
    assert!(clock::timestamp_ms(clock) - merchant.pending_slash_started_at_ms > DEMO_CHALLENGE_WINDOW_MS, EChallengeWindowOpen);
    let amount = min(merchant.pending_slash_amount, balance::value(&merchant.bond_balance));
    if (amount > 0) transfer::public_transfer(
        coin::from_balance(balance::split(&mut merchant.bond_balance, amount), ctx),
        DEMO_PAYOUT_RECIPIENT,
    );
    merchant.pending_slash_amount = 0; merchant.pending_slash_started_at_ms = 0; merchant.status = STATUS_SLASHED;
    event::emit(SlashFinalized { merchant_id: object::uid_to_inner(&merchant.id), amount_deducted: amount });
}

    use std::u64::{min, max};

    public fun required_bond(revenue: u64, score: u64): u64 {
        assert!(score <= 100, EInvalidHealthScore); let risk = 100 - score;
        max((revenue / 100) * risk + ((revenue % 100) * risk) / 100, ABSOLUTE_FLOOR)
    }
    fun assert_oracle(ctx: &TxContext) { assert!(ctx.sender() == DEMO_ORACLE, ENotOracle); }

public fun demo_oracle(): address { DEMO_ORACLE }
public fun demo_payout_recipient(): address { DEMO_PAYOUT_RECIPIENT }
public fun challenge_window_ms(): u64 { CHALLENGE_WINDOW_MS }
public fun demo_challenge_window_ms(): u64 { DEMO_CHALLENGE_WINDOW_MS }
public fun absolute_floor(): u64 { ABSOLUTE_FLOOR }
public fun status_active(): u8 { STATUS_ACTIVE }
public fun status_pending_slash(): u8 { STATUS_PENDING_SLASH }
public fun status_slashed(): u8 { STATUS_SLASHED }
public fun status_challenged_ok(): u8 { STATUS_CHALLENGED_OK }
public fun reason_disappearance(): u8 { REASON_DISAPPEARANCE }
public fun reason_refund_pileup(): u8 { REASON_REFUND_PILEUP }
public fun health_score(m: &Merchant): u64 { m.health_score }
public fun bond_balance(m: &Merchant): u64 { balance::value(&m.bond_balance) }
public fun status(m: &Merchant): u8 { m.status }
public fun owner(m: &Merchant): address { m.owner }
public fun name(m: &Merchant): String { m.name }
public fun trailing_30d_prepaid_revenue(m: &Merchant): u64 { m.trailing_30d_prepaid_revenue }
public fun pending_slash_amount(m: &Merchant): u64 { m.pending_slash_amount }
public fun pending_slash_started_at_ms(m: &Merchant): u64 { m.pending_slash_started_at_ms }
public fun last_checkin_event_ms(m: &Merchant): u64 { m.last_checkin_event_ms }
