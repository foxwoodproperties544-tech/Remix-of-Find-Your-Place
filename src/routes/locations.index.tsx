import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { KENYA_COUNTIES, KENYA_SUBLOCATIONS } from "@/lib/kenya-locations-data";
import { toSlug } from "@/lib/location-slug";
import { MapPin, Search, TrendingUp } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedProperties } from "@/lib/properties";
import { Input } from "@/components/ui/input";

const TITLE = "Browse properties by location in Kenya — Foxwood Properties";
const DESC =
  "Explore verified properties for sale, rent, and lease across all 47 Kenyan counties. Find prime homes, land, and commercial listings in Nairobi, Mombasa, Kiambu, Kajiado, and more.";
const OG = absoluteUrl(heroAbout);
const CANON = "https://foxwoodproperties-co-ke.lovable.app/locations";

// Curated highest-demand markets in Kenya
const FEATURED_COUNTIES = [
  "Nairobi",
  "Kiambu",
  "Kajiado",
  "Machakos",
  "Mombasa",
  "Nakuru",
  "Kisumu",
  "Uasin Gishu",
];

// Popular neighbourhoods that get direct search demand
const POPULAR_TOWNS: { county: string; town: string }[] = [
  { county: "Nairobi", town: "Karen" },
  { county: "Nairobi", town: "Kilimani" },
  { county: "Nairobi", town: "Westlands" },
  { county: "Nairobi", town: "Lavington" },
  { county: "Nairobi", town: "Runda" },
  { county: "Nairobi", town: "Langata" },
  { county: "Kiambu", town: "Ruiru" },
  { county: "Kiambu", town: "Kikuyu" },
  { county: "Kiambu", town: "Juja" },
  { county: "Kajiado", town: "Kitengela" },
  { county: "Kajiado", town: "Ngong" },
  { county: "Machakos", town: "Syokimau" },
  { county: "Machakos", town: "Athi River" },
  { county: "Mombasa", town: "Nyali" },
  { county: "Mombasa", town: "Bamburi" },
  { county: "Mombasa", town: "Diani" },
].filter((p) => (KENYA_SUBLOCATIONS[p.county] ?? []).includes(p.town));

export const Route = createFileRoute("/locations/")({
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://foxwoodproperties-co-ke.lovable.app/" },
            { "@type": "ListItem", position: 2, name: "Locations", item: CANON },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Kenyan counties on Foxwood Properties",
          itemListElement: FEATURED_COUNTIES.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c,
            url: `${CANON}/${toSlug(c)}`,
          })),
        }),
      },
    ],
  }),
  component: LocationsHub,
});

function LocationsHub() {
  const [q, setQ] = useState("");

  const { data: properties = [] } = useQuery({
    queryKey: ["published-properties"],
    queryFn: fetchPublishedProperties,
    staleTime: 60_000,
  });

  const countsByCounty = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of properties) {
      const c = (p as { county?: string | null }).county;
      if (!c) continue;
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return m;
  }, [properties]);

  const filteredCounties = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return KENYA_COUNTIES;
    return KENYA_COUNTIES.filter((c) => c.toLowerCase().includes(needle));
  }, [q]);

  return (
    <>
      <PageHero
        image={heroAbout}
        size="sm"
        eyebrow={
          <>
            <MapPin className="h-3.5 w-3.5" /> Locations
          </>
        }
        title="Browse Kenya by location"
        subtitle="Discover verified properties for sale, rent, and lease across all 47 counties — from prime Nairobi suburbs to coastal Mombasa and beyond."
      />

      {/* Search */}
      <section className="container-page pt-8">
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search counties"
            placeholder="Search a county (e.g. Nairobi, Mombasa, Kajiado)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
      </section>

      {/* Featured counties */}
      {!q && (
        <section className="container-page py-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Popular counties</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {FEATURED_COUNTIES.map((c) => {
              const n = countsByCounty.get(c) ?? 0;
              return (
                <Link
                  key={c}
                  to="/locations/$county"
                  params={{ county: toSlug(c) }}
                  className="group rounded-xl border border-border p-4 bg-card hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold group-hover:text-primary transition-colors">{c}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(KENYA_SUBLOCATIONS[c] ?? []).length} areas
                      </div>
                    </div>
                    {n > 0 && (
                      <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        {n}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Popular neighbourhoods */}
      {!q && POPULAR_TOWNS.length > 0 && (
        <section className="container-page py-6">
          <h2 className="text-lg font-semibold mb-4">Popular neighbourhoods</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TOWNS.map((p) => (
              <Link
                key={`${p.county}-${p.town}`}
                to="/locations/$county/$town"
                params={{ county: toSlug(p.county), town: toSlug(p.town) }}
                className="text-sm rounded-full border border-border px-3 py-1.5 bg-card hover:border-primary/50 hover:text-primary transition-colors"
              >
                {p.town} <span className="text-muted-foreground">· {p.county}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All counties */}
      <section className="container-page py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {q ? `Results (${filteredCounties.length})` : "All 47 counties"}
          </h2>
        </div>
        {filteredCounties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No counties match "{q}".</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredCounties.map((c) => {
              const n = countsByCounty.get(c) ?? 0;
              const areas = (KENYA_SUBLOCATIONS[c] ?? []).length;
              return (
                <Link
                  key={c}
                  to="/locations/$county"
                  params={{ county: toSlug(c) }}
                  className="group rounded-xl border border-border p-4 bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="text-sm font-semibold group-hover:text-primary transition-colors">{c}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {areas} area{areas === 1 ? "" : "s"}
                    {n > 0 ? ` · ${n} listing${n === 1 ? "" : "s"}` : ""}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container-page pb-16">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-secondary/5 p-6 md:p-8 text-center">
          <h2 className="text-xl md:text-2xl font-semibold">Can't find your area?</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            Browse the full property catalogue and filter by county, town, price, and property type.
          </p>
          <Link
            to="/properties"
            className="inline-flex mt-4 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Browse all properties
          </Link>
        </div>
      </section>
    </>
  );
}
