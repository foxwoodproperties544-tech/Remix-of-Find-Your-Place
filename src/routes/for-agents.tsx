import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { listPublicAgents } from "@/lib/users.functions";
import { listActiveTierPlans } from "@/lib/tier-plans.functions";
import { useAuth } from "@/hooks/use-auth";
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Check,
  Users,
  Sparkles,
  ChevronDown,
  Megaphone,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";

const TITLE = "Agents — Foxwood Properties";
const DESC =
  "Meet verified real estate agents and developers on Foxwood Properties. Browse profiles, see subscription pricing, and join as an agent to grow your business across Kenya.";
const OG = absoluteUrl(heroTools);
const CANON = "https://foxwoodproperties-co-ke.lovable.app/for-agents";

export const Route = createFileRoute("/for-agents")({
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
  component: AgentsPage,
});

type View = "for-agents" | "become";

function AgentsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("for-agents");
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["public-agents"],
    queryFn: () => listPublicAgents(),
  });
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["tier-plans-active"],
    queryFn: () => listActiveTierPlans(),
  });

  const becomeHref = user ? "/dashboard/upgrade" : "/auth";

  const viewLabel = view === "for-agents" ? "For Agents" : "Become an Agent";

  return (
    <>
      <PageHero
        image={heroTools}
        size="md"
        eyebrow={<><Users className="h-3.5 w-3.5" /> Agents</>}
        title="Meet Kenya's Foxwood-verified agents"
        subtitle="Browse trusted agents and developers, see what it costs to join, and become one yourself in minutes."
      />

      {/* Section switcher (dropdown) */}
      <section className="container-page pt-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium hover:border-primary/50 transition-colors min-w-[220px] justify-between"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span>{viewLabel}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute z-20 mt-2 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
              >
                <button
                  role="menuitem"
                  onClick={() => { setView("for-agents"); setMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted ${view === "for-agents" ? "bg-primary-soft/50 text-primary font-medium" : ""}`}
                >
                  For Agents
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setView("become"); setMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted ${view === "become" ? "bg-primary-soft/50 text-primary font-medium" : ""}`}
                >
                  Become an Agent
                </button>
              </div>
            )}
          </div>
          {view === "for-agents" ? (
            <Link
              to={becomeHref}
              className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Become an agent <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </section>

      {view === "for-agents" ? (
        <>
          {/* Why join */}
          <section className="container-page py-14">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl md:text-3xl font-semibold">Why agents choose Foxwood</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Everything you need to reach serious buyers, renters, and investors across Kenya.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-14">
              {[
                { icon: BadgeCheck, title: "Verified profile", desc: "Get the Foxwood-verified badge to stand out and build trust." },
                { icon: Megaphone, title: "Wider reach", desc: "Featured slots, SEO-friendly listings, and location hubs across Kenya." },
                { icon: TrendingUp, title: "Built-in CRM", desc: "Track leads, manage viewings, and follow up — all in one place." },
              ].map((b) => (
                <div key={b.title} className="rounded-xl border border-border bg-card p-5">
                  <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-3">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{b.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-2xl md:text-3xl font-semibold">Our current agents</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Verified professionals ready to help you buy, rent, or lease across Kenya.
              </p>
            </div>

            {agentsLoading ? (
              <div className="text-sm text-muted-foreground text-center">Loading agents…</div>
            ) : agents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
                <h3 className="text-base font-semibold">Be one of our first agents</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  No agents have joined yet. Sign up today and get pride of place on this page.
                </p>
                <button
                  onClick={() => setView("become")}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  See pricing <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((a) => (
                  <Link
                    key={a.id}
                    to="/agents/$id"
                    params={{ id: a.id }}
                    className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all flex items-start gap-4"
                  >
                    <div className="h-14 w-14 rounded-full bg-primary-soft text-primary overflow-hidden flex items-center justify-center flex-shrink-0">
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt={a.full_name ?? "Agent"} className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold truncate group-hover:text-primary">
                          {a.full_name || "Agent"}
                        </h3>
                        {a.verified && (
                          <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" aria-label="Verified" />
                        )}
                      </div>
                      {a.company_name && (
                        <p className="text-xs text-muted-foreground truncate">{a.company_name}</p>
                      )}
                      {a.bio && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{a.bio}</p>
                      )}
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        View profile <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Final CTA */}
          <section className="container-page pb-16">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold">Ready to join Foxwood as an agent?</h2>
              <p className="text-sm md:text-base mt-3 opacity-90 max-w-xl mx-auto">
                Create your account, pick a plan, and start reaching qualified buyers, renters, and investors across Kenya today.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setView("become")}
                  className="inline-flex items-center gap-2 rounded-lg bg-background text-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  See pricing <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/30 px-6 py-3 text-sm font-medium hover:bg-primary-foreground/10 transition-colors"
                >
                  Talk to sales
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Become an agent — pricing */}
          <section className="bg-muted/30 border-y border-border">
            <div className="container-page py-14">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <h2 className="text-2xl md:text-3xl font-semibold">Pricing to become an agent</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Pick the subscription that matches how you work. Pay by M-Pesa; change plans anytime.
                </p>
              </div>

              {plansLoading ? (
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

              <div className="mt-10 flex justify-center">
                <Link
                  to={becomeHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Become an agent <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
