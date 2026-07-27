import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, User } from "lucide-react";
import { getViewingAuditLog } from "@/lib/viewings.functions";

const ACTION_LABEL: Record<string, string> = {
  "viewing.book": "Booking requested",
  "viewing.accept": "Booking confirmed",
  "viewing.decline": "Booking declined",
  "viewing.suggest": "New time suggested",
  "viewing.reschedule": "Reschedule requested",
  "viewing.confirm_reschedule": "New time accepted",
  "viewing.cancel": "Booking cancelled",
  "viewing.complete": "Marked completed",
  "viewing.no_show": "Marked no-show",
  "viewing.note": "Note added",
  "viewing.internal_note": "Internal note added",
  "viewing.feedback": "Feedback submitted",
};

/** Who did what and when on this booking, straight from the audit log. */
export function ViewingAuditLog({ viewingId }: { viewingId: string }) {
  const load = useServerFn(getViewingAuditLog);
  const q = useQuery({
    queryKey: ["viewing-audit", viewingId],
    queryFn: () => load({ data: { id: viewingId } }) as Promise<any[]>,
  });

  const rows = q.data ?? [];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-bold">Audit log</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Every action taken on this booking, with who performed it and when.</p>

      {q.isLoading ? (
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-muted" />
      ) : !rows.length ? (
        <p className="mt-4 text-sm text-muted-foreground">No recorded actions yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{ACTION_LABEL[r.action] ?? r.summary ?? r.action}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {r.actor_name}
                  {r.actor_email ? ` · ${r.actor_email}` : ""}
                </p>
                {r.metadata?.from && r.metadata?.to && r.metadata.from !== r.metadata.to && (
                  <p className="text-xs text-muted-foreground">{r.metadata.from} → {r.metadata.to}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
