/**
 * suiTransaction.ts — Sui Programmable Transaction Block (PTB) builders for SME Trust Layer (Day 3)
 */

import { Transaction } from '@mysten/sui/transactions';
import { CLOCK_OBJECT_ID, PACKAGE_ID } from './demoConfig';

/**
 * Build transaction to update health score and trailing prepaid revenue on-chain.
 * (Restricted to oracle signer).
 */
export function buildUpdateHealthScoreTx(
  merchantObjectId: string,
  newScore: number,
  trailingRevenueMist: bigint | number
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::merchant::update_health_score`,
    arguments: [
      tx.object(merchantObjectId),
      tx.pure.u64(newScore),
      tx.pure.u64(trailingRevenueMist),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/**
 * Build transaction to record an on-chain check-in timestamp.
 * (Restricted to oracle signer).
 */
export function buildRecordCheckinTx(merchantObjectId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::merchant::record_checkin`,
    arguments: [
      tx.object(merchantObjectId),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/**
 * Build transaction to initiate slash when a trigger condition fires objectively.
 * Reason codes:
 *  1 = ATTENDANCE_ANOMALY
 *  2 = TICKET_STAGNATION
 *  3 = PROMO_SPIKE
 *  4 = DISAPPEARANCE
 *  5 = REFUND_PILEUP
 */
export function buildInitiateSlashTx(
  merchantObjectId: string,
  reasonCode: number
): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::merchant::initiate_slash`,
    arguments: [
      tx.object(merchantObjectId),
      tx.pure.u8(reasonCode),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/**
 * Build transaction for merchant owner to submit counter-evidence within the challenge window.
 */
export function buildSubmitCounterEvidenceTx(
  merchantObjectId: string,
  evidenceTxHash: string
): Transaction {
  const tx = new Transaction();
  const evidenceBytes = Array.from(new TextEncoder().encode(evidenceTxHash));
  tx.moveCall({
    target: `${PACKAGE_ID}::merchant::submit_counter_evidence`,
    arguments: [
      tx.object(merchantObjectId),
      tx.pure.vector('u8', evidenceBytes),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/**
 * Build transaction to finalize slash after the challenge window expires.
 */
export function buildFinalizeSlashTx(merchantObjectId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::merchant::finalize_slash`,
    arguments: [
      tx.object(merchantObjectId),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });
  return tx;
}

/**
 * Build transaction for merchant to deposit/top up bond.
 */
export function buildDepositBondTx(
  merchantObjectId: string,
  depositAmountMist: bigint | number
): Transaction {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [depositAmountMist]);
  tx.moveCall({
    target: `${PACKAGE_ID}::merchant::deposit_bond`,
    arguments: [
      tx.object(merchantObjectId),
      coin,
    ],
  });
  return tx;
}
