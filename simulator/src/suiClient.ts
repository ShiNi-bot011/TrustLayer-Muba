/**
 * suiClient.ts
 *
 * Day 3:
 * Execute real Sui Testnet transactions using the existing
 * authorized Oracle wallet.
 */
import 'dotenv/config';

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { SerialTransactionExecutor } from '@mysten/sui/transactions';

export const SUI_NETWORK = 'testnet';

export const suiClient = new SuiGrpcClient({
  network: 'testnet',
  baseUrl: 'https://fullnode.testnet.sui.io:443',
});

/**
 * Create the Oracle signer.
 *
 * IMPORTANT:
 * Do NOT put the private key / mnemonic directly into source code.
 *
 * The key will be loaded from the environment variable:
 *
 * SUI_ORACLE_PRIVATE_KEY
 */
export function createOracleKeypair(): Ed25519Keypair {
  const privateKey = process.env.SUI_ORACLE_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      'Missing SUI_ORACLE_PRIVATE_KEY environment variable.'
    );
  }

  return Ed25519Keypair.fromSecretKey(privateKey);
}

/**
 * Check which address the signer controls.
 */
export function getOracleAddress(): string {
  const keypair = createOracleKeypair();
  return keypair.getPublicKey().toSuiAddress();
}

const oracleKeypair = createOracleKeypair();

export const oracleExecutor = new SerialTransactionExecutor({client: suiClient, signer: oracleKeypair,});

/**
 * Execute a transaction using the Oracle wallet.
 */
export async function executeOracleTransaction(
    tx: Transaction
  ) {
    const sender =
      oracleKeypair.getPublicKey().toSuiAddress();
  
    console.log(`Oracle signer: ${sender}`);
  
    tx.setSender(sender);
  
    return await oracleExecutor.executeTransaction(tx);
}

export async function getMerchantObject(merchantObjectId: string) {
    const result = await suiClient.core.getObject({
        objectId: merchantObjectId,
        include: {
            json: true,
        },
    });

    return result;
}