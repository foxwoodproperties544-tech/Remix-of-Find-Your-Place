import { formatKsh } from "@/lib/mock-data";
import { eventLabel, type OfferEvent } from "@/lib/offers";
import { OfferExpiry, formatRemaining } from "./OfferExpiry";

import { Handshake, ArrowLeftRight, Check, X, Undo2, Clock, HelpCircle } from "lucide-react";

const ICONS: Record<string, any> = {
  offer: Handshake,
  counter: ArrowLeftRight,
  accepted: Check,
  rejected: X,
  withdrawn: Undo2,
  expired: Clock,
  info_request: HelpCircle,
};

export function OfferTimeline({
  events,
  offerStatus,
  offerExpiresAt,
}: {
  events: OfferEvent[];
  offerStatus?: string;
  offerExpiresAt?: string | null;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Negotiation history</h2>
        {offerStatus && <OfferExpiry expiresAt={offerExpiresAt} status={offerStatus} compact />}
      </div>
      <ol className="mt-4 space-y-4">

        {events.map((e) => {
          const Icon = ICONS[e.type] ?? Clock;
          return (
            <li key={e.id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 border-b border-border pb-3 last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {eventLabel(e)}
                    {e.actor_role ? <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{e.actor_role}</span> : null}
                  </p>
                  <time className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</time>
                </div>
                {e.amount != null && <p className="mt-0.5 text-sm font-bold text-primary">{formatKsh(Number(e.amount))}</p>}
                {e.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{e.body}</p>}
                {e.expires_at && <p className="mt-1 text-xs text-muted-foreground">Valid until {new Date(e.expires_at).toLocaleString()}</p>}
              </div>
            </li>
          );
        })}
        {events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
      </ol>
    </section>
  );
}
