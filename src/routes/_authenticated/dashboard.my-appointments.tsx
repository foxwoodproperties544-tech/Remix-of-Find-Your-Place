import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppointmentStatusBadge } from "@/components/site/AppointmentStatusBadge";
import { formatDateTime } from "@/lib/appointments";
import { CalendarClock, Check, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/my-appointments")({
  component: MyAppointments,
  head: () => ({ meta: [{ title: "My appointments — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

type Row = {
  id: string;
  property_id: string;
  requested_at: string;
  proposed_at: string | null;
  agent_notes: string | null;
  status: string;
  properties: { title: string | null; slug: string | null } | null;
};

function MyAppointments() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-appointments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("viewings")
        .select("id, property_id, requested_at, proposed_at, agent_notes, status, properties(title, slug)")
        .eq("requester_id", user!.id)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const confirmReschedule = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await supabase.from("viewings").update({
        status: "confirmed",
        requested_at: row.proposed_at ?? row.requested_at,
        confirmed_at: new Date().toISOString(),
      }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Confirmed. The agent has been notified."); qc.invalidateQueries({ queryKey: ["my-appointments"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("viewings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Viewing cancelled"); qc.invalidateQueries({ queryKey: ["my-appointments"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="container-page py-10">
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1"><CalendarClock className="h-3.5 w-3.5" /> Viewings</div>
      <h1 className="text-3xl font-bold mt-2">My appointments</h1>
      <p className="text-sm text-muted-foreground mt-1">Track viewings you have booked and confirm any reschedules.</p>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data || !data.length ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No viewings yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Browse listings and book a viewing to see it here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map(r => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{r.properties?.title ?? "Listing"}</h3>
                      <AppointmentStatusBadge status={r.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Your time: <strong>{formatDateTime(r.requested_at)}</strong>
                      {r.proposed_at && <> · Agent proposed: <strong>{formatDateTime(r.proposed_at)}</strong></>}
                    </div>
                    {r.agent_notes && <p className="mt-2 text-sm text-foreground/80 italic">Agent: {r.agent_notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    <Link to="/properties/$id" params={{ id: r.properties?.slug ?? r.property_id }} className="btn-ghost !py-1.5 !px-3 text-xs"><ExternalLink className="h-4 w-4" /> View</Link>
                    {r.status === "rescheduled" && (
                      <button onClick={() => confirmReschedule.mutate(r)} className="btn-primary btn-primary-hover !py-1.5 !px-3 text-xs"><Check className="h-4 w-4" /> Confirm new time</button>
                    )}
                    {r.status !== "cancelled" && r.status !== "completed" && (
                      <button onClick={() => cancel.mutate(r.id)} className="btn-ghost !py-1.5 !px-3 text-xs text-muted-foreground"><X className="h-4 w-4" /> Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
