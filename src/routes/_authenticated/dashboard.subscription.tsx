import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMySubscription, cancelPendingDowngrade } from "@/lib/subscriptions.functions";
import { listActiveTierPlans } from "@/lib/tier-plans.functions";
import { AlertTriangle, CalendarClock, CheckCircle2, Crown, Receipt, RefreshCw, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { toast } from "sonner";
import VerificationSubscriptionPanel from "@/components/dashboard/VerificationSubscriptionPanel";


export const Route = createFileRoute("/_authenticated/dashboard/subscription")({
  component: MySubscription,
  head: () => ({ meta: [{ title: "My subscription — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    active: { label: "Active", cls: "bg-primary-soft text-primary", icon: CheckCircle2 },
    expiring: { label: "Expiring soon", cls: "bg-secondary/15 text-secondary", icon: AlertTriangle },
    expired: { label: "Expired", cls: "bg-destructive/10 text-destructive", icon: XCircle },
    suspended: { label: "Suspended", cls: "bg-destructive/10 text-destructive", icon: XCircle },
    free: { label: "Free plan", cls: "bg-muted text-foreground", icon: Crown },
  };
  const s = map[status] ?? map.free;
  const I = s.icon;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}><I className="h-3.5 w-3.5" /> {s.label}</span>;
}

function MySubscription() {
  const nav = useNavigate();
  const getFn = useServerFn(getMySubscription);
  const cancelDown = useServerFn(cancelPendingDowngrade);

  const { data: sub, isLoading, refetch } = useQuery({ queryKey: ["my-subscription"], queryFn: () => getFn() });
  const { data: plans = [] } = useQuery({ queryKey: ["tier-plans-active"], queryFn: () => listActiveTierPlans() });

  if (isLoading || !sub) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const currentPlan = plans.find((p) => p.slug === sub.tier);
  const cheaperPlans = currentPlan ? plans.filter((p) => Number(p.price) > 0 && Number(p.price) < Number(currentPlan.price)) : [];
  const higherPlans = currentPlan ? plans.filter((p) => Number(p.price) > Number(currentPlan.price)) : plans.filter((p) => Number(p.price) > 0);

  const banner =
    sub.status === "expired" ? { tone: "bg-destructive/10 border-destructive/30 text-destructive", msg: `Your subscription expired ${sub.daysRemaining !== null ? `${Math.abs(sub.daysRemaining)} days ago` : ""}. New listings are paused; existing listings will be hidden after the ${sub.graceDays}-day grace period.` } :
    sub.status === "expiring" ? { tone: "bg-secondary/10 border-secondary/40 text-secondary", msg: `Your subscription expires in ${sub.daysRemaining} day${sub.daysRemaining === 1 ? "" : "s"}. Renew now to avoid interruption.` } :
    sub.status === "suspended" ? { tone: "bg-destructive/10 border-destructive/30 text-destructive", msg: "Your subscription is suspended. Please contact support." } :
    null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">My Subscription</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your plan, renew, upgrade or downgrade at any time.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/payment-history" className="btn-ghost text-sm inline-flex items-center gap-1.5"><Receipt className="h-4 w-4" /> Payment history</Link>
        </div>
      </div>

      {banner && (
        <div className={`mt-6 rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${banner.tone}`}>
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>{banner.msg}</div>
        </div>
      )}

      {sub.pendingTier && (
        <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-secondary" /> Scheduled downgrade to <b>{sub.pendingTierName}</b> on {fmt(sub.expiresAt)}.</div>
          <button className="btn-ghost text-xs" onClick={async () => { try { await cancelDown(); toast.success("Downgrade cancelled"); refetch(); } catch (e: any) { toast.error(e.message); } }}>Cancel downgrade</button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs uppercase font-semibold text-muted-foreground">Current plan</div>
              <div className="mt-1 flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold capitalize">{sub.planName || sub.tier}</span>
                <StatusBadge status={sub.status} />
              </div>
            </div>
            {sub.tier !== "free" && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Next billing</div>
                <div className="font-bold text-lg">KES {sub.nextBillingAmount.toLocaleString()}</div>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
            <Stat label="Start date" value={fmt(sub.startedAt)} />
            <Stat label="Expiry date" value={fmt(sub.expiresAt)} />
            <Stat label="Days remaining" value={sub.daysRemaining === null ? "—" : `${Math.max(0, sub.daysRemaining)}`} />
            <Stat label="Listings" value={`${sub.listingsUsed} / ${sub.listingQuota >= 999 ? "∞" : sub.listingQuota}`} sub={`${sub.listingsRemaining >= 999 ? "Unlimited" : `${sub.listingsRemaining} remaining`}`} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {sub.tier !== "free" ? (
              <>
                <button onClick={() => nav({ to: "/dashboard/upgrade", search: { tier: sub.tier, mode: "renew" } })} className="btn-primary btn-primary-hover inline-flex items-center gap-1.5"><RefreshCw className="h-4 w-4" /> Renew subscription</button>
                {higherPlans.length > 0 && (
                  <button onClick={() => nav({ to: "/dashboard/upgrade", search: { mode: "upgrade" } })} className="btn-ghost inline-flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Upgrade plan</button>
                )}
                {cheaperPlans.length > 0 && (
                  <button onClick={() => nav({ to: "/dashboard/upgrade", search: { mode: "downgrade" } })} className="btn-ghost inline-flex items-center gap-1.5"><TrendingDown className="h-4 w-4" /> Downgrade plan</button>
                )}
              </>
            ) : (
              <button onClick={() => nav({ to: "/dashboard/upgrade" })} className="btn-primary btn-primary-hover inline-flex items-center gap-1.5"><Crown className="h-4 w-4" /> Choose a plan</button>
            )}
            <Link to="/dashboard/payment-history" className="btn-ghost inline-flex items-center gap-1.5"><Receipt className="h-4 w-4" /> View payment history</Link>
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 h-fit">
          <div className="flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-primary" /> Renewal timeline</div>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li>• You'll be notified 14, 7, 3, 1 day before expiry and on the expiry date.</li>
            <li>• After expiry, listings remain visible for <b>{sub.graceDays} day{sub.graceDays === 1 ? "" : "s"}</b> as a grace period.</li>
            <li>• Scheduled downgrades take effect at the end of the current billing cycle.</li>
            <li>• Upgrades take effect immediately — you're charged the full new-plan price.</li>
          </ul>
        </aside>
      </div>

      <VerificationSubscriptionPanel />
    </div>
  );
}


function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[11px] uppercase font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
