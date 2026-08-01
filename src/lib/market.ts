export interface MarketSnapshot {
  id: string;
  period: string;
  county: string | null;
  town: string | null;
  category: string | null;
  property_type: string | null;
  listing_count: number;
  new_listings: number;
  median_price: number | null;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  avg_price_per_bedroom: number | null;
  avg_days_on_market: number | null;
  updated_at: string;
}

export interface ValuationEstimate {
  available: boolean;
  reason?: string;
  sample_size?: number;
  low?: number;
  mid?: number;
  high?: number;
  listed_price?: number;
  delta_pct?: number | null;
  confidence?: "low" | "medium" | "high";
  generated_at?: string;
}

export const CONFIDENCE_LABEL: Record<string, string> = {
  low: "Indicative",
  medium: "Moderate confidence",
  high: "High confidence",
};

export const CONFIDENCE_CLASS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary-soft text-primary",
  high: "bg-emerald-500/15 text-emerald-600",
};

export function periodLabel(period: string): string {
  return new Date(period).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** Percentage change between the first and last non-null median in a series. */
export function trendPct(series: MarketSnapshot[]): number | null {
  const vals = series.map((s) => (s.median_price == null ? null : Number(s.median_price))).filter((v): v is number => v != null && v > 0);
  if (vals.length < 2) return null;
  const first = vals[0];
  const last = vals[vals.length - 1];
  return ((last - first) / first) * 100;
}

export function priceVerdict(deltaPct: number | null | undefined): { label: string; tone: string } {
  if (deltaPct == null) return { label: "In line with the market", tone: "text-muted-foreground" };
  if (deltaPct <= -10) return { label: "Priced below comparable listings", tone: "text-emerald-600" };
  if (deltaPct >= 10) return { label: "Priced above comparable listings", tone: "text-secondary" };
  return { label: "In line with comparable listings", tone: "text-muted-foreground" };
}
