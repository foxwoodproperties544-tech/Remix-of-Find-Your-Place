import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { History, TrendingDown, TrendingUp, Lightbulb, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh } from "@/lib/mock-data";
import {
  fetchPriceHistory,
  summarizeHistory,
  buildInsights,
  formatDate,
  formatDelta,
  UUID_RE,
} from "@/lib/price-history";
import { PriceChangeBadge, NoPriceChangeBadge } from "./PriceChangeBadge";

const PAGE = 10;

interface Props {
  propertyId: string;
  propertyKey?: string;
  currentPrice: number;
  listedAt?: string | null;
  county?: string | null;
  town?: string | null;
  category?: string | null;
}

/** Public Price History section: summary, chart, paginated table and market insights. */
export function PriceHistoryCard({ propertyId, propertyKey, currentPrice, listedAt, county, town, category }: Props) {
  const enabled = UUID_RE.test(propertyId);
  const [shown, setShown] = useState(PAGE);

  const { data: history } = useQuery({
    queryKey: ["price-history", propertyId],
    enabled,
    staleTime: 60_000,
    queryFn: () => fetchPriceHistory(propertyId),
  });

  const { data: context } = useQuery({
    queryKey: ["price-history-context", propertyId, town, county, category],
    enabled: enabled && !!(town || county),
    staleTime: 300_000,
    queryFn: async () => {
      let q = supabase.from("properties").select("price").eq("status", "published").neq("id", propertyId).limit(300);
      if (town) q = q.eq("town", town);
      else if (county) q = q.eq("county", county);
      if (category) q = q.eq("category", category);
      const [peers, views, saves] = await Promise.all([
        q,
        supabase.from("property_views").select("id", { count: "exact", head: true }).eq("property_key", propertyKey ?? propertyId),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("property_key", propertyKey ?? propertyId),
      ]);
      const prices = ((peers.data ?? []) as any[]).map((r) => Number(r.price)).filter((n) => n > 0);
      return {
        min: prices.length ? Math.min(...prices) : null,
        max: prices.length >= 3 ? Math.max(...prices) : null,
        avg: prices.length >= 3 ? prices.reduce((s, n) => s + n, 0) / prices.length : null,
        views: views.count ?? 0,
        saves: saves.count ?? 0,
      };
    },
  });

  const summary = useMemo(
    () => summarizeHistory(history ?? [], currentPrice, listedAt),
    [history, currentPrice, listedAt],
  );

  const chartData = useMemo(
    () =>
      (history ?? []).map((r) => ({
        date: formatDate(r.created_at),
        price: r.new_price,
      })),
    [history],
  );

  const insights = useMemo(
    () =>
      buildInsights({
        summary,
        areaLabel: town || county || null,
        areaMin: context?.min ?? null,
        areaMax: context?.max ?? null,
        areaAvg: context?.avg ?? null,
        views: context?.views,
        saves: context?.saves,
      }),
    [summary, town, county, context],
  );

  if (!enabled || !history || history.length === 0) return null;

  const rows = [...history].reverse();
  const visible = rows.slice(0, shown);
  const Trend = summary.direction === "down" ? TrendingDown : summary.direction === "up" ? TrendingUp : Clock;

  return (
    <section aria-labelledby="price-history" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h2 id="price-history" className="text-xl font-bold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" /> Price history
        </h2>
        {summary.changeCount > 0 ? (
          <PriceChangeBadge change={summary.lastChange} />
        ) : (
          <NoPriceChangeBadge />
        )}
      </div>

      {/* Summary */}
      <dl className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Current asking price" value={formatKsh(summary.currentPrice)} accent />
        <Stat label="Original asking price" value={formatKsh(summary.originalPrice)} />
        <Stat
          label={summary.totalChange < 0 ? "Total reduction" : summary.totalChange > 0 ? "Total increase" : "Total change"}
          value={summary.changeCount ? formatDelta(summary.totalChange, summary.totalPercent) : "—"}
        />
        <Stat label="Price changes" value={String(summary.changeCount)} />
        <Stat
          label="Days since last update"
          value={summary.daysSinceLastChange == null ? "—" : `${summary.daysSinceLastChange} days`}
        />
        <Stat label="Time on market" value={summary.daysOnMarket == null ? "—" : `${summary.daysOnMarket} days`} />
        <Stat
          label="Trend"
          value={
            summary.direction === "down" ? "Reduced" : summary.direction === "up" ? "Increased" : "Stable"
          }
          icon={<Trend className="h-4 w-4" />}
        />
      </dl>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="mt-5 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                width={70}
                tickFormatter={(v) => formatKsh(Number(v)).replace("KSh ", "")}
              />
              <Tooltip
                formatter={(v: any) => formatKsh(Number(v))}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
              />
              <Line type="stepAfter" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Recorded asking price changes for this listing</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th scope="col" className="px-2 py-2 font-medium">Date</th>
              <th scope="col" className="px-2 py-2 font-medium">Previous price</th>
              <th scope="col" className="px-2 py-2 font-medium">New price</th>
              <th scope="col" className="px-2 py-2 font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0 align-top">
                <td className="px-2 py-2 whitespace-nowrap">{formatDate(r.created_at)}</td>
                <td className="px-2 py-2 text-muted-foreground">{r.previous_price == null ? "—" : formatKsh(r.previous_price)}</td>
                <td className="px-2 py-2 font-semibold">{formatKsh(r.new_price)}</td>
                <td className={"px-2 py-2 font-semibold " + ((r.amount_changed ?? 0) < 0 ? "text-primary" : (r.amount_changed ?? 0) > 0 ? "text-secondary" : "text-muted-foreground")}>
                  {r.is_initial ? "Initial listing" : formatDelta(r.amount_changed, r.percent_changed)}
                  {r.reason && <div className="text-[11px] font-normal text-muted-foreground">{r.reason}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > shown && (
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="mt-3 w-full rounded-xl border border-border py-2 text-sm font-semibold hover:bg-muted"
          >
            Show older price changes
          </button>
        )}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mt-5 rounded-xl bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Lightbulb className="h-4 w-4 text-secondary" /> Foxwood market insights
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
            {insights.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, accent, icon }: { label: string; value: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={"mt-1 text-sm font-bold flex items-center gap-1.5 " + (accent ? "text-primary" : "")}>
        {icon}{value}
      </dd>
    </div>
  );
}
