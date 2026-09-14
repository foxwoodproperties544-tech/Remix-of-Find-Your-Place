import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { countyFromSlug, townFromSlug } from "@/lib/location-slug";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedProperties } from "@/lib/properties";
import { PropertyCard } from "@/components/site/PropertyCard";
import { PriceTrends } from "@/components/site/PriceTrends";
import { NeighborhoodGuide } from "@/components/site/NeighborhoodGuide";

export const Route = createFileRoute("/locations/$county/$town")({
  head: ({ params }) => {
    const county = countyFromSlug(params.county) ?? params.county;
    const town = townFromSlug(county, params.town) ?? params.town;
    const title = `Property Prices & Homes in ${town}, ${county} — Foxwood Properties`;
    const desc = `${town}, ${county} property guide: verified homes for sale, rent, and lease with real-time median prices, neighborhood insights, and direct agent contact.`;
    const url = `https://foxwoodproperties-co-ke.lovable.app/locations/${params.county}/${params.town}`;
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
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Locations", item: "https://foxwoodproperties-co-ke.lovable.app/locations" },
              { "@type": "ListItem", position: 2, name: county, item: `https://foxwoodproperties-co-ke.lovable.app/locations/${params.county}` },
              { "@type": "ListItem", position: 3, name: town, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: TownPage,
});

function TownPage() {
  const { county: cSlug, town: tSlug } = Route.useParams();
  const county = countyFromSlug(cSlug);
  if (!county) return <Navigate to="/locations" />;
  const town = townFromSlug(county, tSlug);
  if (!town) return <Navigate to="/locations/$county" params={{ county: cSlug }} />;

  const { data: props = [] } = useQuery({ queryKey: ["properties"], queryFn: fetchPublishedProperties });
  const listings = props.filter((p) => p.county === county && p.town === town);

  return (
    <>
      <PageHero image={heroAbout} size="sm" eyebrow={<><MapPin className="h-3.5 w-3.5" /> {town}, {county}</>} title={`Properties in ${town}`} subtitle={`${listings.length} listing${listings.length === 1 ? "" : "s"} available.`} />
      <section className="container-page py-8">
        <div className="mb-4 text-sm text-muted-foreground">
          <Link to="/locations" className="hover:text-primary">Locations</Link> ›{" "}
          <Link to="/locations/$county" params={{ county: cSlug }} className="hover:text-primary">{county}</Link> › <span className="text-foreground">{town}</span>
        </div>

        <h1 className="sr-only">Properties for sale, rent, and lease in {town}, {county}</h1>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="lg:col-span-2"><NeighborhoodGuide town={town} county={county} /></div>
          <div><PriceTrends listings={listings} label={town} /></div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Listings in {town}</h2>
          <Link to="/properties" search={{ county, town }} className="text-sm text-primary font-medium">Refine in search →</Link>
        </div>
        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No listings in {town} yet. Try nearby areas in {county}.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </>
  );
}
