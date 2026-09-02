/**
 * simulator.test.ts — Unit tests for the Simulator Service
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateCheckin,
  generateRefund,
  generateMaintenanceTicket,
  generatePromoEvent,
  generate30DaysCheckins,
  calculateHealthScore,
  seedHealthyHistory,
  triggerTrueFitnessScenario,
  trigger1FitScenario,
} from '../src/index.js';

describe('Simulator Event Generators', () => {
  const merchantId = '0x123';

  it('should generate valid CheckinEvent', () => {
    const event = generateCheckin(merchantId, 1000);
    assert.strictEqual(event.merchantId, merchantId);
    assert.strictEqual(event.timestamp, 1000);
  });

  it('should generate valid RefundEvent', () => {
    const event = generateRefund(merchantId, 500, 2000, false);
    assert.strictEqual(event.merchantId, merchantId);
    assert.strictEqual(event.amount, 500);
    assert.strictEqual(event.resolved, false);
  });

  it('should generate valid MaintenanceTicketEvent', () => {
    const event = generateMaintenanceTicket(merchantId, 'TICKET-01', 3000, null);
    assert.strictEqual(event.ticketId, 'TICKET-01');
    assert.strictEqual(event.resolvedAt, null);
  });

  it('should generate valid PromoEvent', () => {
    const event = generatePromoEvent(merchantId, 50, 1000, 4000);
    assert.strictEqual(event.discountPct, 50);
    assert.strictEqual(event.salesVolume, 1000);
  });

  it('should generate 30 days of check-ins', () => {
    const events = generate30DaysCheckins(merchantId);
    assert.strictEqual(events.length, 1500);
  });
});

describe('Health Score Calculation (SDD §4.3)', () => {
  it('should return 100 for perfect metrics', () => {
    const score = calculateHealthScore({
      checkinAnomalyPct: 0,
      unresolvedTicketDaysOver14: 0,
      promoSpikeSeverity: 0,
      unresolvedRefundCount: 0,
    });
    assert.strictEqual(score, 100);
  });

  it('should clamp score between 0 and 100', () => {
    const minScore = calculateHealthScore({
      checkinAnomalyPct: 100,
      unresolvedTicketDaysOver14: 100,
      promoSpikeSeverity: 100,
      unresolvedRefundCount: 100,
    });
    assert.strictEqual(minScore, 0);
  });
});

describe('Scenarios (SDD §4.2)', () => {
  const merchantId = '0x_MERCHANT_B';

  it('Seed Healthy History should produce score ~90-96 and ACTIVE status', () => {
    const res = seedHealthyHistory(merchantId);
    assert.ok(res.newHealthScore >= 90 && res.newHealthScore <= 100);
    assert.strictEqual(res.recommendedStatus, 'ACTIVE');
  });

  it('True Fitness scenario should drop score to ~40-50 and trigger PENDING_SLASH', () => {
    const res = triggerTrueFitnessScenario(merchantId);
    assert.ok(res.newHealthScore >= 40 && res.newHealthScore <= 50);
    assert.strictEqual(res.recommendedStatus, 'PENDING_SLASH');
  });

  it('1Fit scenario should drop score to ~40-50 and trigger PENDING_SLASH', () => {
    const res = trigger1FitScenario(merchantId);
    assert.ok(res.newHealthScore >= 40 && res.newHealthScore <= 50);
    assert.strictEqual(res.recommendedStatus, 'PENDING_SLASH');
  });
});
