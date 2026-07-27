import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, MapPin, Video, Users, ExternalLink } from "lucide-react";
import { listMyViewings } from "@/lib/viewings.functions";
import { ViewingStatusBadge } from "@/components/viewings/ViewingStatusBadge";
import { formatViewingTime, VIEWING_TYPE_LABEL } from "@/lib/viewings";

export const Route = createFileRoute("/_authenticated/dashboard/viewings/")({
  head: () => ({
    meta: [
      { title: "My viewings — Foxwood Properties" },
      { name: "description", content: "Track every property viewing you have booked: pending requests, confirmed appointments, reschedules and completed visits." },
      { property: "og:title", content: "My viewings | Foxwood Properties" },
      { property: "og:description", content: "Manage your property viewing bookings on Foxwood Properties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyViewings,
});

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "rescheduled", label: "Rescheduled" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

function MyViewings() {
  const load = useServerFn(listMyViewings);
  const [tab, setTab] = useState("upcoming");

  const q = useQuery({ queryKey: ["my-viewings"], queryFn: () => load() as Promise<any[]> });
  const rows = q.data ?? [];

  const filtered = useMemo(() => {
    const now = Date.now();
    if (tab === "all") return rows;
    if (tab === "upcoming") {
      return rows.filter((r) => new Date(r.proposed_at ?? r.requested_at).getTime() > now
        && !["cancelled", "declined", "completed", "no_show"].includes(r.status));
    }
    if (tab === "cancelled") return rows.filter((r) => ["cancelled", "declined"].includes(r.status));
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  const count = (key: string) => {
    const now = Date.now();
    if (key === "all") return rows.length;
    if (key === "upcoming") return rows.filter((r) => new Date(r.proposed_at ?? r.requested_at).getTime() > now && !["cancelled", "declined", "completed", "no_show"].includes(r.status)).length;
    if (key === "cancelled") return rows.filter((r) => ["cancelled", "declined"].includes(r.status)).length;
    return rows.filter((r) => r.status === key).length;
  };

  return (
    <div className="container-page py-10">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
        <CalendarClock className="h-3.5 w-3.5" /> Viewings
      </div>
      <h1 className="mt-2 text-3xl font-bold">My viewings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every viewing you have booked, with reschedules, cancellations and feedback in one place.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${tab === t.key ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
          >
            {t.label} ({count(t.key)})
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : !filtered.length ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">Nothing here yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Book a viewing from any listing and it will show up here.</p>
          <Link to="/properties" className="btn-primary btn-primary-hover mt-4 inline-flex">Browse properties</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {filtered.map((r) => (
            <Link
              key={r.id}
              to="/dashboard/viewings/$id"
              params={{ id: r.id }}
              className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{r.property?.title ?? "Listing"}</h3>
                    <ViewingStatusBadge status={r.status} />
                    {r.status === "completed" && !r.has_feedback && (
                      <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] font-semibold text-secondary">Feedback requested</span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{r.booking_ref}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {r.viewing_type === "virtual" ? <Video className="h-3 w-3" /> : r.viewing_type === "open_house" ? <Users className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      {VIEWING_TYPE_LABEL[r.viewing_type] ?? r.viewing_type}
                    </span>
                    <span>{formatViewingTime(r.proposed_at ?? r.requested_at)}</span>
                    {r.proposed_at && <span className="font-semibold text-amber-600">New time proposed</span>}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
              {["confirmed", "approved"].includes(r.status) && (
                <ViewingCalendarActions
                  compact
                  className="mt-3"
                  viewing={{
                    booking_ref: r.booking_ref,
                    requested_at: r.proposed_at ?? r.requested_at,
                    duration_minutes: r.duration_minutes ?? 30,
                    viewing_type: r.viewing_type,
                    meeting_location: r.meeting_location,
                    virtual_link: r.virtual_link,
                    propertyTitle: r.property?.title ?? "Property",
                  }}
                />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
