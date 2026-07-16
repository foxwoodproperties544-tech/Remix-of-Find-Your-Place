import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { properties as mockProps, counties } from "@/lib/mock-data";
import { PropertyCard } from "@/components/site/PropertyCard";
import { Search, SlidersHorizontal, BookmarkPlus, X, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedProperties } from "@/lib/properties";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { toast } from "sonner";
import { PageHero } from "@/components/site/PageHero";
import heroAbout from "@/assets/hero-about.jpg";
import { absoluteUrl } from "@/lib/site-url";

const searchSchema = z.object({
  category: z.string().optional(),
  type: z.string().optional(),
  county: z.string().optional(),
  town: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minBeds: z.coerce.number().optional(),
  favs: z.coerce.boolean().optional(),
});

const PAGE_SIZE = 12;

const OG_IMAGE = absoluteUrl(heroAbout);
const TITLE = "Properties — Foxwood Properties";
const DESC = "Browse verified properties for sale, rent, and lease across Kenya.";

export const Route = createFileRoute("/properties")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
  }),
  validateSearch: searchSchema,
  component: List,
});

function List() {
  const params = Route.useSearch();
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const [q, setQ] = useState(params.q ?? "");
  const [type, setType] = useState(params.type ?? "");
  const [county, setCounty] = useState(params.county ?? "");
  const [town, setTown] = useState(params.town ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [minPrice, setMinPrice] = useState<string>(params.minPrice?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState<string>(params.maxPrice?.toString() ?? "");
  const [minBeds, setMinBeds] = useState<string>(params.minBeds?.toString() ?? "");
  const [favsOnly, setFavsOnly] = useState<boolean>(!!params.favs);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc" | "beds-desc">("newest");
  const [page, setPage] = useState(1);

  const { data: dbProps } = useQuery({ queryKey: ["properties"], queryFn: fetchPublishedProperties });
  const all = useMemo(() => [...(dbProps ?? []), ...mockProps], [dbProps]);

  // Towns available in the current county selection (or all).
  const townOptions = useMemo(() => {
    const pool = county ? all.filter(p => p.county === county) : all;
    return Array.from(new Set(pool.map(p => p.town).filter(Boolean))).sort();
  }, [all, county]);

  // Reset town if it no longer belongs to the selected county.
  useEffect(() => {
    if (town && !townOptions.includes(town)) setTown("");
  }, [town, townOptions]);

  const filtered = all.filter(p => {
    if (category && p.category !== category) return false;
    if (type && p.type !== type) return false;
    if (county && p.county !== county) return false;
    if (town && p.town !== town) return false;
    if (minPrice && p.price < Number(minPrice)) return false;
    if (maxPrice && p.price > Number(maxPrice)) return false;
    if (minBeds && p.bedrooms < Number(minBeds)) return false;
    if (favsOnly && !favorites.has(p.id)) return false;
    if (q && !(`${p.title} ${p.area} ${p.town}`).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "beds-desc") return b.bedrooms - a.bedrooms;
    return 0;
  });

  // Reset page when filters/sort change
  useEffect(() => { setPage(1); }, [q, type, county, town, category, minPrice, maxPrice, minBeds, favsOnly, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const currentFilters = () => {
    const f: Record<string, any> = {};
    if (q) f.q = q;
    if (category) f.category = category;
    if (type) f.type = type;
    if (county) f.county = county;
    if (town) f.town = town;
    if (minPrice) f.minPrice = Number(minPrice);
    if (maxPrice) f.maxPrice = Number(maxPrice);
    if (minBeds) f.minBeds = Number(minBeds);
    return f;
  };

  function clearAll() {
    setQ(""); setCategory(""); setType(""); setCounty(""); setTown(""); setMinPrice(""); setMaxPrice(""); setMinBeds(""); setFavsOnly(false);
  }

  async function saveSearch() {
    if (!user) { toast.error("Sign in to save searches"); return; }
    const name = savingName.trim() || summarize(currentFilters()) || "My search";
    setSaving(true);
    try {
      const { error } = await supabase.from("saved_searches").insert({
        user_id: user.id,
        name,
        filters: currentFilters(),
      });
      if (error) throw error;
      toast.success("Search saved", { action: { label: "View", onClick: () => (window.location.href = "/saved-searches") } });
      setShowSave(false); setSavingName("");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  const hasFilters = q || category || type || county || town || minPrice || maxPrice || minBeds || favsOnly;

  function toggleFavsOnly() {
    if (!user && !favsOnly) {
      toast("Sign in to filter by favorites", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } });
      return;
    }
    setFavsOnly(v => !v);
  }

  return (
    <>
      <section className="relative border-b border-border overflow-hidden" style={{ background: "linear-gradient(135deg, var(--color-primary-soft), color-mix(in oklab, var(--color-secondary) 8%, var(--color-background)))" }}>
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
        <div className="relative container-page py-10 md:py-14">
          <span className="chip"><SlidersHorizontal className="h-3 w-3" /> Browse listings</span>
          <h1 className="text-3xl md:text-4xl font-bold mt-3">Find your next property</h1>
          <p className="mt-2 text-muted-foreground">Refine by category, type, location and price across Kenya.</p>
          <div className="mt-6 rounded-2xl bg-background p-3 shadow-lift ring-1 ring-border/60 space-y-2">
            <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
              <div className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 focus-within:border-primary/50 transition-colors">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by title, area, town..." className="w-full bg-transparent text-sm outline-none" />
              </div>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-full border border-border px-4 py-2.5 text-sm bg-background hover:border-primary/40 transition-colors">
                <option value="">All categories</option>
                {["For Sale","For Rent","For Lease"].map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={type} onChange={e=>setType(e.target.value)} className="rounded-full border border-border px-4 py-2.5 text-sm bg-background hover:border-primary/40 transition-colors">
                <option value="">All types</option>
                {["Houses","Apartments","Land / Plots","Airbnbs","Commercial","Office Spaces","Shops","Warehouses","Farms","Holiday Homes"].map(t => <option key={t}>{t}</option>)}
              </select>
              <select value={county} onChange={e=>setCounty(e.target.value)} className="rounded-full border border-border px-4 py-2.5 text-sm bg-background hover:border-primary/40 transition-colors">
                <option value="">All counties</option>
                {counties.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={town} onChange={e=>setTown(e.target.value)} className="rounded-full border border-border px-4 py-2.5 text-sm bg-background hover:border-primary/40 transition-colors">
                <option value="">{county ? `All towns in ${county}` : "All towns"}</option>
                {townOptions.map(t => <option key={t}>{t}</option>)}
              </select>
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="btn-primary btn-primary-hover"><SlidersHorizontal className="h-4 w-4" /> {showAdvanced ? "Hide" : "More"}</button>
            </div>
            {showAdvanced && (
              <div className="grid gap-2 sm:grid-cols-3 pt-2">
                <div>
                  <label className="text-xs text-muted-foreground">Min price (KSh)</label>
                  <input type="number" min={0} value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="0" className="mt-1 w-full rounded-full border border-border px-4 py-2.5 text-sm bg-background" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max price (KSh)</label>
                  <input type="number" min={0} value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Any" className="mt-1 w-full rounded-full border border-border px-4 py-2.5 text-sm bg-background" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min bedrooms</label>
                  <select value={minBeds} onChange={e=>setMinBeds(e.target.value)} className="mt-1 w-full rounded-full border border-border px-4 py-2.5 text-sm bg-background">
                    <option value="">Any</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}+</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-10 md:py-14">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{sorted.length}</span> {sorted.length === 1 ? "property" : "properties"} found</p>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={toggleFavsOnly}
              aria-pressed={favsOnly}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold border transition ${favsOnly ? "bg-secondary text-secondary-foreground border-secondary" : "bg-background text-foreground border-border hover:border-primary/40"}`}>
              <Heart className={"h-3.5 w-3.5 " + (favsOnly ? "fill-current" : "")} /> Favorites only
            </button>
            <label className="text-xs text-muted-foreground hidden sm:inline">Sort</label>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} className="rounded-full border border-border px-3 py-2 text-xs bg-background font-medium">
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="beds-desc">Most bedrooms</option>
            </select>
            {hasFilters && <button onClick={clearAll} className="btn-ghost !py-2 !px-3 text-xs"><X className="h-3.5 w-3.5" /> Clear</button>}
            {hasFilters && (
              <button onClick={() => setShowSave(true)} className="btn-secondary !py-2 !px-4 text-xs"><BookmarkPlus className="h-4 w-4" /> Save search</button>
            )}
          </div>
        </div>
        {hasFilters && (
          <div className="mb-6 flex flex-wrap gap-1.5">
            {q && <FilterChip label={`"${q}"`} onRemove={() => setQ("")} />}
            {category && <FilterChip label={category} onRemove={() => setCategory("")} />}
            {type && <FilterChip label={type} onRemove={() => setType("")} />}
            {county && <FilterChip label={county} onRemove={() => setCounty("")} />}
            {town && <FilterChip label={town} onRemove={() => setTown("")} />}
            {minPrice && <FilterChip label={`Min KSh ${minPrice}`} onRemove={() => setMinPrice("")} />}
            {maxPrice && <FilterChip label={`Max KSh ${maxPrice}`} onRemove={() => setMaxPrice("")} />}
            {minBeds && <FilterChip label={`${minBeds}+ bed`} onRemove={() => setMinBeds("")} />}
            {favsOnly && <FilterChip label="Favorites" onRemove={() => setFavsOnly(false)} />}
          </div>
        )}
        {sorted.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl bg-muted/30">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">{favsOnly ? <Heart className="h-6 w-6" /> : <Search className="h-6 w-6" />}</div>
            <p className="mt-4 font-semibold">{favsOnly ? "No favorites match these filters" : "No properties match your filters"}</p>
            <p className="text-sm text-muted-foreground mt-1">Try widening your search or clearing a filter.</p>
            {hasFilters && <button onClick={clearAll} className="btn-primary btn-primary-hover mt-5">Clear filters</button>}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map(p => <PropertyCard key={p.id} p={p} />)}
            </div>
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button disabled={currentPage === 1} onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="btn-ghost !py-2 !px-3 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Prev</button>
                <div className="flex items-center gap-1">
                  {pageNumbers(currentPage, totalPages).map((n, i) => (
                    n === "..." ? <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
                      : <button key={n} onClick={() => { setPage(n as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          className={`min-w-9 h-9 rounded-lg text-sm font-semibold transition ${currentPage === n ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{n}</button>
                  ))}
                </div>
                <button disabled={currentPage === totalPages} onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="btn-ghost !py-2 !px-3 disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length}
            </p>
          </>
        )}
      </section>


      {showSave && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-sm p-4" onClick={() => setShowSave(false)}>
          <div onClick={e=>e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border shadow-glow p-6">
            <h3 className="text-lg font-bold flex items-center gap-2"><BookmarkPlus className="h-5 w-5 text-primary" /> Save this search</h3>
            <p className="text-sm text-muted-foreground mt-1">Get notified when new properties match these filters.</p>
            <div className="mt-4">
              <label className="text-xs font-medium">Name</label>
              <input value={savingName} onChange={e=>setSavingName(e.target.value)} placeholder={summarize(currentFilters()) || "My search"} className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Object.entries(currentFilters()).map(([k, v]) => (
                <span key={k} className="rounded-full bg-muted text-xs px-2.5 py-0.5">{k}: {String(v)}</span>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowSave(false)} className="btn-ghost">Cancel</button>
              <button disabled={saving} onClick={saveSearch} className="btn-primary btn-primary-hover">{saving ? "Saving…" : "Save alert"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("...");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("...");
  out.push(total);
  return out;
}

function summarize(f: Record<string, any>) {
  const parts: string[] = [];
  if (f.category) parts.push(f.category);
  if (f.type) parts.push(f.type);
  if (f.town) parts.push(`in ${f.town}`);
  else if (f.county) parts.push(`in ${f.county}`);
  if (f.minBeds) parts.push(`${f.minBeds}+ bed`);
  return parts.join(" · ");
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft text-primary text-xs font-semibold pl-3 pr-1 py-1 border border-primary/20">
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/20 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
