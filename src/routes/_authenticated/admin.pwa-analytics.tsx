import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getPwaInstallAnalytics } from "@/lib/pwa-analytics.functions";
import { Download, Smartphone, Eye, MousePointerClick, CheckCircle2, XCircle } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/admin/pwa-analytics")({
  component: PwaAnalytics,
  head: () => ({ meta: [{ title: "PWA install analytics — Admin" }, { name: "robots", content: "noindex" }] }),
});

function daysAgoISO(n: number) {
  const d = new Date(); d.setUTCDate(d.getUTCDate() - n); d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
function todayISO() {
  const d = new Date(); d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}
function isoToDateInput(iso: string) { return iso.slice(0, 10); }

function PwaAnalytics() {
  const analyticsFn = useServerFn(getPwaInstallAnalytics);
  const [from, setFrom] = useState(isoToDateInput(daysAgoISO(29)));
  const [to, setTo] = useState(isoToDateInput(todayISO()));

  const query = useQuery({
    queryKey: ["pwa-analytics", from, to],
    queryFn: () => analyticsFn({
      data: {
        from: new Date(from + "T00:00:00Z").toISOString(),
        to: new Date(to + "T23:59:59Z").toISOString(),
      },
    }),
  });

  const data = query.data;
  const byDay = data?.byDay ?? [];

  const platformRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.byPlatform).map(([platform, counts]) => ({ platform, ...counts }));
  }, [data]);

  function exportCsv() {
    if (!data) return;
    const header = ["date", "impression", "install_click", "installed", "dismiss", "ios_hint_shown"];
    const rows = byDay.map((r: any) => [r.day, r.impression, r.install_click, r.installed, r.dismiss, r.ios_hint_shown]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `pwa-install-analytics_${from}_to_${to}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  const t = data?.totals ?? { impression: 0, install_click: 0, installed: 0, dismiss: 0, ios_hint_shown: 0 };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">
            <Smartphone className="h-3.5 w-3.5" /> PWA
          </div>
          <h1 className="text-3xl font-bold mt-2">Install banner analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Impressions, install clicks, and successful installs from the PWA banner.</p>
        </div>
        <button onClick={exportCsv} disabled={!data} className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-2 disabled:opacity-50">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
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
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        <StatCard icon={<Eye className="h-3.5 w-3.5" />} label="Impressions" value={t.impression} />
        <StatCard icon={<MousePointerClick className="h-3.5 w-3.5" />} label="Install clicks" value={t.install_click} sub={`${data?.clickRate ?? 0}% CTR`} />
        <StatCard icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Installed" value={t.installed} sub={`${data?.installRate ?? 0}% of clicks`} />
        <StatCard icon={<XCircle className="h-3.5 w-3.5" />} label="Dismissed" value={t.dismiss} />
        <StatCard icon={<Smartphone className="h-3.5 w-3.5" />} label="iOS hints shown" value={t.ios_hint_shown} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="font-semibold mb-3">Events by day</div>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={byDay} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="impression" stroke="#0F766E" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="install_click" stroke="#FE4C25" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="installed" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="dismiss" stroke="#94a3b8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 overflow-x-auto">
        <div className="font-semibold mb-3">Breakdown by platform</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 pr-3">Platform</th>
              <th className="py-2 pr-3">Impressions</th>
              <th className="py-2 pr-3">Clicks</th>
              <th className="py-2 pr-3">Installed</th>
              <th className="py-2 pr-3">Dismiss</th>
              <th className="py-2 pr-3">iOS hint</th>
              <th className="py-2 pr-3">CTR</th>
            </tr>
          </thead>
          <tbody>
            {platformRows.length === 0 && (
              <tr><td colSpan={7} className="py-4 text-muted-foreground">No events yet in this range.</td></tr>
            )}
            {platformRows.map((r) => {
              const ctr = r.impression > 0 ? ((r.install_click / r.impression) * 100).toFixed(2) : "0.00";
              return (
                <tr key={r.platform} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium capitalize">{r.platform}</td>
                  <td className="py-2 pr-3">{r.impression}</td>
                  <td className="py-2 pr-3">{r.install_click}</td>
                  <td className="py-2 pr-3">{r.installed}</td>
                  <td className="py-2 pr-3">{r.dismiss}</td>
                  <td className="py-2 pr-3">{r.ios_hint_shown}</td>
                  <td className="py-2 pr-3">{ctr}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {query.isLoading && <div className="mt-4 text-sm text-muted-foreground">Loading…</div>}
      {query.error && <div className="mt-4 text-sm text-destructive">Failed to load analytics.</div>}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="text-2xl font-bold mt-1">{value.toLocaleString()}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
