#[allow(lint(public_entry), unused_const)]
module sme_trust_layer::merchant;

use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};
use sui::sui::SUI;
use sui::event;
use std::string::{Self, String};

// --- Status enum / constants (SDD §2) ---
const STATUS_ACTIVE: u8 = 0;
const STATUS_PENDING_SLASH: u8 = 1;
const STATUS_SLASHED: u8 = 2;
const STATUS_CHALLENGED_OK: u8 = 3;

// --- Error Codes ---
const EZeroDeposit: u64 = 1;
const EInvalidHealthScore: u64 = 2;

// --- Core Merchant Object (SDD §2) ---
public struct Merchant has key, store {
    id: UID,
    owner: address,
    name: String,
    health_score: u64,
    bond_balance: Balance<SUI>,
    trailing_30d_prepaid_revenue: u64,
    status: u8,
    pending_slash_amount: u64,
    pending_slash_started_at_ms: u64,
    last_checkin_event_ms: u64,
}

// --- Events (SDD §3.6) ---
public struct MerchantRegistered has copy, drop {
    merchant_id: ID,
    owner: address,
    name: String,
    initial_health_score: u64,
}

public struct BondDeposited has copy, drop {
    merchant_id: ID,
    amount: u64,
    new_bond_balance: u64,
}

// --- Entry Functions (SDD §3.2) ---

/// Create a new merchant object, called once per merchant onboarding.
/// Shared object so that the merchant, oracles, and consumers can interact with or observe it.
public entry fun register_merchant(
    name: vector<u8>,
    initial_health_score: u64,
    ctx: &mut TxContext
) {
    assert!(initial_health_score <= 100, EInvalidHealthScore);
    let merchant_uid = object::new(ctx);
    let merchant_id = object::uid_to_inner(&merchant_uid);
    let owner_addr = ctx.sender();
    let name_str = string::utf8(name);

    let merchant = Merchant {
        id: merchant_uid,
        owner: owner_addr,
        name: name_str,
        health_score: initial_health_score,
        bond_balance: balance::zero<SUI>(),
        trailing_30d_prepaid_revenue: 0,
        status: STATUS_ACTIVE,
        pending_slash_amount: 0,
        pending_slash_started_at_ms: 0,
        last_checkin_event_ms: 0,
    };

    event::emit(MerchantRegistered {
        merchant_id,
        owner: owner_addr,
        name: name_str,
        initial_health_score,
    });

    transfer::share_object(merchant);
}

/// Merchant deposits/tops up bond into their Merchant object.
public entry fun deposit_bond(
    merchant: &mut Merchant,
    payment: Coin<SUI>,
    _ctx: &mut TxContext
) {
    let deposit_amount = coin::value(&payment);
    assert!(deposit_amount > 0, EZeroDeposit);

    let payment_balance = coin::into_balance(payment);
    balance::join(&mut merchant.bond_balance, payment_balance);

    event::emit(BondDeposited {
        merchant_id: object::uid_to_inner(&merchant.id),
        amount: deposit_amount,
        new_bond_balance: balance::value(&merchant.bond_balance),
    });
}

// --- Getter / View Functions ---

public fun status_active(): u8 { STATUS_ACTIVE }
public fun status_pending_slash(): u8 { STATUS_PENDING_SLASH }
public fun status_slashed(): u8 { STATUS_SLASHED }
public fun status_challenged_ok(): u8 { STATUS_CHALLENGED_OK }

public fun health_score(merchant: &Merchant): u64 {
    merchant.health_score
}

public fun bond_balance(merchant: &Merchant): u64 {
    balance::value(&merchant.bond_balance)
}

public fun status(merchant: &Merchant): u8 {
    merchant.status
}

public fun owner(merchant: &Merchant): address {
    merchant.owner
}

public fun name(merchant: &Merchant): String {
    merchant.name
}

public fun trailing_30d_prepaid_revenue(merchant: &Merchant): u64 {
    merchant.trailing_30d_prepaid_revenue
}

public fun pending_slash_amount(merchant: &Merchant): u64 {
    merchant.pending_slash_amount
}
