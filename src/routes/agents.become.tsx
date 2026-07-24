import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { listActiveTierPlans } from "@/lib/tier-plans.functions";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Check, Sparkles } from "lucide-react";

const TITLE = "Become an Agent — Foxwood Properties";
const DESC =
  "Join Foxwood Properties as an agent or developer. Pick a subscription plan, get verified, and start reaching buyers, renters, and investors across Kenya.";
const OG = absoluteUrl(heroTools);
const CANON = "https://find-joy-list.lovable.app/agents/become";

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

function BecomeAnAgentPage() {
  const { user } = useAuth();
  const becomeHref = user ? "/dashboard/upgrade" : "/auth";

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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((t) => (
                <div
                  key={t.id}
                  className={`relative rounded-2xl border p-6 shadow-soft flex flex-col ${
                    t.highlight ? "border-primary bg-primary-soft/40" : "border-border bg-card"
                  }`}
                >
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
                    to={becomeHref}
                    className={`mt-5 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity ${
                      t.highlight
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "border border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    Become an agent <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
