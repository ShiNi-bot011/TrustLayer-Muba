/**
 * test-chain.ts — Day 2 Simulator Test Suite
 *
 * Eight checks for SDD §4.1, §4.2 and §4.3.
 * No private key, wallet, or real Sui transaction is required today.
 */

import {
  generateCheckin,
  generateRefund,
  generateMaintenanceTicket,
  generatePromoEvent,
  generate30DaysCheckins,
  calculateCheckinAnomaly,
  calculateHealthScore,
  seedHealthyHistory,
  triggerTrueFitnessScenario,
  trigger1FitScenario,
  simulateRefundPileupScenario,
  submitCounterEvidenceMock,
} from '../src/index.ts';

const MERCHANT_ID = '0xDEMO_MERCHANT_001';
const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 8, 3, 12, 0, 0);

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, details = '') {
  if (condition) {
    console.log(`✓ ${name}${details ? ` — ${details}` : ''}`);
    passed++;
  } else {
    console.error(`✗ ${name}${details ? ` — ${details}` : ''}`);
    failed++;
  }
}

async function main(){
  console.log('\n=== SME TRUST LAYER — DAY 2 TEST SUITE ===\n');

// TEST 1
const checkin = generateCheckin(MERCHANT_ID, NOW);
const refund = generateRefund(MERCHANT_ID, 150, NOW, false);
const ticket = generateMaintenanceTicket(MERCHANT_ID, 'T-001', NOW - 18 * DAY_MS, null);
const promo = generatePromoEvent(MERCHANT_ID, 70, 500, NOW);
check(
  'TEST 1 — Four event generators',
  checkin.merchant_id === MERCHANT_ID &&
    refund.resolved === false &&
    ticket.ticket_id === 'T-001' &&
    promo.discount_pct === 70,
  'Check-in, refund, maintenance and promo generators work'
);

// TEST 2
const history = generate30DaysCheckins(MERCHANT_ID, NOW);
check(
  'TEST 2 — 30-day healthy history',
  history.length === 879,
  `expected 879, got ${history.length}`
);

// TEST 3
const healthy = seedHealthyHistory(MERCHANT_ID, NOW);
check(
  'TEST 3 — Healthy scenario',
  healthy.newHealthScore >= 85 && healthy.newHealthScore <= 95,
  `score=${healthy.newHealthScore}, anomaly=${healthy.factors.checkinAnomalyPct}%`
);

// TEST 4
const trueFitness = triggerTrueFitnessScenario(MERCHANT_ID, NOW);
check(
  'TEST 4 — True Fitness scenario',
  trueFitness.newHealthScore >= 35 &&
    trueFitness.newHealthScore <= 45 &&
    trueFitness.factors.checkinAnomalyPct === 40 &&
    trueFitness.factors.unresolvedTicketDaysOver14 === 8,
  `score=${trueFitness.newHealthScore}, anomaly=${trueFitness.factors.checkinAnomalyPct}%, overdue=${trueFitness.factors.unresolvedTicketDaysOver14}`
);

// TEST 5
const oneFit = trigger1FitScenario(MERCHANT_ID, NOW);
check(
  'TEST 5 — 1Fit scenario',
  oneFit.newHealthScore >= 35 &&
    oneFit.newHealthScore <= 45 &&
    oneFit.factors.promoSpikeSeverity === 1,
  `score=${oneFit.newHealthScore}, promoSeverity=${oneFit.factors.promoSpikeSeverity}`
);

// TEST 6
const refundScenario = simulateRefundPileupScenario(MERCHANT_ID, NOW);
check(
  'TEST 6 — Refund pileup',
  refundScenario.newHealthScore === 74 &&
    refundScenario.factors.unresolvedRefundCount === 2,
  `score=${refundScenario.newHealthScore}`
);

// TEST 7
const evidence = await submitCounterEvidenceMock(
  MERCHANT_ID,
  '0xFAKE_REFUND_TX_123456789'
);
check(
  'TEST 7 — Counter-evidence mock',
  evidence.success === true && evidence.mocked === true,
  'Day 2 mock accepted'
);

// TEST 8
const formulaDataset = {
  merchant_id: MERCHANT_ID,
  checkins: history,
  refunds: [],
  maintenanceTickets: [],
  promos: [],
};
const formulaResult = calculateHealthScore(formulaDataset, NOW);
const directAnomaly = calculateCheckinAnomaly(history);
check(
  'TEST 8 — §4.3 health score formula',
  directAnomaly === 10 && formulaResult.score === 90,
  `anomaly=${directAnomaly}%, score=${formulaResult.score}`
);

console.log('\n=== DAY 2 SUMMARY ===');
console.log(`Healthy      : ${healthy.newHealthScore}`);
console.log(`True Fitness : ${trueFitness.newHealthScore}`);
console.log(`1Fit         : ${oneFit.newHealthScore}`);
console.log(`Refund       : ${refundScenario.newHealthScore}`);
console.log(`Passed       : ${passed}/8`);
console.log(`Failed       : ${failed}/8`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✓✓✓ ALL 8 DAY 2 TESTS PASSED ✓✓✓');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

