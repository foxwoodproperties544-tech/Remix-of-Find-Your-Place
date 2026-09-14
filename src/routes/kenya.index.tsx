import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Input } from "@/components/ui/input";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { allCombos, comboHeading, SEO_LOCATIONS } from "@/lib/programmatic-seo";

const BASE = "https://foxwoodproperties-co-ke.lovable.app";
const TITLE = "Kenya property guides by type, location & category — Foxwood";
const DESC =
  "Explore Foxwood's Kenya property guides: houses, apartments, land, and commercial space for sale, rent, or lease in Nairobi, Mombasa, Kiambu, Kajiado and more.";

export const Route = createFileRoute("/kenya/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${BASE}/kenya` },
      { property: "og:image", content: absoluteUrl(heroAbout) },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: absoluteUrl(heroAbout) },
    ],
    links: [{ rel: "canonical", href: `${BASE}/kenya` }],
  }),
  component: KenyaHub,
});

function KenyaHub() {
  const [q, setQ] = useState("");
  const combos = useMemo(() => allCombos(), []);
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const byLocation = new Map<string, typeof combos>();
    for (const c of combos) {
      if (term && !comboHeading(c).toLowerCase().includes(term)) continue;
      const list = byLocation.get(c.locationLabel) ?? [];
      list.push(c);
      byLocation.set(c.locationLabel, list);
    }
    return [...byLocation.entries()];
  }, [combos, q]);

  return (
    <>
      <PageHero
        image={heroAbout}
        size="sm"
        eyebrow={<><MapPin className="h-3.5 w-3.5" /> Kenya</>}
        title="Property guides across Kenya"
        subtitle={`${combos.length} curated searches covering ${SEO_LOCATIONS.length} of Kenya's busiest property markets.`}
      />
      <section className="container-page py-8">
        <h1 className="sr-only">Kenya property guides by type, location and category</h1>
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search e.g. apartments for rent in Kilimani"
            className="pl-9"
            aria-label="Search property guides"
          />
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No guides match “{q}”.</p>
        ) : (
          <div className="grid gap-8">
            {groups.map(([location, list]) => (
              <div key={location}>
                <h2 className="text-lg font-bold mb-3">{location}</h2>
                <div className="flex flex-wrap gap-2">
                  {list.map((c) => (
                    <Link
                      key={c.slug}
                      to="/kenya/$slug"
                      params={{ slug: c.slug }}
                      className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-secondary hover:text-secondary-foreground transition-colors"
                    >
                      {comboHeading(c)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
