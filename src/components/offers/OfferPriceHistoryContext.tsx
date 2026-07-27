import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { formatKsh } from "@/lib/mock-data";
import { fetchPriceHistory, summarizeHistory, formatDate, formatDelta, UUID_RE } from "@/lib/price-history";

/**
 * Price transparency panel shown inside the Make an Offer flow: asking vs original
 * price, number of adjustments and the date of the last change. No negotiation advice.
 */
export function OfferPriceHistoryContext({ propertyId, currentPrice }: { propertyId: string; currentPrice: number }) {
  const { data } = useQuery({
    queryKey: ["price-history", propertyId],
    enabled: UUID_RE.test(propertyId),
    staleTime: 60_000,
    queryFn: () => fetchPriceHistory(propertyId),
  });

  if (!data || data.length === 0) return null;
  const s = summarizeHistory(data, currentPrice);
  if (s.changeCount === 0) return null;

  return (
    <div className="rounded-xl border border-border p-3 text-xs space-y-1.5">
      <div className="flex items-center gap-1.5 text-sm font-bold"><Info className="h-4 w-4 text-primary" /> Price history</div>
      <div className="flex justify-between"><span className="text-muted-foreground">Current asking price</span><span className="font-semibold">{formatKsh(s.currentPrice)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Original asking price</span><span className="font-semibold">{formatKsh(s.originalPrice)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Total price changes</span><span className="font-semibold">{s.changeCount} ({formatDelta(s.totalChange, s.totalPercent)})</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Last price change</span><span className="font-semibold">{s.lastChangeAt ? formatDate(s.lastChangeAt) : "—"}</span></div>
      {s.changeCount > 1 && (
        <p className="pt-1 text-muted-foreground">
          This property has had multiple price adjustments. Review the price history before submitting your offer.
        </p>
      )}
    </div>
  );
}
