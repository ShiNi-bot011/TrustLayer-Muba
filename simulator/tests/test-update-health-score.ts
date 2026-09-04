/**
 * test-update-health-score.ts
 *
 * Day 3 — Test real update_health_score transaction.
 */
import {
  buildUpdateHealthScoreTx,
  PACKAGE_ID,
} from '../src/suiTransaction.ts';

import {
  getOracleAddress,
  executeOracleTransaction,
} from '../src/suiClient.ts';

import { seedHealthyHistory } from '../src/scenarios.ts';

const MERCHANT_A =
  '0x77b343276131947ae93218ae7d36e34ef3576c8cc9dc9377401af7c34e6e445e';

const EXPECTED_ORACLE =
  '0xa32b2a83afd2dc19c759d7b7db1f7c23a4abecd02279cb6cf7d73dbc74516210';

const NOW = Date.now();

async function main() {
  console.log('=== DAY 3 — REAL SUI TRANSACTION TEST ===\n');

  console.log(`Package ID: ${PACKAGE_ID}`);
  console.log(`Merchant A: ${MERCHANT_A}`);

  // --------------------------------------------------
  // 1. Verify Oracle wallet
  // --------------------------------------------------

  const oracleAddress = getOracleAddress();

  console.log(`Oracle wallet: ${oracleAddress}`);

  if (oracleAddress.toLowerCase() !== EXPECTED_ORACLE.toLowerCase()) {
    throw new Error(
      `Wrong Oracle wallet!\n` +
      `Expected: ${EXPECTED_ORACLE}\n` +
      `Actual:   ${oracleAddress}`
    );
  }

  console.log('✓ Oracle wallet verified\n');

  // --------------------------------------------------
  // 2. Build transaction
  // --------------------------------------------------

    const scenario = seedHealthyHistory(
        'MERCHANT_A', 
        NOW
    );
    console.log('\n=== SIMULATOR RESULT ===');
    console.log(`Health Score: ${scenario.newHealthScore}`);
    console.log(`Recommended Status: ${scenario.recommendedStatus}`);
    console.log(`Simulator Health Score: ${scenario.newHealthScore}`);

  const tx = buildUpdateHealthScoreTx(
    MERCHANT_A,
    scenario.newHealthScore,
    0
  );

  console.log('✓ Transaction built\n');

  // --------------------------------------------------
  // 3. Sign + execute
  // --------------------------------------------------

  console.log('Submitting transaction to Sui Testnet...\n');

  const result = await executeOracleTransaction(tx);

console.log('=== TRANSACTION RESULT ===');

console.log(
  JSON.stringify(result, null, 2)
);
}

main().catch((error) => {
  console.error('\n✗ TEST FAILED');
  console.error(error);
  process.exit(1);
});