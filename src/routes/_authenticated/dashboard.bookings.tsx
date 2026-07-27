import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, MapPin, Video, Users, Download } from "lucide-react";
import { listAgentViewings } from "@/lib/viewings.functions";
import { ViewingStatusBadge } from "@/components/viewings/ViewingStatusBadge";
import { downloadCsv, formatViewingTime, VIEWING_TYPE_LABEL } from "@/lib/viewings";

export const Route = createFileRoute("/_authenticated/dashboard/bookings")({
  head: () => ({
    meta: [
      { title: "Viewing bookings — Foxwood Properties" },
      { name: "description", content: "Review, confirm, reschedule and complete every viewing request buyers have made on your listings." },
      { property: "og:title", content: "Viewing bookings | Foxwood Properties" },
      { property: "og:description", content: "Agent booking calendar for property viewings on Foxwood Properties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentBookings,
});

const TABS = ["today", "upcoming", "pending", "completed", "all"];

function AgentBookings() {
  const load = useServerFn(listAgentViewings);
  const [tab, setTab] = useState("upcoming");

  const q = useQuery({ queryKey: ["agent-viewings"], queryFn: () => load() as Promise<any[]> });
  const rows = q.data ?? [];

  const filtered = useMemo(() => {
    const now = Date.now();
    const today = new Date().toDateString();
    return rows.filter((r) => {
      const t = new Date(r.proposed_at ?? r.requested_at);
      if (tab === "all") return true;
      if (tab === "today") return t.toDateString() === today;
      if (tab === "pending") return ["pending", "rescheduled"].includes(r.status);
      if (tab === "completed") return ["completed", "no_show"].includes(r.status);
      return t.getTime() > now && !["cancelled", "declined", "completed", "no_show"].includes(r.status);
    });
  }, [rows, tab]);

  const stats = useMemo(() => ({
    pending: rows.filter((r) => r.status === "pending").length,
    confirmed: rows.filter((r) => ["confirmed", "approved"].includes(r.status)).length,
    completed: rows.filter((r) => r.status === "completed").length,
    noShow: rows.filter((r) => r.status === "no_show").length,
  }), [rows]);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <CalendarDays className="h-3.5 w-3.5" /> Bookings
          </div>
          <h1 className="mt-2 text-3xl font-bold">Viewing bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every viewing request on your listings, from first request to post-visit feedback.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/availability" className="btn-secondary">Set availability</Link>
          <button
            onClick={() => downloadCsv("foxwood-viewings.csv", filtered.map((r) => ({
              ref: r.booking_ref, property: r.property?.title ?? "", status: r.status,
              type: r.viewing_type, when: r.proposed_at ?? r.requested_at,
              visitor: r.requester_name, phone: r.requester_phone, email: r.requester_email,
            })))}
            className="btn-ghost"
          ><Download className="h-4 w-4" /> Export CSV</button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Confirmed" value={stats.confirmed} />
        <Stat label="Completed" value={stats.completed} />
        <Stat label="No-shows" value={stats.noShow} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${tab === t ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>{t}</button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : !filtered.length ? (
        <p className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No bookings in this view yet.</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {filtered.map((r) => (
            <Link key={r.id} to="/dashboard/viewings/$id" params={{ id: r.id }} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{r.property?.title ?? "Listing"}</h3>
                <ViewingStatusBadge status={r.status} />
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{r.booking_ref}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {r.viewing_type === "virtual" ? <Video className="h-3 w-3" /> : r.viewing_type === "open_house" ? <Users className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                  {VIEWING_TYPE_LABEL[r.viewing_type] ?? r.viewing_type}
                </span>
                <span>{formatViewingTime(r.proposed_at ?? r.requested_at)}</span>
                <span>{r.requester_name}</span>
                <span>{r.visitor_count ?? 1} visitor(s)</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
