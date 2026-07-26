import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PropertyCard } from "@/components/site/PropertyCard";
import { toProperty, type DbPropertyRow } from "@/lib/properties";
import { KENYA_COUNTIES } from "@/lib/kenya-locations-data";
import { CATEGORIES, ALL_TYPES } from "@/lib/taxonomy";
import { toast } from "sonner";
import { Sparkles, Bell, ListChecks, Check, Plus, Trash2, Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/buyer")({
  component: BuyerDashboard,
  head: () => ({
    meta: [
      { title: "Buyer dashboard — Foxwood Properties" },
      { name: "description", content: "Your matched properties, smart alerts and buyer due-diligence checklist in one place." },
      { property: "og:title", content: "Buyer dashboard — Foxwood Properties" },
      { property: "og:description", content: "Matched properties, alerts and your buying checklist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Prefs = {
  category?: string;
  type?: string;
  county?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
};

function BuyerDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  /* ---------------- match preferences + AI-style matches ---------------- */
  const { data: prefRow } = useQuery({
    queryKey: ["match-prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("match_preferences").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const prefs = (prefRow?.prefs ?? {}) as Prefs;
  const [draft, setDraft] = useState<Prefs | null>(null);
  const form = draft ?? prefs;

  const savePrefs = useMutation({
    mutationFn: async (p: Prefs) => {
      const { error } = await supabase
        .from("match_preferences")
        .upsert({ user_id: user!.id, prefs: p as any }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferences saved — matches updated");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["match-prefs"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  const { data: matches } = useQuery({
    queryKey: ["matches", user?.id, prefs],
    enabled: !!user && !!prefRow,
    queryFn: async () => {
      let q = supabase.from("properties").select("*").eq("status", "published").limit(6);
      if (prefs.category) q = q.eq("category", prefs.category);
      if (prefs.type) q = q.eq("property_type", prefs.type);
      if (prefs.county) q = q.eq("county", prefs.county);
      if (prefs.minPrice) q = q.gte("price", prefs.minPrice);
      if (prefs.maxPrice) q = q.lte("price", prefs.maxPrice);
      if (prefs.minBeds) q = q.gte("bedrooms", prefs.minBeds);
      const { data, error } = await q
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as DbPropertyRow[]).map(toProperty);
    },
  });

  /* ---------------- smart alerts ---------------- */
  const { data: alerts } = useQuery({
    queryKey: ["property-alerts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_alerts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createAlert = useMutation({
    mutationFn: async () => {
      const name = [form.county, form.type, form.category].filter(Boolean).join(" · ") || "All new listings";
      const { error } = await supabase.from("property_alerts").insert({
        user_id: user!.id,
        name,
        filters: form as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert created");
      qc.invalidateQueries({ queryKey: ["property-alerts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create alert"),
  });

  const updateAlert = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, boolean> }) => {
      const { error } = await supabase.from("property_alerts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["property-alerts"] }),
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("property_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert removed");
      qc.invalidateQueries({ queryKey: ["property-alerts"] });
    },
  });

  /* ---------------- buyer checklist ---------------- */
  const { data: checklist } = useQuery({
    queryKey: ["buyer-checklist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [tpl, prog] = await Promise.all([
        supabase.from("buyer_checklist_templates").select("*").eq("active", true).order("sort_order"),
        supabase.from("buyer_checklist_progress").select("template_id, done"),
      ]);
      if (tpl.error) throw tpl.error;
      const done = new Set((prog.data ?? []).filter((r: any) => r.done).map((r: any) => r.template_id));
      return { items: tpl.data ?? [], done };
    },
  });

  const toggleStep = useMutation({
    mutationFn: async ({ templateId, done }: { templateId: string; done: boolean }) => {
      const { error } = await supabase.from("buyer_checklist_progress").upsert(
        { user_id: user!.id, template_id: templateId, done, done_at: done ? new Date().toISOString() : null },
        { onConflict: "user_id,template_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["buyer-checklist"] }),
    onError: (e: any) => toast.error(e?.message ?? "Could not update step"),
  });

  const doneCount = checklist ? checklist.done.size : 0;
  const totalSteps = checklist?.items.length ?? 0;
  const pct = totalSteps ? Math.round((doneCount / totalSteps) * 100) : 0;

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
          <Sparkles className="h-3.5 w-3.5" /> Buyer tools
        </div>
        <h1 className="text-3xl font-bold mt-2">Your buying dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us what you're looking for and we'll match listings, alert you to changes and guide your due diligence.
        </p>
      </header>

      {/* Preferences */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-bold">What are you looking for?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Category">
            <select className="input" value={form.category ?? ""} onChange={(e) => setDraft({ ...form, category: e.target.value || undefined })}>
              <option value="">Any</option>
              {CATEGORIES.map((c: any) => <option key={c.value ?? c} value={c.value ?? c}>{c.label ?? c}</option>)}
            </select>
          </Field>
          <Field label="Property type">
            <select className="input" value={form.type ?? ""} onChange={(e) => setDraft({ ...form, type: e.target.value || undefined })}>
              <option value="">Any</option>
              {PROPERTY_TYPES.map((t: any) => <option key={t.value ?? t} value={t.value ?? t}>{t.label ?? t}</option>)}
            </select>
          </Field>
          <Field label="County">
            <select className="input" value={form.county ?? ""} onChange={(e) => setDraft({ ...form, county: e.target.value || undefined })}>
              <option value="">Any</option>
              {COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Min price (KES)">
            <input type="number" min={0} className="input" value={form.minPrice ?? ""} onChange={(e) => setDraft({ ...form, minPrice: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
          <Field label="Max price (KES)">
            <input type="number" min={0} className="input" value={form.maxPrice ?? ""} onChange={(e) => setDraft({ ...form, maxPrice: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
          <Field label="Min bedrooms">
            <input type="number" min={0} className="input" value={form.minBeds ?? ""} onChange={(e) => setDraft({ ...form, minBeds: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary btn-primary-hover text-sm" disabled={savePrefs.isPending} onClick={() => savePrefs.mutate(form)}>
            Save preferences
          </button>
          <button className="btn-ghost text-sm" disabled={createAlert.isPending} onClick={() => createAlert.mutate()}>
            <Plus className="h-4 w-4" /> Create alert from these filters
          </button>
        </div>
      </section>

      {/* Matches */}
      <section>
        <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-secondary" /> Matched for you</h2>
        {!matches || matches.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No matches yet. Save your preferences above, or <Link to="/properties" className="text-primary underline">browse all listings</Link>.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}
        <Link to="/favorites" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <Heart className="h-4 w-4" /> View your saved properties
        </Link>
      </section>

      {/* Alerts */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-bold flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Smart alerts</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose what you want to hear about for each saved search.</p>
        <div className="mt-4 grid gap-3">
          {!alerts || alerts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No alerts yet.
            </p>
          ) : alerts.map((a: any) => (
            <div key={a.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="btn-ghost !px-2 !py-1 text-destructive"
                  aria-label={`Delete alert ${a.name}`}
                  onClick={() => deleteAlert.mutate(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {[
                  ["on_new_match", "New matches"],
                  ["on_price_drop", "Price drops"],
                  ["on_status_change", "Status changes"],
                  ["on_relisted", "Relisted"],
                  ["on_agent_new_listing", "New listings from this agent"],
                  ["notify_in_app", "In-app"],
                  ["notify_email", "Email"],
                  ["active", "Alert active"],
                ].map(([key, label]) => (
                  <label key={key} className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={!!a[key]}
                      onChange={(e) => updateAlert.mutate({ id: a.id, patch: { [key]: e.target.checked } })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Checklist */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /> Buyer due-diligence checklist</h2>
          <div className="text-sm font-semibold">{doneCount}/{totalSteps} done</div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <ul className="mt-4 grid gap-2">
          {(checklist?.items ?? []).map((it: any) => {
            const done = checklist!.done.has(it.id);
            return (
              <li key={it.id}>
                <button
                  onClick={() => toggleStep.mutate({ templateId: it.id, done: !done })}
                  className={`w-full text-left flex items-start gap-3 rounded-xl border p-3 transition ${done ? "border-primary/25 bg-primary-soft/40" : "border-border hover:bg-muted/40"}`}
                  aria-pressed={done}
                >
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {done && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{it.label}</span>
                    {it.description && <span className="block text-xs text-muted-foreground mt-0.5">{it.description}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Link to="/due-diligence" className="mt-4 inline-flex text-sm text-primary hover:underline">
          Need help? Request a land search or valuation →
        </Link>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
