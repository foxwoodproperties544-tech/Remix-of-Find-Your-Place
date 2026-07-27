import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarRange, Download, FileSpreadsheet, Search } from "lucide-react";
import { adminListViewings } from "@/lib/viewings.functions";
import { ViewingStatusBadge } from "@/components/viewings/ViewingStatusBadge";
import { downloadCsv, downloadExcel, formatViewingTime, VIEWING_STATUSES, VIEWING_STATUS_LABEL, VIEWING_TYPES, VIEWING_TYPE_LABEL } from "@/lib/viewings";

export const Route = createFileRoute("/_authenticated/admin/viewings")({
  head: () => ({
    meta: [
      { title: "Viewings admin — Foxwood Properties" },
      { name: "description", content: "Platform-wide oversight of property viewing bookings: filters, conversion analytics, no-show tracking and CSV exports." },
      { property: "og:title", content: "Viewings admin | Foxwood Properties" },
      { property: "og:description", content: "Monitor every property viewing booked across Foxwood Properties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminViewings,
});

function AdminViewings() {
  const load = useServerFn(adminListViewings);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [viewingType, setViewingType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = useQuery({
    queryKey: ["admin-viewings", q, status, viewingType, from, to],
    queryFn: () => load({
      data: {
        q: q || undefined,
        status: status || undefined,
        viewingType: viewingType || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      },
    }) as Promise<any>,
  });

  const rows = query.data?.rows ?? [];
  const a = query.data?.analytics;

  return (
    <div className="container-page py-10">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
        <CalendarRange className="h-3.5 w-3.5" /> Admin
      </div>
      <h1 className="mt-2 text-3xl font-bold">Viewings oversight</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every booking across the platform, with conversion and no-show analytics.</p>

      {a && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total" value={a.total} />
          <Stat label="Confirmed" value={a.confirmed} />
          <Stat label="Completed" value={a.completed} />
          <Stat label="Cancelled" value={a.cancelled} />
          <Stat label="No-shows" value={a.noShows} />
          <Stat label="Avg confirm (h)" value={a.avgConfirmHours ?? "—"} />
        </div>
      )}

      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, buyer, property, agent" className="input-base pl-9" />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-base">
          <option value="">All statuses</option>
          {VIEWING_STATUSES.map((s) => <option key={s} value={s}>{VIEWING_STATUS_LABEL[s]}</option>)}
        </select>
        <select value={viewingType} onChange={(e) => setViewingType(e.target.value)} className="input-base">
          <option value="">All types</option>
          {VIEWING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-base" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-base" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button onClick={() => downloadCsv(exportName("csv"), exportRows())} className="btn-ghost">
          <Download className="h-4 w-4" /> Export CSV
        </button>
        <button
          onClick={() => downloadExcel(exportName("xls"), [
            { name: "Bookings", rows: exportRows() },
            { name: "Status breakdown", rows: statusBreakdown() },
            { name: "Filters", rows: filterSummary() },
          ])}
          className="btn-ghost"
        >
          <FileSpreadsheet className="h-4 w-4" /> Export Excel
        </button>
      </div>

      {a && (
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <Tally title="Most viewed properties" items={a.topProperties} />
          <Tally title="Busiest agents" items={a.topAgents} />
          <Tally title="Top locations" items={a.topLocations} />
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Ref</th><th className="p-3">Property</th><th className="p-3">Agent</th>
              <th className="p-3">Buyer</th><th className="p-3">Type</th><th className="p-3">When</th><th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : !rows.length ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No bookings match these filters.</td></tr>
            ) : rows.map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">
                  <Link to="/dashboard/viewings/$id" params={{ id: r.id }} className="text-primary hover:underline">{r.booking_ref}</Link>
                </td>
                <td className="p-3">{r.property?.title ?? "—"}</td>
                <td className="p-3">{r.agent_name ?? "—"}</td>
                <td className="p-3">{r.requester_name ?? "—"}</td>
                <td className="p-3">{VIEWING_TYPE_LABEL[r.viewing_type] ?? r.viewing_type}</td>
                <td className="p-3">{formatViewingTime(r.proposed_at ?? r.requested_at)}</td>
                <td className="p-3"><ViewingStatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Tally({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-bold">{title}</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {items.length ? items.map((i) => (
          <li key={i.label} className="flex justify-between gap-2">
            <span className="truncate text-muted-foreground">{i.label}</span>
            <span className="font-semibold">{i.value}</span>
          </li>
        )) : <li className="text-xs text-muted-foreground">No data yet.</li>}
      </ul>
    </div>
  );
}
