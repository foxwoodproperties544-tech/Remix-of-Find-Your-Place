/** Size parsing + normalized ("price per unit") helpers used across search and cards. */

const SQFT_PER_ACRE = 43560;

/** Parse a free-text listing size ("0.125 acre", "1,200 sqft", "500 m²") into square feet. */
export function parseSizeToSqft(size?: string | null): number | null {
  if (!size) return null;
  const s = size.toLowerCase().replace(/,/g, "");
  const numMatch = s.match(/([\d.]+)(?:\s*\/\s*([\d.]+))?/);
  if (!numMatch) return null;
  let n = parseFloat(numMatch[1]);
  if (numMatch[2]) n = n / parseFloat(numMatch[2]);
  if (!isFinite(n) || n <= 0) return null;
  if (s.includes("acre")) return Math.round(n * SQFT_PER_ACRE);
  if (s.includes("hectare") || /\bha\b/.test(s)) return Math.round(n * 107639);
  if (s.includes("sqm") || s.includes("sq m") || s.includes("m²") || s.includes("m2")) return Math.round(n * 10.7639);
  return Math.round(n);
}

export interface NormalizedPrice {
  /** Price per square foot. */
  perSqft: number;
  /** Price per acre (land-style listings). */
  perAcre: number;
  /** Short display string, unit chosen to suit the listing size. */
  label: string;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(n));
}

/**
 * Normalized price so listings of different sizes can be compared like-for-like.
 * Land-scale plots are quoted per acre; buildings per square foot.
 */
export function normalizedPrice(price?: number | null, size?: string | null, suffix?: string | null): NormalizedPrice | null {
  const sqft = parseSizeToSqft(size);
  if (!price || !sqft || price <= 0) return null;
  const perSqft = price / sqft;
  const perAcre = perSqft * SQFT_PER_ACRE;
  const per = suffix?.trim() ? ` ${suffix.trim()}` : "";
  const label =
    sqft >= SQFT_PER_ACRE / 4
      ? `KSh ${compact(perAcre)}/acre${per}`
      : `KSh ${compact(perSqft)}/sqft${per}`;
  return { perSqft, perAcre, label };
}
