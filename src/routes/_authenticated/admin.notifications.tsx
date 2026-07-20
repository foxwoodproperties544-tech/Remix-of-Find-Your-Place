import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { listAllNotifications, updateNotifications, broadcastNotification } from "@/lib/admin.functions";
import { Bell, Search, CheckCheck, Circle, Trash2, Megaphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: AdminNotifications,
  head: () => ({ meta: [{ title: "Notifications — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function AdminNotifications() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "unread" | "read">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openCast, setOpenCast] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", link: "", audience: "all" as "all" | "agents" | "verified" });

  const listFn = useServerFn(listAllNotifications);
  const updateFn = useServerFn(updateNotifications);
  const castFn = useServerFn(broadcastNotification);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notifs", q, status],
    enabled: isAdmin,
    queryFn: () => listFn({ data: { q, status } }),
  });

  const mut = useMutation({
    mutationFn: (v: { ids: string[]; action: "mark_read" | "mark_unread" | "delete" }) => updateFn({ data: v }),
    onSuccess: () => { setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin-notifs"] }); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const castMut = useMutation({
    mutationFn: () => castFn({ data: form }),
    onSuccess: (r: any) => { toast.success(`Sent to ${r.sent} users`); setOpenCast(false); setForm({ title: "", body: "", link: "", audience: "all" }); qc.invalidateQueries({ queryKey: ["admin-notifs"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
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

  const rows = data ?? [];
  const allSelected = rows.length > 0 && rows.every((r: any) => selected.has(r.id));
  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </div>
          <h1 className="text-3xl font-bold mt-2">Notifications center</h1>
          <p className="text-sm text-muted-foreground mt-1">Review user notifications and broadcast messages.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOpenCast((v) => !v)} className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-1">
            <Megaphone className="h-4 w-4" /> Broadcast
          </button>
          <Link to="/admin/analytics" className="btn-ghost text-sm">Analytics</Link>
        </div>
      </div>

      {openCast && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">Send broadcast</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as any })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="all">All users</option>
              <option value="agents">Agents only</option>
              <option value="verified">Verified only</option>
            </select>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message body" rows={3} className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Link (optional, e.g. /properties)" className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setOpenCast(false)} className="btn-ghost text-sm">Cancel</button>
            <button disabled={castMut.isPending || form.title.length < 2 || form.body.length < 2} onClick={() => castMut.mutate()} className="btn-primary btn-primary-hover text-sm">
              {castMut.isPending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 flex-wrap">
        <div className="relative max-w-md flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, body, recipient…" className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm" />
        </div>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-sm">
          {(["all", "unread", "read"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-2 capitalize ${status === s ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{s}</button>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="ml-auto flex gap-2">
            <button onClick={() => mut.mutate({ ids: [...selected], action: "mark_read" })} className="btn-ghost text-sm inline-flex items-center gap-1"><CheckCheck className="h-4 w-4" /> Mark read</button>
            <button onClick={() => mut.mutate({ ids: [...selected], action: "mark_unread" })} className="btn-ghost text-sm inline-flex items-center gap-1"><Circle className="h-4 w-4" /> Mark unread</button>
            <button onClick={() => mut.mutate({ ids: [...selected], action: "delete" })} className="btn-ghost text-sm inline-flex items-center gap-1 text-destructive"><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r: any) => r.id)) : new Set())}
                  />
                </th>
                <th className="text-left px-4 py-3">Notification</th>
                <th className="text-left px-4 py-3">Recipient</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground"><Bell className="h-6 w-6 mx-auto mb-2 opacity-50" /> No notifications match.</td></tr>
              )}
              {rows.map((n: any) => (
                <tr key={n.id} className={`hover:bg-muted/30 ${!n.read ? "bg-primary-soft/20" : ""}`}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggle(n.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{n.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>
                    {n.link && <div className="text-xs text-primary mt-1">{n.link}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{n.user_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{n.user_id.slice(0, 8)}</div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs rounded-full bg-muted px-2 py-0.5">{n.type}</span></td>
                  <td className="px-4 py-3">
                    {n.read
                      ? <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5" /> Read</span>
                      : <span className="text-xs text-primary font-semibold inline-flex items-center gap-1"><Circle className="h-3.5 w-3.5 fill-current" /> Unread</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmt(n.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
