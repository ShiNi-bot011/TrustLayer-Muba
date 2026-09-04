/**
 * scoring.ts — Off-chain Health Score Calculation (SDD §4.3)
 *
 * health_score = 100
 *   - (checkin_anomaly_pct * WEIGHT_1)
 *   - (unresolved_ticket_days_over_14 * WEIGHT_2)
 *   - (promo_spike_severity * WEIGHT_3)
 *   - (unresolved_refund_count * WEIGHT_4)
 *
 * The score is calculated OFF-CHAIN and is later submitted to Sui.
 */

import type {
  HealthScoreFactors,
  HealthScoreResult,
  SimulationDataset,
  CheckinEvent,
  MaintenanceTicketEvent,
  PromoEvent,
  RefundEvent,
} from './types.ts';
import { RECENT_DAYS } from './generators.ts';

export const HEALTH_SCORE_WEIGHTS = {
  CHECKIN_ANOMALY: 1.0,
  UNRESOLVED_TICKET: 2.5,
  PROMO_SPIKE: 50.0,
  UNRESOLVED_REFUND: 8.0,
} as const;

const DAY_MS = 86_400_000;

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Calculate percentage drop between baseline and the latest 7 days. */
export function calculateCheckinAnomaly(checkinEvents: CheckinEvent[]): number {
  if (!Array.isArray(checkinEvents) || checkinEvents.length === 0) return 0;

  const dailyCounts = new Map<number, number>();
  for (const event of checkinEvents) {
    const day = startOfUtcDay(Number(event.timestamp));
    dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);
  }

  const days = [...dailyCounts.keys()].sort((a, b) => a - b);
  if (days.length < 2) return 0;

  const splitIndex = Math.max(1, days.length - RECENT_DAYS);
  const baselineDays = days.slice(0, splitIndex);
  const recentDays = days.slice(splitIndex);

  const baselineAverage =
    baselineDays.reduce((sum, day) => sum + (dailyCounts.get(day) ?? 0), 0) /
    baselineDays.length;
  const recentAverage =
    recentDays.reduce((sum, day) => sum + (dailyCounts.get(day) ?? 0), 0) /
    recentDays.length;

  if (baselineAverage <= 0) return 0;

  const dropPct = ((baselineAverage - recentAverage) / baselineAverage) * 100;
  return round(Math.max(0, dropPct), 2);
}

/** Total unresolved maintenance-ticket days beyond the first 14 days. */
export function calculateUnresolvedTicketDaysOver14(
  maintenanceEvents: MaintenanceTicketEvent[],
  nowMs: number = Date.now()
): number {
  if (!Array.isArray(maintenanceEvents)) return 0;

  let total = 0;
  for (const ticket of maintenanceEvents) {
    if (ticket.resolved_at !== null) continue;

    const daysOpen = (nowMs - Number(ticket.opened_at)) / DAY_MS;
    if (daysOpen > 14) total += daysOpen - 14;
  }

  return round(total, 2);
}

/**
 * Demo rule from the SDD: a promo is a spike when discount >= 50%
 * and sales volume >= 300. Severity is deliberately simple: 0 or 1.
 */
export function calculatePromoSpikeSeverity(promoEvents: PromoEvent[]): number {
  if (!Array.isArray(promoEvents)) return 0;

  return promoEvents.some(
    (promo) => Number(promo.discount_pct) >= 50 && Number(promo.sales_volume) >= 300
  )
    ? 1
    : 0;
}

export function calculateUnresolvedRefundCount(refundEvents: RefundEvent[]): number {
  if (!Array.isArray(refundEvents)) return 0;
  return refundEvents.filter((refund) => refund.resolved === false).length;
}

export function calculateFactors(
  dataset: SimulationDataset,
  nowMs: number = Date.now()
): HealthScoreFactors {
  return {
    checkinAnomalyPct: calculateCheckinAnomaly(dataset.checkins),
    unresolvedTicketDaysOver14: calculateUnresolvedTicketDaysOver14(
      dataset.maintenanceTickets,
      nowMs
    ),
    promoSpikeSeverity: calculatePromoSpikeSeverity(dataset.promos),
    unresolvedRefundCount: calculateUnresolvedRefundCount(dataset.refunds),
  };
}

export function calculateHealthScore(
  datasetOrFactors: SimulationDataset | HealthScoreFactors,
  nowMs: number = Date.now()
): HealthScoreResult {
  const factors =
    'checkins' in datasetOrFactors
      ? calculateFactors(datasetOrFactors, nowMs)
      : datasetOrFactors;

  const deductions =
    Math.max(0, factors.checkinAnomalyPct) * HEALTH_SCORE_WEIGHTS.CHECKIN_ANOMALY +
    Math.max(0, factors.unresolvedTicketDaysOver14) * HEALTH_SCORE_WEIGHTS.UNRESOLVED_TICKET +
    Math.max(0, factors.promoSpikeSeverity) * HEALTH_SCORE_WEIGHTS.PROMO_SPIKE +
    Math.max(0, factors.unresolvedRefundCount) * HEALTH_SCORE_WEIGHTS.UNRESOLVED_REFUND;

  const score = Math.max(0, Math.min(100, Math.round(100 - deductions)));

  return {
    score,
    breakdown: {
      checkinAnomalyPct: round(factors.checkinAnomalyPct),
      unresolvedTicketDaysOver14: round(factors.unresolvedTicketDaysOver14),
      promoSpikeSeverity: round(factors.promoSpikeSeverity),
      unresolvedRefundCount: Math.round(factors.unresolvedRefundCount),
    },
    penalties: {
      checkin: round(Math.max(0, factors.checkinAnomalyPct) * HEALTH_SCORE_WEIGHTS.CHECKIN_ANOMALY),
      maintenance: round(
        Math.max(0, factors.unresolvedTicketDaysOver14) * HEALTH_SCORE_WEIGHTS.UNRESOLVED_TICKET
      ),
      promo: round(Math.max(0, factors.promoSpikeSeverity) * HEALTH_SCORE_WEIGHTS.PROMO_SPIKE),
      refund: round(Math.max(0, factors.unresolvedRefundCount) * HEALTH_SCORE_WEIGHTS.UNRESOLVED_REFUND),
    },
    weights: { ...HEALTH_SCORE_WEIGHTS },
  };
}
