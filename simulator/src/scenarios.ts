/**
 * scenarios.ts — Deterministic Day 2 demo scenarios (SDD §4.2)
 */

import {
  generate30DaysCheckins,
  generateDailyCheckins,
  generateRefund,
  generateMaintenanceTicket,
  generatePromoEvent,
  DAY_MS,
  SIMULATION_DAYS,
  BASELINE_DAYS,
} from './generators.ts';
import { calculateHealthScore } from './scoring.ts';
import type {
  ScenarioResult,
  SimulationDataset,
  MockTransactionResult,
  CheckinEvent,
} from './types.ts';

function utcDayStart(nowMs: number): number {
  const date = new Date(nowMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function makeScenarioResult(
  merchantId: string,
  scenarioName: string,
  previousHealthScore: number,
  dataset: SimulationDataset,
  recommendedStatus: ScenarioResult['recommendedStatus'],
  summary: string,
  reasonCode?: number,
  nowMs: number = Date.now()
): ScenarioResult {
  const health = calculateHealthScore(dataset, nowMs);
  return {
    merchantId,
    scenarioName,
    previousHealthScore,
    newHealthScore: health.score,
    factors: health.breakdown,
    health,
    eventsEmitted: {
      checkins: dataset.checkins.length,
      refunds: dataset.refunds.length,
      maintenanceTickets: dataset.maintenanceTickets.length,
      promoEvents: dataset.promos.length,
    },
    recommendedStatus,
    reasonCode,
    summary,
    dataset,
  };
}

/** Seed a healthy baseline: 23 days × 30 and 7 days × 27 = 879 check-ins. */
export function seedHealthyHistory(merchantId: string, nowMs: number = Date.now()): ScenarioResult {
  const checkins = generate30DaysCheckins(merchantId, nowMs);
  const dataset: SimulationDataset = {
    merchant_id: merchantId,
    checkins,
    refunds: [],
    maintenanceTickets: [],
    promos: [],
  };

  return makeScenarioResult(
    merchantId,
    'Seed Healthy History',
    80,
    dataset,
    'ACTIVE',
    `Seeded ${checkins.length} check-in events over 30 days. Healthy baseline established.`,
    undefined,
    nowMs
  );
}

/**
 * True Fitness scenario:
 * 30/day baseline → 18/day recent (40% drop), plus two unresolved tickets
 * open for 18 days. Score = 100 - 40 - 20 = 40.
 */
export function triggerTrueFitnessScenario(
  merchantId: string,
  nowMs: number = Date.now()
): ScenarioResult {
  const today = utcDayStart(nowMs);
  const checkins: CheckinEvent[] = [];

  for (let dayIndex = 0; dayIndex < SIMULATION_DAYS; dayIndex++) {
    const dayStart = today - (SIMULATION_DAYS - 1 - dayIndex) * DAY_MS;
    const count = dayIndex < BASELINE_DAYS ? 30 : 18;
    checkins.push(...generateDailyCheckins(merchantId, dayStart, count));
  }

  const maintenanceTickets = [
    generateMaintenanceTicket(merchantId, 'TF-TICKET-001', nowMs - 18 * DAY_MS, null),
    generateMaintenanceTicket(merchantId, 'TF-TICKET-002', nowMs - 18 * DAY_MS, null),
  ];

  const dataset: SimulationDataset = {
    merchant_id: merchantId,
    checkins,
    refunds: [],
    maintenanceTickets,
    promos: [],
  };

  return makeScenarioResult(
    merchantId,
    'True Fitness Scenario',
    92,
    dataset,
    'PENDING_SLASH',
    'Maintenance tickets stopped resolving → check-ins dropped by 40% → health score fell.',
    4,
    nowMs
  );
}

/**
 * 1Fit scenario:
 * healthy check-in history (~10% anomaly) + extreme promo spike.
 * Score = 100 - 10 - 50 = 40.
 */
export function trigger1FitScenario(
  merchantId: string,
  nowMs: number = Date.now()
): ScenarioResult {
  const checkins = generate30DaysCheckins(merchantId, nowMs);
  const promos = [
    generatePromoEvent(merchantId, 70, 500, nowMs),
    generatePromoEvent(merchantId, 70, 500, nowMs + 60 * 60 * 1000),
  ];

  const dataset: SimulationDataset = {
    merchant_id: merchantId,
    checkins,
    refunds: [],
    maintenanceTickets: [],
    promos,
  };

  return makeScenarioResult(
    merchantId,
    '1Fit Scenario',
    90,
    dataset,
    'PENDING_SLASH',
    'Promo spike detected → health score dropped → required bond should increase.',
    3,
    nowMs
  );
}

/** Additional Day 2 test for the refund penalty. */
export function simulateRefundPileupScenario(
  merchantId: string,
  nowMs: number = Date.now()
): ScenarioResult {
  const checkins = generate30DaysCheckins(merchantId, nowMs);
  const refunds = [
    generateRefund(merchantId, 150, nowMs - DAY_MS, false),
    generateRefund(merchantId, 200, nowMs - DAY_MS, false),
  ];

  const dataset: SimulationDataset = {
    merchant_id: merchantId,
    checkins,
    refunds,
    maintenanceTickets: [],
    promos: [],
  };

  return makeScenarioResult(
    merchantId,
    'Refund Pileup',
    90,
    dataset,
    'PENDING_SLASH',
    'Two unresolved refunds were detected and included in the health score.',
    5,
    nowMs
  );
}

/** Day 2 mock: real Sui transaction is intentionally deferred to Day 3. */
export async function mockUpdateHealthScoreOnChain(
  merchantId: string,
  healthScore: number
): Promise<MockTransactionResult> {
  return {
    success: true,
    mocked: true,
    merchant_id: merchantId,
    health_score: healthScore,
    message: 'Health score update simulated successfully. Real Sui call is a Day 3 task.',
  };
}

/** Day 2 mock for the counter-evidence control. */
export async function submitCounterEvidenceMock(
  merchantId: string,
  evidenceTxHash: string
): Promise<MockTransactionResult> {
  return {
    success: true,
    mocked: true,
    merchant_id: merchantId,
    evidence_hash: evidenceTxHash,
    message: 'Counter-evidence accepted in mock mode. Real Sui call is a Day 3 task.',
  };
}

export async function runScenario(
  scenario: string,
  merchantId: string,
  nowMs: number = Date.now()
): Promise<ScenarioResult> {
  switch (scenario.toLowerCase()) {
    case 'healthy':
      return seedHealthyHistory(merchantId, nowMs);
    case 'true_fitness':
      return triggerTrueFitnessScenario(merchantId, nowMs);
    case '1fit':
      return trigger1FitScenario(merchantId, nowMs);
    case 'refund':
      return simulateRefundPileupScenario(merchantId, nowMs);
    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
}

export async function runAllDemoScenarios(merchantId: string, nowMs: number = Date.now()) {
  const healthy = await runScenario('healthy', merchantId, nowMs);
  const trueFitness = await runScenario('true_fitness', merchantId, nowMs);
  const oneFit = await runScenario('1fit', merchantId, nowMs);

  return { healthy, trueFitness, oneFit };
}
