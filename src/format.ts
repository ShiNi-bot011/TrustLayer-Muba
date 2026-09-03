export const formatSuiBond = (mistAmount: bigint | number | string | undefined | null) => {
  if (!mistAmount) return '0.00 SUI';
  try {
    const sui = Number(BigInt(mistAmount)) / 1_000_000_000;
    return `${sui.toFixed(2)} SUI`;
  } catch (e) {
    return '0.00 SUI';
  }
};