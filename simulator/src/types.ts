/**
 * types.ts — Simulator event and state interfaces (SDD §4.1)
 */

export interface CheckinEvent {
  merchantId: string;
  timestamp: number;
}

export interface RefundEvent {
  merchantId: string;
  amount: number;
  timestamp: number;
  resolved: boolean;
}

export interface MaintenanceTicketEvent {
  merchantId: string;
  ticketId: string;
  openedAt: number;
  resolvedAt: number | null;
}

export interface PromoEvent {
  merchantId: string;
  discountPct: number;
  salesVolume: number;
  timestamp: number;
}

export interface HealthScoreFactors {
  checkinAnomalyPct: number;
  unresolvedTicketDaysOver14: number;
  promoSpikeSeverity: number;
  unresolvedRefundCount: number;
}

export interface ScenarioResult {
  merchantId: string;
  scenarioName: string;
  previousHealthScore: number;
  newHealthScore: number;
  factors: HealthScoreFactors;
  eventsEmitted: {
    checkins: number;
    refunds: number;
    maintenanceTickets: number;
    promoEvents: number;
  };
  recommendedStatus: 'ACTIVE' | 'PENDING_SLASH' | 'SLASHED';
  reasonCode?: number;
  summary: string;
}
