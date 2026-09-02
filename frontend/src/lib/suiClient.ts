/**
 * suiClient.ts — Sui read abstraction for the SME Trust Layer frontend.
 *
 * PURPOSE: isolate all Sui RPC/SDK reads from UI components.
 * ConsumerView and AdminControlPanel import from here — they do NOT
 * contain raw SuiClient/SuiGrpcClient calls.
 *
 * MOCK_MODE:
 *   true  → return mock data (no network call). Use until Adam posts
 *            the deployed Merchant object IDs for Merchant A and B.
 *   false → real on-chain read via Sui testnet gRPC/RPC.
 *
 * CONTRACT STATUS (as of Day 2 / 2026-09-02):
 *   Package ID : 0x6fcff68419d9540248d34f7bbe46ab12ad1f5905bb7f94f1d1fcb083f620efd1
 *   Deployed   : register_merchant, deposit_bond, all getter functions.
 *   Pending    : update_health_score, record_checkin, initiate_slash,
 *                submit_counter_evidence, finalize_slash (Adam Day 2 work).
 *
 * HOW TO SWAP IN REAL DATA (Day 3):
 *   1. Set MOCK_MODE = false.
 *   2. Replace MERCHANT_OBJECT_IDS values with real shared-object IDs
 *      that Adam calls register_merchant with.
 *   3. No other changes to ConsumerView or AdminControlPanel needed.
 */

import { SuiGrpcClient } from "@mysten/sui/grpc";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Deployed contract package ID on Sui testnet (from Published.toml). */
export const PACKAGE_ID =
  "0x6fcff68419d9540248d34f7bbe46ab12ad1f5905bb7f94f1d1fcb083f620efd1";

/**
 * MOCK_MODE — set to false once Adam registers real Merchant objects and
 * posts their object IDs to the team channel.
 *
 * DO NOT set to false and leave MERCHANT_OBJECT_IDS as placeholders.
 * The app must never display fake data labelled as real on-chain data.
 */
export const MOCK_MODE = true;

/**
 * Shared Merchant object IDs.
 * REPLACE with real IDs once Adam calls register_merchant on testnet.
 * Keys are human-readable labels used in the UI and admin panel.
 */
export const MERCHANT_OBJECT_IDS: Record<string, string> = {
  // PLACEHOLDER — replace with real shared-object ID from Adam
  "Merchant A": "0x_PLACEHOLDER_MERCHANT_A",
  // PLACEHOLDER — replace with real shared-object ID from Adam
  "Merchant B": "0x_PLACEHOLDER_MERCHANT_B",
};

// ---------------------------------------------------------------------------
// Status enum (mirrors the Move contract — do not change values)
// ---------------------------------------------------------------------------

export const STATUS = {
  ACTIVE: 0,
  PENDING_SLASH: 1,
  SLASHED: 2,
  CHALLENGED_OK: 3,
} as const;

export type MerchantStatus = (typeof STATUS)[keyof typeof STATUS];

// ---------------------------------------------------------------------------
// Data shape returned to the UI
// ---------------------------------------------------------------------------

export interface MerchantState {
  objectId: string;
  name: string;
  /** Bond balance in MIST (1 SUI = 1_000_000_000 MIST). */
  bondBalanceMist: bigint;
  /** Health score 0–100. */
  healthScore: number;
  /** Status: 0=ACTIVE, 1=PENDING_SLASH, 2=SLASHED, 3=CHALLENGED_OK. */
  status: MerchantStatus;
  /** Required bond in MIST based on bond formula (off-chain calc for display). */
  requiredBondMist: bigint;
  /** Trailing 30-day prepaid revenue in MIST. */
  trailing30dRevenueMist: bigint;
  /** True if data came from on-chain; false if mock. UI should label mock data. */
  isMockData: boolean;
}

// ---------------------------------------------------------------------------
// Mock data (CLEARLY labelled — do NOT present as real on-chain state)
// ---------------------------------------------------------------------------

/** MOCK data for demo/development when MOCK_MODE=true or object IDs missing. */
const MOCK_MERCHANTS: Record<string, MerchantState> = {
  "Merchant A": {
    objectId: "0x_MOCK_MERCHANT_A",
    name: "Merchant A (True Fitness-style)",
    bondBalanceMist: BigInt("2_500_000_000".replace(/_/g, "")), // 2.5 SUI
    healthScore: 92,
    status: STATUS.ACTIVE,
    requiredBondMist: BigInt("800_000_000".replace(/_/g, "")), // 0.8 SUI
    trailing30dRevenueMist: BigInt("10_000_000_000".replace(/_/g, "")),
    isMockData: true,
  },
  "Merchant B": {
    objectId: "0x_MOCK_MERCHANT_B",
    name: "Merchant B (1Fit-style)",
    bondBalanceMist: BigInt("1_000_000_000".replace(/_/g, "")), // 1 SUI
    healthScore: 72,
    status: STATUS.ACTIVE,
    requiredBondMist: BigInt("2_800_000_000".replace(/_/g, "")),
    trailing30dRevenueMist: BigInt("10_000_000_000".replace(/_/g, "")),
    isMockData: true,
  },
};

