import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { getPlatformAnalytics } from "@/lib/analytics.functions";
import {
  ShieldCheck, Home, Users2, Inbox, CalendarCheck, Eye, Star, BadgeCheck,
  TrendingUp, Clock, CheckCircle2, XCircle, Download,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalytics,
  head: () => ({ meta: [{ title: "Analytics — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

function Stat({ icon: Icon, label, value, hint, tone = "primary" }: any) {
  const toneClass = tone === "secondary" ? "text-secondary bg-secondary/10" : "text-primary bg-primary-soft";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-3xl font-bold">{value ?? "—"}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }
function toIsoStart(d: string) { return new Date(d + "T00:00:00.000Z").toISOString(); }
function toIsoEnd(d: string) { return new Date(d + "T23:59:59.999Z").toISOString(); }

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function AdminAnalytics() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const fetchFn = useServerFn(getPlatformAnalytics);

  const today = new Date();
  const monthAgo = new Date(Date.now() - 30 * 864e5);
  const [from, setFrom] = useState<string>(isoDay(monthAgo));
  const [to, setTo] = useState<string>(isoDay(today));

  const range = useMemo(() => ({ from: toIsoStart(from), to: toIsoEnd(to) }), [from, to]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics", range.from, range.to],
    enabled: isAdmin,
    queryFn: () => fetchFn({ data: range }),
  });

  function exportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Metric", "Value"],
      ["Date range", `${from} → ${to}`],
      [],
      ["Listings — total", data.properties.total],
      ["Listings — published", data.properties.published],
      ["Listings — pending", data.properties.pending],
      ["Listings — rejected", data.properties.rejected],
      ["Listings — featured", data.properties.featured],
      ["Listings — verified", data.properties.verified],
      [],
      ["Engagement — property views", data.engagement.views],
      ["Engagement — inquiries", data.engagement.inquiries],
      ["Viewings — total", data.viewings.total],
      ["Viewings — pending", data.viewings.pending],
      [],
      ["Leads — total", data.leads.total],
      ["Leads — new", data.leads.new],
      ["Leads — won", data.leads.won],
      [],
      ["Users — total accounts", data.users.total],
      ["Users — new in range", data.users.newInRange],
      ["Users — agents", data.users.agents],
      ["Users — verified profiles", data.users.verified],
    ];
    downloadCsv(`foxwood-analytics_${from}_${to}.csv`, rows);
  }

  function applyPreset(days: number) {
    setFrom(isoDay(new Date(Date.now() - days * 864e5)));
    setTo(isoDay(new Date()));
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-xl font-bold mt-3">Admins only</h1>
        <button onClick={() => nav({ to: "/dashboard/account" })} className="btn-primary btn-primary-hover mt-4">Back</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </div>
          <h1 className="text-3xl font-bold mt-2">Platform analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Filter by date range and export key metrics.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} disabled={!data} className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-1">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <Link to="/admin" className="btn-ghost text-sm">Moderation</Link>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground block">From</label>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block">To</label>
          <input type="date" value={to} min={from} max={isoDay(new Date())} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-1">
          {[7, 30, 90, 365].map((d) => (
            <button key={d} onClick={() => applyPreset(d)} className="btn-ghost text-xs">Last {d}d</button>
          ))}
        </div>
      </div>

      {isLoading && <div className="mt-8 text-sm text-muted-foreground">Loading metrics…</div>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Home} label="Listings created" value={data.properties.total} hint={`${data.properties.published} published`} />
            <Stat icon={Clock} label="Pending review" value={data.properties.pending} tone="secondary" />
            <Stat icon={Star} label="Featured" value={data.properties.featured} />
            <Stat icon={BadgeCheck} label="Verified listings" value={data.properties.verified} />
          </div>

          <h2 className="text-lg font-semibold mt-8">Engagement</h2>
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Eye} label="Property views" value={data.engagement.views} />
            <Stat icon={Inbox} label="Inquiries" value={data.engagement.inquiries} tone="secondary" />
            <Stat icon={CalendarCheck} label="Viewings booked" value={data.viewings.total} hint={`${data.viewings.pending} pending`} />
            <Stat icon={TrendingUp} label="Leads won" value={data.leads.won} hint={`of ${data.leads.total} total`} />
          </div>

          <h2 className="text-lg font-semibold mt-8">Users</h2>
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={Users2} label="Total accounts" value={data.users.total} />
            <Stat icon={TrendingUp} label="New in range" value={data.users.newInRange} tone="secondary" />
            <Stat icon={ShieldCheck} label="Agents" value={data.users.agents} />
            <Stat icon={BadgeCheck} label="Verified profiles" value={data.users.verified} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-3">Moderation queue</h3>
              <ul className="text-sm space-y-2">
                <li className="flex justify-between"><span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-secondary" /> Pending</span><span className="font-semibold">{data.properties.pending}</span></li>
                <li className="flex justify-between"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Published</span><span className="font-semibold">{data.properties.published}</span></li>
                <li className="flex justify-between"><span className="inline-flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /> Rejected</span><span className="font-semibold">{data.properties.rejected}</span></li>
              </ul>
              <Link to="/admin" className="btn-primary btn-primary-hover mt-4 inline-flex text-sm">Open moderation</Link>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-3">Recent listings</h3>
              <ul className="text-sm divide-y divide-border">
                {data.recentListings.map((p: any) => (
                  <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                    <Link to="/properties/$id" params={{ id: p.slug ?? p.id }} className="truncate hover:text-primary">{p.title}</Link>
                    <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
                  </li>
                ))}
                {data.recentListings.length === 0 && <li className="py-3 text-muted-foreground">No listings in range.</li>}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
