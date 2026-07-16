import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchPropertiesByOwner } from "@/lib/properties";
import { PropertyCard } from "@/components/site/PropertyCard";
import { ProfileReviews } from "@/components/site/ProfileReviews";
import { Phone, MessageCircle, MapPin, Home, BadgeCheck, Building2, Mail } from "lucide-react";

export const Route = createFileRoute("/agents/$id")({
  loader: async ({ params }) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, bio, company_name, verified, role_primary, created_at")
      .eq("id", params.id)
      .maybeSingle();
    if (!profile) throw notFound();
    const listings = await fetchPropertiesByOwner(params.id);
    return { profile, listings };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.profile.full_name ?? "Agent"} — Foxwood Properties` },
          { name: "description", content: loaderData.profile.bio ?? `Browse properties listed by ${loaderData.profile.full_name ?? "this agent"} on Foxwood Properties.` },
          { property: "og:title", content: `${loaderData.profile.full_name ?? "Agent"} on Foxwood` },
          { property: "og:type", content: "profile" },
          ...(loaderData.profile.avatar_url ? [{ property: "og:image", content: loaderData.profile.avatar_url }] : []),
        ]
      : [{ title: "Agent not found" }, { name: "robots", content: "noindex" }],
  }),
  errorComponent: () => <div className="container-page py-24 text-center"><h1 className="text-2xl font-bold">Something went wrong</h1></div>,
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-bold">Agent not found</h1>
      <Link to="/properties" className="btn-primary btn-primary-hover mt-6 inline-flex">Browse properties</Link>
    </div>
  ),
  component: AgentPage,
});

function AgentPage() {
  const { profile, listings } = Route.useLoaderData();
  const name = profile.full_name ?? "Foxwood Agent";
  const initials = name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const phone = "";
  const waNumber = "";
  const since = new Date(profile.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long" });
  const roleLabel = profile.role_primary === "developer" ? "Verified Developer" : profile.role_primary === "owner" ? "Property Owner" : "Verified Agent";

  return (
    <>
      <section className="bg-primary-soft border-b border-border">
        <div className="container-page py-10 md:py-14 flex items-start gap-6 flex-wrap">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="h-24 w-24 rounded-full object-cover ring-4 ring-background shadow-glow" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-3xl ring-4 ring-background shadow-glow">{initials || "FA"}</div>
          )}
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              {roleLabel}
              {profile.verified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified" />}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">{name}</h1>
            {profile.company_name && (
              <div className="mt-2 flex items-center gap-1 text-sm font-medium">
                <Building2 className="h-4 w-4 text-muted-foreground" /> {profile.company_name}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Kenya</span>
              <span className="flex items-center gap-1"><Home className="h-4 w-4" /> {listings.length} active listing{listings.length === 1 ? "" : "s"}</span>
              <span>Member since {since}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {phone && <a href={`tel:${phone}`} className="btn-primary btn-primary-hover"><Phone className="h-4 w-4" /> Call</a>}
            {waNumber && <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          </div>
        </div>
      </section>

      <section className="container-page py-10 md:py-14 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          {profile.bio && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">About {name.split(" ")[0]}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{profile.bio}</p>
            </div>
          )}

          <div className="mt-10">
            <h2 className="text-2xl font-bold">Listings by {name}</h2>
            {listings.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
                <Home className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="mt-3 font-semibold">No published listings yet</p>
                <p className="text-sm text-muted-foreground mt-1">Check back later or contact the agent directly.</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {listings.map((p: any) => <PropertyCard key={p.id} p={p} />)}
              </div>
            )}
          </div>

          <ProfileReviews targetId={profile.id} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {phone && (
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <a href={`tel:${phone}`} className="hover:text-primary">{phone}</a>
                </li>
              )}
              {waNumber && (
                <li className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="hover:text-primary">WhatsApp chat</a>
                </li>
              )}
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" />
                <Link to="/contact" className="hover:text-primary">Send an enquiry</Link>
              </li>
            </ul>
          </div>
          {profile.company_name && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Company</h3>
              <div className="mt-2 flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-primary" /> {profile.company_name}</div>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
