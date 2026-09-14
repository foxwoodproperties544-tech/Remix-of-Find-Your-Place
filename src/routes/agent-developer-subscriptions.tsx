import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackagePageShell, Li, SectionHeader } from "@/components/site/PackagePageShell";
import { listActiveTierPlans, type TierPlanRow } from "@/lib/tier-plans.functions";
import heroAbout from "@/assets/hero-about.jpg";
import { Building2, Check, X as XIcon } from "lucide-react";

export const Route = createFileRoute("/agent-developer-subscriptions")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Agent & Developer Subscriptions — Foxwood Properties" },
      { name: "description", content: "Subscription plans for agents and property developers on Foxwood Properties. Higher listing quotas, verified badge, featured allowances, CRM and priority support." },
      { property: "og:title", content: "Agent & Developer Subscriptions — Foxwood Properties" },
      { property: "og:description", content: "Grow your agency with the right subscription plan." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://foxwoodproperties-co-ke.lovable.app/agent-developer-subscriptions" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://foxwoodproperties-co-ke.lovable.app/agent-developer-subscriptions" }],
  }),
});

const COMPARISON: { label: string; get: (t: TierPlanRow) => string | boolean }[] = [
  { label: "Active listings", get: (t) => t.listing_quota >= 999 ? "Unlimited" : `${t.listing_quota}` },
  { label: "Featured listings / month", get: (t) => t.perks.find((p) => p.toLowerCase().includes("featured")) ?? "—" },
  { label: "Verified agent badge", get: (t) => t.perks.some((p) => /verified/i.test(p)) },
  { label: "Analytics dashboard", get: (t) => t.price > 0 },
  { label: "Lead / CRM access", get: () => true },
  { label: "Priority support", get: (t) => t.price >= 4500 },
];


function Page() {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["tier-plans-active"],
    queryFn: () => listActiveTierPlans(),
  });

  return (
    <PackagePageShell
      eyebrow={<><Building2 className="h-3.5 w-3.5" /> Agent & Developer Plans</>}
      title="Grow your agency on Foxwood Properties"
      subtitle="Higher listing quotas, verified badge, featured allowances, CRM, analytics and priority support."
      hero={heroAbout}
      crumbs={[{ label: "Home", to: "/" }, { label: "Agent & Developer Subscriptions" }]}
      intro={<>Whether you're an independent agent or a large developer, our monthly subscriptions give you room to scale — from just a few listings to unlimited inventory, plus the trust signals and lead tools your team needs.</>}
      ctaTitle="Ready to upgrade?"
      ctaSubtitle="Pick a plan that fits your team. Pay by M-Pesa each month."
      ctaHref="/dashboard/upgrade"
      ctaLabel="Choose a plan"
      faqs={[
        { q: "Can I switch plans later?", a: "Yes — upgrade or downgrade at any time from your dashboard. New quotas apply immediately." },
        { q: "How does the verified badge work?", a: "Complete our KYC flow with your ID and business documents; once approved your profile and listings show a verified badge." },
        { q: "Do you offer annual billing?", a: "Contact sales for annual pricing and enterprise plans — we offer discounts for annual commitments." },
        { q: "What happens if I exceed my listing quota?", a: "New listings pause until you archive existing ones or upgrade to a bigger plan." },
      ]}
    >
      <section>
        <SectionHeader title="Subscription plans" subtitle="Monthly pricing in KES. Cancel or change anytime." />
        {isLoading ? (
          <div className="mt-8 text-sm text-muted-foreground">Loading plans…</div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((t) => (
              <div key={t.id} className={`relative rounded-2xl border p-6 shadow-soft flex flex-col ${t.highlight ? "border-primary bg-primary-soft/40" : "border-border bg-card"}`}>
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider px-3 py-1">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-bold">{t.name}</h3>
                <div className="mt-3">
                  {t.price === 0 ? (
                    <span className="text-3xl font-extrabold">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold">KES {Number(t.price).toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground"> / {t.duration_days === 30 ? "month" : `${t.duration_days} days`}</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Up to {t.listing_quota >= 999 ? "unlimited" : t.listing_quota} active listings</div>
                <ul className="mt-4 space-y-2 flex-1">
                  {t.perks.map((perk) => <Li key={perk}>{perk}</Li>)}
                </ul>
                <Link
                  to="/dashboard/upgrade"
                  search={{ tier: t.slug } as any}
                  className={`mt-6 justify-center ${t.price === 0 ? "btn-ghost" : "btn-primary btn-primary-hover"}`}
                >
                  {t.price === 0 ? "Get started" : `Subscribe`}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {plans.length > 0 && (
        <section>
          <SectionHeader title="Compare plans" subtitle="Every feature at a glance." />
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-4 font-semibold">Feature</th>
                  {plans.map((t) => (
                    <th key={t.id} className="text-center p-4 font-semibold">{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <td className="p-4 text-muted-foreground">{row.label}</td>
                    {plans.map((t) => {
                      const v = row.get(t);
                      return (
                        <td key={t.id} className="p-4 text-center">
                          {typeof v === "boolean" ? (
                            v ? <Check className="h-4 w-4 text-primary mx-auto" /> : <XIcon className="h-4 w-4 text-muted-foreground/50 mx-auto" />
                          ) : (
                            <span className="text-foreground">{v}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </PackagePageShell>
  );
}

