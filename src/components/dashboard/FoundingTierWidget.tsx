import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, Clock, CheckCircle2, AlertTriangle, Crown } from "lucide-react";
import { getMyFoundingStatus } from "@/lib/founding.functions";

export function FoundingTierWidget() {
  const fn = useServerFn(getMyFoundingStatus);
  const { data, isLoading } = useQuery({
    queryKey: ["founding-status"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse h-40" />
    );
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

  const pct = data.listing_quota > 0
    ? Math.min(100, Math.round((data.published_count / data.listing_quota) * 100))
    : 0;
  const expiringSoon = data.days_remaining !== null && data.days_remaining <= 14;
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Expires in"
          value={data.days_remaining !== null ? `${data.days_remaining}d` : "—"}
          hint={data.expires_at ? new Date(data.expires_at).toDateString() : "No expiry"}
          icon={<Clock className="h-4 w-4" />}
          tone={expiringSoon ? "warn" : "default"}
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

      {data.listing_quota > 0 && (
        <div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full ${atQuota ? "bg-secondary" : "bg-primary"} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {atQuota
              ? "You've reached your published-listing quota. Unpublish an old listing or upgrade to add more."
              : `${pct}% of your ${data.listing_quota}-listing quota used`}
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
