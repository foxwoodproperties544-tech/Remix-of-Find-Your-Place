import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVerificationSubscription } from "@/lib/verification-subscription.functions";
import { BadgeCheck, AlertTriangle, CheckCircle2, Clock, Receipt, XCircle } from "lucide-react";

export function fmtDateTime(d?: string | null) {
  return d
    ? new Date(d).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-primary-soft text-primary",
    pending: "bg-muted text-muted-foreground",
    failed: "bg-destructive/10 text-destructive",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${map[status] ?? map.pending}`}>
      {status}
    </span>
  );
}

/** Verified-agent subscription: plan details, timestamps and payment history. */
export default function VerificationSubscriptionPanel() {
  const getFn = useServerFn(getVerificationSubscription);
  const { data: sub, isLoading } = useQuery({
    queryKey: ["verification-sub"],
    queryFn: () => getFn(),
  });

  if (isLoading || !sub) return null;

  const expired = !sub.active && !!sub.expiresAt;
  const expiring = sub.active && (sub.daysRemaining ?? 99) <= 7;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase font-semibold text-muted-foreground">Verified agent plan</div>
          <div className="mt-1 flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold">KSh {sub.price.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/ {sub.durationDays} days</span>
            {sub.active ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </span>
            ) : expired ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                <XCircle className="h-3.5 w-3.5" /> Expired
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">Not subscribed</span>
            )}
          </div>
        </div>
        <Link to="/dashboard/kyc" className="btn-primary btn-primary-hover text-sm">
          {sub.active ? "Renew early" : expired ? "Renew now" : "Subscribe"}
        </Link>
      </div>

      {(expiring || expired) && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
            expired
              ? "bg-destructive/10 border-destructive/30 text-destructive"
              : "bg-secondary/10 border-secondary/40 text-secondary"
          }`}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            {expired
              ? "Your Verified badge has lapsed. Renew to restore it."
              : `Your Verified badge expires in ${sub.daysRemaining} day${sub.daysRemaining === 1 ? "" : "s"}. We'll remind you before it lapses.`}
          </div>
        </div>
      )}

      <dl className="mt-5 grid gap-4 sm:grid-cols-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Activated</dt>
          <dd className="font-medium">{fmtDateTime(sub.startedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Last renewal</dt>
          <dd className="font-medium">{fmtDateTime(sub.lastRenewedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Renews / expires on</dt>
          <dd className="font-medium inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {fmtDateTime(sub.expiresAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-border pt-4">
        <h3 className="text-sm font-semibold inline-flex items-center gap-1.5">
          <Receipt className="h-4 w-4" /> Payment history
        </h3>
        {sub.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">No verification payments yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Amount</th>
                  <th className="py-2 pr-3 font-semibold">Receipt</th>
                  <th className="py-2 pr-3 font-semibold">Phone</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {sub.payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmtDateTime(p.paidAt)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">KSh {p.amount.toLocaleString()}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{p.receipt ?? "—"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{p.phone ?? "—"}</td>
                    <td className="py-2"><StatusPill status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
