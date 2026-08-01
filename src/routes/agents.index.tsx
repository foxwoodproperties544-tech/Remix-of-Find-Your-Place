import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import heroTools from "@/assets/hero-tools.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { listPublicAgents, listTopAgents } from "@/lib/users.functions";
import { useAuth } from "@/hooks/use-auth";
import { SERVICES, ALL_TYPES } from "@/lib/taxonomy";
import { KENYA_COUNTIES } from "@/lib/kenya-locations-data";
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Users,
  Sparkles,
  Megaphone,
  TrendingUp,
  BadgeCheck,
  Search,
  X,
  Trophy,
  Star,
} from "lucide-react";


const TITLE = "Our Agents — Foxwood Properties";
const DESC =
  "Search verified real estate agents and developers on Foxwood Properties. Filter by county, service, specialty and language.";
const OG = absoluteUrl(heroTools);
const CANON = "https://find-joy-list.lovable.app/agents";

const LANGUAGES = ["English", "Kiswahili", "Kikuyu", "Luo", "Luhya", "Kalenjin", "Kamba", "Meru", "Somali", "French", "Arabic"];

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

  const [q, setQ] = useState("");
  const [county, setCounty] = useState("");
  const [service, setService] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [language, setLanguage] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return agents.filter((a: any) => {
      if (verifiedOnly && !a.verified) return false;
      if (county && a.county !== county && !(a.service_areas ?? []).includes(county)) return false;
      if (service && !(a.services ?? []).includes(service)) return false;
      if (specialty && !(a.specialties ?? []).includes(specialty)) return false;
      if (language && !(a.languages ?? []).includes(language)) return false;
      if (needle) {
        const hay = [a.full_name, a.company_name, a.bio, a.town, a.county, ...(a.services ?? []), ...(a.specialties ?? [])]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [agents, q, county, service, specialty, language, verifiedOnly]);

  const hasFilters = q || county || service || specialty || language || verifiedOnly;
  const clearAll = () => { setQ(""); setCounty(""); setService(""); setSpecialty(""); setLanguage(""); setVerifiedOnly(false); };

  return (
    <>
      <PageHero
        image={heroTools}
        size="md"
        eyebrow={<><Users className="h-3.5 w-3.5" /> Our Agents</>}
        title="Meet Kenya's Foxwood-verified agents"
        subtitle="Search trusted agents and developers by location, service, specialty or language."
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

        <TopAgents />



        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold">Find an agent</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {agents.length} agent{agents.length === 1 ? "" : "s"} on Foxwood — filter to find your match.
          </p>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5 mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, agency, or keyword…"
              className="w-full rounded-lg border border-border bg-field pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Location" value={county} onChange={setCounty} options={KENYA_COUNTIES} />
            <FilterSelect label="Service" value={service} onChange={setService} options={SERVICES.map((s) => s.title)} />
            <FilterSelect label="Specialty" value={specialty} onChange={setSpecialty} options={ALL_TYPES} />
            <FilterSelect label="Language" value={language} onChange={setLanguage} options={LANGUAGES} />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
              <span className="inline-flex items-center gap-1"><BadgeCheck className="h-4 w-4 text-primary" /> Verified only</span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{filtered.length} match{filtered.length === 1 ? "" : "es"}</span>
              {hasFilters && (
                <button onClick={clearAll} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-8">Loading agents…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="text-base font-semibold">
              {agents.length === 0 ? "Be one of our first agents" : "No agents match those filters"}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {agents.length === 0
                ? "No agents have joined yet. Sign up today and get pride of place on this page."
                : "Try clearing a filter or broadening your search."}
            </p>
            {agents.length === 0 ? (
              <Link to="/agents/become" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
                See pricing <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button onClick={clearAll} className="mt-5 text-xs text-primary hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a: any) => {
              const location = [a.town, a.county].filter(Boolean).join(", ");
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
                    {location && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{location}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {a.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5">
                          <BadgeCheck className="h-3 w-3" /> Verified{tierLabel ? ` · ${tierLabel}` : ""}
                        </span>
                      ) : tierLabel ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5">
                          {tierLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5">
                          Free tier
                        </span>
                      )}
                    </div>
                    {(a.services ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(a.services ?? []).slice(0, 3).map((s: string) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-soft text-primary">{s}</span>
                        ))}
                      </div>
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
            <Link to="/agents/become" className="inline-flex items-center gap-2 rounded-lg bg-background text-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity">
              See pricing <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={becomeHref} className="inline-flex items-center gap-2 rounded-lg border border-primary-foreground/30 px-6 py-3 text-sm font-medium hover:bg-primary-foreground/10 transition-colors">
              Become an agent
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function TopAgents() {
  const { data: top = [], isLoading } = useQuery({
    queryKey: ["top-agents"],
    queryFn: () => listTopAgents(),
  });

  if (isLoading || top.length === 0) return null;

  return (
    <div className="mb-14">
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold inline-flex items-center gap-2">
          <Trophy className="h-6 w-6 text-secondary" aria-hidden="true" /> Top agents this month
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Ranked by verification, active listings and client reviews.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((a: any, i: number) => (
          <Link
            key={a.id}
            to="/agents/$id"
            params={{ id: a.id }}
            className="group relative rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all flex items-start gap-4"
          >
            <span className="absolute top-3 right-3 text-xs font-bold text-muted-foreground">#{i + 1}</span>
            <div className="h-12 w-12 rounded-full bg-primary-soft text-primary overflow-hidden flex items-center justify-center flex-shrink-0">
              {a.avatar_url ? (
                <img src={a.avatar_url} alt={a.full_name ?? "Agent"} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold truncate group-hover:text-primary">{a.full_name || "Agent"}</h3>
                {a.verified && <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" aria-label="Verified" />}
              </div>
              {(a.company_name || a.county) && (
                <p className="text-xs text-muted-foreground truncate">
                  {a.company_name || [a.town, a.county].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{a.listings} active listing{a.listings === 1 ? "" : "s"}</span>
                {a.rating != null && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-secondary fill-secondary" aria-hidden="true" />
                    {a.rating} ({a.reviews})
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-field px-3 py-2 text-sm"
      >
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
