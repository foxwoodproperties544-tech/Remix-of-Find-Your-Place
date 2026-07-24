import { TrendingUp } from "lucide-react";
import { computeCategoryStats, computeTypeStats, fmt } from "@/lib/location-stats";
import type { Property } from "@/lib/properties";

export function PriceTrends({ listings, label }: { listings: Property[]; label: string }) {
  const byCat = computeCategoryStats(listings);
  const byType = computeTypeStats(listings);

  if (!byCat.length && !byType.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        Price trends will appear here once more listings in {label} are published.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold">Price trends in {label}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Median asking prices from currently published Foxwood listings. Updates in real time as new listings go live.</p>

      {byCat.length > 0 && (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium">Listings</th>
                <th className="px-2 py-2 font-medium">Median asking</th>
                <th className="px-2 py-2 font-medium hidden sm:table-cell">Range</th>
              </tr>
            </thead>
            <tbody>
              {byCat.map((r) => (
                <tr key={r.category} className="border-b border-border/60 last:border-0">
                  <td className="px-2 py-2 font-semibold capitalize">{r.category}</td>
                  <td className="px-2 py-2">{r.count}</td>
                  <td className="px-2 py-2 text-primary font-semibold">{fmt(r.median)}</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground hidden sm:table-cell">{fmt(r.min)} – {fmt(r.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {byType.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">By property type</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {byType.map((r) => (
              <div key={r.category} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-sm font-medium capitalize">{r.category}</span>
                <span className="text-sm text-primary font-semibold">{fmt(r.median)}<span className="text-xs text-muted-foreground font-normal"> · {r.count}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
