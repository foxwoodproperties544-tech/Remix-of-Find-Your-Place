import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TIER_PLANS, type TierId } from "@/lib/pricing";
import { startTierUpgrade } from "@/lib/payments.functions";
import { MpesaModal } from "@/components/site/MpesaModal";
import { Check, Crown } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { z } from "zod";

const search = z.object({ tier: z.enum(["basic", "pro", "elite"]).optional() });

export const Route = createFileRoute("/_authenticated/dashboard/upgrade")({
  component: Upgrade,
  validateSearch: (s) => search.parse(s),
  head: () => ({ meta: [{ title: "Upgrade plan — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function Upgrade() {
  const { tier: initial } = useSearch({ from: "/_authenticated/dashboard/upgrade" });
  const nav = useNavigate();
  const [selected, setSelected] = useState<TierId | null>(initial ?? null);
  const [payFor, setPayFor] = useState<TierId | null>(null);
  const startFn = useServerFn(startTierUpgrade);

  const plans = TIER_PLANS.filter((t) => t.id !== "free");

  return (
    <>
      <PageHero
        image={heroTools} size="xs"
        eyebrow={<><Crown className="h-3.5 w-3.5" /> Upgrade</>}
        title="Choose your plan"
        subtitle="Unlock more listings, featured slots, and verified badge."
      />
      <div className="container-page py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((t) => (
            <label key={t.id} className={`relative rounded-2xl border-2 p-5 cursor-pointer transition ${selected === t.id ? "border-primary shadow-glow" : "border-border hover:border-primary/40"} bg-card`}>
              <input type="radio" name="tier" checked={selected === t.id} onChange={() => setSelected(t.id)} className="sr-only" />
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t.name}</h3>
                {t.highlight && <span className="text-[10px] font-semibold uppercase text-primary bg-primary-soft px-2 py-0.5 rounded-full">Popular</span>}
              </div>
              <div className="mt-2 text-2xl font-extrabold">KES {t.price.toLocaleString()}<span className="text-xs font-medium text-muted-foreground">/mo</span></div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {t.perks.map((p) => <li key={p} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {p}</li>)}
              </ul>
            </label>
          ))}
        </div>
        <div className="mt-8 flex gap-3">
          <button onClick={() => nav({ to: "/dashboard" })} className="btn-ghost">Cancel</button>
          <button disabled={!selected} onClick={() => setPayFor(selected)} className="btn-primary btn-primary-hover disabled:opacity-40">Continue to M-Pesa</button>
        </div>
      </div>

      <MpesaModal
        open={!!payFor}
        onClose={() => setPayFor(null)}
        title={`Upgrade to ${payFor ? TIER_PLANS.find((t) => t.id === payFor)!.name : ""}`}
        amountKes={payFor ? TIER_PLANS.find((t) => t.id === payFor)!.price : 0}
        initiate={async (phone) => startFn({ data: { tier: payFor as any, phone } })}
        onSuccess={() => { setPayFor(null); nav({ to: "/dashboard" }); }}
      />
    </>
  );
}
