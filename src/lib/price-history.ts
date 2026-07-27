import { supabase } from "@/integrations/supabase/client";
import { formatKsh } from "@/lib/mock-data";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PriceHistoryRow {
  id: string;
  property_id: string;
  previous_price: number | null;
  new_price: number;
  amount_changed: number | null;
  percent_changed: number | null;
  reason: string | null;
  changed_by: string | null;
  is_initial: boolean;
  reverted: boolean;
  created_at: string;
}

export interface PriceSummary {
  currentPrice: number;
  originalPrice: number;
  totalChange: number;
  totalPercent: number;
  changeCount: number;
  lastChangeAt: string | null;
  daysSinceLastChange: number | null;
  daysOnMarket: number | null;
  direction: "down" | "up" | "flat";
  lastChange: PriceHistoryRow | null;
}

const DAY = 86_400_000;

export function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / DAY));
}

/** Fetch full (non-reverted) price history for a property, oldest first. */
export async function fetchPriceHistory(propertyId: string): Promise<PriceHistoryRow[]> {
  if (!UUID_RE.test(propertyId)) return [];
  const { data, error } = await supabase
    .from("property_price_history")
    .select("id, property_id, previous_price, new_price, amount_changed, percent_changed, reason, changed_by, is_initial, reverted, created_at")
    .eq("property_id", propertyId)
    .eq("reverted", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map(normalizeRow);
}

/** Latest price change per property, for a batch of property ids (saved lists, cards). */
export async function fetchLatestChanges(propertyIds: string[]): Promise<Map<string, PriceHistoryRow>> {
  const ids = propertyIds.filter((id) => UUID_RE.test(id));
  const out = new Map<string, PriceHistoryRow>();
  if (!ids.length) return out;
  const { data, error } = await supabase
    .from("property_price_history")
    .select("id, property_id, previous_price, new_price, amount_changed, percent_changed, reason, changed_by, is_initial, reverted, created_at")
    .in("property_id", ids)
    .eq("reverted", false)
    .eq("is_initial", false)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  for (const raw of (data ?? []) as any[]) {
    const row = normalizeRow(raw);
    if (!out.has(row.property_id)) out.set(row.property_id, row);
  }
  return out;
}

function normalizeRow(r: any): PriceHistoryRow {
  return {
    ...r,
    previous_price: r.previous_price == null ? null : Number(r.previous_price),
    new_price: Number(r.new_price),
    amount_changed: r.amount_changed == null ? null : Number(r.amount_changed),
    percent_changed: r.percent_changed == null ? null : Number(r.percent_changed),
  };
}

/** Derive the full summary card figures from the history + listing dates. */
export function summarizeHistory(
  history: PriceHistoryRow[],
  currentPrice: number,
  listedAt?: string | null,
): PriceSummary {
  const sorted = [...history].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const originalPrice = sorted[0]?.new_price ?? currentPrice;
  const changes = sorted.filter((r) => !r.is_initial);
  const lastChange = changes.length ? changes[changes.length - 1] : null;
  const totalChange = currentPrice - originalPrice;
  const totalPercent = originalPrice > 0 ? (totalChange / originalPrice) * 100 : 0;
  return {
    currentPrice,
    originalPrice,
    totalChange,
    totalPercent,
    changeCount: changes.length,
    lastChangeAt: lastChange?.created_at ?? null,
    daysSinceLastChange: daysSince(lastChange?.created_at),
    daysOnMarket: daysSince(listedAt ?? sorted[0]?.created_at ?? null),
    direction: totalChange < 0 ? "down" : totalChange > 0 ? "up" : "flat",
    lastChange,
  };
}

export function formatDelta(amount: number | null | undefined, percent?: number | null): string {
  if (amount == null || amount === 0) return "No change";
  const sign = amount < 0 ? "-" : "+";
  const pct = percent == null ? "" : ` (${amount < 0 ? "" : "+"}${percent.toFixed(1)}%)`;
  return `${sign}${formatKsh(Math.abs(amount))}${pct}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Buyer-facing market insights built only from platform data. */
export function buildInsights(opts: {
  summary: PriceSummary;
  areaLabel?: string | null;
  areaMin?: number | null;
  areaMax?: number | null;
  areaAvg?: number | null;
  views?: number | null;
  saves?: number | null;
}): string[] {
  const { summary, areaLabel, areaMin, areaMax, areaAvg, views, saves } = opts;
  const out: string[] = [];
  if (summary.daysOnMarket != null && summary.daysOnMarket > 0) {
    out.push(`This property has been listed for ${summary.daysOnMarket} day${summary.daysOnMarket === 1 ? "" : "s"}.`);
  }
  if (summary.changeCount > 0 && summary.totalPercent !== 0) {
    const verb = summary.totalChange < 0 ? "reduced" : "increased";
    out.push(`The asking price has been ${verb} by ${Math.abs(summary.totalPercent).toFixed(1)}% since it was first listed.`);
  }
  if (areaLabel && areaMin != null && areaMax != null && areaMin !== areaMax) {
    out.push(`Similar properties in ${areaLabel} are listed between ${formatKsh(areaMin)} and ${formatKsh(areaMax)}.`);
  }
  if (areaLabel && areaAvg != null && areaAvg > 0) {
    const diff = ((summary.currentPrice - areaAvg) / areaAvg) * 100;
    if (Math.abs(diff) >= 5) {
      out.push(
        `This property is currently priced ${Math.abs(diff).toFixed(0)}% ${diff < 0 ? "below" : "above"} the average asking price in ${areaLabel}.`,
      );
    }
  }
  if ((views ?? 0) >= 50 || (saves ?? 0) >= 5) {
    out.push("This property has received high buyer interest on Foxwood.");
  }
  return out;
}
