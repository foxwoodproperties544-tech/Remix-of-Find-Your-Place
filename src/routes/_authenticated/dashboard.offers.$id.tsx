import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Check, X, ArrowLeftRight, Undo2, HelpCircle, Download, CalendarDays, Loader2, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatKsh } from "@/lib/mock-data";
import { actOnOffer, getOffer } from "@/lib/offers.functions";
import {
  OPEN_STATUSES, SALE_STATES, STATUS_CLASS, STATUS_LABEL, TIMELINE_LABEL,
  downloadOfferSummary, offerAmount, priceDiff, type Offer, type OfferEvent, type OfferMessage, type OfferStatus,
} from "@/lib/offers";
import { OfferTimeline } from "@/components/offers/OfferTimeline";
import { OfferChat } from "@/components/offers/OfferChat";
import { OfferExpiry } from "@/components/offers/OfferExpiry";
import { whatsappLink, propertyReference } from "@/lib/whatsapp";
import { MessageCircle } from "lucide-react";


export const Route = createFileRoute("/_authenticated/dashboard/offers/$id")({
  head: () => ({
    meta: [
      { title: "Offer details & negotiation | Foxwood Properties" },
      { name: "description", content: "Review an offer, respond with a counter offer, message the other party and follow the complete negotiation history." },
      { property: "og:title", content: "Offer details | Foxwood Properties" },
      { property: "og:description", content: "Accept, reject or counter a property offer securely on Foxwood." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfferDetail,
});

function OfferDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const load = useServerFn(getOffer);
  const act = useServerFn(actOnOffer);

  const [counterOpen, setCounterOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [counterExpiry, setCounterExpiry] = useState("");
  const [saleState, setSaleState] = useState("");

  const q = useQuery({
    queryKey: ["offer", id],
    queryFn: () => load({ data: { offerId: id } }) as Promise<{ offer: Offer; events: OfferEvent[]; messages: OfferMessage[]; role: string }>,
  });

  const mut = useMutation({
    mutationFn: (vars: any) => act({ data: { offerId: id, ...vars } }),
    onSuccess: () => {
      toast.success("Offer updated");
      setCounterOpen(false);
      qc.invalidateQueries({ queryKey: ["offer", id] });
      qc.invalidateQueries({ queryKey: ["my-offers"] });
      qc.invalidateQueries({ queryKey: ["received-offers"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });

  if (q.isLoading) return <div className="p-8"><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div>;
  if (q.error || !q.data) return (
    <div className="p-8 text-center">
      <h1 className="text-xl font-bold">Offer not available</h1>
      <Link to="/dashboard/offers" className="mt-3 inline-block text-primary underline">Back to Offer Center</Link>
    </div>
  );

  const { offer, events, messages, role } = q.data;
  const sellerSide = role === "owner" || role === "agent" || role === "admin";
  const open = OPEN_STATUSES.includes(offer.status as OfferStatus);
  const d = priceDiff(Number(offer.asking_price), offerAmount(offer));
  const busy = mut.isPending;

  return (
    <div className="p-4 md:p-8">
      <Link to="/dashboard/offers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Offer Center</Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <header className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[offer.status as OfferStatus]}`}>{STATUS_LABEL[offer.status as OfferStatus]}</span>
              <OfferExpiry expiresAt={offer.expires_at} status={offer.status} />
              <span className="font-mono text-xs text-muted-foreground">{offer.offer_ref}</span>
            </div>

            <h1 className="mt-3 text-2xl font-bold">{offer.property?.title ?? "Listing"}</h1>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
              <Cell label="Asking price" value={formatKsh(Number(offer.asking_price))} />
              <Cell label="Current offer" value={`${formatKsh(offerAmount(offer))}`} />
              <Cell label="Difference" value={d.label} className={d.tone} />
              <Cell label="Timeline" value={TIMELINE_LABEL[offer.timeline] ?? offer.timeline} />
              <Cell label="Cash buyer" value={offer.cash_buyer ? "Yes" : "No"} />
              <Cell label="Mortgage needed" value={offer.needs_mortgage ? "Yes" : "No"} />
              <Cell label="Viewed property" value={offer.has_viewed ? "Yes" : "No"} />
              <Cell label="Submitted" value={new Date(offer.created_at).toLocaleString()} />
              <Cell label="Last updated" value={new Date(offer.updated_at).toLocaleString()} />
              {offer.expires_at && <Cell label="Expires" value={new Date(offer.expires_at).toLocaleString()} />}
              {offer.first_response_at && (
                <Cell label="Response time" value={`${((new Date(offer.first_response_at).getTime() - new Date(offer.created_at).getTime()) / 3600000).toFixed(1)}h`} />
              )}
            </div>
            {offer.message && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-sm">{offer.message}</p>}
          </header>

          {sellerSide && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold">Buyer details</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
                <Cell label="Name" value={offer.buyer_name ?? "—"} />
                <Cell label="Email" value={offer.buyer_email ?? "—"} />
                <Cell label="Phone" value={offer.buyer_phone ?? "—"} />
              </div>
            </section>
          )}

          <OfferTimeline events={events} offerStatus={offer.status} offerExpiresAt={offer.expires_at} />
          <OfferChat offerId={offer.id} messages={messages} meId={user?.id ?? ""} disabled={!open && offer.status !== "accepted"} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          {open && sellerSide && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Respond to this offer</p>
              <select value={saleState} onChange={(e) => setSaleState(e.target.value)} className="input-base text-sm">
                {SALE_STATES.map((s) => <option key={s.value} value={s.value}>{s.value ? `On accept: ${s.label}` : "On accept: no listing change"}</option>)}
              </select>
              <button disabled={busy} onClick={() => mut.mutate({ action: "accept", saleState: saleState || undefined })} className="btn-primary w-full justify-center disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept offer
              </button>
              <button disabled={busy} onClick={() => setCounterOpen((v) => !v)} className="btn-secondary w-full justify-center"><ArrowLeftRight className="h-4 w-4" /> Counter offer</button>
              <button disabled={busy} onClick={() => { const note = window.prompt("What do you need from the buyer?"); if (note) mut.mutate({ action: "request_info", note }); }} className="btn-ghost w-full justify-center"><HelpCircle className="h-4 w-4" /> Request more info</button>
              {offer.status === "pending" && (
                <button disabled={busy} onClick={() => mut.mutate({ action: "review" })} className="btn-ghost w-full justify-center"><Eye className="h-4 w-4" /> Mark under review</button>
              )}
              <button disabled={busy} onClick={() => { const note = window.prompt("Reason for rejecting (optional)") ?? undefined; mut.mutate({ action: "reject", note }); }} className="btn-ghost w-full justify-center text-destructive"><X className="h-4 w-4" /> Reject offer</button>
            </div>
          )}

          {open && role === "buyer" && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Your options</p>
              {offer.status === "counter_offered" && (
                <>
                  <button disabled={busy} onClick={() => mut.mutate({ action: "accept" })} className="btn-primary w-full justify-center"><Check className="h-4 w-4" /> Accept counter offer</button>
                  <button disabled={busy} onClick={() => setCounterOpen((v) => !v)} className="btn-secondary w-full justify-center"><ArrowLeftRight className="h-4 w-4" /> Counter back</button>
                </>
              )}
              <button disabled={busy} onClick={() => { const note = window.prompt("Reason for withdrawing (optional)") ?? undefined; mut.mutate({ action: "withdraw", note }); }} className="btn-ghost w-full justify-center"><Undo2 className="h-4 w-4" /> Withdraw offer</button>
            </div>
          )}

          {counterOpen && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">New price</p>
              <input inputMode="numeric" value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} className="input-base text-sm" placeholder="e.g. 9000000" />
              <textarea value={counterNote} onChange={(e) => setCounterNote(e.target.value)} rows={3} className="input-base text-sm" placeholder="Message (optional)" />
              <label className="block text-xs text-muted-foreground">Expiry (optional)
                <input type="datetime-local" value={counterExpiry} onChange={(e) => setCounterExpiry(e.target.value)} className="input-base mt-1 text-sm" />
              </label>
              <button
                disabled={busy || !Number(counterAmount.replace(/[^\d.]/g, ""))}
                onClick={() => mut.mutate({
                  action: "counter",
                  amount: Number(counterAmount.replace(/[^\d.]/g, "")),
                  note: counterNote.trim() || undefined,
                  expiresAt: counterExpiry ? new Date(counterExpiry).toISOString() : undefined,
                })}
                className="btn-primary w-full justify-center disabled:opacity-50"
              >Send counter offer</button>
            </div>
          )}

          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <a
              href={whatsappLink(sellerSide ? offer.buyer_phone : null, "offer", {
                propertyTitle: offer.property?.title ?? null,
                reference: propertyReference(offer.property?.id ?? null),
                offerAmount: formatKsh(offerAmount(offer)),
                bookingId: offer.offer_ref,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost w-full justify-center"
            ><MessageCircle className="h-4 w-4" /> WhatsApp about this offer</a>
            <button onClick={() => downloadOfferSummary(offer)} className="btn-ghost w-full justify-center"><Download className="h-4 w-4" /> Download summary</button>
            {offer.property && (
              <Link to="/properties/$id" params={{ id: offer.property.slug ?? offer.property.id }} className="btn-ghost w-full justify-center"><CalendarDays className="h-4 w-4" /> View listing & book viewing</Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Cell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-semibold ${className ?? ""}`}>{value}</p>
    </div>
  );
}
