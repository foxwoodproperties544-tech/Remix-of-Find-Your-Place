import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { listActiveTierPlans } from "@/lib/tier-plans.functions";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { SupportBanner } from "@/components/site/SupportBanner";

const TITLE = "Become an Agent — Foxwood Properties";
const DESC =
  "Join Foxwood Properties as an agent or developer. Pick a subscription plan, get verified, and start reaching buyers, renters, and investors across Kenya.";
const OG = absoluteUrl(heroTools);
const CANON = "https://foxwoodproperties-co-ke.lovable.app/agents/become";

export const Route = createFileRoute("/agents/become")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
      { property: "og:image", content: OG },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: BecomeAnAgentPage,
});

const COMPARISON_ROWS: { label: string; values: Record<string, string> }[] = [
  { label: "Monthly price", values: { basic: "KSh 1,500", standard: "KSh 3,500", premium: "KSh 7,000", featured: "KSh 10,000" } },
  { label: "Active listings", values: { basic: "5", standard: "15", premium: "20", featured: "Unlimited" } },
  { label: "Featured listings", values: { basic: "—", standard: "2", premium: "10", featured: "Unlimited" } },
  { label: "Photos per listing", values: { basic: "5", standard: "10", premium: "Unlimited", featured: "Unlimited" } },
  { label: "Verified badge", values: { basic: "—", standard: "✓", premium: "✓", featured: "✓ Featured" } },
  { label: "Search ranking", values: { basic: "Standard", standard: "Better", premium: "Priority", featured: "Highest" } },
  { label: "Homepage promotion", values: { basic: "—", standard: "—", premium: "✓", featured: "Premium placement" } },
  { label: "Company branding", values: { basic: "—", standard: "✓", premium: "✓", featured: "Premium profile" } },
  { label: "Analytics", values: { basic: "Basic", standard: "Standard", premium: "Advanced", featured: "Premium" } },
  { label: "Lead management", values: { basic: "—", standard: "—", premium: "✓", featured: "✓" } },
  { label: "WhatsApp contact", values: { basic: "✓", standard: "✓", premium: "✓", featured: "✓" } },
  { label: "Email support", values: { basic: "✓", standard: "✓", premium: "✓", featured: "Priority" } },
  { label: "Phone support", values: { basic: "—", standard: "—", premium: "✓", featured: "Priority" } },
];

function BecomeAnAgentPage() {
  const { user } = useAuth();
  const hrefFor = (slug: string) =>
    user ? `/dashboard/upgrade?tier=${slug}` : `/auth?redirect=/dashboard/upgrade?tier=${slug}`;

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["tier-plans-active"],
    queryFn: () => listActiveTierPlans(),
  });

  return (
    <>
      <PageHero
        image={heroTools}
        size="md"
        eyebrow={<><Sparkles className="h-3.5 w-3.5" /> Become an Agent</>}
        title="Grow your real estate business with Foxwood"
        subtitle="Pick a subscription that matches how you work. Pay by M-Pesa; change plans anytime."
      />

      <div className="container-page mt-6">
        <SupportBanner context="agent_subscription" whatsappMessage="Hello Foxwood Properties, I need help picking an agent plan." />
      </div>

      <section className="bg-muted/30 border-y border-border">
        <div className="container-page py-14">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold">Choose your plan</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Every plan includes your public agent profile and Foxwood CRM tools.
            </p>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center">Loading plans…</div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center max-w-lg mx-auto">
              <p className="text-sm text-muted-foreground">
                Subscription plans are being finalised. Check back shortly, or{" "}
                <Link to="/contact" className="text-primary underline">contact us</Link> for early access.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((t) => (
                  <div
                    key={t.id}
                    className={`relative rounded-2xl border p-6 shadow-soft flex flex-col transition hover:-translate-y-1 hover:shadow-glow ${
                      t.highlight ? "border-primary bg-primary-soft/40 ring-2 ring-primary/30" : "border-border bg-card"
                    }`}
                  >
                    {t.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider px-3 py-1 shadow-md">
                        Most Popular
                      </span>
                    )}
                    <h3 className="text-lg font-bold">{t.name}</h3>
                    <div className="mt-3">
                      {t.price === 0 ? (
                        <span className="text-3xl font-extrabold">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-extrabold">KSh {Number(t.price).toLocaleString()}</span>
                          <span className="text-sm text-muted-foreground">
                            {" "}/ {t.duration_days === 30 ? "month" : `${t.duration_days} days`}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.listing_quota >= 999 ? "Unlimited" : t.listing_quota} active listing{t.listing_quota === 1 ? "" : "s"}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm flex-1">
                      {t.perks.map((p) => (
                        <li key={p} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={hrefFor(t.slug)}
                      className={`mt-5 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity ${
                        t.highlight
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "border border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      Choose {t.name} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mt-16">
                <div className="text-center max-w-2xl mx-auto mb-6">
                  <h3 className="text-xl md:text-2xl font-semibold">Compare plans</h3>
                  <p className="text-sm text-muted-foreground mt-1">See exactly what's included at each level.</p>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left font-semibold px-4 py-3">Feature</th>
                        <th className="text-center font-semibold px-4 py-3">Basic</th>
                        <th className="text-center font-semibold px-4 py-3">Standard</th>
                        <th className="text-center font-semibold px-4 py-3 bg-primary-soft/40 text-primary">
                          Premium
                        </th>
                        <th className="text-center font-semibold px-4 py-3">Featured</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON_ROWS.map((row, i) => (
                        <tr key={row.label} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="px-4 py-3 font-medium">{row.label}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{row.values.basic}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{row.values.standard}</td>
                          <td className="px-4 py-3 text-center text-foreground font-medium bg-primary-soft/20">{row.values.premium}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{row.values.featured}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
