import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { TIER_PLANS } from "@/lib/pricing";
import { Check, Crown } from "lucide-react";
import heroTools from "@/assets/hero-tools.jpg";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
  head: () => ({
    meta: [
      { title: "Agent plans & pricing — Foxwood Properties" },
      { name: "description", content: "Choose an agent plan that fits your listing volume. Pay with M-Pesa. Free, Basic, Pro and Elite tiers with featured listings included." },
      { property: "og:title", content: "Agent plans — Foxwood Properties" },
      { property: "og:description", content: "Free, Basic, Pro and Elite plans. Pay by M-Pesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Pricing() {
  return (
    <>
      <PageHero
        image={heroTools}
        size="sm"
        eyebrow={<><Crown className="h-3.5 w-3.5" /> Agent plans</>}
        title="Grow your property business"
        subtitle="Simple monthly plans. Pay with M-Pesa. Upgrade any time."
      />
      <div className="container-page py-12">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TIER_PLANS.map((t) => (
            <div key={t.id} className={`relative rounded-2xl border p-6 flex flex-col ${t.highlight ? "border-primary shadow-glow" : "border-border shadow-soft"} bg-card`}>
              {t.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">Most popular</span>}
              <h3 className="text-lg font-bold">{t.name}</h3>
              <div className="mt-3">
                <span className="text-3xl font-extrabold">KES {t.price.toLocaleString()}</span>
                {t.price > 0 && <span className="text-sm text-muted-foreground">/mo</span>}
              </div>
              <ul className="mt-5 space-y-2 text-sm flex-1">
                {t.perks.map((p) => (
                  <li key={p} className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" /> <span>{p}</span></li>
                ))}
              </ul>
              {t.id === "free" ? (
                <Link to="/auth" className="btn-ghost mt-6 justify-center">Get started</Link>
              ) : (
                <Link to="/dashboard/upgrade" search={{ tier: t.id } as any} className="btn-primary btn-primary-hover mt-6 justify-center">Upgrade</Link>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">All prices in KES · Billed monthly · Auto-verified badge for Pro & Elite</p>
      </div>
    </>
  );
}
