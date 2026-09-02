#[test_only]
module sme_trust_layer::merchant_tests;

use sme_trust_layer::merchant::{Self, Merchant};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario::{Self as ts};

const ORACLE: address = @0xAD;
const OWNER: address = @0xB0B;
const CONSUMER: address = @0xC0;
const ATTACKER: address = @0xBAD;

fun setup(s: &mut ts::Scenario, bond: u64) {
    ts::next_tx(s, OWNER); merchant::register_merchant(b"Urban Retreat Spa", 95, ts::ctx(s));
    ts::next_tx(s, OWNER); let mut m = ts::take_shared<Merchant>(s);
    merchant::deposit_bond(&mut m, coin::mint_for_testing<SUI>(bond, ts::ctx(s)), ts::ctx(s));
    ts::return_shared(m);
    ts::next_tx(s, @0x0); clock::share_for_testing(clock::create_for_testing(ts::ctx(s)));
}

fun initiate(s: &mut ts::Scenario) {
    ts::next_tx(s, ORACLE); let mut m = ts::take_shared<Merchant>(s); let c = ts::take_shared<Clock>(s);
    merchant::update_health_score(&mut m, 40, 4_000_000_000, &c, ts::ctx(s));
    merchant::record_checkin(&mut m, &c, ts::ctx(s));
    merchant::initiate_slash(&mut m, merchant::reason_refund_pileup(), &c, ts::ctx(s));
    ts::return_shared(c); ts::return_shared(m);
}

#[test]
fun formula_deposit_and_cap() {
    assert!(merchant::required_bond(10_000_000_000, 80) == 2_000_000_000, 0);
    assert!(merchant::required_bond(10_000_000_000, 100) == merchant::absolute_floor(), 1);
    let mut s = ts::begin(OWNER); setup(&mut s, 1_000_000_000);
    ts::next_tx(&mut s, OWNER); let mut m = ts::take_shared<Merchant>(&s);
    merchant::deposit_bond(&mut m, coin::mint_for_testing<SUI>(250_000_000, ts::ctx(&mut s)), ts::ctx(&mut s));
    assert!(merchant::bond_balance(&m) == 1_250_000_000, 2); ts::return_shared(m);
    initiate(&mut s); ts::next_tx(&mut s, OWNER); let m = ts::take_shared<Merchant>(&s);
    assert!(merchant::pending_slash_amount(&m) == 1_250_000_000, 3); ts::return_shared(m); ts::end(s);
}

#[test]
fun counter_evidence_returns_active() {
    let mut s = ts::begin(OWNER); setup(&mut s, 2_000_000_000); initiate(&mut s);
    ts::next_tx(&mut s, OWNER); let mut m = ts::take_shared<Merchant>(&s); let c = ts::take_shared<Clock>(&s);
    merchant::submit_counter_evidence(&mut m, b"refund-tx", &c, ts::ctx(&mut s));
    assert!(merchant::status(&m) == merchant::status_active(), 0);
    assert!(merchant::pending_slash_amount(&m) == 0, 1);
    ts::return_shared(c); ts::return_shared(m); ts::end(s);
}

#[test]
fun finalize_cannot_redirect_payout() {
    let mut s = ts::begin(OWNER); setup(&mut s, 1_000_000_000); initiate(&mut s);
    ts::next_tx(&mut s, ORACLE); let mut c = ts::take_shared<Clock>(&s);
    clock::increment_for_testing(&mut c, merchant::demo_challenge_window_ms() + 1); ts::return_shared(c);
    // An arbitrary attacker is allowed to finalize, but cannot select themselves as recipient.
    ts::next_tx(&mut s, ATTACKER); let mut m = ts::take_shared<Merchant>(&s); let c = ts::take_shared<Clock>(&s);
    merchant::finalize_slash(&mut m, &c, ts::ctx(&mut s));
    assert!(merchant::status(&m) == merchant::status_slashed(), 0);
    assert!(merchant::bond_balance(&m) == 0, 1); ts::return_shared(c); ts::return_shared(m);
    ts::next_tx(&mut s, CONSUMER); let payout = ts::take_from_sender<Coin<SUI>>(&s);
    assert!(coin::value(&payout) == 1_000_000_000, 2); coin::burn_for_testing(payout); ts::end(s);
}

#[test] #[expected_failure(abort_code = 3)]
fun blocks_merchant_self_scoring() {
    let mut s = ts::begin(OWNER); setup(&mut s, 1); ts::next_tx(&mut s, OWNER);
    let mut m = ts::take_shared<Merchant>(&s); let c = ts::take_shared<Clock>(&s);
    merchant::update_health_score(&mut m, 100, 0, &c, ts::ctx(&mut s)); ts::return_shared(c); ts::return_shared(m); ts::end(s);
}

#[test] #[expected_failure(abort_code = 4)]
fun blocks_second_slash() {
    let mut s = ts::begin(OWNER); setup(&mut s, 1); initiate(&mut s); ts::next_tx(&mut s, ORACLE);
    let mut m = ts::take_shared<Merchant>(&s); let c = ts::take_shared<Clock>(&s);
    merchant::initiate_slash(&mut m, 5, &c, ts::ctx(&mut s)); ts::return_shared(c); ts::return_shared(m); ts::end(s);
}

#[test] #[expected_failure(abort_code = 6)]
fun blocks_non_owner_evidence() {
    let mut s = ts::begin(OWNER); setup(&mut s, 1); initiate(&mut s); ts::next_tx(&mut s, CONSUMER);
    let mut m = ts::take_shared<Merchant>(&s); let c = ts::take_shared<Clock>(&s);
    merchant::submit_counter_evidence(&mut m, b"fake", &c, ts::ctx(&mut s)); ts::return_shared(c); ts::return_shared(m); ts::end(s);
}

#[test] #[expected_failure(abort_code = 7)]
fun blocks_late_evidence() {
    let mut s = ts::begin(OWNER); setup(&mut s, 1); initiate(&mut s); ts::next_tx(&mut s, ORACLE);
    let mut c = ts::take_shared<Clock>(&s); clock::increment_for_testing(&mut c, merchant::demo_challenge_window_ms() + 1); ts::return_shared(c);
    ts::next_tx(&mut s, OWNER); let mut m = ts::take_shared<Merchant>(&s); let c = ts::take_shared<Clock>(&s);
    merchant::submit_counter_evidence(&mut m, b"late", &c, ts::ctx(&mut s)); ts::return_shared(c); ts::return_shared(m); ts::end(s);
}

#[test] #[expected_failure(abort_code = 8)]
fun blocks_early_finalize() {
    let mut s = ts::begin(OWNER); setup(&mut s, 1); initiate(&mut s); ts::next_tx(&mut s, CONSUMER);
    let mut m = ts::take_shared<Merchant>(&s); let c = ts::take_shared<Clock>(&s);
    merchant::finalize_slash(&mut m, &c, ts::ctx(&mut s)); ts::return_shared(c); ts::return_shared(m); ts::end(s);
}
