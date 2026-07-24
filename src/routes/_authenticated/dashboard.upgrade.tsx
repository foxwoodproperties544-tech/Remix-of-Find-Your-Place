import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActiveTierPlans, type TierPlanRow } from "@/lib/tier-plans.functions";
import { startTierUpgrade } from "@/lib/payments.functions";
import { getMySubscription, scheduleDowngrade } from "@/lib/subscriptions.functions";
import { MpesaModal } from "@/components/site/MpesaModal";
import { Check, Crown, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { toast } from "sonner";
import { z } from "zod";

const search = z.object({
  tier: z.string().optional(),
  mode: z.enum(["renew", "upgrade", "downgrade", "new"]).optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard/upgrade")({
  component: Upgrade,
  validateSearch: (s) => search.parse(s),
  head: () => ({ meta: [{ title: "Choose plan — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function Upgrade() {
  const { tier: initial, mode } = useSearch({ from: "/_authenticated/dashboard/upgrade" });
  const nav = useNavigate();
  const startFn = useServerFn(startTierUpgrade);
  const downgradeFn = useServerFn(scheduleDowngrade);
  const getMySub = useServerFn(getMySubscription);

  const { data: allPlans = [], isLoading } = useQuery({ queryKey: ["tier-plans-active"], queryFn: () => listActiveTierPlans() });
  const { data: sub } = useQuery({ queryKey: ["my-subscription"], queryFn: () => getMySub() });

  const currentPrice = useMemo(() => {
    const cur = allPlans.find((p) => p.slug === sub?.tier);
    return Number(cur?.price ?? 0);
  }, [allPlans, sub?.tier]);

  const filteredPlans = useMemo(() => {
    const paid = allPlans.filter((t) => t.price > 0);
    if (mode === "upgrade") return paid.filter((p) => Number(p.price) > currentPrice);
    if (mode === "downgrade") return paid.filter((p) => Number(p.price) < currentPrice && Number(p.price) > 0);
    return paid;
  }, [allPlans, mode, currentPrice]);

  const [selected, setSelected] = useState<string | null>(initial ?? null);
  const [payFor, setPayFor] = useState<TierPlanRow | null>(null);
  const chosen = allPlans.find((t) => t.slug === selected) ?? null;

  const heading =
    mode === "renew" ? "Renew your subscription" :
    mode === "upgrade" ? "Upgrade your plan" :
    mode === "downgrade" ? "Downgrade your plan" :
    "Choose your plan";

  const eyebrowIcon =
    mode === "renew" ? <RefreshCw className="h-3.5 w-3.5" /> :
    mode === "upgrade" ? <TrendingUp className="h-3.5 w-3.5" /> :
    mode === "downgrade" ? <TrendingDown className="h-3.5 w-3.5" /> :
    <Crown className="h-3.5 w-3.5" />;

  const subtitle =
    mode === "renew" ? "Extend your current plan by another billing cycle."
    : mode === "upgrade" ? "Upgrade takes effect immediately — you're charged the full new-plan price."
    : mode === "downgrade" ? "Downgrade takes effect at the end of your current billing cycle. No refund is issued."
    : "Unlock more listings, featured slots, and verified badge.";

  async function proceed() {
    if (!chosen) return;

    if (mode === "downgrade") {
      try {
        await downgradeFn({ data: { tier: chosen.slug } });
        toast.success(`Downgrade to ${chosen.name} scheduled`);
        nav({ to: "/dashboard/subscription" });
      } catch (e: any) {
        toast.error(e.message ?? "Failed to schedule downgrade");
      }
      return;
    }

    if (chosen.price === 0) {
      try {
        await startFn({ data: { tier: chosen.slug, phone: "0700000000" } });
        toast.success("Plan activated");
        nav({ to: "/dashboard/subscription" });
      } catch (e: any) {
        toast.error(e.message ?? "Failed to activate");
      }
      return;
    }
    setPayFor(chosen);
  }

  return (
    <>
      <PageHero
        image={heroTools} size="xs"
        eyebrow={<>{eyebrowIcon} {mode === "renew" ? "Renew" : mode === "upgrade" ? "Upgrade" : mode === "downgrade" ? "Downgrade" : "Choose"}</>}
        title={heading}
        subtitle={subtitle}
      />
      <div className="container-page py-10">
        {sub && sub.tier !== "free" && (
          <div className="rounded-xl border border-border bg-card p-4 mb-6 text-sm">
            <span className="text-muted-foreground">Current plan:</span>{" "}
            <b className="capitalize">{sub.planName || sub.tier}</b>
            {sub.expiresAt && <span className="text-muted-foreground"> · expires {new Date(sub.expiresAt).toLocaleDateString()}</span>}
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading plans…</div>
        ) : filteredPlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center max-w-lg mx-auto">
            <p className="text-sm text-muted-foreground">
              {mode === "downgrade" ? "You're already on the lowest paid plan — no cheaper options available."
              : mode === "upgrade" ? "You're already on the top plan — no higher options available."
              : "No plans available right now."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {filteredPlans.map((t) => (
              <label key={t.id} className={`relative rounded-2xl border-2 p-5 cursor-pointer transition ${selected === t.slug ? "border-primary shadow-glow" : "border-border hover:border-primary/40"} bg-card`}>
                <input type="radio" name="tier" checked={selected === t.slug} onChange={() => setSelected(t.slug)} className="sr-only" />
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{t.name}</h3>
                  {t.highlight && <span className="text-[10px] font-semibold uppercase text-primary bg-primary-soft px-2 py-0.5 rounded-full">Popular</span>}
                  {sub?.tier === t.slug && <span className="text-[10px] font-semibold uppercase text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">Current</span>}
                </div>
                <div className="mt-2 text-2xl font-extrabold">KES {Number(t.price).toLocaleString()}<span className="text-xs font-medium text-muted-foreground">/{t.duration_days === 30 ? "mo" : `${t.duration_days}d`}</span></div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {t.perks.map((p) => <li key={p} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {p}</li>)}
                </ul>
              </label>
            ))}
          </div>
        )}

        <div className="mt-8 flex gap-3">
          <button onClick={() => nav({ to: "/dashboard/subscription" })} className="btn-ghost">Cancel</button>
          <button disabled={!chosen} onClick={proceed} className="btn-primary btn-primary-hover disabled:opacity-40">
            {mode === "downgrade" ? "Schedule downgrade" : chosen?.price === 0 ? "Activate plan" : "Continue to M-Pesa"}
          </button>
        </div>
      </div>

      <MpesaModal
        open={!!payFor}
        onClose={() => setPayFor(null)}
        title={`${mode === "renew" ? "Renew" : mode === "upgrade" ? "Upgrade to" : "Subscribe to"} ${payFor?.name ?? ""}`}
        amountKes={Number(payFor?.price ?? 0)}
        initiate={async (phone) => startFn({ data: { tier: payFor!.slug, phone } })}
        onSuccess={() => { setPayFor(null); nav({ to: "/dashboard/subscription" }); }}
      />
    </>
  );
}
