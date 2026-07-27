import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatKsh } from "@/lib/mock-data";
import { fetchPriceHistory, formatDate, UUID_RE, type PriceHistoryRow } from "@/lib/price-history";

/**
 * "Price reduced" / "Price updated" badge derived from the latest recorded change.
 * Renders nothing when a listing has never changed price.
 */
export function PriceChangeBadge({
  change,
  compact,
  className = "",
}: {
  change?: PriceHistoryRow | null;
  compact?: boolean;
  className?: string;
}) {
  if (!change || change.is_initial || !change.amount_changed) return null;
  const dropped = change.amount_changed < 0;
  const Icon = dropped ? TrendingDown : TrendingUp;
  const tone = dropped
    ? "bg-primary-soft text-primary"
    : "bg-secondary/10 text-secondary";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${tone} px-2.5 py-1 text-xs font-semibold ${className}`}
      title={`${dropped ? "Reduced" : "Increased"} on ${formatDate(change.created_at)}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {dropped ? "Price reduced" : "Price updated"}
      {!compact && (
        <span className="font-medium">
          {dropped ? "-" : "+"}
          {formatKsh(Math.abs(change.amount_changed))}
          {change.percent_changed != null && ` (${change.percent_changed.toFixed(1)}%)`} · {formatDate(change.created_at)}
        </span>
      )}
    </span>
  );
}

export function NoPriceChangeBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground ${className}`}>
      <Minus className="h-3.5 w-3.5" /> No price changes
    </span>
  );
}

/** Self-fetching badge for use anywhere a listing price is displayed. */
export function LatestPriceChangeBadge({ propertyId, compact, className }: { propertyId: string; compact?: boolean; className?: string }) {
  const { data } = useQuery({
    queryKey: ["price-history", propertyId],
    enabled: UUID_RE.test(propertyId),
    staleTime: 60_000,
    queryFn: () => fetchPriceHistory(propertyId),
  });
  const changes = (data ?? []).filter((r) => !r.is_initial);
  const last = changes.length ? changes[changes.length - 1] : null;
  return <PriceChangeBadge change={last} compact={compact} className={className} />;
}
