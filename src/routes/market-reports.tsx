import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatKsh } from "@/lib/mock-data";
import { getMarketReport, listMarketAreas } from "@/lib/market.functions";
import { periodLabel, trendPct, type MarketSnapshot } from "@/lib/market";

const CATEGORIES = ["All categories", "For Sale", "For Rent", "For Lease"];

export const Route = createFileRoute("/market-reports")({
  head: () => ({
    meta: [
      { title: "Kenya Property Market Reports | Foxwood Properties" },
      {
        name: "description",
        content:
          "Track median prices, listing volumes and days on market across Kenyan counties and towns with Foxwood Properties market reports.",
      },
      { property: "og:title", content: "Kenya Property Market Reports | Foxwood Properties" },
      {
        property: "og:description",
        content: "Median prices, supply and days on market for property across Kenya, updated monthly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketReportsPage,
});

function MarketReportsPage() {
  const areasFn = useServerFn(listMarketAreas);
  const reportFn = useServerFn(getMarketReport);

  const [county, setCounty] = useState<string>("");
  const [town, setTown] = useState<string>("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);

  const { data: areas = [] } = useQuery({
    queryKey: ["market-areas"],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => await areasFn({ data: {} as never }),
  });

  const towns = useMemo(() => areas.find((a) => a.county === county)?.towns ?? [], [areas, county]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["market-report", county, town, category],
    staleTime: 10 * 60 * 1000,
    queryFn: async () =>
      (await reportFn({
        data: {
          ...(county ? { county } : {}),
          ...(town ? { town } : {}),
          ...(category !== CATEGORIES[0] ? { category } : {}),
        },
      })) as unknown as MarketSnapshot[],
  });

  const latest = rows.length ? rows[rows.length - 1] : null;
  const change = trendPct(rows);
  const chartData = rows.map((r) => ({
    label: periodLabel(r.period),
    median: r.median_price ? Number(r.median_price) : null,
    listings: r.listing_count,
  }));

  return (
    <main className="container mx-auto px-4 py-10">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-secondary">Market intelligence</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">Kenya property market reports</h1>
        <p className="mt-2 text-muted-foreground">
          Median asking prices, supply and time on market across counties and towns — recalculated every day from live
          Foxwood listings.
        </p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Select
          value={county || "all"}
          onValueChange={(v) => {
            setCounty(v === "all" ? "" : v);
            setTown("");
          }}
        >
          <SelectTrigger aria-label="County"><SelectValue placeholder="All of Kenya" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All of Kenya</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.county} value={a.county}>{a.county}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={town || "all"} onValueChange={(v) => setTown(v === "all" ? "" : v)} disabled={!county}>
          <SelectTrigger aria-label="Town"><SelectValue placeholder="All towns" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All towns</SelectItem>
            {towns.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Loading market data…</p>
      ) : !latest ? (
        <p className="mt-10 rounded-2xl border border-border bg-card p-6 text-muted-foreground">
          No market data published for this selection yet. Try a wider area or check back soon.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Median price" value={latest.median_price ? formatKsh(Number(latest.median_price)) : "—"} />
            <Stat label="Active listings" value={String(latest.listing_count)} />
            <Stat label="New this month" value={String(latest.new_listings)} />
            <Stat
              label="Avg. days on market"
              value={latest.avg_days_on_market ? `${Math.round(Number(latest.avg_days_on_market))} days` : "—"}
            />
          </div>

          {change != null && (
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-secondary" />
              )}
              Median asking prices are {change >= 0 ? "up" : "down"} {Math.abs(change).toFixed(1)}% over the period shown.
            </p>
          )}

          <section className="mt-6 rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-4 font-bold">Median asking price trend</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="medianFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}M`} width={44} />
                  <Tooltip formatter={(v) => formatKsh(Number(v))} />
                  <Area type="monotone" dataKey="median" stroke="hsl(var(--primary))" fill="url(#medianFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Monthly market statistics</caption>
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Month</th>
                  <th className="px-4 py-2 font-semibold">Median</th>
                  <th className="px-4 py-2 font-semibold">Average</th>
                  <th className="px-4 py-2 font-semibold">Listings</th>
                  <th className="px-4 py-2 font-semibold">New</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2">{periodLabel(r.period)}</td>
                    <td className="px-4 py-2">{r.median_price ? formatKsh(Number(r.median_price)) : "—"}</td>
                    <td className="px-4 py-2">{r.avg_price ? formatKsh(Number(r.avg_price)) : "—"}</td>
                    <td className="px-4 py-2">{r.listing_count}</td>
                    <td className="px-4 py-2">{r.new_listings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-primary">{value}</p>
    </div>
  );
}
