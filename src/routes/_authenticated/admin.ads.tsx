import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import {
  adminListAdPackages, adminCreateAdPackage, adminUpdateAdPackage,
  adminDeleteAdPackage, adminToggleAdPackageActive,
} from "@/lib/ads.functions";
import { toast } from "sonner";
import { ShieldCheck, Plus, Trash2, Pencil, Power, X, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/ads")({
  component: AdminAds,
  head: () => ({ meta: [{ title: "Advertising packages — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

const PLACEMENTS = [
  { v: "homepage_hero", l: "Homepage hero" },
  { v: "homepage_banner", l: "Homepage banner" },
  { v: "properties_top", l: "Properties top" },
  { v: "sidebar", l: "Sidebar" },
  { v: "blog_inline", l: "Blog inline" },
] as const;

type Form = {
  id?: string;
  name: string; slug: string; description: string;
  placement: (typeof PLACEMENTS)[number]["v"];
  price: number; duration_days: number;
  width_px: number; height_px: number; max_active: number;
  sort_order: number; active: boolean; badge_color: string;
};

const empty: Form = {
  name: "", slug: "", description: "",
  placement: "homepage_banner",
  price: 5000, duration_days: 14,
  width_px: 1200, height_px: 300, max_active: 3,
  sort_order: 10, active: true, badge_color: "#FE4C25",
};

function AdminAds() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Form | null>(null);

  const listFn = useServerFn(adminListAdPackages);
  const createFn = useServerFn(adminCreateAdPackage);
  const updateFn = useServerFn(adminUpdateAdPackage);
  const deleteFn = useServerFn(adminDeleteAdPackage);
  const toggleFn = useServerFn(adminToggleAdPackageActive);

  const { data: pkgs, isLoading } = useQuery({
    queryKey: ["admin-ad-packages"],
    enabled: isAdmin,
    queryFn: () => listFn(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-ad-packages"] });

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { id, ...data } = editing;
      if (id) await updateFn({ data: { id, patch: data } });
      else await createFn({ data });
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleFn({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-xl font-bold mt-3">Admins only</h1>
        <button onClick={() => nav({ to: "/dashboard/account" })} className="btn-primary btn-primary-hover mt-4">Back</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-secondary bg-secondary/10 rounded-full px-3 py-1">
            <Megaphone className="h-3.5 w-3.5" /> Monetization
          </div>
          <h1 className="text-3xl font-bold mt-2">Advertising packages</h1>
          <p className="text-sm text-muted-foreground mt-1">Define the ad slots you sell, their price, duration and rotation cap.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/ad-campaigns" className="btn-ghost text-sm">Review campaigns</Link>
          <button onClick={() => setEditing({ ...empty })} className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> New ad package
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Placement</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Size</th>
                <th className="text-left px-4 py-3">Rotation</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</td></tr>}
              {!isLoading && (pkgs?.length ?? 0) === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No ad packages yet.</td></tr>
              )}
              {pkgs?.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.badge_color || "#FE4C25" }} />
                      {p.name}
                    </div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{PLACEMENTS.find(x => x.v === p.placement)?.l ?? p.placement}</td>
                  <td className="px-4 py-3 font-medium">{Number(p.price) === 0 ? "Free" : `KSh ${Number(p.price).toLocaleString()}`}</td>
                  <td className="px-4 py-3">{p.duration_days}d</td>
                  <td className="px-4 py-3 text-xs">{p.width_px}×{p.height_px}</td>
                  <td className="px-4 py-3 text-xs">{p.max_active} concurrent</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${p.active ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button className="btn-ghost !p-1.5" title="Toggle" onClick={() => toggle.mutate({ id: p.id, active: !p.active })}><Power className="h-4 w-4" /></button>
                      <button className="btn-ghost !p-1.5" title="Edit" onClick={() => setEditing({ ...p, description: p.description ?? "", badge_color: p.badge_color ?? "#FE4C25" })}><Pencil className="h-4 w-4" /></button>
                      <button className="btn-ghost !p-1.5 text-destructive" title="Delete" onClick={() => confirm(`Delete "${p.name}"?`) && remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="w-full max-w-2xl bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card/95 backdrop-blur p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing.id ? "Edit ad package" : "New ad package"}</h2>
              <button onClick={() => setEditing(null)} className="btn-ghost !p-1.5"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name"><input className={inp} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
                <Field label="Slug"><input className={inp} value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></Field>
              </div>
              <Field label="Description"><textarea className={`${inp} min-h-[70px]`} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Placement">
                  <select className={inp} value={editing.placement} onChange={(e) => setEditing({ ...editing, placement: e.target.value as any })}>
                    {PLACEMENTS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </Field>
                <Field label="Price (KSh)"><input type="number" className={inp} value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></Field>
                <Field label="Duration (days)"><input type="number" className={inp} value={editing.duration_days} onChange={(e) => setEditing({ ...editing, duration_days: Number(e.target.value) })} /></Field>
                <Field label="Max concurrent"><input type="number" className={inp} value={editing.max_active} onChange={(e) => setEditing({ ...editing, max_active: Number(e.target.value) })} /></Field>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Width (px)"><input type="number" className={inp} value={editing.width_px} onChange={(e) => setEditing({ ...editing, width_px: Number(e.target.value) })} /></Field>
                <Field label="Height (px)"><input type="number" className={inp} value={editing.height_px} onChange={(e) => setEditing({ ...editing, height_px: Number(e.target.value) })} /></Field>
                <Field label="Sort order"><input type="number" className={inp} value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
                <Field label="Badge color"><input type="color" className="h-10 w-full rounded-lg border border-border" value={editing.badge_color} onChange={(e) => setEditing({ ...editing, badge_color: e.target.value })} /></Field>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Active (available for purchase)
              </label>
            </div>
            <div className="sticky bottom-0 bg-card/95 backdrop-blur border-t border-border p-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary btn-primary-hover text-sm">
                {save.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-xs font-semibold mb-1">{label}</div>{children}</label>;
}
