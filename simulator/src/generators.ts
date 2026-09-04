/**
 * generators.ts — Simulated webhook event generators (SDD §4.1)
 *
 * Day 2: deterministic fake data only. No real third-party webhook/API.
 */

import type {
  CheckinEvent,
  RefundEvent,
  MaintenanceTicketEvent,
  PromoEvent,
} from './types.ts';

const DAY_MS = 86_400_000;
const SIMULATION_DAYS = 30;
const BASELINE_DAYS = 23;
const RECENT_DAYS = 7;

export function generateCheckin(
  merchantId: string,
  timestamp: number = Date.now()
): CheckinEvent {
  return {
    merchant_id: merchantId,
    timestamp,
  };
}

export function generateRefund(
  merchantId: string,
  amount: number,
  timestamp: number = Date.now(),
  resolved: boolean = false
): RefundEvent {
  return {
    merchant_id: merchantId,
    amount,
    timestamp,
    resolved,
  };
}

export function generateMaintenanceTicket(
  merchantId: string,
  ticketId: string,
  openedAt: number = Date.now(),
  resolvedAt: number | null = null
): MaintenanceTicketEvent {
  return {
    merchant_id: merchantId,
    ticket_id: ticketId,
    opened_at: openedAt,
    resolved_at: resolvedAt,
  };
}

export function generatePromoEvent(
  merchantId: string,
  discountPct: number,
  salesVolume: number,
  timestamp: number = Date.now()
): PromoEvent {
  return {
    merchant_id: merchantId,
    discount_pct: discountPct,
    sales_volume: salesVolume,
    timestamp,
  };
}

function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Generate deterministic check-ins for one day.
 * Events stay inside the same UTC day so daily aggregation is reliable.
 */
export function generateDailyCheckins(
  merchantId: string,
  dayStartMs: number,
  count: number
): CheckinEvent[] {
  const events: CheckinEvent[] = [];
  const firstEventMs = 8 * 60 * 60 * 1000;
  const spacingMs = 20 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const timestamp = dayStartMs + firstEventMs + i * spacingMs;
    events.push(generateCheckin(merchantId,timestamp));
  }

  return events;
}

/**
 * Bulk generate the deterministic 30-day history used by today's tests.
 * Days 1–23: 30 check-ins/day.
 * Days 24–30: 27 check-ins/day.
 * Total = 879 events.
 */
export function generate30DaysCheckins(
  merchantId: string,
  nowMs: number = Date.now()
): CheckinEvent[] {
  const events: CheckinEvent[] = [];
  const today = startOfUtcDay(nowMs);

  for (let dayIndex = 0; dayIndex < SIMULATION_DAYS; dayIndex++) {
    const daysAgo = SIMULATION_DAYS - 1 - dayIndex;
    const dayStart = today - daysAgo * DAY_MS;
    const count = dayIndex < BASELINE_DAYS ? 30 : 27;
    events.push(...generateDailyCheckins(merchantId, dayStart, count));
  }

  return events;
}

// Alias used by the previous Day 2 test suite.
export const simulate30DaysHealthyHistory = generate30DaysCheckins;

export { DAY_MS, SIMULATION_DAYS, BASELINE_DAYS, RECENT_DAYS };
