import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { listUsers, setUserRole } from "@/lib/users.functions";
import { decideAccountVerification } from "@/lib/admin.functions";
import { ShieldCheck, Search, BadgeCheck, X, ThumbsUp, ThumbsDown, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
  head: () => ({ meta: [{ title: "Users & roles — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

const ROLES = ["admin", "agent", "developer", "owner", "user"] as const;

function AdminUsers() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const listFn = useServerFn(listUsers);
  const roleFn = useServerFn(setUserRole);
  const decideFn = useServerFn(decideAccountVerification);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    enabled: isAdmin,
    queryFn: () => listFn({ data: { q } }),
  });

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: (typeof ROLES)[number]; action: "add" | "remove" }) =>
      roleFn({ data: v }),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const decideMut = useMutation({
    mutationFn: (v: { userId: string; decision: "approve" | "reject"; reason?: string }) => decideFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.decision === "approve" ? "Account verified" : "Account rejected");
      setRejectFor(null); setReason("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
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

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin
          </div>
          <h1 className="text-3xl font-bold mt-2">Users &amp; roles</h1>
          <p className="text-sm text-muted-foreground mt-1">Grant or revoke roles and manage profile verification.</p>
        </div>
        <Link to="/admin" className="btn-ghost text-sm">Moderation</Link>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, company…"
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Roles</th>
                <th className="text-left px-4 py-3">Tier</th>
                <th className="text-left px-4 py-3">Verified</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading users…</td></tr>
              )}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No users match.</td></tr>
              )}
              {data?.map((u: any) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{u.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? u.id.slice(0, 8)}</div>
                    {u.company_name && <div className="text-xs text-muted-foreground">{u.company_name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">user</span>}
                      {u.roles.map((r: string) => (
                        <span key={r} className="inline-flex items-center gap-1 rounded-full bg-primary-soft text-primary text-xs px-2 py-0.5 font-semibold">
                          {r}
                          <button
                            onClick={() => roleMut.mutate({ userId: u.id, role: r as any, action: "remove" })}
                            className="hover:text-destructive"
                            title="Remove role"
                          ><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{u.tier}</td>
                  <td className="px-4 py-3">
                    {u.verified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><BadgeCheck className="h-4 w-4" /> Verified</span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <select
                        className="rounded-md border border-border bg-background text-xs px-2 py-1"
                        defaultValue=""
                        onChange={(e) => {
                          const role = e.target.value as any;
                          if (!role) return;
                          if (u.roles.includes(role)) { toast.info("Already assigned"); e.target.value = ""; return; }
                          roleMut.mutate({ userId: u.id, role, action: "add" });
                          e.target.value = "";
                        }}
                      >
                        <option value="">+ Add role</option>
                        {ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {u.verified ? (
                        <button
                          onClick={() => decideMut.mutate({ userId: u.id, decision: "reject" })}
                          className="btn-ghost !px-2 !py-1 text-xs text-destructive"
                          title="Revoke verification"
                        >
                          <ThumbsDown className="h-4 w-4" /> Unverify
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => decideMut.mutate({ userId: u.id, decision: "approve" })}
                            className="btn-ghost !px-2 !py-1 text-xs text-primary"
                            title="Verify account"
                          >
                            <ThumbsUp className="h-4 w-4" /> Verify
                          </button>
                          <button
                            onClick={() => { setRejectFor(u.id); setReason(""); }}
                            className="btn-ghost !px-2 !py-1 text-xs text-destructive"
                            title="Reject request"
                          >
                            <ThumbsDown className="h-4 w-4" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRejectFor(null)}>
          <div className="bg-card rounded-2xl border border-border p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">Reject verification</h3>
            <p className="text-xs text-muted-foreground mt-1">The user will be notified with your reason.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Reason (optional but recommended)"
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setRejectFor(null)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={() => decideMut.mutate({ userId: rejectFor!, decision: "reject", reason: reason.trim() || undefined })}
                className="btn-primary btn-primary-hover text-sm"
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
