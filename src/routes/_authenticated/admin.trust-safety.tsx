import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoles } from "@/hooks/use-role";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Undo2, Gavel } from "lucide-react";
import {
  listSuspendedAgents,
  setAgentSuspension,
  listAppeals,
  decideAppeal,
} from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/admin/trust-safety")({
  component: TrustSafety,
  head: () => ({
    meta: [
      { title: "Trust & safety — Foxwood Admin" },
      { name: "description", content: "Suspend or reinstate agents and review suspension appeals." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function TrustSafety() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const qc = useQueryClient();

  const fetchSuspended = useServerFn(listSuspendedAgents);
  const fetchAppeals = useServerFn(listAppeals);
  const suspendFn = useServerFn(setAgentSuspension);
  const decideFn = useServerFn(decideAppeal);

  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isAdmin) nav({ to: "/dashboard" });
  }, [loading, isAdmin, nav]);

  const suspended = useQuery({
    queryKey: ["admin", "suspended-agents"],
    queryFn: () => fetchSuspended({}),
    enabled: isAdmin,
  });
  const appeals = useQuery({
    queryKey: ["admin", "appeals"],
    queryFn: () => fetchAppeals({}),
    enabled: isAdmin,
  });

  if (loading || !isAdmin) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const suspend = async () => {
    if (!targetId.trim() || !reason.trim()) { toast.error("User id and reason are required"); return; }
    setBusy(true);
    try {
      await suspendFn({ data: { userId: targetId.trim(), suspend: true, reason: reason.trim() } });
      toast.success("Agent suspended and listings unpublished");
      setTargetId(""); setReason("");
      qc.invalidateQueries({ queryKey: ["admin", "suspended-agents"] });
    } catch (e: any) { toast.error(e?.message ?? "Could not suspend"); }
    setBusy(false);
  };

  const reinstate = async (userId: string) => {
    try {
      await suspendFn({ data: { userId, suspend: false } });
      toast.success("Agent reinstated");
      qc.invalidateQueries({ queryKey: ["admin", "suspended-agents"] });
    } catch (e: any) { toast.error(e?.message ?? "Could not reinstate"); }
  };

  const decide = async (appealId: string, decision: "approved" | "declined") => {
    try {
      await decideFn({ data: { appealId, decision, note: notes[appealId]?.trim() || undefined } });
      toast.success(`Appeal ${decision}`);
      qc.invalidateQueries({ queryKey: ["admin", "appeals"] });
      qc.invalidateQueries({ queryKey: ["admin", "suspended-agents"] });
    } catch (e: any) { toast.error(e?.message ?? "Could not save decision"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trust &amp; safety</h1>
        <p className="text-sm text-muted-foreground">Suspend fraudulent accounts, reinstate them, and rule on appeals.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-secondary" /> Suspend an account</h2>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
          <input
            aria-label="User id to suspend"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder="User id (UUID)"
            className="rounded-lg border border-border bg-field px-3 py-2 text-sm"
          />
          <input
            aria-label="Suspension reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (shown to the agent)"
            className="rounded-lg border border-border bg-field px-3 py-2 text-sm"
          />
          <button onClick={suspend} disabled={busy} className="btn-primary btn-primary-hover !py-2 !px-4 text-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suspend"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Suspending immediately unpublishes every live listing owned by that account and notifies them with an appeal link.</p>
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="p-4 border-b border-border font-semibold">Suspended accounts</div>
        {suspended.isLoading ? (
          <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (suspended.data ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No suspended accounts.</div>
        ) : (
          <ul className="divide-y divide-border">
            {(suspended.data ?? []).map((a: any) => (
              <li key={a.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{a.full_name ?? "Unnamed"} {a.company_name ? `· ${a.company_name}` : ""}</div>
                  <div className="text-xs text-muted-foreground">Suspended {fmt(a.suspended_at)} — {a.suspension_reason ?? "no reason recorded"}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{a.id}</div>
                </div>
                <button onClick={() => reinstate(a.id)} className="btn-ghost !py-2 !px-3 text-sm inline-flex items-center gap-2">
                  <Undo2 className="h-4 w-4" /> Reinstate
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="p-4 border-b border-border font-semibold flex items-center gap-2"><Gavel className="h-4 w-4" /> Appeals</div>
        {appeals.isLoading ? (
          <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (appeals.data ?? []).length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No appeals submitted.</div>
        ) : (
          <ul className="divide-y divide-border">
            {(appeals.data ?? []).map((ap: any) => (
              <li key={ap.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{ap.agent_name}</div>
                  <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{ap.status}</span>
                </div>
                <div className="text-xs text-muted-foreground">{fmt(ap.created_at)}</div>
                <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/40 border border-border p-3">{ap.body}</p>
                {ap.status === "pending" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      aria-label="Decision note"
                      value={notes[ap.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [ap.id]: e.target.value }))}
                      placeholder="Decision note (optional)"
                      className="flex-1 min-w-[200px] rounded-lg border border-border bg-field px-3 py-2 text-sm"
                    />
                    <button onClick={() => decide(ap.id, "approved")} className="btn-primary btn-primary-hover !py-2 !px-3 text-sm">Approve &amp; reinstate</button>
                    <button onClick={() => decide(ap.id, "declined")} className="btn-ghost !py-2 !px-3 text-sm">Decline</button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Decided {fmt(ap.reviewed_at)} — {ap.decision_note ?? "no note"}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
