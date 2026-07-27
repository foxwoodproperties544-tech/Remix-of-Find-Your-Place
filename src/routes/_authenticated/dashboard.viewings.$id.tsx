import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft, Check, X, RefreshCw, CalendarPlus, Loader2, Video, MapPin, Users,
  Star, MessageSquare, Ban, CheckCheck, Phone,
} from "lucide-react";
import { actOnViewing, getViewing, submitViewingFeedback } from "@/lib/viewings.functions";
import { ViewingTimeline } from "@/components/viewings/ViewingTimeline";
import { ViewingAuditLog } from "@/components/viewings/ViewingAuditLog";
import { ViewingCalendarActions } from "@/components/viewings/ViewingCalendarActions";
import { ViewingStatusBadge } from "@/components/viewings/ViewingStatusBadge";
import { formatViewingTime, VIEWING_TYPE_LABEL } from "@/lib/viewings";

export const Route = createFileRoute("/_authenticated/dashboard/viewings/$id")({
  head: () => ({
    meta: [
      { title: "Viewing details — Foxwood Properties" },
      { name: "description", content: "Confirm, reschedule or cancel a property viewing, add notes and share feedback after the visit." },
      { property: "og:title", content: "Viewing details | Foxwood Properties" },
      { property: "og:description", content: "Manage a property viewing booking on Foxwood Properties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ViewingDetail,
});

function ViewingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const load = useServerFn(getViewing);
  const act = useServerFn(actOnViewing);
  const sendFeedback = useServerFn(submitViewingFeedback);

  const [proposed, setProposed] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [asDescribed, setAsDescribed] = useState(true);
  const [interested, setInterested] = useState(false);

  const q = useQuery({ queryKey: ["viewing", id], queryFn: () => load({ data: { id } }) as Promise<any> });

  const mut = useMutation({
    mutationFn: (vars: any) => act({ data: { id, ...vars } }),
    onSuccess: () => {
      toast.success("Booking updated");
      setProposed(""); setNote("");
      qc.invalidateQueries({ queryKey: ["viewing", id] });
      qc.invalidateQueries({ queryKey: ["my-viewings"] });
      qc.invalidateQueries({ queryKey: ["agent-viewings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });

  const fb = useMutation({
    mutationFn: () => sendFeedback({ data: { viewingId: id, rating, comments: comments.trim() || undefined, asDescribed, interestedInOffer: interested } }),
    onSuccess: () => { toast.success("Thanks for the feedback"); qc.invalidateQueries({ queryKey: ["viewing", id] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not submit feedback"),
  });

  if (q.isLoading) return <div className="p-8"><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div>;
  if (q.error || !q.data) return (
    <div className="p-8 text-center">
      <h1 className="text-xl font-bold">Booking not available</h1>
      <Link to="/dashboard/viewings" className="mt-3 inline-block text-primary underline">Back to my viewings</Link>
    </div>
  );

  const { viewing, events, feedback, agent, role } = q.data;
  const isAgent = role === "agent" || role === "admin";
  const isBuyer = role === "buyer";
  const when = viewing.proposed_at ?? viewing.requested_at;
  const active = ["pending", "approved", "confirmed", "rescheduled"].includes(viewing.status);
  const busy = mut.isPending;

  return (
    <div className="p-4 md:p-8">
      <Link to="/dashboard/viewings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> My viewings
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <header className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <ViewingStatusBadge status={viewing.status} />
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {viewing.viewing_type === "virtual" ? <Video className="h-3.5 w-3.5" /> : viewing.viewing_type === "open_house" ? <Users className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                {VIEWING_TYPE_LABEL[viewing.viewing_type] ?? viewing.viewing_type}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{viewing.booking_ref}</span>
            </div>

            <h1 className="mt-3 text-2xl font-bold">{viewing.property?.title ?? "Listing"}</h1>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <Cell label={viewing.proposed_at ? "Proposed time" : "Scheduled for"} value={formatViewingTime(when)} />
              <Cell label="Visitors" value={String(viewing.visitor_count ?? 1)} />
              <Cell label="Agent" value={agent?.full_name ?? "Foxwood agent"} />
              {viewing.meeting_location && <Cell label="Meeting point" value={viewing.meeting_location} />}
              {viewing.virtual_link && <Cell label="Virtual link" value={viewing.virtual_link} />}
              <Cell label="Requested" value={new Date(viewing.created_at).toLocaleString()} />
            </div>
            {viewing.notes && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-sm">{viewing.notes}</p>}
            {viewing.agent_notes && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-primary-soft p-3 text-sm">Agent note: {viewing.agent_notes}</p>}
            {viewing.cancel_reason && <p className="mt-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Reason: {viewing.cancel_reason}</p>}
          </header>

          {isAgent && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold">Visitor details</h2>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <Cell label="Name" value={viewing.requester_name ?? "—"} />
                <Cell label="Email" value={viewing.requester_email ?? "—"} />
                <Cell label="Phone" value={viewing.requester_phone ?? "—"} />
              </div>
              {viewing.requester_phone && (
                <a href={`tel:${viewing.requester_phone}`} className="btn-ghost mt-3 inline-flex"><Phone className="h-4 w-4" /> Call visitor</a>
              )}
              {viewing.internal_notes && <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">Internal: {viewing.internal_notes}</p>}
            </section>
          )}

          <ViewingTimeline events={events} />

          <ViewingAuditLog viewingId={id} />

          {isBuyer && viewing.status === "completed" && (
            feedback ? (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-lg font-bold">Your feedback</h2>
                <p className="mt-2 text-sm">{feedback.rating}/5 — {feedback.as_described ? "matched the listing" : "did not match the listing"}{feedback.interested_in_offer ? ", interested in making an offer" : ""}.</p>
                {feedback.comments && <p className="mt-2 text-sm text-muted-foreground">{feedback.comments}</p>}
              </section>
            ) : (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-lg font-bold">How was the viewing?</h2>
                <div className="mt-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`}>
                      <Star className={`h-6 w-6 ${n <= rating ? "fill-secondary text-secondary" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} className="input-base mt-3 text-sm" placeholder="What stood out? (optional)" />
                <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={asDescribed} onChange={(e) => setAsDescribed(e.target.checked)} /> The property matched the listing</label>
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={interested} onChange={(e) => setInterested(e.target.checked)} /> I'm interested in making an offer</label>
                <button disabled={!rating || fb.isPending} onClick={() => fb.mutate()} className="btn-primary btn-primary-hover mt-4 disabled:opacity-50">
                  {fb.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Submit feedback
                </button>
              </section>
            )
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          {isAgent && active && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Agent actions</p>
              {viewing.viewing_type === "virtual" && (
                <input value={link} onChange={(e) => setLink(e.target.value)} className="input-base text-sm" placeholder="Virtual meeting link" />
              )}
              <button disabled={busy} onClick={() => mut.mutate({ action: "accept", virtualLink: link || undefined })} className="btn-primary btn-primary-hover w-full justify-center disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirm booking
              </button>
              <input type="datetime-local" value={proposed} onChange={(e) => setProposed(e.target.value)} className="input-base text-sm" />
              <button disabled={busy || !proposed} onClick={() => mut.mutate({ action: "suggest", proposedAt: new Date(proposed).toISOString(), note: note || undefined })} className="btn-secondary w-full justify-center disabled:opacity-50">
                <RefreshCw className="h-4 w-4" /> Suggest new time
              </button>
              <button disabled={busy} onClick={() => { const r = window.prompt("Reason for declining (optional)") ?? undefined; mut.mutate({ action: "decline", note: r }); }} className="btn-ghost w-full justify-center text-destructive">
                <X className="h-4 w-4" /> Decline
              </button>
              <button disabled={busy} onClick={() => mut.mutate({ action: "complete" })} className="btn-ghost w-full justify-center"><CheckCheck className="h-4 w-4" /> Mark completed</button>
              <button disabled={busy} onClick={() => mut.mutate({ action: "no_show" })} className="btn-ghost w-full justify-center"><Ban className="h-4 w-4" /> Mark no-show</button>
              <button disabled={busy} onClick={() => { const n = window.prompt("Internal note (agents only)"); if (n) mut.mutate({ action: "internal_note", note: n }); }} className="btn-ghost w-full justify-center">
                <MessageSquare className="h-4 w-4" /> Internal note
              </button>
            </div>
          )}

          {isBuyer && active && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Your options</p>
              {viewing.proposed_at && (
                <button disabled={busy} onClick={() => mut.mutate({ action: "confirm_reschedule" })} className="btn-primary btn-primary-hover w-full justify-center">
                  <Check className="h-4 w-4" /> Accept new time
                </button>
              )}
              <input type="datetime-local" value={proposed} onChange={(e) => setProposed(e.target.value)} className="input-base text-sm" />
              <button disabled={busy || !proposed} onClick={() => mut.mutate({ action: "reschedule", proposedAt: new Date(proposed).toISOString() })} className="btn-secondary w-full justify-center disabled:opacity-50">
                <RefreshCw className="h-4 w-4" /> Request reschedule
              </button>
              <button disabled={busy} onClick={() => { const r = window.prompt("Reason for cancelling (optional)") ?? undefined; mut.mutate({ action: "cancel", note: r }); }} className="btn-ghost w-full justify-center text-destructive">
                <X className="h-4 w-4" /> Cancel viewing
              </button>
            </div>
          )}

          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Add to your calendar</p>
            <ViewingCalendarActions
              viewing={{
                booking_ref: viewing.booking_ref,
                requested_at: when,
                duration_minutes: viewing.duration_minutes ?? 30,
                viewing_type: viewing.viewing_type,
                meeting_location: viewing.meeting_location,
                virtual_link: viewing.virtual_link,
                propertyTitle: viewing.property?.title ?? "Property",
              }}
            />
            <a
              href={whatsappLink(isAgent ? viewing.requester_phone : agent?.phone, "viewing", {
                propertyTitle: viewing.property?.title ?? null,
                reference: propertyReference(viewing.property?.id ?? null),
                bookingId: viewing.booking_ref,
                viewingDate: when ? new Date(when).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : null,
                viewingTime: when ? new Date(when).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : null,
                agentName: agent?.full_name ?? null,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost w-full justify-center"
            ><MessageSquare className="h-4 w-4" /> WhatsApp about this viewing</a>
            {viewing.property && (
              <Link to="/properties/$id" params={{ id: viewing.property.slug ?? viewing.property.id }} className="btn-ghost w-full justify-center">
                <MapPin className="h-4 w-4" /> View listing
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-words font-semibold">{value}</p>
    </div>
  );
}
