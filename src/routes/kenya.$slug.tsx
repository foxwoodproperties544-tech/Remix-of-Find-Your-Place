import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, TrendingUp } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { PropertyCard } from "@/components/site/PropertyCard";
import { PriceTrends } from "@/components/site/PriceTrends";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";
import { fetchPublishedProperties } from "@/lib/properties";
import { findCombo, comboHeading, comboTitle, comboDescription, allCombos } from "@/lib/programmatic-seo";
import { getAreaGuide } from "@/lib/area-guides";
import { toSlug } from "@/lib/location-slug";
import { fmt } from "@/lib/location-stats";

const BASE = "https://foxwoodproperties-co-ke.lovable.app";

export const Route = createFileRoute("/kenya/$slug")({
  head: ({ params }) => {
    const combo = findCombo(params.slug);
    if (!combo) {
      const t = "Property search — Foxwood Properties";
      return { meta: [{ title: t }, { name: "description", content: "Browse verified property listings across Kenya." }] };
    }
    const title = comboTitle(combo);
    const desc = comboDescription(combo);
    const url = `${BASE}/kenya/${combo.slug}`;
    const guide = getAreaGuide(combo.town ?? combo.county, combo.county);
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
              { "@type": "ListItem", position: 1, name: "Kenya property guides", item: `${BASE}/kenya` },
              { "@type": "ListItem", position: 2, name: combo.locationLabel, item: `${BASE}/locations/${toSlug(combo.county)}` },
              { "@type": "ListItem", position: 3, name: comboHeading(combo), item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: guide.faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
      ],
    };
  },
  component: ComboPage,
});

function ComboPage() {
  const { slug } = Route.useParams();
  const combo = findCombo(slug);
  const { data: props = [] } = useQuery({ queryKey: ["properties"], queryFn: fetchPublishedProperties });

  if (!combo) return <Navigate to="/kenya" />;

  const listings = props.filter(
    (p) =>
      p.category === combo.category &&
      p.type === combo.type &&
      p.county === combo.county &&
      (!combo.town || p.town === combo.town),
  );
  const prices = listings.map((p) => Number(p.price)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  const guide = getAreaGuide(combo.town ?? combo.county, combo.county);
  const heading = comboHeading(combo);

  const related = allCombos()
    .filter((c) => c.slug !== combo.slug && (c.locationLabel === combo.locationLabel || c.type === combo.type))
    .slice(0, 12);

  return (
    <>
      <PageHero
        image={heroAbout}
        size="sm"
        eyebrow={<><MapPin className="h-3.5 w-3.5" /> {combo.locationLabel}, Kenya</>}
        title={heading}
        subtitle={`${listings.length} verified listing${listings.length === 1 ? "" : "s"}${median ? ` · median ${fmt(median)}` : ""}`}
      />

      <section className="container-page py-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
          <Link to="/kenya" className="hover:text-primary">Kenya guides</Link> ›{" "}
          <Link to="/locations/$county" params={{ county: toSlug(combo.county) }} className="hover:text-primary">{combo.county}</Link> ›{" "}
          <span className="text-foreground">{heading}</span>
        </nav>

        <h1 className="text-2xl font-bold mb-2">{heading}</h1>
        <p className="text-muted-foreground max-w-3xl mb-6">{guide.overview}</p>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-bold mb-2">What to expect in {combo.locationLabel}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm">
              {guide.bestFor.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" /> {b}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">{guide.transport}</p>
            <p className="mt-2 text-sm text-muted-foreground flex gap-2">
              <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {guide.investment}
            </p>
          </div>
          <div><PriceTrends listings={listings} label={combo.locationLabel} /></div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Available now</h2>
          <Link
            to="/properties"
            search={{ county: combo.county, town: combo.town, category: combo.category, type: combo.type } as any}
            className="text-sm text-primary font-medium"
          >
            Refine in search →
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No {combo.type.toLowerCase()} {combo.category.toLowerCase()} in {combo.locationLabel} right now. Save a search and we will alert you the moment one is listed.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}

        <h2 className="text-lg font-bold mt-10 mb-3">Frequently asked questions</h2>
        <div className="grid gap-3">
          {guide.faqs.map((f) => (
            <details key={f.q} className="rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>

        <h2 className="text-lg font-bold mt-10 mb-3">Related searches</h2>
        <div className="flex flex-wrap gap-2">
          {related.map((c) => (
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
      </section>
    </>
  );
}
