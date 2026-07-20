import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listMyCampaigns, getAdAnalytics } from "@/lib/ads.functions";
import { BarChart3, Download, Eye, MousePointerClick, Percent } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard/ad-analytics")({
  component: AdAnalytics,
  head: () => ({ meta: [{ title: "Ad analytics — Foxwood" }, { name: "robots", content: "noindex" }] }),
});

function daysAgoISO(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
function todayISO() {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}
function isoToDateInput(iso: string) { return iso.slice(0, 10); }

function AdAnalytics() {
  const listFn = useServerFn(listMyCampaigns);
  const analyticsFn = useServerFn(getAdAnalytics);

  const [from, setFrom] = useState(isoToDateInput(daysAgoISO(29)));
  const [to, setTo] = useState(isoToDateInput(todayISO()));
  const [campaignId, setCampaignId] = useState<string>("");

  const { data: campaigns } = useQuery({
    queryKey: ["my-ad-campaigns-select"],
    queryFn: () => listFn(),
  });

  const query = useQuery({
    queryKey: ["ad-analytics", from, to, campaignId],
    queryFn: () =>
      analyticsFn({
        data: {
          from: new Date(from + "T00:00:00Z").toISOString(),
          to: new Date(to + "T23:59:59Z").toISOString(),
          campaignId: campaignId || undefined,
        },
      }),
  });

  const daily = query.data?.daily ?? [];

  // Fill missing days with zeros for a continuous chart
  const filled = useMemo(() => {
    if (!from || !to) return daily;
    const map = new Map(daily.map((d) => [d.day, d]));
    const out: { day: string; impressions: number; clicks: number; ctr: number }[] = [];
    const start = new Date(from + "T00:00:00Z");
    const end = new Date(to + "T00:00:00Z");
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key) ?? { day: key, impressions: 0, clicks: 0 };
      const ctr = row.impressions > 0 ? Number(((row.clicks / row.impressions) * 100).toFixed(2)) : 0;
      out.push({ ...row, ctr });
    }
    return out;
  }, [daily, from, to]);

  const totals = useMemo(() => {
    const imp = filled.reduce((a, r) => a + r.impressions, 0);
    const clk = filled.reduce((a, r) => a + r.clicks, 0);
    const ctr = imp > 0 ? (clk / imp) * 100 : 0;
    return { imp, clk, ctr };
  }, [filled]);

  function exportCsv() {
    const header = ["date", "impressions", "clicks", "ctr_percent"];
    const rows = filled.map((r) => [r.day, r.impressions, r.clicks, r.ctr.toFixed(2)]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad-analytics_${from}_to_${to}${campaignId ? `_${campaignId.slice(0, 8)}` : ""}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">
            <BarChart3 className="h-3.5 w-3.5" /> Insights
          </div>
          <h1 className="text-3xl font-bold mt-2">Ad performance</h1>
          <p className="text-sm text-muted-foreground mt-1">Impressions, clicks, and CTR by day for your campaigns.</p>
        </div>
        <button onClick={exportCsv} className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <label className="text-[10px] uppercase font-bold text-muted-foreground">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <label className="text-[10px] uppercase font-bold text-muted-foreground">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="rounded-xl border border-border bg-card p-3 md:col-span-2">
          <label className="text-[10px] uppercase font-bold text-muted-foreground">Campaign</label>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">All campaigns</option>
            {campaigns?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.title} · {c.placement}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" /> Impressions</div>
          <div className="text-2xl font-bold mt-1">{totals.imp.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground"><MousePointerClick className="h-3.5 w-3.5" /> Clicks</div>
          <div className="text-2xl font-bold mt-1">{totals.clk.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground"><Percent className="h-3.5 w-3.5" /> CTR</div>
          <div className="text-2xl font-bold mt-1">{totals.ctr.toFixed(2)}%</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="font-semibold mb-3">Impressions & clicks</div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={filled} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="impressions" stroke="#0F766E" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="clicks" stroke="#FE4C25" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="font-semibold mb-3">CTR by day (%)</div>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={filled} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="ctr" fill="#0F766E" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {query.isLoading && <div className="mt-4 text-sm text-muted-foreground">Loading…</div>}
    </div>
  );
}
