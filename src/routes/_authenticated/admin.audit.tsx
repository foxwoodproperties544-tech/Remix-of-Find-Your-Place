import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listAuditLogs } from "@/lib/audit.functions";
import { listUsers } from "@/lib/users.functions";
import { useRoles } from "@/hooks/use-role";
import { ShieldCheck, Search, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
  head: () => ({ meta: [{ title: "Audit logs — Admin" }, { name: "robots", content: "noindex" }] }),
});

const AGENT_EVENT_ACTIONS = [
  "agent.invite",
  "agent.grant_comp",
  "agent.revoke_comp",
  "role.grant",
  "role.revoke",
  "user.verify",
  "user.unverify",
];

const PRESETS = [
  { key: "all", label: "All events", actions: [] as string[] },
  { key: "agent", label: "Invite / revoke / tier-grant", actions: AGENT_EVENT_ACTIONS },
  { key: "listing", label: "Listing approvals", actions: ["listing.approve", "listing.reject"] },
] as const;

function AuditPage() {
  const { isAdmin, loading } = useRoles();
  const listFn = useServerFn(listAuditLogs);
  const usersFn = useServerFn(listUsers);
  const [q, setQ] = useState("");
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["key"]>("agent");
  const [action, setAction] = useState("");
  const [agentId, setAgentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const activeActions = useMemo(() => {
    if (action) return [action];
    return PRESETS.find((p) => p.key === preset)?.actions ?? [];
  }, [preset, action]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs", q, activeActions, agentId, startDate, endDate],
    enabled: isAdmin,
    queryFn: () =>
      listFn({
        data: {
          q: q || undefined,
          actions: activeActions.length ? activeActions : undefined,
          actorId: agentId || undefined,
          entityId: agentId || undefined,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
          limit: 400,
        },
      }),
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users-min"],
    enabled: isAdmin,
    queryFn: () => usersFn({ data: {} }),
  });

  if (loading) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <div className="p-6">Admins only.</div>;

  // When agentId is set, we want events where agent is EITHER actor or entity.
  // The server ORed via applying both filters — but that's an AND. Do a client OR here.
  const rowsRaw = (data ?? []) as any[];
  const rows = agentId
    ? rowsRaw.filter((r) => r.actor_id === agentId || r.entity_id === agentId)
    : rowsRaw;

  function exportCsv() {
    const header = ["created_at", "actor_email", "actor_id", "action", "entity_type", "entity_id", "summary", "ip_address"];
    const lines = [header.join(",")].concat(
      rows.map((r) => header.map((k) => JSON.stringify(r[k] ?? "")).join(",")),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setQ(""); setAction(""); setAgentId(""); setStartDate(""); setEndDate(""); setPreset("all");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Audit logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Every privileged action — filter by agent, event type, and date.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={clearFilters} className="btn-ghost text-sm">Clear</button>
          <button onClick={() => refetch()} className="btn-ghost text-sm">Refresh</button>
          <button onClick={exportCsv} className="btn-primary btn-primary-hover">Export CSV</button>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase text-muted-foreground">Preset:</span>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setPreset(p.key); setAction(""); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                preset === p.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search actor, summary…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm bg-background outline-none focus:border-primary"
            />
          </div>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-sm bg-background outline-none focus:border-primary"
          >
            <option value="">All agents / users</option>
            {(users ?? []).map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? u.email ?? u.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-sm bg-background outline-none focus:border-primary"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-sm bg-background outline-none focus:border-primary"
          />
        </div>

        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Advanced: single action override (e.g. agent.invite)"
          className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-background outline-none focus:border-primary"
        />
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
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No entries match your filters.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-xs">{r.actor_email ?? r.actor_id?.slice(0, 8) ?? "—"}</td>
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
        <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
          Showing {rows.length} {rows.length === 1 ? "entry" : "entries"}
        </div>
      </div>
    </div>
  );
}
