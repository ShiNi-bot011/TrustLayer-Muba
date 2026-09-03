/**
 * suiClient.ts — Sui read abstraction for the SME Trust Layer frontend.
 *
 * PURPOSE: isolate all Sui RPC/SDK reads from UI components.
 * ConsumerView and AdminControlPanel import from here — they do NOT
 * contain raw Sui RPC calls.
 *
 * MOCK_MODE:
 *   false → real on-chain read via Sui testnet RPC.
 *   true  → return mock data fallback if network is unreachable.
 */

import {
  ENABLE_EXPLICIT_MOCK_DATA,
  MERCHANT_OBJECT_IDS,
  SUI_JSON_RPC_URL,
} from './demoConfig';

export const MOCK_MODE = ENABLE_EXPLICIT_MOCK_DATA;

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
// Mock data (CLEARLY labelled fallback)
// ---------------------------------------------------------------------------

const MOCK_MERCHANTS: Record<string, MerchantState> = {
  "Merchant A": {
    objectId: "0x77b343276131947ae93218ae7d36e34ef3576c8cc9dc9377401af7c34e6e445e",
    name: "Merchant A - True Fitness Style",
    bondBalanceMist: BigInt("2500000000"), // 2.5 SUI
    healthScore: 92,
    status: STATUS.ACTIVE,
    requiredBondMist: BigInt("800000000"), // 0.8 SUI
    trailing30dRevenueMist: BigInt("10000000000"),
    isMockData: true,
  },
  "Merchant B": {
    objectId: "0x49aba03938aa9d99d5a9b090db555d3f31ab672a2dceb1406f4a3bad4233abca",
    name: "Merchant B - 1Fit Style",
    bondBalanceMist: BigInt("1000000000"), // 1.0 SUI
    healthScore: 90,
    status: STATUS.ACTIVE,
    requiredBondMist: BigInt("1000000000"),
    trailing30dRevenueMist: BigInt("10000000000"),
    isMockData: true,
  },
};

// ---------------------------------------------------------------------------
// Bond formula (mirrors SDD §3.3)
// required_bond = trailing_30d_revenue * (100 - health_score) / 100
// clamped to >= ABSOLUTE_FLOOR
// ---------------------------------------------------------------------------

const ABSOLUTE_FLOOR_MIST = BigInt(500_000_000); // 0.5 SUI

export function computeRequiredBond(
  trailing30dRevenueMist: bigint,
  healthScore: number
): bigint {
  const score = BigInt(Math.max(0, Math.min(100, healthScore)));
  const computed = (trailing30dRevenueMist * (BigInt(100) - score)) / BigInt(100);
  return computed > ABSOLUTE_FLOOR_MIST ? computed : ABSOLUTE_FLOOR_MIST;
}

// ---------------------------------------------------------------------------
// Core read function
// ---------------------------------------------------------------------------

/**
 * Fetch a merchant's on-chain state from the Sui testnet.
 */
export async function getMerchantState(
  merchantLabel: string
): Promise<MerchantState> {
  const objectId = MERCHANT_OBJECT_IDS[merchantLabel as keyof typeof MERCHANT_OBJECT_IDS];
  const isMockId = !objectId || objectId.startsWith("0x_PLACEHOLDER");

  if (MOCK_MODE || isMockId) {
    const mock = MOCK_MERCHANTS[merchantLabel];
    if (!mock) throw new Error(`Unknown merchant label: ${merchantLabel}`);
    await new Promise((r) => setTimeout(r, 100));
    return { ...mock };
  }

  try {
    const response = await fetch(SUI_JSON_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sui_getObject",
        params: [
          objectId,
          { showContent: true, showType: true, showOwner: true },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Sui RPC returned HTTP ${response.status}`);
    }

    const json = await response.json();
    const data = json?.result?.data;

    if (!data || !data.content) {
      throw new Error(`Failed to fetch Merchant object ${objectId}`);
    }

    const fields = (data.content.fields as Record<string, unknown>) ?? {};

    const healthScore = Number(fields["health_score"] ?? 0);
    const trailing30dRevenueMist = BigInt(
      String(fields["trailing_30d_prepaid_revenue"] ?? "0")
    );
    const bondBalanceMist = BigInt(
      String(
        (fields["bond_balance"] as Record<string, unknown>)?.["value"] ??
        fields["bond_balance"] ??
        "0"
      )
    );
    const status = Number(fields["status"] ?? 0) as MerchantStatus;
    const name = String(fields["name"] ?? merchantLabel);

    return {
      objectId,
      name,
      bondBalanceMist,
      healthScore,
      status,
      requiredBondMist: computeRequiredBond(trailing30dRevenueMist, healthScore),
      trailing30dRevenueMist,
      isMockData: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`LIVE SUI READ FAILED for ${merchantLabel}: ${message}`);
  }
}

/**
 * Fetch all known merchants in a single batch.
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
// Utility formatters
// ---------------------------------------------------------------------------

export function formatSui(mist: bigint): string {
  const sui = Number(mist) / 1_000_000_000;
  return `${sui.toFixed(2)} SUI`;
}

export function statusLabel(status: MerchantStatus): string {
  switch (status) {
    case STATUS.ACTIVE:
      return "Active";
    case STATUS.PENDING_SLASH:
      return "⚠️ Under Review (72-Second Demo Challenge Window)";
    case STATUS.SLASHED:
      return "Bond Deducted to Demo Payout Recipient";
    case STATUS.CHALLENGED_OK:
      return "Recovered";
    default:
      return "Unknown";
  }
}
