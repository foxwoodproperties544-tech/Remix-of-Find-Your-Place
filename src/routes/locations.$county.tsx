import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { KENYA_SUBLOCATIONS } from "@/lib/kenya-locations-data";
import { countyFromSlug, toSlug } from "@/lib/location-slug";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedProperties } from "@/lib/properties";
import { PropertyCard } from "@/components/site/PropertyCard";
import { PriceTrends } from "@/components/site/PriceTrends";

export const Route = createFileRoute("/locations/$county")({
  head: ({ params }) => {
    const name = countyFromSlug(params.county) ?? params.county;
    const title = `Properties in ${name} — Foxwood Properties`;
    const desc = `Browse verified properties for sale, rent, and lease in ${name}, Kenya. Explore popular areas and current listings.`;
    const url = `https://foxwoodproperties-co-ke.lovable.app/locations/${params.county}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: absoluteUrl(heroAbout) },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: absoluteUrl(heroAbout) },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CountyPage,
});

function CountyPage() {
  const { county: slug } = Route.useParams();
  const county = countyFromSlug(slug);
  if (!county) return <Navigate to="/locations" />;
  const towns = KENYA_SUBLOCATIONS[county] ?? [];
  const { data: props = [] } = useQuery({ queryKey: ["properties"], queryFn: fetchPublishedProperties });
  const listings = props.filter((p) => p.county === county);

  return (
    <>
      <PageHero image={heroAbout} size="sm" eyebrow={<><MapPin className="h-3.5 w-3.5" /> {county}</>} title={`Properties in ${county}`} subtitle={`${listings.length} listing${listings.length === 1 ? "" : "s"} across ${towns.length} areas.`} />
      <section className="container-page py-8">
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold mb-3">Popular areas in {county}</h2>
            <div className="flex flex-wrap gap-2">
              {towns.slice(0, 40).map((t) => (
                <Link key={t} to="/locations/$county/$town" params={{ county: slug, town: toSlug(t) }} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/40">
                  {t}
                </Link>
              ))}
              {towns.length > 40 && <span className="text-xs text-muted-foreground self-center">+{towns.length - 40} more</span>}
            </div>
          </div>
          <div><PriceTrends listings={listings} label={county} /></div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Current listings</h2>
            <Link to="/properties" search={{ county }} className="text-sm text-primary font-medium">View all →</Link>
          </div>
          {listings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No listings in {county} yet.</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.slice(0, 12).map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
