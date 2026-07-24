import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListScanRuns, adminRunSubscriptionScan } from "@/lib/renewals.functions";
import { CheckCircle2, XCircle, RefreshCw, Play, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/scan-runs")({
  component: ScanRunsPage,
  head: () => ({ meta: [{ title: "Subscription scan runs — Admin" }, { name: "robots", content: "noindex" }] }),
});

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
}

function ScanRunsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListScanRuns);
  const runFn = useServerFn(adminRunSubscriptionScan);

  const { data = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["admin-scan-runs"],
    queryFn: () => listFn(),
    refetchInterval: 30_000,
  });

  const run = useMutation({
    mutationFn: () => runFn(),
    onSuccess: (r: any) => { toast.success(`Scan complete · ${r.remindersSent} reminders sent`); qc.invalidateQueries({ queryKey: ["admin-scan-runs"] }); },
    onError: (e: any) => toast.error(e.message ?? "Scan failed"),
  });

  const last = data[0];
  const lastOk = data.find((r: any) => r.ok);
  const lastErr = data.find((r: any) => !r.ok);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Subscription scan runs</h1>
          <p className="text-sm text-muted-foreground mt-1">Daily automation history — reminders sent + expiry sweep results.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost text-sm inline-flex items-center gap-1.5"><RefreshCw className="h-4 w-4" /> Refresh</button>
          <button disabled={run.isPending} onClick={() => run.mutate()} className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-1.5">
            {run.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Play className="h-4 w-4" /> Run now</>}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <StatCard label="Last run" value={fmt(last?.ran_at)} tone={last?.ok ? "primary" : "destructive"} icon={last?.ok ? CheckCircle2 : XCircle} hint={last?.ok ? "Succeeded" : last ? `Failed at ${last.error_step}` : "No runs yet"} />
        <StatCard label="Last success" value={fmt(lastOk?.ran_at)} tone="primary" icon={CheckCircle2} hint={lastOk ? `${lastOk.reminders_sent} reminders` : "—"} />
        <StatCard label="Last error" value={fmt(lastErr?.ran_at)} tone="destructive" icon={XCircle} hint={lastErr?.error_step ?? "None"} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Ran at</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Reminders</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Trigger</th>
                <th className="text-left px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</td></tr>}
              {!isLoading && data.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground"><Clock className="h-6 w-6 mx-auto mb-2 opacity-60" /> No runs recorded yet. Trigger one manually or wait for the daily cron.</td></tr>}
              {data.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{fmt(r.ran_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${r.ok ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive"}`}>
                      {r.ok ? "OK" : "FAILED"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{r.reminders_sent}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.duration_ms ? `${r.duration_ms}ms` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.triggered_by}</td>
                  <td className="px-4 py-3 text-xs text-destructive max-w-md truncate">{r.error_step ? `${r.error_step}: ${r.error_message}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone, icon: Icon, hint }: { label: string; value: string; tone: "primary" | "destructive"; icon: any; hint?: string }) {
  const toneCls = tone === "primary" ? "bg-primary-soft text-primary" : "bg-destructive/10 text-destructive";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${toneCls}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-2 text-sm font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
