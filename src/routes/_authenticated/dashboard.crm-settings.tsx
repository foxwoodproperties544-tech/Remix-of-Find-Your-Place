import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LEAD_SOURCES } from "@/lib/leads";
import {
  TEMPLATE_CHANNELS,
  TEMPLATE_PLACEHOLDERS,
  STARTER_TEMPLATES,
  type CrmTemplateRow,
} from "@/lib/crm-templates";
import { KENYA_COUNTIES } from "@/lib/kenya-locations-data";
import { Plus, Trash2, MessageSquareText, Route as RouteIcon, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/crm-settings")({
  component: CrmSettings,
  head: () => ({
    meta: [
      { title: "CRM settings — Foxwood Properties" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CrmSettings() {
  return (
    <div className="container-page py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">CRM settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Save reply templates your team reuses, and route incoming leads to the right person automatically.
        </p>
      </header>
      <TemplatesPanel />
      <RoutingPanel />
    </div>
  );
}

/* ---------------------------------- Templates --------------------------------- */

function TemplatesPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["crm-templates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_templates")
        .select("*")
        .eq("owner_id", user!.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CrmTemplateRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["crm-templates", user?.id] });

  const save = useMutation({
    mutationFn: async (row: { id?: string; name: string; channel: string; subject: string | null; body: string }) => {
      if (row.id) {
        const { error } = await supabase.from("crm_templates")
          .update({ name: row.name, channel: row.channel, subject: row.subject, body: row.body })
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_templates").insert({ ...row, owner_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Template saved"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Template deleted"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const seed = useMutation({
    mutationFn: async () => {
      const rows = STARTER_TEMPLATES.map((t, i) => ({
        owner_id: user!.id,
        name: t.name,
        channel: t.channel,
        subject: t.subject ?? null,
        body: t.body,
        sort_order: i,
      }));
      const { error } = await supabase.from("crm_templates").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Starter templates added"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [draft, setDraft] = useState({ name: "", channel: "whatsapp", subject: "", body: "" });

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h2 className="font-semibold inline-flex items-center gap-2">
          <MessageSquareText className="h-4 w-4" /> Message templates
        </h2>
        {!q.isLoading && (q.data?.length ?? 0) === 0 && (
          <button onClick={() => seed.mutate()} disabled={seed.isPending}
            className="btn-ghost !py-2 !px-3 text-xs inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> Add starter templates
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Placeholders: {TEMPLATE_PLACEHOLDERS.join(" ")}
      </p>

      <div className="mt-5 space-y-3">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {q.data?.map((t) => (
          <TemplateRow key={t.id} row={t}
            onSave={(patch) => save.mutate({ id: t.id, ...patch })}
            onDelete={() => confirm(`Delete "${t.name}"?`) && remove.mutate(t.id)} />
        ))}
        {!q.isLoading && !q.data?.length && (
          <p className="text-sm text-muted-foreground">No templates yet.</p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border p-4">
        <h3 className="text-sm font-semibold mb-3">New template</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Template name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <select value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm capitalize">
            {TEMPLATE_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {draft.channel === "email" && (
          <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            placeholder="Subject" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        )}
        <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={4}
          placeholder="Hi {{contact_name}}, …"
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <div className="mt-2 flex justify-end">
          <button
            disabled={!draft.name.trim() || !draft.body.trim() || save.isPending}
            onClick={() => {
              save.mutate({
                name: draft.name.trim(),
                channel: draft.channel,
                subject: draft.channel === "email" ? (draft.subject.trim() || null) : null,
                body: draft.body,
              });
              setDraft({ name: "", channel: "whatsapp", subject: "", body: "" });
            }}
            className="btn-primary btn-primary-hover !py-2 !px-4 text-sm disabled:opacity-50 inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add template
          </button>
        </div>
      </div>
    </section>
  );
}

function TemplateRow({ row, onSave, onDelete }: {
  row: CrmTemplateRow;
  onSave: (patch: { name: string; channel: string; subject: string | null; body: string }) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(row.name);
  const [channel, setChannel] = useState(row.channel);
  const [subject, setSubject] = useState(row.subject ?? "");
  const [body, setBody] = useState(row.body);

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setOpen((o) => !o)} className="text-left flex-1">
          <span className="text-sm font-semibold">{row.name}</span>
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">{row.channel}</span>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{row.body}</p>
        </button>
        <button onClick={onDelete} aria-label={`Delete ${row.name}`}
          className="btn-ghost !py-1.5 !px-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <select value={channel} onChange={(e) => setChannel(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm capitalize">
              {TEMPLATE_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {channel === "email" && (
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          )}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <div className="flex justify-end">
            <button onClick={() => onSave({ name: name.trim(), channel, subject: channel === "email" ? (subject.trim() || null) : null, body })}
              className="btn-primary btn-primary-hover !py-2 !px-4 text-sm">Save changes</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Routing ---------------------------------- */

function RoutingPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const rulesQ = useQuery({
    queryKey: ["lead-routing-rules", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_routing_rules")
        .select("*")
        .eq("owner_id", user!.id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const teamQ = useQuery({
    queryKey: ["routing-team"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id").in("role", ["agent", "admin"]);
      const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("public_profiles").select("id, full_name").in("id", ids);
      return profs ?? [];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["lead-routing-rules", user?.id] });

  const add = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from("lead_routing_rules").insert({ ...row, owner_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rule added"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("lead_routing_rules").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lead_routing_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rule deleted"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [draft, setDraft] = useState({
    name: "", match_county: "", match_source: "", min_budget: "", assign_to: "", priority: "0",
  });

  const nameOf = (id: string | null) =>
    (teamQ.data ?? []).find((t: any) => t.id === id)?.full_name ?? "Teammate";

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-semibold inline-flex items-center gap-2"><RouteIcon className="h-4 w-4" /> Lead auto-routing</h2>
      <p className="text-xs text-muted-foreground mt-1">
        New leads on your listings are assigned to the first matching active rule, highest priority first.
      </p>

      <div className="mt-5 space-y-2">
        {rulesQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!rulesQ.isLoading && !rulesQ.data?.length && (
          <p className="text-sm text-muted-foreground">No routing rules yet — leads stay unassigned.</p>
        )}
        {(rulesQ.data ?? []).map((r: any) => (
          <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-4">
            <div className="text-sm">
              <div className="font-semibold">{r.name} <span className="text-xs font-normal text-muted-foreground">· priority {r.priority}</span></div>
              <div className="text-xs text-muted-foreground mt-1">
                {[
                  r.match_county && `County: ${r.match_county}`,
                  r.match_source && `Source: ${String(r.match_source).replace("_", " ")}`,
                  r.min_budget && `Budget ≥ KES ${Number(r.min_budget).toLocaleString()}`,
                ].filter(Boolean).join(" · ") || "Matches every new lead"}
              </div>
              <div className="text-xs mt-1">→ assigns to <span className="font-medium">{nameOf(r.assign_to)}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle.mutate({ id: r.id, active: !r.active })}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${r.active ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                {r.active ? "Active" : "Paused"}
              </button>
              <button onClick={() => confirm(`Delete rule "${r.name}"?`) && remove.mutate(r.id)}
                aria-label={`Delete rule ${r.name}`} className="btn-ghost !py-1.5 !px-2 text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border p-4">
        <h3 className="text-sm font-semibold mb-3">New rule</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Rule name (e.g. Nairobi leads → Jane)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <select value={draft.assign_to} onChange={(e) => setDraft({ ...draft, assign_to: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Assign to…</option>
            {user && <option value={user.id}>Me</option>}
            {(teamQ.data ?? []).filter((t: any) => t.id !== user?.id).map((t: any) => (
              <option key={t.id} value={t.id}>{t.full_name ?? "Agent"}</option>
            ))}
          </select>
          <select value={draft.match_county} onChange={(e) => setDraft({ ...draft, match_county: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">Any county</option>
            {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={draft.match_source} onChange={(e) => setDraft({ ...draft, match_source: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm capitalize">
            <option value="">Any source</option>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <input type="number" min={0} value={draft.min_budget} onChange={(e) => setDraft({ ...draft, min_budget: e.target.value })}
            placeholder="Minimum budget (KES)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input type="number" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
            placeholder="Priority" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="mt-2 flex justify-end">
          <button
            disabled={!draft.name.trim() || !draft.assign_to || add.isPending}
            onClick={() => {
              add.mutate({
                name: draft.name.trim(),
                assign_to: draft.assign_to,
                match_county: draft.match_county || null,
                match_source: draft.match_source || null,
                min_budget: draft.min_budget ? Number(draft.min_budget) : null,
                priority: Number(draft.priority) || 0,
              });
              setDraft({ name: "", match_county: "", match_source: "", min_budget: "", assign_to: "", priority: "0" });
            }}
            className="btn-primary btn-primary-hover !py-2 !px-4 text-sm disabled:opacity-50 inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add rule
          </button>
        </div>
      </div>
    </section>
  );
}
