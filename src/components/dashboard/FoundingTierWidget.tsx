import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, Clock, CheckCircle2, AlertTriangle, Crown } from "lucide-react";
import { getMyFoundingStatus } from "@/lib/founding.functions";

const FOUNDING_TOTAL_DAYS = 30;

export function FoundingTierWidget() {
  const fn = useServerFn(getMyFoundingStatus);
  const { data, isLoading } = useQuery({
    queryKey: ["founding-status"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return <div className="rounded-2xl border border-border bg-card p-5 animate-pulse h-40" />;
  }
  if (!data) return null;
  if (!data.active && !data.is_comp) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase font-semibold text-muted-foreground">Plan</div>
            <div className="font-semibold">Free plan — upgrade for more listings</div>
          </div>
          <Link to="/dashboard/upgrade" className="btn-primary btn-primary-hover text-sm">
            <Crown className="h-4 w-4" /> Upgrade
          </Link>
        </div>
      </div>
    );
  }

  const listingPct = data.listing_quota > 0
    ? Math.min(100, Math.round((data.published_count / data.listing_quota) * 100))
    : 0;
  const daysRemaining = data.days_remaining ?? 0;
  const daysPct = Math.max(0, Math.min(100, Math.round((daysRemaining / FOUNDING_TOTAL_DAYS) * 100)));
  const expiringSoon = data.days_remaining !== null && data.days_remaining <= 7;
  const veryClose = data.days_remaining !== null && data.days_remaining <= 3;
  const atQuota = data.remaining <= 0 && data.listing_quota > 0;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/60 to-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-white/70 rounded-full px-2.5 py-0.5">
            <Sparkles className="h-3 w-3" /> {data.is_founding ? "Founding Agent" : (data.tier_name ?? data.tier)}
            {data.is_comp && <span className="text-secondary">· Complimentary</span>}
          </div>
          <h3 className="mt-1 font-bold text-lg">Your plan status</h3>
        </div>
        <Link to="/dashboard/subscription" className="btn-ghost text-xs">Manage plan</Link>
      </div>

      {expiringSoon && (
        <div
          className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
            veryClose
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-secondary/30 bg-secondary/10 text-secondary"
          }`}
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">
              {daysRemaining <= 0
                ? "Your founding plan has expired"
                : `Founding plan expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`}
            </div>
            <div className="mt-0.5">
              Choose a paid plan to keep publishing new listings after expiry.
            </div>
            <Link to="/dashboard/upgrade" className="mt-2 inline-flex items-center gap-1 font-semibold underline">
              <Crown className="h-3.5 w-3.5" /> Upgrade now
            </Link>
          </div>
        </div>
      )}

      {atQuota && (
        <div className="flex items-start gap-2 rounded-xl border border-secondary/30 bg-secondary/10 p-3 text-xs text-secondary">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">You've used all {data.listing_quota} free founding listings</div>
            <div className="mt-0.5">
              Any additional listing needs a paid package before it can go live.
            </div>
            <Link to="/dashboard/upgrade" className="mt-2 inline-flex items-center gap-1 font-semibold underline">
              <Crown className="h-3.5 w-3.5" /> Choose a plan
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Expires in"
          value={data.days_remaining !== null ? `${daysRemaining}d` : "—"}
          hint={data.expires_at ? new Date(data.expires_at).toDateString() : "No expiry"}
          icon={<Clock className="h-4 w-4" />}
          tone={veryClose ? "warn" : expiringSoon ? "info" : "default"}
        />
        <Stat
          label="Listings used"
          value={`${data.published_count}/${data.listing_quota || "∞"}`}
          hint={atQuota ? "Quota reached" : `${data.remaining} remaining`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone={atQuota ? "warn" : "default"}
        />
        <Stat
          label="Awaiting approval"
          value={String(data.pending_count)}
          hint={data.rejected_count > 0 ? `${data.rejected_count} rejected` : "All caught up"}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={data.pending_count > 0 ? "info" : "default"}
        />
      </div>

      {data.days_remaining !== null && (
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Time remaining on founding plan</span>
            <span>{daysRemaining} / {FOUNDING_TOTAL_DAYS} days</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${
                veryClose ? "bg-destructive" : expiringSoon ? "bg-secondary" : "bg-primary"
              }`}
              style={{ width: `${daysPct}%` }}
            />
          </div>
        </div>
      )}

      {data.listing_quota > 0 && (
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Free listings used</span>
            <span>{data.published_count} / {data.listing_quota}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full ${atQuota ? "bg-secondary" : "bg-primary"} transition-all`}
              style={{ width: `${listingPct}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {atQuota
              ? "You've reached your free listing quota. Choose a paid plan to add more."
              : `${data.remaining} free listing${data.remaining === 1 ? "" : "s"} left on the founding plan`}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label, value, hint, icon, tone,
}: {
  label: string; value: string; hint?: string; icon: React.ReactNode;
  tone?: "default" | "warn" | "info";
}) {
  const toneCls =
    tone === "warn" ? "text-secondary" : tone === "info" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-xl bg-background/70 border border-border p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase font-semibold text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${toneCls}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
