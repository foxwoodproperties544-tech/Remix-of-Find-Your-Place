import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calculator, Info } from "lucide-react";
import { formatKsh } from "@/lib/mock-data";
import { getValuationEstimate } from "@/lib/market.functions";
import { CONFIDENCE_CLASS, CONFIDENCE_LABEL, priceVerdict, type ValuationEstimate } from "@/lib/market";

export function ValuationEstimateCard({ propertyId }: { propertyId: string }) {
  const estimate = useServerFn(getValuationEstimate);

  const { data, isLoading } = useQuery({
    queryKey: ["valuation", propertyId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => (await estimate({ data: { propertyId } })) as unknown as ValuationEstimate,
  });

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Calculating a market estimate…</p>
      </section>
    );
  }

  if (!data?.available) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 font-bold"><Calculator className="h-4 w-4 text-primary" /> Foxwood value estimate</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Not enough comparable listings in this area yet to publish an estimate. Check back as more properties are listed.
        </p>
      </section>
    );
  }

  const verdict = priceVerdict(data.delta_pct ?? null);
  const low = Number(data.low ?? 0);
  const high = Number(data.high ?? 0);
  const mid = Number(data.mid ?? 0);
  const listed = Number(data.listed_price ?? 0);
  const span = Math.max(high - low, 1);
  const markerPct = Math.min(100, Math.max(0, ((listed - low) / span) * 100));

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-bold"><Calculator className="h-4 w-4 text-primary" /> Foxwood value estimate</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CONFIDENCE_CLASS[data.confidence ?? "low"]}`}>
          {CONFIDENCE_LABEL[data.confidence ?? "low"]}
        </span>
      </div>

      <p className="mt-3 text-2xl font-extrabold text-primary">{formatKsh(mid)}</p>
      <p className="text-xs text-muted-foreground">
        Estimated range {formatKsh(low)} – {formatKsh(high)}
      </p>

      <div className="relative mt-4 h-2 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-primary/25" />
        <div
          className="absolute -top-1 h-4 w-1 rounded-full bg-secondary"
          style={{ left: `${markerPct}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{formatKsh(low)}</span>
        <span>Listed at {formatKsh(listed)}</span>
        <span>{formatKsh(high)}</span>
      </div>

      <p className={`mt-3 text-sm font-semibold ${verdict.tone}`}>
        {verdict.label}
        {data.delta_pct != null && (
          <span className="ml-1 font-normal text-muted-foreground">
            ({data.delta_pct > 0 ? "+" : ""}{data.delta_pct}% vs median)
          </span>
        )}
      </p>

      <p className="mt-3 flex gap-1.5 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Based on {data.sample_size} comparable published listings of the same type and category nearby. This is a guide,
        not a professional valuation.
      </p>
    </section>
  );
}
