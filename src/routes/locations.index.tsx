import { createFileRoute, Link } from "@tanstack/react-router";
import { KENYA_COUNTIES } from "@/lib/kenya-locations-data";
import { toSlug } from "@/lib/location-slug";
import { MapPin } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";

const TITLE = "Browse properties by location — Foxwood Properties";
const DESC = "Explore properties for sale, rent, and lease across every Kenyan county. Pick a county to see listings and popular areas.";
const OG = absoluteUrl(heroAbout);

export const Route = createFileRoute("/locations/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG },
    ],
    links: [{ rel: "canonical", href: "https://find-joy-list.lovable.app/locations" }],
  }),
  component: LocationsIndex,
});

function LocationsIndex() {
  return (
    <>
      <PageHero image={heroAbout} size="sm" eyebrow={<><MapPin className="h-3.5 w-3.5" /> Locations</>} title="Browse by location" subtitle="Properties across all 47 counties in Kenya." />
      <section className="container-page py-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {KENYA_COUNTIES.map((c) => (
            <Link key={c} to="/locations/$county" params={{ county: toSlug(c) }} className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors bg-card">
              <div className="text-sm font-semibold">{c}</div>
              <div className="text-xs text-muted-foreground mt-1">View properties</div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
