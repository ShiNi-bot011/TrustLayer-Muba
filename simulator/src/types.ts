/**
 * types.ts — Simulator event and state interfaces (SDD §4.1–§4.3)
 */

export interface CheckinEvent {
  merchant_id: string;
  timestamp: number;
}

export interface RefundEvent {
  merchant_id: string;
  amount: number;
  timestamp: number;
  resolved: boolean;
}

export interface MaintenanceTicketEvent {
  merchant_id: string;
  ticket_id: string;
  opened_at: number;
  resolved_at: number | null;
}

export interface PromoEvent {
  merchant_id: string;
  discount_pct: number;
  sales_volume: number;
  timestamp: number;
}

export interface HealthScoreFactors {
  checkinAnomalyPct: number;
  unresolvedTicketDaysOver14: number;
  promoSpikeSeverity: number;
  unresolvedRefundCount: number;
}

export interface HealthScoreResult {
  score: number;
  breakdown: HealthScoreFactors;
  penalties: {
    checkin: number;
    maintenance: number;
    promo: number;
    refund: number;
  };
  weights: {
    CHECKIN_ANOMALY: number;
    UNRESOLVED_TICKET: number;
    PROMO_SPIKE: number;
    UNRESOLVED_REFUND: number;
  };
}

export interface SimulationDataset {
  merchant_id: string;
  checkins: CheckinEvent[];
  refunds: RefundEvent[];
  maintenanceTickets: MaintenanceTicketEvent[];
  promos: PromoEvent[];
}

export interface ScenarioResult {
  merchantId: string;
  scenarioName: string;
  previousHealthScore: number;
  newHealthScore: number;
  factors: HealthScoreFactors;
  health: HealthScoreResult;
  eventsEmitted: {
    checkins: number;
    refunds: number;
    maintenanceTickets: number;
    promoEvents: number;
  };
  recommendedStatus: 'ACTIVE' | 'PENDING_SLASH' | 'SLASHED';
  reasonCode?: number;
  summary: string;
  dataset: SimulationDataset;
}

export interface MockTransactionResult {
  success: boolean;
  mocked: true;
  merchant_id: string;
  health_score?: number;
  evidence_hash?: string;
  message: string;
}
