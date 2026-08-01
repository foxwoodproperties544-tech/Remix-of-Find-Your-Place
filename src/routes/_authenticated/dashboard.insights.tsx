import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { getAgentInsights } from "@/lib/insights.functions";
import { LayoutDashboard, Download, Eye, Inbox, TrendingUp, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/insights")({
  component: InsightsPage,
  head: () => ({
    meta: [
      { title: "Traffic insights — Foxwood dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function InsightsPage() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(
    fmtDate(new Date(today.getTime() - 29 * 864e5)),
  );
  const [to, setTo] = useState(fmtDate(today));

  const fetchInsights = useServerFn(getAgentInsights);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["agent-insights", from, to],
    queryFn: () => fetchInsights({ data: { from, to } }),
  });

  function exportListingsCsv() {
    const rows = data?.byListing ?? [];
    const header = [
      "id",
      "title",
      "status",
      "price",
      "views",
      "inquiries",
      "conversion_pct",
    ];
    const lines = [header.join(",")].concat(
      rows.map((r) =>
        [
          r.id,
          JSON.stringify(r.title ?? ""),
          r.status,
          r.price ?? "",
          r.views,
          r.inquiries,
          r.conversion,
        ].join(","),
      ),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foxwood-insights-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportDailyCsv() {
    const rows = data?.daily ?? [];
    const header = ["date", "views", "inquiries"];
    const lines = [header.join(",")].concat(
      rows.map((r) => [r.date, r.views, r.inquiries].join(",")),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foxwood-daily-${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const t = data?.totals;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" /> Traffic insights
          </h1>
          <p className="text-sm text-muted-foreground">
            Views and inquiries across your listings — export anytime.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-border bg-field text-sm px-2 py-1"
          />
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-border bg-field text-sm px-2 py-1"
          />
          <button
            onClick={exportListingsCsv}
            disabled={!data}
            className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" /> Export listings
          </button>
          <button
            onClick={exportDailyCsv}
            disabled={!data}
            className="btn-ghost text-sm inline-flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" /> Daily CSV
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          icon={<Home className="h-4 w-4" />}
          label="Listings"
          value={t?.listings ?? 0}
          sub={`${t?.published ?? 0} published`}
        />
        <Stat
          icon={<Eye className="h-4 w-4" />}
          label="Views"
          value={t?.views ?? 0}
        />
        <Stat
          icon={<Inbox className="h-4 w-4" />}
          label="Inquiries"
          value={t?.inquiries ?? 0}
        />
        <Stat
          icon={<TrendingUp className="h-4 w-4" />}
          label="Conversion"
          value={`${t?.conversion ?? 0}%`}
          sub="inquiries ÷ views"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-3">Traffic over time</div>
        <div className="h-64">
          {isLoading || isFetching ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily ?? []}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} tickMargin={6} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--primary))"
                  fill="url(#gv)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="inquiries"
                  stroke="hsl(var(--secondary))"
                  fill="url(#gi)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold text-sm">
          Per-listing performance
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Listing</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Views</th>
                <th className="text-right px-4 py-3">Inquiries</th>
                <th className="text-right px-4 py-3">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : (data?.byListing?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No listings in range yet.
                  </td>
                </tr>
              ) : (
                data!.byListing.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-2">
                      <Link
                        to="/properties/$id"
                        params={{ id: r.id }}
                        className="font-medium hover:text-primary"
                      >
                        {r.title || "Untitled"}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs capitalize rounded-full bg-muted px-2 py-0.5">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.views}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.inquiries}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.conversion}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
