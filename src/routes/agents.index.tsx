import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { listPublicAgents } from "@/lib/users.functions";
import { useAuth } from "@/hooks/use-auth";
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Users,
  Sparkles,
  Megaphone,
  TrendingUp,
  BadgeCheck,
} from "lucide-react";

const TITLE = "Our Agents — Foxwood Properties";
const DESC =
  "Meet verified real estate agents and developers on Foxwood Properties. Browse profiles and connect with trusted professionals across Kenya.";
const OG = absoluteUrl(heroTools);
const CANON = "https://find-joy-list.lovable.app/agents";

export const Route = createFileRoute("/agents/")({
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
  component: OurAgentsPage,
});

function OurAgentsPage() {
  const { user } = useAuth();
  const becomeHref = user ? "/dashboard/upgrade" : "/auth";

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["public-agents"],
    queryFn: () => listPublicAgents(),
  });

  return (
    <>
      <PageHero
        image={heroTools}
        size="md"
        eyebrow={<><Users className="h-3.5 w-3.5" /> Our Agents</>}
        title="Meet Kenya's Foxwood-verified agents"
        subtitle="Browse trusted agents and developers ready to help you buy, rent, or lease."
      />

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

        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center">Loading agents…</div>
        ) : agents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="text-base font-semibold">Be one of our first agents</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              No agents have joined yet. Sign up today and get pride of place on this page.
            </p>
            <Link
              to="/agents/become"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              See pricing <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((a) => {
              const tierLabel = a.tier && a.tier !== "free"
                ? a.tier.charAt(0).toUpperCase() + a.tier.slice(1)
                : null;
              return (
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
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {a.subscribed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5">
                        <BadgeCheck className="h-3 w-3" /> Subscribed{tierLabel ? ` · ${tierLabel}` : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5">
                        Free tier
                      </span>
                    )}
                    {a.verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 text-secondary text-[10px] font-semibold px-2 py-0.5">
                        Verified
                      </span>
                    )}
                  </div>
                  {a.bio && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{a.bio}</p>
                  )}
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    View profile <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="container-page pb-16">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Ready to join Foxwood as an agent?</h2>
          <p className="text-sm md:text-base mt-3 opacity-90 max-w-xl mx-auto">
            Create your account, pick a plan, and start reaching qualified buyers, renters, and investors across Kenya today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Link
              to="/agents/become"
              className="inline-flex items-center gap-2 rounded-lg bg-background text-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              See pricing <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={becomeHref}
              className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/30 px-6 py-3 text-sm font-medium hover:bg-primary-foreground/10 transition-colors"
            >
              Become an agent
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
