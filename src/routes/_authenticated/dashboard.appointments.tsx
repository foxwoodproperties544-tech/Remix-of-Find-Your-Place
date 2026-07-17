import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppointmentStatusBadge } from "@/components/site/AppointmentStatusBadge";
import { APPOINTMENT_STATUSES, formatDateTime, waLink, type AppointmentStatus } from "@/lib/appointments";
import { CalendarClock, Check, X, MessageCircle, Mail, Phone as PhoneIcon, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/appointments")({
  component: AppointmentsPage,
  head: () => ({ meta: [{ title: "Appointments — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

type Row = {
  id: string;
  property_id: string;
  requester_id: string | null;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  requested_at: string;
  proposed_at: string | null;
  confirmed_at: string | null;
  notes: string | null;
  agent_notes: string | null;
  status: string;
  created_at: string;
  properties: { title: string | null; slug: string | null } | null;
};

function AppointmentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<AppointmentStatus | "all">("all");
  const [rescheduleFor, setRescheduleFor] = useState<Row | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["agent-appointments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("viewings")
        .select("id, property_id, requester_id, requester_name, requester_email, requester_phone, requested_at, proposed_at, confirmed_at, notes, agent_notes, status, created_at, properties!inner(title, slug, owner_id)")
        .eq("properties.owner_id", user!.id)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("viewings").update({ status: "approved", confirmed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Approved. Requester notified."); qc.invalidateQueries({ queryKey: ["agent-appointments"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.from("viewings").update({ status: "cancelled", cancel_reason: reason || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["agent-appointments"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("viewings").update({ status: "completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marked completed"); qc.invalidateQueries({ queryKey: ["agent-appointments"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const reschedule = useMutation({
    mutationFn: async ({ id, proposed_at, agent_notes }: { id: string; proposed_at: string; agent_notes?: string }) => {
      const { error } = await supabase.from("viewings").update({
        status: "rescheduled",
        proposed_at,
        agent_notes: agent_notes || null,
        rescheduled_by: user!.id,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Reschedule proposed. Requester will be asked to confirm."); setRescheduleFor(null); qc.invalidateQueries({ queryKey: ["agent-appointments"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => (data ?? []).filter(r => filter === "all" || r.status === filter), [data, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.length ?? 0 };
    for (const s of APPOINTMENT_STATUSES) c[s] = (data ?? []).filter(r => r.status === s).length;
    return c;
  }, [data]);

  return (
    <div className="container-page py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <CalendarClock className="h-3.5 w-3.5" /> Viewings
          </div>
          <h1 className="text-3xl font-bold mt-2">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">Approve, reschedule, or cancel viewing requests for your listings.</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 flex-wrap">
        <FilterPill label={`All (${counts.all})`} active={filter === "all"} onClick={() => setFilter("all")} />
        {APPOINTMENT_STATUSES.map(s => (
          <FilterPill key={s} label={`${s} (${counts[s] ?? 0})`} active={filter === s} onClick={() => setFilter(s)} />
        ))}
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : !filtered.length ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No appointments</h3>
          <p className="text-sm text-muted-foreground mt-1">When someone books a viewing on your listings, it will show up here.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {filtered.map(r => {
            const displayTime = r.proposed_at ?? r.requested_at;
            const waMessage = `Hi ${r.requester_name}, this is regarding your viewing for "${r.properties?.title ?? "our listing"}" on ${formatDateTime(displayTime)}.`;
            const wa = waLink(r.requester_phone, waMessage);
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{r.requester_name}</h3>
                      <AppointmentStatusBadge status={r.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      {r.properties?.title ?? "Listing"} · Requested: <strong>{formatDateTime(r.requested_at)}</strong>
                      {r.proposed_at && <> · Proposed: <strong>{formatDateTime(r.proposed_at)}</strong></>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <a href={`mailto:${r.requester_email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3" /> {r.requester_email}</a>
                      {r.requester_phone && <a href={`tel:${r.requester_phone}`} className="inline-flex items-center gap-1 hover:text-primary"><PhoneIcon className="h-3 w-3" /> {r.requester_phone}</a>}
                      {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700"><MessageCircle className="h-3 w-3" /> WhatsApp</a>}
                    </div>
                    {r.notes && <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">{r.notes}</p>}
                    {r.agent_notes && <p className="mt-2 text-xs text-muted-foreground italic">Your note: {r.agent_notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    <Link to="/properties/$id" params={{ id: r.properties?.slug ?? r.property_id }} className="btn-ghost !px-3 !py-2 text-xs" title="View listing"><ExternalLink className="h-4 w-4" /></Link>
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => approve.mutate(r.id)} className="btn-primary btn-primary-hover !py-1.5 !px-3 text-xs"><Check className="h-4 w-4" /> Approve</button>
                        <button onClick={() => setRescheduleFor(r)} className="btn-ghost !py-1.5 !px-3 text-xs"><RefreshCw className="h-4 w-4" /> Reschedule</button>
                      </>
                    )}
                    {(r.status === "approved" || r.status === "confirmed") && (
                      <>
                        <button onClick={() => complete.mutate(r.id)} className="btn-ghost !py-1.5 !px-3 text-xs text-primary"><Check className="h-4 w-4" /> Mark completed</button>
                        <button onClick={() => setRescheduleFor(r)} className="btn-ghost !py-1.5 !px-3 text-xs"><RefreshCw className="h-4 w-4" /> Reschedule</button>
                      </>
                    )}
                    {r.status !== "cancelled" && r.status !== "completed" && (
                      <button onClick={() => { const reason = prompt("Cancel reason (optional):") ?? ""; cancel.mutate({ id: r.id, reason }); }} className="btn-ghost !py-1.5 !px-3 text-xs text-muted-foreground"><X className="h-4 w-4" /> Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rescheduleFor && (
        <RescheduleModal
          row={rescheduleFor}
          onClose={() => setRescheduleFor(null)}
          onSubmit={(iso, notes) => reschedule.mutate({ id: rescheduleFor.id, proposed_at: iso, agent_notes: notes })}
        />
      )}
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize border transition ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/70 hover:border-primary/40"}`}>{label}</button>
  );
}

function RescheduleModal({ row, onClose, onSubmit }: { row: { requested_at: string }; onClose: () => void; onSubmit: (iso: string, notes: string) => void }) {
  const initial = new Date(row.requested_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const [date, setDate] = useState(`${initial.getFullYear()}-${pad(initial.getMonth() + 1)}-${pad(initial.getDate())}`);
  const [time, setTime] = useState(`${pad(initial.getHours())}:${pad(initial.getMinutes())}`);
  const [notes, setNotes] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-glow" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold">Propose a new time</h3>
        <p className="text-xs text-muted-foreground mt-1">The requester will be notified and asked to confirm.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm" />
          </div>
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Message to requester (optional)" className="mt-3 w-full rounded-xl border border-border px-4 py-2.5 text-sm" />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost !py-2 !px-4 text-sm">Cancel</button>
          <button
            onClick={() => {
              const iso = new Date(`${date}T${time}:00`);
              if (isNaN(iso.getTime()) || iso.getTime() < Date.now()) { toast.error("Pick a future date and time"); return; }
              onSubmit(iso.toISOString(), notes);
            }}
            className="btn-primary btn-primary-hover !py-2 !px-4 text-sm"
          >Propose</button>
        </div>
      </div>
    </div>
  );
}
