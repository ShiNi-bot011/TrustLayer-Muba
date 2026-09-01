#[test_only]
module sme_trust_layer::merchant_tests;

use sme_trust_layer::merchant::{Self, Merchant};
use sui::test_scenario::{Self as ts};
use sui::coin;
use sui::sui::SUI;

#[test]
fun test_register_merchant_and_deposit_bond() {
    let admin = @0xAD;
    let merchant_owner = @0xB0B;
    let mut scenario = ts::begin(admin);

    // 1. Register merchant
    ts::next_tx(&mut scenario, merchant_owner);
    {
        merchant::register_merchant(
            b"Urban Retreat Spa",
            95,
            ts::ctx(&mut scenario)
        );
    };

    // 2. Inspect shared Merchant object and deposit bond
    ts::next_tx(&mut scenario, merchant_owner);
    {
        let mut merchant = ts::take_shared<Merchant>(&scenario);
        assert!(merchant::health_score(&merchant) == 95, 0);
        assert!(merchant::status(&merchant) == merchant::status_active(), 1);
        assert!(merchant::owner(&merchant) == merchant_owner, 2);
        assert!(merchant::bond_balance(&merchant) == 0, 3);

        // Mint 500 MIST for testing deposit
        let payment = coin::mint_for_testing<SUI>(500_000_000, ts::ctx(&mut scenario));
        merchant::deposit_bond(&mut merchant, payment, ts::ctx(&mut scenario));

        assert!(merchant::bond_balance(&merchant) == 500_000_000, 4);

        ts::return_shared(merchant);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 2)] // EInvalidHealthScore = 2
fun test_register_invalid_health_score() {
    let merchant_owner = @0xB0B;
    let mut scenario = ts::begin(merchant_owner);

    ts::next_tx(&mut scenario, merchant_owner);
    {
        merchant::register_merchant(
            b"Invalid Score Gym",
            105, // Invalid: > 100
            ts::ctx(&mut scenario)
        );
    };

    ts::end(scenario);
}
