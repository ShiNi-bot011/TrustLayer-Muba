/**
 * scenarios.ts — Deterministic demo scenarios (SDD §4.2)
 */

import { generate30DaysCheckins, generateRefund, generateMaintenanceTicket, generatePromoEvent } from './generators.js';
import { calculateHealthScore } from './scoring.js';
import type { ScenarioResult } from './types.js';

/**
 * 1. Seed Healthy History
 * Generates normal 30-day check-in baseline, 0 unresolved tickets, 0 refund pileups.
 * Target Health Score: ~95
 */
export function seedHealthyHistory(merchantId: string): ScenarioResult {
  const checkins = generate30DaysCheckins(merchantId);
  const factors = {
    checkinAnomalyPct: 0,
    unresolvedTicketDaysOver14: 0,
    promoSpikeSeverity: 0,
    unresolvedRefundCount: 2, // low baseline refunds
  };

  const newScore = calculateHealthScore(factors); // ~96

  return {
    merchantId,
    scenarioName: 'Seed Healthy History',
    previousHealthScore: 80,
    newHealthScore: newScore,
    factors,
    eventsEmitted: {
      checkins: checkins.length,
      refunds: 2,
      maintenanceTickets: 0,
      promoEvents: 0,
    },
    recommendedStatus: 'ACTIVE',
    summary: `Seeded ${checkins.length} check-in events over 30 days. Healthy baseline established with score ${newScore}/100.`,
  };
}

/**
 * 2. Trigger True Fitness Scenario (True Fitness 2017 style)
 * Simulates: maintenance tickets unresolved (>14 days) -> attendance drops >40% -> disappearance/refund pileup.
 * Target Health Score: ~45, trigger PENDING_SLASH.
 */
export function triggerTrueFitnessScenario(merchantId: string): ScenarioResult {
  const factors = {
    checkinAnomalyPct: 45, // 45% drop -> -22.5
    unresolvedTicketDaysOver14: 12, // 12 days over 14 -> -18
    promoSpikeSeverity: 0,
    unresolvedRefundCount: 7, // -14
  };

  const newScore = calculateHealthScore(factors); // ~45.5 -> 46

  return {
    merchantId,
    scenarioName: 'True Fitness Scenario',
    previousHealthScore: 92,
    newHealthScore: newScore,
    factors,
    eventsEmitted: {
      checkins: 10,
      refunds: 7,
      maintenanceTickets: 3,
      promoEvents: 0,
    },
    recommendedStatus: 'PENDING_SLASH',
    reasonCode: 4, // DISAPPEARANCE / ATTENDANCE ANOMALY
    summary: `Simulated broken equipment & unanswered tickets (>14 days), check-ins fell by 45%. Health score plunged to ${newScore}/100. Triggers PENDING_SLASH.`,
  };
}

/**
 * 3. Trigger 1Fit Scenario (1Fit 2025 style)
 * Simulates: promo spike (extreme discount rate + volume surge) -> refund pileup.
 * Target Health Score: ~42, triggers bond recalculation / PENDING_SLASH.
 */
export function trigger1FitScenario(merchantId: string): ScenarioResult {
  const factors = {
    checkinAnomalyPct: 20, // -10
    unresolvedTicketDaysOver14: 0,
    promoSpikeSeverity: 65, // extreme promo -> -22.75
    unresolvedRefundCount: 13, // refund pileup -> -26
  };

  const newScore = calculateHealthScore(factors); // ~41

  return {
    merchantId,
    scenarioName: '1Fit Scenario',
    previousHealthScore: 90,
    newHealthScore: newScore,
    factors,
    eventsEmitted: {
      checkins: 15,
      refunds: 13,
      maintenanceTickets: 0,
      promoEvents: 2,
    },
    recommendedStatus: 'PENDING_SLASH',
    reasonCode: 5, // REFUND_PILEUP
    summary: `Simulated 70% flash-sale promo spike accompanied by 13 unresolved refund requests. Health score dropped to ${newScore}/100. Required bond recalculates upward.`,
  };
}
