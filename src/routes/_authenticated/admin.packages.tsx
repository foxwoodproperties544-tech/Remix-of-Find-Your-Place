import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import {
  adminListPackages, adminCreatePackage, adminUpdatePackage,
  adminDeletePackage, adminTogglePackageActive, adminDuplicatePackage,
} from "@/lib/packages.functions";
import { toast } from "sonner";
import { ShieldCheck, Plus, Copy, Trash2, Pencil, Power, X, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  component: AdminPackages,
  head: () => ({ meta: [{ title: "Listing packages — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

type PkgForm = {
  name: string; slug: string; description: string;
  price: number; duration_days: number;
  max_listings: number; max_photos: number; max_videos: number;
  is_featured: boolean; homepage_placement: boolean; priority_search: boolean;
  category_highlight: boolean; analytics_enabled: boolean; whatsapp_button: boolean;
  lead_management: boolean; renewal_enabled: boolean; auto_expiry: boolean;
  active: boolean; sort_order: number; badge_color: string;
};

const empty: PkgForm = {
  name: "", slug: "", description: "",
  price: 500, duration_days: 30,
  max_listings: 1, max_photos: 10, max_videos: 0,
  is_featured: false, homepage_placement: false, priority_search: false,
  category_highlight: false, analytics_enabled: false, whatsapp_button: true,
  lead_management: false, renewal_enabled: true, auto_expiry: true,
  active: true, sort_order: 10, badge_color: "#0F766E",
};

function AdminPackages() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PkgForm & { id?: string } | null>(null);

  const listFn = useServerFn(adminListPackages);
  const createFn = useServerFn(adminCreatePackage);
  const updateFn = useServerFn(adminUpdatePackage);
  const deleteFn = useServerFn(adminDeletePackage);
  const toggleFn = useServerFn(adminTogglePackageActive);
  const duplicateFn = useServerFn(adminDuplicatePackage);

  const { data: pkgs, isLoading } = useQuery({
    queryKey: ["admin-packages"],
    enabled: isAdmin,
    queryFn: () => listFn(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-packages"] });
    // Also refresh the public pricing page cache so toggles/edits show immediately.
    qc.invalidateQueries({ queryKey: ["active-packages"] });
  };

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

  const duplicate = useMutation({
    mutationFn: (id: string) => duplicateFn({ data: { id } }),
    onSuccess: () => { toast.success("Duplicated"); invalidate(); },
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
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <Package className="h-3.5 w-3.5" /> Monetization
          </div>
          <h1 className="text-3xl font-bold mt-2">Listing packages</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, edit, duplicate and activate the packages users buy before publishing.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/subscriptions" className="btn-ghost text-sm">Subscriptions</Link>
          <Link to="/admin/packages/preview" className="btn-ghost text-sm">Preview pricing page</Link>
          <button onClick={() => setEditing({ ...empty })} className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-2"><Plus className="h-4 w-4" /> New package</button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Limits</th>
                <th className="text-left px-4 py-3">Perks</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</td></tr>}
              {!isLoading && (pkgs?.length ?? 0) === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No packages yet.</td></tr>
              )}
              {pkgs?.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.badge_color || "#0F766E" }} />
                      {p.name}
                    </div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{Number(p.price) === 0 ? "Free" : `KSh ${Number(p.price).toLocaleString()}`}</td>
                  <td className="px-4 py-3">{p.duration_days}d</td>
                  <td className="px-4 py-3 text-xs">{p.max_listings} listing · {p.max_photos} photos · {p.max_videos} video</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {[
                      p.is_featured && "Featured",
                      p.homepage_placement && "Homepage",
                      p.priority_search && "Priority",
                      p.analytics_enabled && "Analytics",
                      p.lead_management && "CRM",
                    ].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${p.active ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button className="btn-ghost !p-1.5" title="Toggle active" onClick={() => toggle.mutate({ id: p.id, active: !p.active })}><Power className="h-4 w-4" /></button>
                      <button className="btn-ghost !p-1.5" title="Duplicate" onClick={() => duplicate.mutate(p.id)}><Copy className="h-4 w-4" /></button>
                      <button className="btn-ghost !p-1.5" title="Edit" onClick={() => setEditing({ ...p, description: p.description ?? "", badge_color: p.badge_color ?? "#0F766E" })}><Pencil className="h-4 w-4" /></button>
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
          <div className="w-full max-w-3xl bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card/95 backdrop-blur p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing.id ? "Edit package" : "New package"}</h2>
              <button onClick={() => setEditing(null)} className="btn-ghost !p-1.5"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name"><input className={inp} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
                <Field label="Slug (URL)"><input className={inp} value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></Field>
              </div>
              <Field label="Description"><textarea className={`${inp} min-h-[80px]`} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Price (KSh)"><input type="number" className={inp} value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></Field>
                <Field label="Duration (days)"><input type="number" className={inp} value={editing.duration_days} onChange={(e) => setEditing({ ...editing, duration_days: Number(e.target.value) })} /></Field>
                <Field label="Sort order"><input type="number" className={inp} value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
                <Field label="Badge color"><input type="color" className="h-10 w-full rounded-lg border border-border" value={editing.badge_color} onChange={(e) => setEditing({ ...editing, badge_color: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Max listings"><input type="number" className={inp} value={editing.max_listings} onChange={(e) => setEditing({ ...editing, max_listings: Number(e.target.value) })} /></Field>
                <Field label="Max photos"><input type="number" className={inp} value={editing.max_photos} onChange={(e) => setEditing({ ...editing, max_photos: Number(e.target.value) })} /></Field>
                <Field label="Max videos"><input type="number" className={inp} value={editing.max_videos} onChange={(e) => setEditing({ ...editing, max_videos: Number(e.target.value) })} /></Field>
              </div>
              <div className="rounded-xl border border-border p-4 space-y-2">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Features</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    ["is_featured", "Featured listing badge"],
                    ["homepage_placement", "Homepage placement"],
                    ["priority_search", "Priority search placement"],
                    ["category_highlight", "Category highlight"],
                    ["analytics_enabled", "Analytics dashboard"],
                    ["whatsapp_button", "WhatsApp contact button"],
                    ["lead_management", "Lead / CRM access"],
                    ["renewal_enabled", "Renewal enabled"],
                    ["auto_expiry", "Auto-expire at end of duration"],
                    ["active", "Active (visible to buyers)"],
                  ].map(([k, l]) => (
                    <label key={k} className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={(editing as any)[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.checked } as any)} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-card/95 backdrop-blur border-t border-border p-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary btn-primary-hover text-sm">
                {save.isPending ? "Saving…" : "Save package"}
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
