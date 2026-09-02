/**
 * simulatorAdapter.ts — Simulator integration for Frontend AdminControlPanel (SDD §4.2, §5.2)
 */

export interface HealthScoreFactors {
  checkinAnomalyPct: number;
  unresolvedTicketDaysOver14: number;
  promoSpikeSeverity: number;
  unresolvedRefundCount: number;
}

export function calculateHealthScore(factors: HealthScoreFactors): number {
  const {
    checkinAnomalyPct,
    unresolvedTicketDaysOver14,
    promoSpikeSeverity,
    unresolvedRefundCount,
  } = factors;

  const deductions =
    Math.max(0, checkinAnomalyPct) * 0.5 +
    Math.max(0, unresolvedTicketDaysOver14) * 1.5 +
    Math.max(0, promoSpikeSeverity) * 0.35 +
    Math.max(0, unresolvedRefundCount) * 2.0;

  const rawScore = Math.round(100 - deductions);
  return Math.max(0, Math.min(100, rawScore));
}

export const REAL_SIMULATOR_ADAPTER = {
  async seedHealthyHistory(merchantObjectId: string): Promise<string> {
    const score = calculateHealthScore({
      checkinAnomalyPct: 0,
      unresolvedTicketDaysOver14: 0,
      promoSpikeSeverity: 0,
      unresolvedRefundCount: 2,
    });
    return `[SIMULATOR] Seeded 1500 check-in events over 30 days for ${merchantObjectId.slice(0, 10)}…\nHealth score → ${score}/100. Status: ACTIVE. Bond requirement at absolute floor (0.50 SUI).`;
  },

  async triggerTrueFitnessScenario(merchantObjectId: string): Promise<string> {
    const score = calculateHealthScore({
      checkinAnomalyPct: 45,
      unresolvedTicketDaysOver14: 12,
      promoSpikeSeverity: 0,
      unresolvedRefundCount: 7,
    });
    return `[SIMULATOR] True Fitness scenario triggered for ${merchantObjectId.slice(0, 10)}…\nDisappearance & Ticket Stagnation detected. Health score plunged to ${score}/100.\nState machine transition: ACTIVE → PENDING_SLASH (72s demo challenge window opened).`;
  },

  async trigger1FitScenario(merchantObjectId: string): Promise<string> {
    const score = calculateHealthScore({
      checkinAnomalyPct: 20,
      unresolvedTicketDaysOver14: 0,
      promoSpikeSeverity: 65,
      unresolvedRefundCount: 13,
    });
    return `[SIMULATOR] 1Fit scenario triggered for ${merchantObjectId.slice(0, 10)}…\nExtreme 70% flash-sale promo spike + 13 refund pileups. Health score dropped to ${score}/100.\nDynamic bond recalculates upward on-chain.`;
  },

  async submitCounterEvidence(merchantObjectId: string, evidenceHash: string): Promise<string> {
    return `[SIMULATOR] Counter-evidence submitted by merchant owner for ${merchantObjectId.slice(0, 10)}…\nEvidence Hash: ${evidenceHash || '0xDEMO_REFUND_SETTLEMENT_TX'}\nChallenge verified within demo window → status reverted to ACTIVE.`;
  },
};
