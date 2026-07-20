import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadStatus, type LeadActivityType } from "@/lib/leads";
import { LeadStatusBadge } from "@/components/site/LeadStatusBadge";
import { ArrowLeft, Mail, Phone, MessageCircle, Calendar, Trash2, CheckCircle2, Home, User as UserIcon, StickyNote, PhoneCall, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/leads/$id")({
  component: LeadDetail,
  head: () => ({ meta: [{ title: "Lead — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function LeadDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const leadQ = useQuery({
    queryKey: ["lead", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const activitiesQ = useQuery({
    queryKey: ["lead-activities", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_activities")
        .select("id, type, body, metadata, actor_id, created_at")
        .eq("lead_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const followUpsQ = useQuery({
    queryKey: ["lead-followups", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_follow_ups")
        .select("id, title, notes, due_at, completed_at, assigned_to")
        .eq("lead_id", id).order("due_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const propQ = useQuery({
    queryKey: ["lead-property", leadQ.data?.property_id],
    enabled: !!leadQ.data?.property_id,
    queryFn: async () => {
      const { data } = await supabase.from("properties")
        .select("id, slug, title, town, price, images")
        .eq("id", leadQ.data!.property_id!).maybeSingle();
      return data;
    },
  });

  const updateLead = useMutation({
    mutationFn: async (patch: Partial<Record<string, any>>) => {
      const { error } = await supabase.from("leads").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead updated");
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["lead-activities", id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addActivity = useMutation({
    mutationFn: async ({ type, body }: { type: LeadActivityType; body: string }) => {
      const { error } = await supabase.from("lead_activities").insert({
        lead_id: id, actor_id: user!.id, type, body,
      });
      if (error) throw error;
      if (["call", "whatsapp", "email"].includes(type)) {
        await supabase.from("leads").update({ last_contacted_at: new Date().toISOString() }).eq("id", id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-activities", id] });
      qc.invalidateQueries({ queryKey: ["lead", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addFollowUp = useMutation({
    mutationFn: async (payload: { title: string; due_at: string; notes?: string }) => {
      const { error } = await supabase.from("lead_follow_ups").insert({
        lead_id: id, created_by: user!.id, assigned_to: leadQ.data?.assigned_to ?? user!.id, ...payload,
      });
      if (error) throw error;
      await supabase.from("leads").update({ next_follow_up_at: payload.due_at }).eq("id", id);
    },
    onSuccess: () => {
      toast.success("Follow-up scheduled");
      qc.invalidateQueries({ queryKey: ["lead-followups", id] });
      qc.invalidateQueries({ queryKey: ["lead", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const completeFollowUp = useMutation({
    mutationFn: async (fid: string) => {
      const { error } = await supabase.from("lead_follow_ups")
        .update({ completed_at: new Date().toISOString() }).eq("id", fid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-followups", id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Lead deleted"); navigate({ to: "/dashboard/leads" }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (leadQ.isLoading) return <div className="container-page py-10 text-sm text-muted-foreground">Loading…</div>;
  if (!leadQ.data) return <div className="container-page py-10 text-sm">Lead not found. <Link to="/dashboard/leads" className="text-primary">Back</Link></div>;

  const lead = leadQ.data;

  return (
    <div className="container-page py-10">
      <Link to="/dashboard/leads" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* MAIN */}
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{lead.contact_name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <LeadStatusBadge status={lead.status} />
                  <span className="text-xs text-muted-foreground capitalize">· {lead.source.replace("_", " ")} · {lead.priority} priority</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  {lead.contact_email && <a href={`mailto:${lead.contact_email}`} className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary"><Mail className="h-4 w-4" />{lead.contact_email}</a>}
                  {lead.contact_phone && <a href={`tel:${lead.contact_phone}`} className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary"><Phone className="h-4 w-4" />{lead.contact_phone}</a>}
                  {lead.contact_whatsapp && <a href={`https://wa.me/${lead.contact_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-foreground/80 hover:text-primary"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
                </div>
                {lead.message && <p className="mt-4 text-sm text-foreground/80 whitespace-pre-wrap bg-muted/40 p-3 rounded-lg">{lead.message}</p>}
              </div>
              <button onClick={() => confirm("Delete this lead?") && deleteLead.mutate()}
                className="btn-ghost !py-2 !px-3 text-xs text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Log communication */}
          <LogCommForm onSubmit={(type, body) => addActivity.mutate({ type, body })} />

          {/* Follow-ups */}
          <FollowUpsSection
            items={followUpsQ.data ?? []}
            onAdd={(p) => addFollowUp.mutate(p)}
            onComplete={(fid) => completeFollowUp.mutate(fid)}
          />

          {/* Activity timeline */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">Activity timeline</h2>
            {activitiesQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !activitiesQ.data?.length ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="relative border-l border-border pl-5 space-y-4">
                {activitiesQ.data.map(a => (
                  <li key={a.id}>
                    <span className="absolute -left-[7px] h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
                    <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()} · <span className="capitalize">{a.type.replace("_", " ")}</span></div>
                    {a.body && <div className="text-sm mt-0.5 whitespace-pre-wrap">{a.body}</div>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-4">
          {/* Status control */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Pipeline stage</h3>
            <div className="grid gap-1.5">
              {LEAD_STATUSES.map(s => (
                <button key={s} onClick={() => updateLead.mutate({ status: s })}
                  className={`text-left rounded-lg px-3 py-2 text-sm transition ${lead.status === s ? "bg-primary-soft text-primary font-semibold" : "hover:bg-muted"}`}>
                  {LEAD_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {lead.status === "won" && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-muted-foreground">Deal value (KES)</label>
                <input type="number" defaultValue={lead.deal_value ?? ""} onBlur={e => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  if (v !== lead.deal_value) updateLead.mutate({ deal_value: v });
                }} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
            )}
            {lead.status === "lost" && (
              <div className="mt-4">
                <label className="text-xs font-semibold text-muted-foreground">Lost reason</label>
                <input defaultValue={lead.lost_reason ?? ""} onBlur={e => {
                  if (e.target.value !== lead.lost_reason) updateLead.mutate({ lost_reason: e.target.value });
                }} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
            )}
          </div>

          {/* Assignment */}
          <AssignmentPanel leadId={id} currentAssignee={lead.assigned_to} onAssign={(uid) => updateLead.mutate({ assigned_to: uid })} />

          {/* Priority */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3">Priority</h3>
            <div className="inline-flex rounded-full bg-muted p-1 text-xs">
              {(["low", "medium", "high"] as const).map(p => (
                <button key={p} onClick={() => updateLead.mutate({ priority: p })}
                  className={`rounded-full px-3 py-1.5 font-semibold capitalize ${lead.priority === p ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Property */}
          {propQ.data && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3 inline-flex items-center gap-1.5"><Home className="h-4 w-4" /> Property</h3>
              <Link to="/properties/$id" params={{ id: (propQ.data as any).slug ?? propQ.data.id }} className="block group">
                {propQ.data.images?.[0] && (
                  <img src={propQ.data.images[0]} alt="" className="w-full aspect-video object-cover rounded-lg" />
                )}
                <div className="mt-2 font-medium text-sm group-hover:text-primary line-clamp-2">{propQ.data.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{propQ.data.town} · KES {Number(propQ.data.price).toLocaleString()}</div>
              </Link>
            </div>
          )}

          {/* Meta */}
          <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground space-y-1.5">
            <div>Created {new Date(lead.created_at).toLocaleString()}</div>
            {lead.last_contacted_at && <div>Last contacted {new Date(lead.last_contacted_at).toLocaleString()}</div>}
            {lead.won_at && <div>Won {new Date(lead.won_at).toLocaleString()}</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function LogCommForm({ onSubmit }: { onSubmit: (type: LeadActivityType, body: string) => void }) {
  const [type, setType] = useState<LeadActivityType>("note");
  const [body, setBody] = useState("");
  const icons: Record<string, any> = { note: StickyNote, call: PhoneCall, whatsapp: MessageCircle, email: Mail };
  const Icon = icons[type] ?? StickyNote;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold mb-3">Log activity</h2>
      <div className="flex gap-1 mb-3 flex-wrap">
        {(["note", "call", "whatsapp", "email"] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${type === t ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"}`}>{t}</button>
        ))}
      </div>
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
        placeholder={type === "note" ? "Add a note…" : `Log ${type} details…`}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      <div className="mt-2 flex justify-end">
        <button onClick={() => { if (body.trim()) { onSubmit(type, body.trim()); setBody(""); } }}
          disabled={!body.trim()} className="btn-primary btn-primary-hover !py-2 !px-4 text-sm disabled:opacity-50">
          <Icon className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  );
}

function FollowUpsSection({ items, onAdd, onComplete }: {
  items: any[];
  onAdd: (p: { title: string; due_at: string; notes?: string }) => void;
  onComplete: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold mb-3 inline-flex items-center gap-2"><Calendar className="h-4 w-4" /> Follow-ups</h2>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>}
        {items.map(f => (
          <div key={f.id} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${f.completed_at ? "opacity-60 border-border" : "border-border bg-muted/30"}`}>
            <div className="flex-1">
              <div className="font-medium">{f.title}</div>
              <div className="text-xs text-muted-foreground">Due {new Date(f.due_at).toLocaleString()}</div>
              {f.notes && <div className="text-xs mt-1">{f.notes}</div>}
            </div>
            {!f.completed_at && (
              <button onClick={() => onComplete(f.id)} title="Mark done"
                className="btn-ghost !py-1.5 !px-2 text-xs text-primary"><CheckCircle2 className="h-4 w-4" /></button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input placeholder="Follow-up task" value={title} onChange={e => setTitle(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button disabled={!title.trim() || !dueAt}
          onClick={() => { onAdd({ title: title.trim(), due_at: new Date(dueAt).toISOString(), notes: notes || undefined }); setTitle(""); setDueAt(""); setNotes(""); }}
          className="btn-primary btn-primary-hover !py-2 !px-4 text-sm disabled:opacity-50">Add</button>
      </div>
      <input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)}
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </div>
  );
}

function AssignmentPanel({ leadId, currentAssignee, onAssign }: {
  leadId: string;
  currentAssignee: string | null;
  onAssign: (uid: string | null) => void;
}) {
  const { user } = useAuth();
  const agents = useQuery({
    queryKey: ["agents-list"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id").in("role", ["agent", "admin"]);
      const ids = Array.from(new Set((data ?? []).map(r => r.user_id)));
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      return profs ?? [];
    },
  });
  const currentProfile = agents.data?.find(a => a.id === currentAssignee);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3 inline-flex items-center gap-1.5"><UserIcon className="h-4 w-4" /> Assigned to</h3>
      <div className="text-sm mb-3">
        {currentAssignee ? (currentProfile?.full_name ?? "Assigned user") : <span className="text-muted-foreground">Unassigned</span>}
      </div>
      <div className="grid gap-1.5 max-h-56 overflow-y-auto">
        <button onClick={() => onAssign(user!.id)}
          className="text-left rounded-lg px-3 py-2 text-sm hover:bg-muted">Assign to me</button>
        {(agents.data ?? []).filter(a => a.id !== user?.id).map(a => (
          <button key={a.id} onClick={() => onAssign(a.id)}
            className="text-left rounded-lg px-3 py-2 text-sm hover:bg-muted">{a.full_name ?? "Agent"}</button>
        ))}
        {currentAssignee && (
          <button onClick={() => onAssign(null)}
            className="text-left rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Unassign</button>
        )}
      </div>
    </div>
  );
}
