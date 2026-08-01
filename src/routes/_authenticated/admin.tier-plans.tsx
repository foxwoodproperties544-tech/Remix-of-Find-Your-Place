import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListTierPlans, adminUpsertTierPlan, adminToggleTierPlan, adminDeleteTierPlan,
} from "@/lib/tier-plans.functions";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useRoles } from "@/hooks/use-role";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tier-plans")({
  component: AdminTierPlans,
  head: () => ({ meta: [{ title: "Agent tier plans — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

const EMPTY = {
  slug: "", name: "", price: 0, listing_quota: 3, duration_days: 30,
  perks: "", badge_color: "", highlight: false, active: true, sort_order: 0,
};

function AdminTierPlans() {
  const { isAdmin, loading } = useRoles();
  const qc = useQueryClient();
  const listFn = useServerFn(adminListTierPlans);
  const upsert = useServerFn(adminUpsertTierPlan);
  const toggle = useServerFn(adminToggleTierPlan);
  const del = useServerFn(adminDeleteTierPlan);

  const [editing, setEditing] = useState<any | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-tier-plans"],
    enabled: isAdmin,
    queryFn: () => listFn(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-tier-plans"] });
    qc.invalidateQueries({ queryKey: ["tier-plans-active"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const patch = {
        slug: editing.slug.trim(),
        name: editing.name.trim(),
        price: Number(editing.price),
        listing_quota: Number(editing.listing_quota),
        duration_days: Number(editing.duration_days),
        perks: (editing.perks || "").split("\n").map((s: string) => s.trim()).filter(Boolean),
        badge_color: editing.badge_color || null,
        highlight: !!editing.highlight,
        active: !!editing.active,
        sort_order: Number(editing.sort_order) || 0,
      };
      return upsert({ data: { id: editing.id, patch } });
    },
    onSuccess: () => { toast.success("Saved"); setEditing(null); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  const onToggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggle({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message ?? "Toggle failed"),
  });

  const onDelete = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  if (loading) return <DashboardShell><div>Loading…</div></DashboardShell>;
  if (!isAdmin) return <DashboardShell><div className="text-sm text-destructive">Admins only.</div></DashboardShell>;

  return (
    <DashboardShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent tier plans</h1>
          <p className="text-sm text-muted-foreground">Create, edit, price, and reorder subscription tiers.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="btn-primary btn-primary-hover inline-flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> New plan
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Price (KES)</th>
                <th className="p-3">Quota</th>
                <th className="p-3">Days</th>
                <th className="p-3">Active</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(plans ?? []).map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">{p.sort_order}</td>
                  <td className="p-3 font-medium">{p.name}{p.highlight && <span className="ml-2 text-[10px] text-primary">POPULAR</span>}</td>
                  <td className="p-3 text-muted-foreground">{p.slug}</td>
                  <td className="p-3">{Number(p.price).toLocaleString()}</td>
                  <td className="p-3">{p.listing_quota}</td>
                  <td className="p-3">{p.duration_days}</td>
                  <td className="p-3">
                    <button onClick={() => onToggle.mutate({ id: p.id, active: !p.active })} className="inline-flex items-center gap-1 text-xs">
                      {p.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      {p.active ? "Active" : "Off"}
                    </button>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => setEditing({ ...p, perks: (p.perks ?? []).join("\n") })} className="btn-ghost inline-flex items-center gap-1 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                    <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) onDelete.mutate(p.id); }} className="btn-ghost inline-flex items-center gap-1 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  </td>
                </tr>
              ))}
              {(plans ?? []).length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">No plans yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-bold">{editing.id ? "Edit" : "New"} tier plan</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm">Name<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-field px-3 py-2" /></label>
                <label className="block text-sm">Slug (lowercase, unique)<input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} className="mt-1 w-full rounded-md border border-border bg-field px-3 py-2" /></label>
                <label className="block text-sm">Price (KES, 0 = free)<input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-field px-3 py-2" /></label>
                <label className="block text-sm">Listing quota (999 = unlimited)<input type="number" value={editing.listing_quota} onChange={(e) => setEditing({ ...editing, listing_quota: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-field px-3 py-2" /></label>
                <label className="block text-sm">Duration days<input type="number" value={editing.duration_days} onChange={(e) => setEditing({ ...editing, duration_days: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-field px-3 py-2" /></label>
                <label className="block text-sm">Sort order<input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-field px-3 py-2" /></label>
              </div>
              <label className="block text-sm">Perks (one per line)
                <textarea rows={6} value={editing.perks} onChange={(e) => setEditing({ ...editing, perks: e.target.value })} className="mt-1 w-full rounded-md border border-border bg-field px-3 py-2 font-mono text-xs" />
              </label>
              <div className="flex items-center gap-6 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.highlight} onChange={(e) => setEditing({ ...editing, highlight: e.target.checked })} /> Highlight (Popular badge)</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => save.mutate()} disabled={save.isPending || !editing.slug || !editing.name} className="btn-primary btn-primary-hover disabled:opacity-40">{save.isPending ? "Saving…" : "Save plan"}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