// ---------------------------------------------------------------------------
// Bond formula (mirrors §3.3 — keep in sync with Move contract)
// required_bond = trailing_30d_revenue * (100 - health_score) / 100
// clamped to >= ABSOLUTE_FLOOR
// ---------------------------------------------------------------------------

/** Absolute floor in MIST — matches Move constant (500_000_000 = 0.5 SUI). */
const ABSOLUTE_FLOOR_MIST = BigInt(500_000_000);

export function computeRequiredBond(
  trailing30dRevenueMist: bigint,
  healthScore: number
): bigint {
  const score = BigInt(Math.max(0, Math.min(100, healthScore)));
  const computed = (trailing30dRevenueMist * (BigInt(100) - score)) / BigInt(100);
  return computed > ABSOLUTE_FLOOR_MIST ? computed : ABSOLUTE_FLOOR_MIST;
}

// ---------------------------------------------------------------------------
// Sui client singleton
// ---------------------------------------------------------------------------

let _client: SuiGrpcClient | null = null;

function getClient(): SuiGrpcClient {
  if (!_client) {
    _client = new SuiGrpcClient({
      network: "testnet",
      baseUrl: "https://fullnode.testnet.sui.io:443",
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Core read function
// ---------------------------------------------------------------------------

/**
 * Fetch a merchant's on-chain state from the Sui testnet.
 *
 * Returns mock data if MOCK_MODE=true or if the object ID is a placeholder.
 * The `isMockData` field on the returned object is always truthful —
 * UI components should surface this to the user when true.
 */
export async function getMerchantState(
  merchantLabel: string
): Promise<MerchantState> {
  const objectId = MERCHANT_OBJECT_IDS[merchantLabel];
  const isMockId = !objectId || objectId.startsWith("0x_PLACEHOLDER");

  if (MOCK_MODE || isMockId) {
    const mock = MOCK_MERCHANTS[merchantLabel];
    if (!mock) {
      throw new Error(`Unknown merchant label: ${merchantLabel}`);
    }
    // Simulate a brief async delay so the UI feels real
    await new Promise((r) => setTimeout(r, 200));
    return { ...mock };
  }

  // --- Real on-chain read ---
  const client = getClient();
  const result = await client.getObject({
    objectId,
  });

  if (!result || !result.object) {
    throw new Error(`Failed to fetch Merchant object ${objectId}`);
  }

  // When live on-chain objects are available, parse fields from the response or BCS.
  // Fallback to safe defaults if fields are not directly accessible.
  const fields = (result.object as unknown as { fields?: Record<string, unknown> }).fields ?? {};

  const healthScore = Number(fields["health_score"] ?? 0);
  const trailing30dRevenueMist = BigInt(
    String(fields["trailing_30d_prepaid_revenue"] ?? "0")
  );
  const bondBalanceMist = BigInt(
    String((fields["bond_balance"] as Record<string, unknown>)?.["value"] ?? "0")
  );
  const status = Number(fields["status"] ?? 0) as MerchantStatus;

  return {
    objectId,
    name: String(fields["name"] ?? merchantLabel),
    bondBalanceMist,
    healthScore,
    status,
    requiredBondMist: computeRequiredBond(trailing30dRevenueMist, healthScore),
    trailing30dRevenueMist,
    isMockData: false,
  };
}

/**
 * Fetch all known merchants in a single batch.
 * Returns a map keyed by merchant label.
 */
export async function getAllMerchants(): Promise<Record<string, MerchantState>> {
  const entries = await Promise.all(
    Object.keys(MERCHANT_OBJECT_IDS).map(async (label) => {
      const state = await getMerchantState(label);
      return [label, state] as const;
    })
  );
  return Object.fromEntries(entries);
}

// ---------------------------------------------------------------------------
// Utility formatters (UI helpers — not data logic)
// ---------------------------------------------------------------------------

/**
 * Format a MIST value as a SUI amount string.
 * e.g. 2_500_000_000n → "2.50 SUI"
 */
export function formatSui(mist: bigint): string {
  const sui = Number(mist) / 1_000_000_000;
  return `${sui.toFixed(2)} SUI`;
}

/**
 * Map status code to a human-readable label.
 */
export function statusLabel(status: MerchantStatus): string {
  switch (status) {
    case STATUS.ACTIVE:
      return "Active";
    case STATUS.PENDING_SLASH:
      return "⚠️ Under Review";
    case STATUS.SLASHED:
      return "Slashed";
    case STATUS.CHALLENGED_OK:
      return "Recovered";
    default:
      return "Unknown";
  }
}
