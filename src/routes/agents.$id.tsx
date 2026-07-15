import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchPropertiesByOwner } from "@/lib/properties";
import { PropertyCard } from "@/components/site/PropertyCard";
import { Phone, MessageCircle, Mail, MapPin, Home } from "lucide-react";

export const Route = createFileRoute("/agents/$id")({
  loader: async ({ params }) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, phone, created_at")
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
          { name: "description", content: `Browse properties listed by ${loaderData.profile.full_name ?? "this agent"} on Foxwood Properties.` },
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
  const initials = name.split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
  const phone = profile.phone ?? "";
  const wa = phone.replace(/[^\d]/g, "");
  const since = new Date(profile.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "long" });

  return (
    <>
      <section className="bg-primary-soft border-b border-border">
        <div className="container-page py-10 md:py-14 flex items-start gap-6 flex-wrap">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={name} className="h-24 w-24 rounded-full object-cover ring-4 ring-background shadow-glow" />
            : <div className="grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground font-bold text-3xl ring-4 ring-background shadow-glow">{initials || "FA"}</div>}
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider">Verified Agent</div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">{name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Kenya</span>
              <span className="flex items-center gap-1"><Home className="h-4 w-4" /> {listings.length} active listing{listings.length === 1 ? "" : "s"}</span>
              <span>Member since {since}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {phone && <a href={`tel:${phone}`} className="btn-primary btn-primary-hover"><Phone className="h-4 w-4" /> Call</a>}
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
          </div>
        </div>
      </section>

      <section className="container-page py-10 md:py-14">
        <h2 className="text-2xl font-bold">Listings by {name}</h2>
        {listings.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
            <Home className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-3 font-semibold">No published listings yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back later or contact the agent directly.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map(p => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </>
  );
}
