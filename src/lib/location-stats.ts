import type { Property } from "@/lib/mock-data";

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });
export const fmt = (n: number) => KES.format(Math.round(n));

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type CategoryStat = {
  category: string;
  count: number;
  median: number;
  min: number;
  max: number;
};

export function computeCategoryStats(listings: Property[]): CategoryStat[] {
  const groups = new Map<string, number[]>();
  for (const p of listings) {
    const cat = (p.category ?? "").trim();
    const price = Number(p.price);
    if (!cat || !Number.isFinite(price) || price <= 0) continue;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(price);
  }
  return [...groups.entries()]
    .map(([category, prices]) => ({
      category,
      count: prices.length,
      median: median(prices),
      min: Math.min(...prices),
      max: Math.max(...prices),
    }))
    .sort((a, b) => b.count - a.count);
}

export function computeTypeStats(listings: Property[]): CategoryStat[] {
  const groups = new Map<string, number[]>();
  for (const p of listings) {
    const t = (p.type ?? "").trim();
    const price = Number(p.price);
    if (!t || !Number.isFinite(price) || price <= 0) continue;
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t)!.push(price);
  }
  return [...groups.entries()]
    .map(([category, prices]) => ({
      category,
      count: prices.length,
      median: median(prices),
      min: Math.min(...prices),
      max: Math.max(...prices),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
