import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { countyFromSlug, townFromSlug } from "@/lib/location-slug";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedProperties } from "@/lib/properties";
import { PropertyCard } from "@/components/site/PropertyCard";

export const Route = createFileRoute("/locations/$county/$town")({
  head: ({ params }) => {
    const county = countyFromSlug(params.county) ?? params.county;
    const town = townFromSlug(county, params.town) ?? params.town;
    const title = `Properties in ${town}, ${county} — Foxwood Properties`;
    const desc = `Verified properties for sale, rent, and lease in ${town}, ${county}. Compare listings and contact agents on Foxwood Properties.`;
    const url = `https://find-joy-list.lovable.app/locations/${params.county}/${params.town}`;
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
