/**
 * generators.ts — Simulated webhook event generators (SDD §4.1)
 */

import type {
  CheckinEvent,
  RefundEvent,
  MaintenanceTicketEvent,
  PromoEvent,
} from './types.js';

export function generateCheckin(
  merchantId: string,
  timestamp: number = Date.now()
): CheckinEvent {
  return {
    merchantId,
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
    merchantId,
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
    merchantId,
    ticketId,
    openedAt,
    resolvedAt,
  };
}

export function generatePromoEvent(
  merchantId: string,
  discountPct: number,
  salesVolume: number,
  timestamp: number = Date.now()
): PromoEvent {
  return {
    merchantId,
    discountPct,
    salesVolume,
    timestamp,
  };
}

/**
 * Bulk generate normal check-in events over a 30-day window (e.g. ~40-60 check-ins/day).
 */
export function generate30DaysCheckins(
  merchantId: string,
  nowMs: number = Date.now()
): CheckinEvent[] {
  const events: CheckinEvent[] = [];
  const msPerDay = 86_400_000;
  for (let day = 30; day >= 1; day--) {
    const dayStart = nowMs - day * msPerDay;
    // 50 check-ins per day on average
    for (let i = 0; i < 50; i++) {
      const timestamp = dayStart + Math.floor((i / 50) * msPerDay);
      events.push(generateCheckin(merchantId, timestamp));
    }
  }
  return events;
}
