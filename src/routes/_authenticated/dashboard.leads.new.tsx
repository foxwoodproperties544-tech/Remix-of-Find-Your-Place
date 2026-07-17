import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, LEAD_SOURCES } from "@/lib/leads";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/leads/new")({
  component: NewLead,
  head: () => ({ meta: [{ title: "New lead — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function NewLead() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    contact_name: "", contact_email: "", contact_phone: "", contact_whatsapp: "",
    status: "new" as any, source: "manual" as any, priority: "medium" as any,
    property_id: "", message: "", budget_min: "", budget_max: "",
  });

  const props = useQuery({
    queryKey: ["my-props-min", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, title").eq("owner_id", user!.id).order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload: any = {
        contact_name: form.contact_name,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        contact_whatsapp: form.contact_whatsapp || null,
        status: form.status,
        source: form.source,
        priority: form.priority,
        message: form.message || null,
        budget_min: form.budget_min ? Number(form.budget_min) : null,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
        property_id: form.property_id || null,
        owner_id: user!.id,
        created_by: user!.id,
        assigned_to: user!.id,
      };
      const { data, error } = await supabase.from("leads").insert(payload).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { toast.success("Lead created"); navigate({ to: "/dashboard/leads/$id", params: { id: d.id } }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="container-page py-10 max-w-2xl">
      <Link to="/dashboard/leads" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>
      <h1 className="text-3xl font-bold mt-3">New lead</h1>
      <p className="text-sm text-muted-foreground mt-1">Manually add someone interested in a property or service.</p>

      <form onSubmit={e => { e.preventDefault(); if (form.contact_name) create.mutate(); }} className="mt-6 space-y-4">
        <Field label="Contact name *"><input required value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} className={inputCls} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email"><input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className={inputCls} /></Field>
          <Field label="Phone"><input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className={inputCls} /></Field>
        </div>
        <Field label="WhatsApp"><input value={form.contact_whatsapp} onChange={e => setForm({ ...form, contact_whatsapp: e.target.value })} className={inputCls} placeholder="+2547…" /></Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className={inputCls}>
              {LEAD_STATUSES.map(s => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Source">
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value as any })} className={inputCls}>
              {LEAD_SOURCES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })} className={inputCls}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </Field>
        </div>

        <Field label="Property">
          <select value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })} className={inputCls}>
            <option value="">— None —</option>
            {(props.data ?? []).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget min (KES)"><input type="number" value={form.budget_min} onChange={e => setForm({ ...form, budget_min: e.target.value })} className={inputCls} /></Field>
          <Field label="Budget max (KES)"><input type="number" value={form.budget_max} onChange={e => setForm({ ...form, budget_max: e.target.value })} className={inputCls} /></Field>
        </div>

        <Field label="Notes / message">
          <textarea rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className={inputCls} />
        </Field>

        <div className="pt-2">
          <button type="submit" disabled={create.isPending || !form.contact_name}
            className="btn-primary btn-primary-hover disabled:opacity-50">
            <PlusCircle className="h-4 w-4" /> Create lead
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
