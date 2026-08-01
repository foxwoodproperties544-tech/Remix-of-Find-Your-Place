import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRoles } from "@/hooks/use-role";
import { toast } from "sonner";
import { Loader2, Eye, Lock } from "lucide-react";
import { getSupportSnapshot } from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/admin/support-view")({
  component: SupportView,
  head: () => ({
    meta: [
      { title: "Read-only support view — Foxwood Admin" },
      { name: "description", content: "Look up a customer account read-only for support debugging." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function SupportView() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const snapshotFn = useServerFn(getSupportSnapshot);

  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [snap, setSnap] = useState<any>(null);

  useEffect(() => {
    if (!loading && !isAdmin) nav({ to: "/dashboard" });
  }, [loading, isAdmin, nav]);

  if (loading || !isAdmin) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const run = async () => {
    setBusy(true);
    try {
      const res = await snapshotFn({ data: { email: email.trim(), reason: reason.trim() } });
      setSnap(res);
    } catch (e: any) {
      toast.error(e?.message ?? "Lookup failed");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Read-only support view</h1>
        <p className="text-sm text-muted-foreground">Inspect an account to debug a support issue. Every lookup is logged with your id and reason.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
        <input aria-label="Account email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="Account email" className="rounded-lg border border-border bg-field px-3 py-2 text-sm" />
        <input aria-label="Reason for the lookup" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (ticket ref / issue)" className="rounded-lg border border-border bg-field px-3 py-2 text-sm" />
        <button onClick={run} disabled={busy} className="btn-primary btn-primary-hover !py-2 !px-4 text-sm inline-flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Look up
        </button>
      </section>

      {snap && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3"><Lock className="h-3.5 w-3.5" /> Read-only — no actions can be taken from this view.</div>
            <h2 className="font-semibold">{snap.profile?.full_name ?? "Unnamed"} {snap.profile?.company_name ? `· ${snap.profile.company_name}` : ""}</h2>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">User id</dt><dd className="font-mono text-xs">{snap.profile?.id}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Joined</dt><dd>{fmt(snap.profile?.created_at)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Location</dt><dd>{[snap.profile?.town, snap.profile?.county].filter(Boolean).join(", ") || "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Verified / KYC</dt><dd>{String(snap.profile?.verified)} · {snap.profile?.kyc_status ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Suspended</dt><dd>{snap.profile?.suspended ? `Yes — ${snap.profile?.suspension_reason ?? ""}` : "No"}</dd></div>
            </dl>
          </div>

          <SnapTable title="Recent listings" rows={snap.listings} cols={["title", "status", "price", "created_at"]} />
          <SnapTable title="Recent viewings" rows={snap.viewings} cols={["status", "requested_at"]} />
          <SnapTable title="Recent offers" rows={snap.offers} cols={["status", "amount", "created_at"]} />
          <SnapTable title="Support tickets" rows={snap.tickets} cols={["subject", "status", "created_at"]} />
        </div>
      )}
    </div>
  );
}

function SnapTable({ title, rows, cols }: { title: string; rows: any[]; cols: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="p-4 border-b border-border font-semibold text-sm">{title}</div>
      {(!rows || rows.length === 0) ? (
        <div className="p-4 text-sm text-muted-foreground">None.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>{cols.map((c) => <th key={c} className="text-left px-4 py-2">{c.replace(/_/g, " ")}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={r.id ?? i}>
                  {cols.map((c) => (
                    <td key={c} className="px-4 py-2">
                      {c.endsWith("_at") ? fmt(r[c]) : String(r[c] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
