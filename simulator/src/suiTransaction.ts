/**
 * suiTransaction.ts — Sui PTB builders for SME Trust Layer.
 *
 * These builders are kept ready for Day 3. Day 2 simulator tests do not
 * execute real Sui transactions; they use the mocks in scenarios.ts.
 */

import { Transaction } from '@mysten/sui/transactions';

export const PACKAGE_ID = '0x88f8473000a36652045c2253e4e2b0b9c6d93fa44fda61943580f2918ee07475';
export const CLOCK_OBJECT_ID = '0x6';

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

export function buildRecordCheckinTx(merchantObjectId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::merchant::record_checkin`,
    arguments: [tx.object(merchantObjectId), tx.object(CLOCK_OBJECT_ID)],
  });
  return tx;
}

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

export function buildFinalizeSlashTx(merchantObjectId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::merchant::finalize_slash`,
    arguments: [tx.object(merchantObjectId), tx.object(CLOCK_OBJECT_ID)],
  });
  return tx;
}

export function buildDepositBondTx(
  merchantObjectId: string,
  depositAmountMist: bigint | number
): Transaction {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [depositAmountMist]);
  tx.moveCall({
    target: `${PACKAGE_ID}::merchant::deposit_bond`,
    arguments: [tx.object(merchantObjectId), coin],
  });
  return tx;
}

export function buildRegisterMerchantTx(
  name: string,
  initialHealthScore: number
): Transaction {
  const tx = new Transaction();

  const nameBytes = Array.from(
    new TextEncoder().encode(name)
  );

  tx.moveCall({
    target: `${PACKAGE_ID}::merchant::register_merchant`,
    arguments: [
      tx.pure.vector('u8', nameBytes),
      tx.pure.u64(initialHealthScore),
    ],
  });

  return tx;
}