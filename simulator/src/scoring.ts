/**
 * scoring.ts — Off-chain Health Score Calculation (SDD §4.3)
 *
 * Deterministic formula:
 *   health_score = 100
 *     - (checkin_anomaly_pct * WEIGHT_1)
 *     - (unresolved_ticket_days_over_14 * WEIGHT_2)
 *     - (promo_spike_severity * WEIGHT_3)
 *     - (unresolved_refund_count * WEIGHT_4)
 *   clamped to [0, 100]
 */

import type { HealthScoreFactors } from './types.js';

// Tuned weights to produce reliable demo transitions (~90s -> ~40s)
const WEIGHT_CHECKIN_ANOMALY = 0.5; // e.g. 50% drop -> -25 points
const WEIGHT_TICKET_STAGNATION = 1.5; // e.g. 10 days overdue -> -15 points
const WEIGHT_PROMO_SPIKE = 0.35; // e.g. 70 severity -> -24.5 points
const WEIGHT_REFUND_PILEUP = 2.0; // e.g. 12 unresolved refunds -> -24 points

export function calculateHealthScore(factors: HealthScoreFactors): number {
  const {
    checkinAnomalyPct,
    unresolvedTicketDaysOver14,
    promoSpikeSeverity,
    unresolvedRefundCount,
  } = factors;

  const deductions =
    Math.max(0, checkinAnomalyPct) * WEIGHT_CHECKIN_ANOMALY +
    Math.max(0, unresolvedTicketDaysOver14) * WEIGHT_TICKET_STAGNATION +
    Math.max(0, promoSpikeSeverity) * WEIGHT_PROMO_SPIKE +
    Math.max(0, unresolvedRefundCount) * WEIGHT_REFUND_PILEUP;

  const rawScore = Math.round(100 - deductions);
  return Math.max(0, Math.min(100, rawScore));
}
