import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { properties, counties } from "@/lib/mock-data";
import { PropertyCard } from "@/components/site/PropertyCard";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

const searchSchema = z.object({
  category: z.string().optional(),
  type: z.string().optional(),
  county: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/properties")({
  head: () => ({ meta: [{ title: "Properties — Foxwood Properties" }, { name: "description", content: "Browse verified properties for sale, rent, and lease across Kenya." }] }),
  validateSearch: searchSchema,
  component: List,
});

function List() {
  const params = Route.useSearch();
  const [q, setQ] = useState(params.q ?? "");
  const [type, setType] = useState(params.type ?? "");
  const [county, setCounty] = useState(params.county ?? "");
  const [category, setCategory] = useState(params.category ?? "");

  const filtered = properties.filter(p => {
    if (category && p.category !== category) return false;
    if (type && p.type !== type) return false;
    if (county && p.county !== county) return false;
    if (q && !(`${p.title} ${p.area} ${p.town}`).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <section className="bg-primary-soft border-b border-border">
        <div className="container-page py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-bold">Properties</h1>
          <p className="mt-2 text-muted-foreground">Find your next home, plot or investment across Kenya.</p>
          <div className="mt-6 rounded-2xl bg-background p-3 shadow-soft grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
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
            <button className="btn-primary btn-primary-hover"><SlidersHorizontal className="h-4 w-4" /> Filter</button>
          </div>
        </div>
      </section>

      <section className="container-page py-10 md:py-14">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "property" : "properties"} found</p>
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
    </>
  );
}
