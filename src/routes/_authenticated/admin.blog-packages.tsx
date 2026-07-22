import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListBlogPackages, adminUpsertBlogPackage, adminToggleBlogPackage, adminDeleteBlogPackage,
} from "@/lib/blog-submission.functions";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useRoles } from "@/hooks/use-role";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/blog-packages")({
  component: AdminBlogPackages,
  head: () => ({ meta: [{ title: "Blog packages — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

const EMPTY = {
  name: "", slug: "", description: "", price: 0, duration_days: 30, features: "",
  is_featured: false, is_sponsored: false, homepage_placement: false, priority_placement: false,
  badge_color: "", active: true, sort_order: 0,
};

function AdminBlogPackages() {
  const { isAdmin, loading } = useRoles();
  const qc = useQueryClient();
  const listFn = useServerFn(adminListBlogPackages);
  const upsert = useServerFn(adminUpsertBlogPackage);
  const toggle = useServerFn(adminToggleBlogPackage);
  const del = useServerFn(adminDeleteBlogPackage);

  const [editing, setEditing] = useState<any | null>(null);

  const { data: pkgs, isLoading } = useQuery({
    queryKey: ["admin-blog-packages"],
    enabled: isAdmin,
    queryFn: () => listFn(),
  });

  const save = useMutation({
    mutationFn: async () => {
      const patch = {
        ...editing,
        price: Number(editing.price),
        duration_days: Number(editing.duration_days),
        sort_order: Number(editing.sort_order),
        features: (editing.features || "").split("\n").map((s: string) => s.trim()).filter(Boolean),
      };
      return upsert({ data: { id: editing.id, patch } });
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-blog-packages"] });
      qc.invalidateQueries({ queryKey: ["blog-packages"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  if (loading) return <DashboardShell><div>Loading…</div></DashboardShell>;
  if (!isAdmin) return <DashboardShell><div className="text-sm text-destructive">Admins only.</div></DashboardShell>;

  return (
    <DashboardShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog packages</h1>
          <p className="text-sm text-muted-foreground">Create, edit, price, activate or deactivate packages.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="btn-primary btn-primary-hover inline-flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> New package
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Days</th><th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3">Active</th><th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pkgs?.map((p: any) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-semibold">{p.name}<div className="text-xs text-muted-foreground font-normal">{p.slug}</div></td>
                  <td className="px-4 py-3">{Number(p.price) === 0 ? "Free" : `KSh ${Number(p.price).toLocaleString()}`}</td>
                  <td className="px-4 py-3">{p.duration_days}</td>
                  <td className="px-4 py-3 text-xs">
                    {p.is_sponsored && <span className="mr-1 text-secondary">Sponsored</span>}
                    {p.is_featured && <span className="mr-1 text-primary">Featured</span>}
                    {p.homepage_placement && <span className="mr-1">Homepage</span>}
                    {p.priority_placement && <span>Priority</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={async () => { await toggle({ data: { id: p.id, active: !p.active } }); qc.invalidateQueries({ queryKey: ["admin-blog-packages"] }); qc.invalidateQueries({ queryKey: ["blog-packages"] }); }}
                      className="inline-flex items-center gap-1 text-xs font-semibold">
                      {p.active ? <><ToggleRight className="h-4 w-4 text-primary" /> On</> : <><ToggleLeft className="h-4 w-4 text-muted-foreground" /> Off</>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing({ ...p, features: (p.features ?? []).join("\n") })} className="btn-ghost text-xs inline-flex items-center gap-1 mr-1">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={async () => { if (!confirm("Delete this package?")) return; await del({ data: { id: p.id } }); qc.invalidateQueries({ queryKey: ["admin-blog-packages"] }); toast.success("Deleted"); }}
                      className="btn-ghost text-xs inline-flex items-center gap-1 text-destructive">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!pkgs?.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No packages yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-background p-6 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{editing.id ? "Edit package" : "New package"}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Name"><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input" /></Field>
              <Field label="Slug"><input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="input" /></Field>
              <Field label="Price (KSh)"><input type="number" min={0} value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} className="input" /></Field>
              <Field label="Duration (days)"><input type="number" min={1} value={editing.duration_days} onChange={(e) => setEditing({ ...editing, duration_days: e.target.value })} className="input" /></Field>
              <Field label="Sort order"><input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} className="input" /></Field>
              <Field label="Badge color (hex)"><input value={editing.badge_color ?? ""} onChange={(e) => setEditing({ ...editing, badge_color: e.target.value })} className="input" /></Field>
              <Field label="Description" full><textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} className="input" /></Field>
              <Field label="Features (one per line)" full><textarea value={editing.features} onChange={(e) => setEditing({ ...editing, features: e.target.value })} rows={4} className="input font-mono text-xs" /></Field>
              <Toggle label="Featured on blog homepage" checked={editing.is_featured} onChange={(v) => setEditing({ ...editing, is_featured: v })} />
              <Toggle label="Sponsored badge" checked={editing.is_sponsored} onChange={(v) => setEditing({ ...editing, is_sponsored: v })} />
              <Toggle label="Homepage exposure" checked={editing.homepage_placement} onChange={(v) => setEditing({ ...editing, homepage_placement: v })} />
              <Toggle label="Priority in listings" checked={editing.priority_placement} onChange={(v) => setEditing({ ...editing, priority_placement: v })} />
              <Toggle label="Active" checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} />
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-2">
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input { width: 100%; border-radius: 0.5rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </DashboardShell>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`text-xs font-semibold ${full ? "md:col-span-2" : ""}`}>
      {label}
      <div className="mt-1 font-normal">{children}</div>
    </label>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}
