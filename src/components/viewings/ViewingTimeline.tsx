import { CalendarClock, CheckCircle2, RefreshCw, MessageSquare } from "lucide-react";
import { formatViewingTime, VIEWING_STATUS_LABEL } from "@/lib/viewings";

export type ViewingEvent = {
  id: string;
  type: string;
  body: string | null;
  metadata: any;
  created_at: string;
};

const ICON: Record<string, any> = {
  created: CalendarClock,
  status_change: CheckCircle2,
  reschedule: RefreshCw,
  note: MessageSquare,
};

/** Chronological activity history for a single booking. */
export function ViewingTimeline({ events }: { events: ViewingEvent[] }) {
  if (!events.length) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">Booking timeline</h2>
      <ol className="mt-4 space-y-4">
        {events.map((e) => {
          const Icon = ICON[e.type] ?? CalendarClock;
          const to = e.metadata?.to as string | undefined;
          return (
            <li key={e.id} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {to ? `${VIEWING_STATUS_LABEL[to] ?? to}` : e.body ?? e.type}
                </p>
                {e.metadata?.requested_at && (
                  <p className="text-xs text-muted-foreground">{formatViewingTime(e.metadata.requested_at)}</p>
                )}
                <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
