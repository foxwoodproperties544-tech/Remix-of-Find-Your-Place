import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Building2, Search, X, ShieldCheck, Sparkles } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { BusinessCard } from "@/components/site/BusinessCard";
import { fetchBusinesses, fetchCategories } from "@/lib/directory";
import { KENYA_COUNTIES } from "@/lib/kenya-locations-data";
import { ALL_TYPES } from "@/lib/taxonomy";
import { SITE_URL } from "@/lib/site-url";

const TITLE = "Property Companies in Kenya — Foxwood Properties";
const DESC =
  "Browse verified real estate agencies, developers, land selling companies and property managers across Kenya. Compare companies and send enquiries through Foxwood Properties.";
const CANON = `${SITE_URL}/companies`;

export const Route = createFileRoute("/companies/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANON },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: CompaniesPage,
});

const PAGE_SIZE = 12;

function CompaniesPage() {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [county, setCounty] = useState("");
  const [town, setTown] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data: categories = [] } = useQuery({ queryKey: ["business-categories"], queryFn: fetchCategories });

  const filters = { q, categoryId, county, town, propertyType, verifiedOnly, featuredOnly, page, pageSize: PAGE_SIZE };
  const { data, isLoading } = useQuery({
    queryKey: ["businesses", filters],
    queryFn: () => fetchBusinesses(filters),
  });

  const catName = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => (map[c.id] = c.name));
    return map;
  }, [categories]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const active = q || categoryId || county || town || propertyType || verifiedOnly || featuredOnly;

  function reset() {
    setQ(""); setCategoryId(""); setCounty(""); setTown(""); setPropertyType("");
    setVerifiedOnly(false); setFeaturedOnly(false); setPage(1);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESC,
    url: CANON,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Companies", item: CANON },
      ],
    },
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        eyebrow="Business directory"
        title="Property companies across Kenya"
        subtitle="Discover agencies, developers, land sellers and property managers — then enquire directly through Foxwood Properties."
      />

      <div className="container-page py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4 rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Filter companies</h2>
              {active && (
                <button onClick={reset} className="inline-flex items-center gap-1 text-xs text-secondary">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Company name</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder="Search…"
                  className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Category</span>
              <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">County</span>
              <select value={county} onChange={(e) => { setCounty(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">All counties</option>
                {KENYA_COUNTIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Town</span>
              <input value={town} onChange={(e) => { setTown(e.target.value); setPage(1); }}
                placeholder="e.g. Kitengela"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Property type</span>
              <select value={propertyType} onChange={(e) => { setPropertyType(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Any type</option>
                {ALL_TYPES.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => { setVerifiedOnly(e.target.checked); setPage(1); }} />
              <ShieldCheck className="h-4 w-4 text-primary" /> Verified only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={featuredOnly} onChange={(e) => { setFeaturedOnly(e.target.checked); setPage(1); }} />
              <Sparkles className="h-4 w-4 text-secondary" /> Featured only
            </label>
          </aside>

          <section>
            <p className="mb-4 text-sm text-muted-foreground">
              {isLoading ? "Loading companies…" : `${total} compan${total === 1 ? "y" : "ies"} found`}
            </p>

            {!isLoading && rows.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No companies match your filters yet. Try clearing some filters.
                </p>
                <Link to="/contact" className="mt-4 inline-block text-sm font-semibold text-primary">
                  List your company on Foxwood →
                </Link>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((b) => (
                <BusinessCard key={b.id} b={b} categoryName={b.category_id ? catName[b.category_id] : undefined} />
              ))}
            </div>

            {pages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40">Previous</button>
                <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
                  className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40">Next</button>
              </nav>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
