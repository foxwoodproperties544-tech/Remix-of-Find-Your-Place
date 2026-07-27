import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, FileSpreadsheet, Search, TrendingDown, TrendingUp, Undo2, LineChart as LineChartIcon } from "lucide-react";
import { listPriceChanges, revertPriceChange, getPriceAnalytics, type AdminPriceChange } from "@/lib/price-history.functions";
import { downloadCsv, downloadExcel } from "@/lib/viewings";
import { formatKsh } from "@/lib/mock-data";
import { formatDate, formatDelta } from "@/lib/price-history";
import { KENYA_COUNTIES } from "@/lib/kenya-locations-data";
import { ALL_TYPES } from "@/lib/taxonomy";

const PAGE = 25;

export const Route = createFileRoute("/_authenticated/admin/price-history")({
  head: () => ({
    meta: [
      { title: "Price history management — Foxwood Properties" },
      { name: "description", content: "Audit every asking-price change across Foxwood Properties, review the largest reductions and increases, and export pricing reports." },
      { property: "og:title", content: "Price history management | Foxwood Properties" },
      { property: "og:description", content: "Platform-wide oversight of listing price changes and pricing analytics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPriceHistory,
});

function AdminPriceHistory() {
  const load = useServerFn(listPriceChanges);
  const analytics = useServerFn(getPriceAnalytics);
  const revert = useServerFn(revertPriceChange);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [county, setCounty] = useState("");
  const [town, setTown] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [direction, setDirection] = useState<"all" | "down" | "up">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shown, setShown] = useState(PAGE);

  const changes = useQuery({
    queryKey: ["admin-price-history", q, county, town, propertyType, direction, from, to],
    queryFn: () =>
      load({
        data: {
          q: q || undefined,
          county: county || undefined,
          town: town || undefined,
          propertyType: propertyType || undefined,
          direction,
          startDate: from ? new Date(from).toISOString() : undefined,
          endDate: to ? new Date(to + "T23:59:59").toISOString() : undefined,
          limit: 500,
        },
      }) as Promise<AdminPriceChange[]>,
  });

  const stats = useQuery({
    queryKey: ["admin-price-analytics"],
    queryFn: () => analytics({ data: { days: 180 } }) as Promise<any>,
  });

  const rows = changes.data ?? [];
  const visible = rows.slice(0, shown);
  const exportName = (ext: string) => `foxwood-price-history-${new Date().toISOString().slice(0, 10)}.${ext}`;
  const exportRows = () =>
    rows.map((r) => ({
      date: formatDate(r.created_at),
      property: r.title,
      county: r.county ?? "",
      town: r.town ?? "",
      type: r.property_type ?? "",
      owner: r.owner_name ?? "",
      previous_price: r.previous_price ?? "",
      new_price: r.new_price,
      amount_changed: r.amount_changed ?? "",
      percent_changed: r.percent_changed ?? "",
      reason: r.reason ?? "",
      reverted: r.reverted ? "yes" : "no",
    }));

  async function onRevert(row: AdminPriceChange) {
    if (!confirm(`Restore ${row.title} to ${formatKsh(row.previous_price ?? 0)}? The original record stays in the audit log.`)) return;
    try {
      await revert({ data: { historyId: row.id } });
      toast.success("Price change reverted");
      qc.invalidateQueries({ queryKey: ["admin-price-history"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not revert this change");
    }
  }

  const a = stats.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LineChartIcon className="h-6 w-6 text-primary" /> Price history management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every recorded asking-price change across the platform, with pricing analytics and exports.
        </p>
      </header>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold">
            Search
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Property, agent or owner" className="input-base pl-9 w-full" />
            </div>
          </label>
          <label className="text-xs font-semibold">
            County
            <select value={county} onChange={(e) => setCounty(e.target.value)} className="input-base mt-1 w-full">
              <option value="">All counties</option>
              {KENYA_COUNTIES.map((c: any) => (
                <option key={typeof c === "string" ? c : c.name} value={typeof c === "string" ? c : c.name}>
                  {typeof c === "string" ? c : c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold">
            Town
            <input value={town} onChange={(e) => setTown(e.target.value)} placeholder="Any town" className="input-base mt-1 w-full" />
          </label>
          <label className="text-xs font-semibold">
            Property type
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="input-base mt-1 w-full">
              <option value="">All types</option>
              {ALL_TYPES.map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold">
            Direction
            <select value={direction} onChange={(e) => setDirection(e.target.value as any)} className="input-base mt-1 w-full">
              <option value="all">All changes</option>
              <option value="down">Reductions only</option>
              <option value="up">Increases only</option>
            </select>
          </label>
          <label className="text-xs font-semibold">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-base mt-1 w-full" />
          </label>
          <label className="text-xs font-semibold">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-base mt-1 w-full" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button onClick={() => downloadCsv(exportName("csv"), exportRows())} className="btn-ghost">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() =>
              downloadExcel(exportName("xls"), [
                { name: "Price changes", rows: exportRows() },
                { name: "Avg by county", rows: (a?.byCounty ?? []).map((r: any) => ({ county: r.key, average_price: r.avg, listings: r.count })) },
                { name: "Avg by town", rows: (a?.byTown ?? []).map((r: any) => ({ town: r.key, average_price: r.avg, listings: r.count })) },
                { name: "Avg by type", rows: (a?.byType ?? []).map((r: any) => ({ type: r.key, average_price: r.avg, listings: r.count })) },
                { name: "Trend", rows: (a?.trend ?? []) as any[] },
              ])
            }
            className="btn-ghost"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Analytics */}
      {a && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Pricing overview">
            <ul className="text-sm space-y-1.5">
              <li>Recorded changes (180 days): <strong>{a.totalChanges}</strong></li>
              <li>Average days between changes: <strong>{a.avgDaysBetweenChanges ?? "—"}</strong></li>
              <li>Counties tracked: <strong>{a.byCounty.length}</strong></li>
            </ul>
            {a.trend.length > 0 && (
              <div className="mt-3 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={a.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={30} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                    <Bar dataKey="drops" name="Reductions" fill="hsl(var(--primary))" />
                    <Bar dataKey="increases" name="Increases" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel title="Largest reductions">
            <TopList rows={a.largestDrops} icon={<TrendingDown className="h-3.5 w-3.5 text-primary" />} />
          </Panel>
          <Panel title="Largest increases">
            <TopList rows={a.largestIncreases} icon={<TrendingUp className="h-3.5 w-3.5 text-secondary" />} />
          </Panel>

          <Panel title="Average asking price by county">
            <AvgList rows={a.byCounty} />
          </Panel>
          <Panel title="Average asking price by town">
            <AvgList rows={a.byTown} />
          </Panel>
          <Panel title="Average asking price by property type">
            <AvgList rows={a.byType} />
          </Panel>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card p-4 overflow-x-auto">
        {changes.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading price changes…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No price changes match these filters.</p>
        ) : (
          <>
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Property</th>
                  <th className="px-2 py-2 font-medium">Location</th>
                  <th className="px-2 py-2 font-medium">Owner</th>
                  <th className="px-2 py-2 font-medium">Previous</th>
                  <th className="px-2 py-2 font-medium">New</th>
                  <th className="px-2 py-2 font-medium">Change</th>
                  <th className="px-2 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className={"border-b border-border/60 last:border-0 " + (r.reverted ? "opacity-50" : "")}>
                    <td className="px-2 py-2 whitespace-nowrap">{formatDate(r.created_at)}</td>
                    <td className="px-2 py-2">
                      <Link to="/properties/$id" params={{ id: r.slug ?? r.property_id }} className="font-semibold hover:text-primary">
                        {r.title}
                      </Link>
                      {r.reason && <div className="text-[11px] text-muted-foreground">{r.reason}</div>}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{[r.town, r.county].filter(Boolean).join(", ")}</td>
                    <td className="px-2 py-2 text-muted-foreground">{r.owner_name ?? "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{r.previous_price == null ? "—" : formatKsh(r.previous_price)}</td>
                    <td className="px-2 py-2 font-semibold">{formatKsh(r.new_price)}</td>
                    <td className={"px-2 py-2 font-semibold " + ((r.amount_changed ?? 0) < 0 ? "text-primary" : "text-secondary")}>
                      {formatDelta(r.amount_changed, r.percent_changed)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {!r.reverted && r.previous_price != null && (
                        <button onClick={() => onRevert(r)} className="btn-ghost text-xs" title="Restore the previous price">
                          <Undo2 className="h-3.5 w-3.5" /> Revert
                        </button>
                      )}
                      {r.reverted && <span className="text-xs text-muted-foreground">Reverted</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > shown && (
              <button onClick={() => setShown((n) => n + PAGE)} className="mt-3 w-full rounded-xl border border-border py-2 text-sm font-semibold hover:bg-muted">
                Load more ({rows.length - shown} remaining)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TopList({ rows, icon }: { rows: AdminPriceChange[]; icon: React.ReactNode }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">Not enough data yet.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {rows.slice(0, 6).map((r) => (
        <li key={r.id} className="flex items-start justify-between gap-2">
          <span className="flex items-start gap-1.5 min-w-0">
            {icon}
            <Link to="/properties/$id" params={{ id: r.slug ?? r.property_id }} className="truncate hover:text-primary">{r.title}</Link>
          </span>
          <span className="whitespace-nowrap font-semibold">{formatDelta(r.amount_changed, r.percent_changed)}</span>
        </li>
      ))}
    </ul>
  );
}

function AvgList({ rows }: { rows: { key: string; avg: number; count: number }[] }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">Not enough data yet.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.slice(0, 8).map((r) => (
        <li key={r.key} className="flex items-center justify-between gap-2">
          <span className="truncate capitalize">{r.key} <span className="text-xs text-muted-foreground">· {r.count}</span></span>
          <span className="font-semibold text-primary whitespace-nowrap">{formatKsh(r.avg)}</span>
        </li>
      ))}
    </ul>
  );
}
