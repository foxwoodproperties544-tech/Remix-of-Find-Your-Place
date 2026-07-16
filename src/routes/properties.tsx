import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { properties as mockProps, counties, formatKsh } from "@/lib/mock-data";
import { PropertyCard } from "@/components/site/PropertyCard";
import { Search, SlidersHorizontal, BookmarkPlus, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPublishedProperties } from "@/lib/properties";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const searchSchema = z.object({
  category: z.string().optional(),
  type: z.string().optional(),
  county: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minBeds: z.coerce.number().optional(),
});

export const Route = createFileRoute("/properties")({
  head: () => ({ meta: [{ title: "Properties — Foxwood Properties" }, { name: "description", content: "Browse verified properties for sale, rent, and lease across Kenya." }] }),
  validateSearch: searchSchema,
  component: List,
});

function List() {
  const params = Route.useSearch();
  const { user } = useAuth();
  const [q, setQ] = useState(params.q ?? "");
  const [type, setType] = useState(params.type ?? "");
  const [county, setCounty] = useState(params.county ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [minPrice, setMinPrice] = useState<string>(params.minPrice?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState<string>(params.maxPrice?.toString() ?? "");
  const [minBeds, setMinBeds] = useState<string>(params.minBeds?.toString() ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc" | "beds-desc">("newest");

  const { data: dbProps } = useQuery({ queryKey: ["properties"], queryFn: fetchPublishedProperties });
  const all = [...(dbProps ?? []), ...mockProps];
  const filtered = all.filter(p => {
    if (category && p.category !== category) return false;
    if (type && p.type !== type) return false;
    if (county && p.county !== county) return false;
    if (minPrice && p.price < Number(minPrice)) return false;
    if (maxPrice && p.price > Number(maxPrice)) return false;
    if (minBeds && p.bedrooms < Number(minBeds)) return false;
    if (q && !(`${p.title} ${p.area} ${p.town}`).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "beds-desc") return b.bedrooms - a.bedrooms;
    return 0;
  });


  const currentFilters = () => {
    const f: Record<string, any> = {};
    if (q) f.q = q;
    if (category) f.category = category;
    if (type) f.type = type;
    if (county) f.county = county;
    if (minPrice) f.minPrice = Number(minPrice);
    if (maxPrice) f.maxPrice = Number(maxPrice);
    if (minBeds) f.minBeds = Number(minBeds);
    return f;
  };

  function clearAll() {
    setQ(""); setCategory(""); setType(""); setCounty(""); setMinPrice(""); setMaxPrice(""); setMinBeds("");
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

  const hasFilters = q || category || type || county || minPrice || maxPrice || minBeds;

  return (
    <>
      <section className="bg-primary-soft border-b border-border">
        <div className="container-page py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-bold">Properties</h1>
          <p className="mt-2 text-muted-foreground">Find your next home, plot or investment across Kenya.</p>
          <div className="mt-6 rounded-2xl bg-background p-3 shadow-soft space-y-2">
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <div className="flex items-center gap-2 rounded-full border border-border px-4 py-2.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search location, title..." className="w-full bg-transparent text-sm outline-none" />
              </div>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-full border border-border px-4 py-2.5 text-sm bg-background">
                <option value="">All categories</option>
                {["For Sale","For Rent","For Lease"].map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={type} onChange={e=>setType(e.target.value)} className="rounded-full border border-border px-4 py-2.5 text-sm bg-background">
                <option value="">All types</option>
                {["Houses","Apartments","Land / Plots","Airbnbs","Commercial","Office Spaces","Shops","Warehouses","Farms","Holiday Homes"].map(t => <option key={t}>{t}</option>)}
              </select>
              <select value={county} onChange={e=>setCounty(e.target.value)} className="rounded-full border border-border px-4 py-2.5 text-sm bg-background">
                <option value="">All counties</option>
                {counties.map(c => <option key={c}>{c}</option>)}
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
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "property" : "properties"} found</p>
          <div className="flex items-center gap-2">
            {hasFilters && <button onClick={clearAll} className="btn-ghost !py-2 !px-3 text-xs"><X className="h-3.5 w-3.5" /> Clear filters</button>}
            {hasFilters && (
              <button onClick={() => setShowSave(true)} className="btn-secondary !py-2 !px-4 text-xs"><BookmarkPlus className="h-4 w-4" /> Save this search</button>
            )}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <p className="font-semibold">No properties match your filters.</p>
            <p className="text-sm text-muted-foreground mt-1">Try widening your search.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(p => <PropertyCard key={p.id} p={p} />)}
          </div>
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

function summarize(f: Record<string, any>) {
  const parts: string[] = [];
  if (f.category) parts.push(f.category);
  if (f.type) parts.push(f.type);
  if (f.county) parts.push(`in ${f.county}`);
  if (f.minBeds) parts.push(`${f.minBeds}+ bed`);
  return parts.join(" · ");
}
