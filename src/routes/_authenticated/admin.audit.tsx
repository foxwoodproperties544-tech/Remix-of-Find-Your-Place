import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAuditLogs } from "@/lib/audit.functions";
import { useRoles } from "@/hooks/use-role";
import { ShieldCheck, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
  head: () => ({ meta: [{ title: "Audit logs — Admin" }, { name: "robots", content: "noindex" }] }),
});

function AuditPage() {
  const { isAdmin, loading } = useRoles();
  const listFn = useServerFn(listAuditLogs);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs", q, action, entityType],
    enabled: isAdmin,
    queryFn: () =>
      listFn({
        data: {
          q: q || undefined,
          action: action || undefined,
          entityType: entityType || undefined,
          limit: 300,
        },
      }),
  });

  if (loading) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <div className="p-6">Admins only.</div>;

  const rows = (data ?? []) as any[];

  function exportCsv() {
    const header = ["created_at","actor_email","action","entity_type","entity_id","summary","ip_address"];
    const lines = [header.join(",")].concat(
      rows.map(r => header.map(k => JSON.stringify(r[k] ?? "")).join(",")),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-logs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Audit logs
          </h1>
          <p className="text-sm text-muted-foreground">Every privileged action, searchable and exportable.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost text-sm">Refresh</button>
          <button onClick={exportCsv} className="btn-primary btn-primary-hover">Export CSV</button>
        </div>
      </header>

      <div className="grid gap-2 md:grid-cols-3 rounded-2xl border border-border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search actor, summary, entity…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm outline-none focus:border-primary" />
        </div>
        <input value={action} onChange={e => setAction(e.target.value)} placeholder="Action (e.g. role.grant)"
          className="w-full px-3 py-2 rounded-lg border border-border text-sm outline-none focus:border-primary" />
        <input value={entityType} onChange={e => setEntityType(e.target.value)} placeholder="Entity type (e.g. user)"
          className="w-full px-3 py-2 rounded-lg border border-border text-sm outline-none focus:border-primary" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Actor</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Summary</th>
                <th className="text-left px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No entries.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-xs">{r.actor_email ?? r.actor_id ?? "—"}</td>
                  <td className="px-4 py-2"><code className="text-xs bg-muted rounded px-1.5 py-0.5">{r.action}</code></td>
                  <td className="px-4 py-2 text-xs">
                    <span className="font-medium">{r.entity_type}</span>
                    {r.entity_id && <span className="text-muted-foreground"> · {r.entity_id.slice(0, 8)}…</span>}
                  </td>
                  <td className="px-4 py-2">{r.summary ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-primary-soft/40 p-4 text-sm">
        <div className="font-semibold text-primary mb-1">Backups</div>
        <p className="text-muted-foreground">
          Database backups and point-in-time recovery are managed automatically by Lovable Cloud —
          no configuration required. Contact support to restore a specific point in time.
        </p>
      </div>
    </div>
  );
}
