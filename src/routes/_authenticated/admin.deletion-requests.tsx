import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { listDeletionRequests, processDeletionRequest } from "@/lib/compliance.functions";

export const Route = createFileRoute("/_authenticated/admin/deletion-requests")({
  component: DeletionRequests,
  head: () => ({
    meta: [
      { title: "Account deletion requests — Foxwood Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const TABS = ["pending", "reviewing", "completed", "rejected", "all"] as const;

function DeletionRequests() {
  const { isAdmin, loading } = useAdminGuard();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const list = useQuery({
    queryKey: ["deletion-requests", tab],
    enabled: isAdmin,
    queryFn: () => listDeletionRequests({ data: { status: tab } }),
  });

  const act = useMutation({
    mutationFn: (v: { id: string; action: "reviewing" | "completed" | "rejected" }) =>
      processDeletionRequest({ data: { ...v, notes: notes[v.id] || undefined } }),
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["deletion-requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || !isAdmin) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" /> Account deletion requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Users who asked us to erase their data. Verify identity, remove or anonymise their records, then mark complete.
        </p>
      </header>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize border ${
              tab === t ? "bg-primary text-primary-foreground border-primary" : "border-border"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (list.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No requests here.</p>
      ) : (
        <ul className="space-y-3">
          {list.data!.map((r: any) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{r.profile?.full_name ?? "Unnamed user"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.user_id} · requested {new Date(r.created_at).toLocaleString()}
                  </div>
                  {r.reason && <p className="text-sm mt-2">Reason: {r.reason}</p>}
                  {r.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-1">Notes: {r.admin_notes}</p>
                  )}
                </div>
                <span className="rounded-full border border-border px-2 py-1 text-[11px] font-semibold capitalize">
                  {r.status}
                </span>
              </div>

              {r.status !== "completed" && r.status !== "rejected" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    placeholder="Internal note (optional)"
                    className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    disabled={act.isPending}
                    onClick={() => act.mutate({ id: r.id, action: "reviewing" })}
                    className="btn-ghost text-xs"
                  >
                    Mark reviewing
                  </button>
                  <button
                    disabled={act.isPending}
                    onClick={() => act.mutate({ id: r.id, action: "rejected" })}
                    className="btn-ghost text-xs"
                  >
                    Reject
                  </button>
                  <button
                    disabled={act.isPending}
                    onClick={() => act.mutate({ id: r.id, action: "completed" })}
                    className="btn-primary btn-primary-hover text-xs"
                  >
                    Mark completed
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
