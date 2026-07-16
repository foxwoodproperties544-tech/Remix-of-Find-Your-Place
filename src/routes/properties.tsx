import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { properties as mockProps } from "@/lib/mock-data";
import { PropertyCard } from "@/components/site/PropertyCard";
import { Search, SlidersHorizontal, BookmarkPlus, X, Heart, ChevronLeft, ChevronRight, Filter } from "lucide-react";
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
import { FiltersSidebar, type FiltersState } from "@/components/site/FiltersSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const searchSchema = z.object({
  category: z.string().optional(),
  type: z.string().optional(),
  county: z.string().optional(),
  town: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minBeds: z.coerce.number().optional(),
  minSize: z.coerce.number().optional(),
  maxSize: z.coerce.number().optional(),
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

  const [state, setState] = useState<FiltersState>({
    category: params.category ?? "",
    type: params.type ?? "",
    county: params.county ?? "",
    town: params.town ?? "",
    minPrice: params.minPrice?.toString() ?? "",
    maxPrice: params.maxPrice?.toString() ?? "",
    minBeds: params.minBeds?.toString() ?? "",
    minBaths: "",
    minSize: params.minSize?.toString() ?? "",
    maxSize: params.maxSize?.toString() ?? "",
    features: new Set<string>(),
    nearby: new Set<string>(),
    status: "",
    listingType: "",
    purpose: "",
  });
  const [q, setQ] = useState(params.q ?? "");
  const [favsOnly, setFavsOnly] = useState<boolean>(!!params.favs);
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc" | "beds-desc">("newest");
  const [page, setPage] = useState(1);
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);

  function patch(p: Partial<FiltersState>) { setState((s) => ({ ...s, ...p })); }
  function clearAll() {
    setState({ category: "", type: "", county: "", town: "", minPrice: "", maxPrice: "", minBeds: "", minBaths: "", minSize: "", maxSize: "", features: new Set(), nearby: new Set(), status: "", listingType: "", purpose: "" });
    setQ(""); setFavsOnly(false);
  }

  const { data: dbProps } = useQuery({ queryKey: ["properties"], queryFn: fetchPublishedProperties });
  const all = useMemo(() => [...(dbProps ?? []), ...mockProps], [dbProps]);

  const townOptions = useMemo(() => {
    const pool = state.county ? all.filter((p) => p.county === state.county) : all;
    return Array.from(new Set(pool.map((p) => p.town).filter(Boolean))).sort();
  }, [all, state.county]);

  useEffect(() => { if (state.town && !townOptions.includes(state.town)) patch({ town: "" }); }, [state.town, townOptions]);

  const filtered = all.filter((p) => {
    if (state.category && p.category !== state.category) return false;
    if (state.type && p.type !== state.type) return false;
    if (state.county && p.county !== state.county) return false;
    if (state.town && p.town !== state.town) return false;
    if (state.minPrice && p.price < Number(state.minPrice)) return false;
    if (state.maxPrice && p.price > Number(state.maxPrice)) return false;
    if (state.minBeds && p.bedrooms < Number(state.minBeds)) return false;
    if (state.minBaths && p.bathrooms < Number(state.minBaths)) return false;
    if (state.minSize || state.maxSize) {
      const sqft = parseSizeToSqft(p.size);
      if (sqft == null) return false;
      if (state.minSize && sqft < Number(state.minSize)) return false;
      if (state.maxSize && sqft > Number(state.maxSize)) return false;
    }
    if (state.features.size) {
      for (const f of state.features) if (!p.features.includes(f)) return false;
    }
    if (state.nearby.size) {
      for (const a of state.nearby) if (!p.amenities.includes(a)) return false;
    }
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

  useEffect(() => { setPage(1); }, [state, q, favsOnly, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeCount =
    (state.category ? 1 : 0) + (state.type ? 1 : 0) + (state.county ? 1 : 0) + (state.town ? 1 : 0) +
    (state.minPrice ? 1 : 0) + (state.maxPrice ? 1 : 0) + (state.minBeds ? 1 : 0) + (state.minBaths ? 1 : 0) +
    (state.minSize ? 1 : 0) + (state.maxSize ? 1 : 0) +
    state.features.size + state.nearby.size +
    (state.status ? 1 : 0) + (state.listingType ? 1 : 0) + (state.purpose ? 1 : 0) +
    (favsOnly ? 1 : 0) + (q ? 1 : 0);

  function currentFilters() {
    const f: Record<string, any> = {};
    if (q) f.q = q;
    if (state.category) f.category = state.category;
    if (state.type) f.type = state.type;
    if (state.county) f.county = state.county;
    if (state.town) f.town = state.town;
    if (state.minPrice) f.minPrice = Number(state.minPrice);
    if (state.maxPrice) f.maxPrice = Number(state.maxPrice);
    if (state.minBeds) f.minBeds = Number(state.minBeds);
    if (state.minSize) f.minSize = Number(state.minSize);
    if (state.maxSize) f.maxSize = Number(state.maxSize);
    if (state.features.size) f.features = [...state.features];
    if (state.nearby.size) f.nearby = [...state.nearby];
    if (state.status) f.status = state.status;
    return f;
  }

  async function saveSearch() {
    if (!user) { toast.error("Sign in to save searches"); return; }
    const name = savingName.trim() || summarize(currentFilters()) || "My search";
    setSaving(true);
    try {
      const { error } = await supabase.from("saved_searches").insert({ user_id: user.id, name, filters: currentFilters() });
      if (error) throw error;
      toast.success("Search saved");
      setShowSave(false); setSavingName("");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  function toggleFavsOnly() {
    if (!user && !favsOnly) {
      toast("Sign in to filter by favorites", { action: { label: "Sign in", onClick: () => (window.location.href = "/auth") } });
      return;
    }
    setFavsOnly((v) => !v);
  }

  const sidebar = <FiltersSidebar state={state} townOptions={townOptions} onChange={patch} onClear={clearAll} />;

  return (
    <>
      <PageHero
        image={heroAbout}
        size="sm"
        eyebrow={<><SlidersHorizontal className="h-3.5 w-3.5" /> Browse listings</>}
        title="Find your next property"
        subtitle="Refine by category, type, location, price and features across Kenya."
      >
        <div className="rounded-2xl bg-background text-foreground p-3 shadow-lift ring-1 ring-border/60">
          <div className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5 focus-within:border-primary/50 transition-colors">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, area, town..." className="w-full bg-transparent text-sm outline-none" />
          </div>
        </div>
      </PageHero>

      <section className="container-page py-8 md:py-12">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            {sidebar}
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Sheet open={mobileFilters} onOpenChange={setMobileFilters}>
                  <SheetTrigger asChild>
                    <button className="lg:hidden btn-ghost !py-2 !px-3 text-xs">
                      <Filter className="h-3.5 w-3.5" /> Filters {activeCount > 0 && <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 text-[10px]">{activeCount}</span>}
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-4">
                    {sidebar}
                  </SheetContent>
                </Sheet>
                <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{sorted.length}</span> {sorted.length === 1 ? "property" : "properties"}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={toggleFavsOnly} aria-pressed={favsOnly}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold border transition ${favsOnly ? "bg-secondary text-secondary-foreground border-secondary" : "bg-background text-foreground border-border hover:border-primary/40"}`}>
                  <Heart className={"h-3.5 w-3.5 " + (favsOnly ? "fill-current" : "")} /> Favorites
                </button>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="rounded-full border border-border px-3 py-2 text-xs bg-background font-medium">
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="beds-desc">Most bedrooms</option>
                </select>
                {activeCount > 0 && <button onClick={clearAll} className="btn-ghost !py-2 !px-3 text-xs"><X className="h-3.5 w-3.5" /> Clear</button>}
                {activeCount > 0 && <button onClick={() => setShowSave(true)} className="btn-secondary !py-2 !px-4 text-xs"><BookmarkPlus className="h-4 w-4" /> Save</button>}
              </div>
            </div>

            {activeCount > 0 && (
              <div className="mb-6 flex flex-wrap gap-1.5">
                {q && <Chip label={`"${q}"`} onRemove={() => setQ("")} />}
                {state.category && <Chip label={state.category} onRemove={() => patch({ category: "" })} />}
                {state.type && <Chip label={state.type} onRemove={() => patch({ type: "" })} />}
                {state.county && <Chip label={state.county} onRemove={() => patch({ county: "" })} />}
                {state.town && <Chip label={state.town} onRemove={() => patch({ town: "" })} />}
                {state.minPrice && <Chip label={`Min KSh ${state.minPrice}`} onRemove={() => patch({ minPrice: "" })} />}
                {state.maxPrice && <Chip label={`Max KSh ${state.maxPrice}`} onRemove={() => patch({ maxPrice: "" })} />}
                {state.minBeds && <Chip label={`${state.minBeds}+ bed`} onRemove={() => patch({ minBeds: "" })} />}
                {state.minBaths && <Chip label={`${state.minBaths}+ bath`} onRemove={() => patch({ minBaths: "" })} />}
                {[...state.features].map((f) => <Chip key={f} label={f} onRemove={() => { const s = new Set(state.features); s.delete(f); patch({ features: s }); }} />)}
                {[...state.nearby].map((a) => <Chip key={a} label={`Near: ${a}`} onRemove={() => { const s = new Set(state.nearby); s.delete(a); patch({ nearby: s }); }} />)}
                {state.status && <Chip label={state.status} onRemove={() => patch({ status: "" })} />}
                {state.listingType && <Chip label={state.listingType} onRemove={() => patch({ listingType: "" })} />}
                {state.purpose && <Chip label={state.purpose} onRemove={() => patch({ purpose: "" })} />}
                {favsOnly && <Chip label="Favorites" onRemove={() => setFavsOnly(false)} />}
              </div>
            )}

            {sorted.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-border rounded-2xl bg-muted/30">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">{favsOnly ? <Heart className="h-6 w-6" /> : <Search className="h-6 w-6" />}</div>
                <p className="mt-4 font-semibold">{favsOnly ? "No favorites match these filters" : "No properties match your filters"}</p>
                <p className="text-sm text-muted-foreground mt-1">Try widening your search or clearing a filter.</p>
                {activeCount > 0 && <button onClick={clearAll} className="btn-primary btn-primary-hover mt-5">Clear filters</button>}
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {pageItems.map((p) => <PropertyCard key={p.id} p={p} />)}
                </div>
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button disabled={currentPage === 1} onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="btn-ghost !py-2 !px-3 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Prev</button>
                    <div className="flex items-center gap-1">
                      {pageNumbers(currentPage, totalPages).map((n, i) =>
                        n === "..." ? <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
                          : <button key={n} onClick={() => { setPage(n as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                              className={`min-w-9 h-9 rounded-lg text-sm font-semibold transition ${currentPage === n ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{n}</button>
                      )}
                    </div>
                    <button disabled={currentPage === totalPages} onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="btn-ghost !py-2 !px-3 disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
                  </div>
                )}
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {showSave && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-sm p-4" onClick={() => setShowSave(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card border border-border shadow-glow p-6">
            <h3 className="text-lg font-bold flex items-center gap-2"><BookmarkPlus className="h-5 w-5 text-primary" /> Save this search</h3>
            <p className="text-sm text-muted-foreground mt-1">Get notified when new properties match these filters.</p>
            <div className="mt-4">
              <label className="text-xs font-medium">Name</label>
              <input value={savingName} onChange={(e) => setSavingName(e.target.value)} placeholder={summarize(currentFilters()) || "My search"} className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary" />
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

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft text-primary text-xs font-semibold pl-3 pr-1 py-1 border border-primary/20">
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/20 transition-colors">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
