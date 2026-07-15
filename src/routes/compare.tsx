import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCompare } from "@/hooks/use-compare";
import { properties as mockProps, formatKsh, type Property } from "@/lib/mock-data";
import { fetchPublishedProperties } from "@/lib/properties";
import { GitCompare, X, Bed, Bath, Maximize, MapPin, Check, Minus, Share2, Printer } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";
import { toast } from "sonner";

const searchSchema = z.object({ ids: z.string().optional() });

export const Route = createFileRoute("/compare")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Compare Properties — Foxwood Properties" },
      { name: "description", content: "Compare properties side-by-side: price, size, features and amenities." },
    ],
  }),
  component: Compare,
});

function Compare() {
  const search = Route.useSearch();
  const { ids: localIds, remove, clear, max } = useCompare();
  const sharedIds = search.ids ? search.ids.split(",").filter(Boolean) : null;
  const ids = sharedIds ?? localIds;
  const isShared = !!sharedIds;

  const { data: dbProps } = useQuery({ queryKey: ["properties"], queryFn: fetchPublishedProperties });
  const all = [...(dbProps ?? []), ...mockProps];
  const items = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean) as Property[];

  const allFeatures = Array.from(new Set(items.flatMap((p) => p.features)));
  const allAmenities = Array.from(new Set(items.flatMap((p) => p.amenities)));

  useEffect(() => { document.body.classList.add("compare-body"); return () => document.body.classList.remove("compare-body"); }, []);

  async function copyShareLink() {
    const url = `${window.location.origin}/compare?ids=${ids.join(",")}`;
    try {
      if (navigator.share) await navigator.share({ title: "Foxwood — Property Comparison", url });
      else { await navigator.clipboard.writeText(url); toast.success("Share link copied"); }
    } catch {}
  }

  function printPdf() {
    toast("Choose 'Save as PDF' in the print dialog", { duration: 3500 });
    setTimeout(() => window.print(), 200);
  }

  return (
    <>
      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          body { background: white !important; }
          .compare-shell { padding: 0 !important; }
          table { page-break-inside: avoid; }
        }
      `}</style>
      <section className="bg-primary-soft border-b border-border no-print">
        <div className="container-page py-10 md:py-14 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-background rounded-full px-3 py-1"><GitCompare className="h-3.5 w-3.5" /> Compare</div>
            <h1 className="text-3xl md:text-4xl font-bold mt-3">Property Comparison</h1>
            <p className="mt-2 text-muted-foreground">
              {isShared ? "Shared comparison — read only." : `Compare up to ${max} properties side-by-side. ${items.length}/${max} selected.`}
            </p>
          </div>
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={copyShareLink} className="btn-ghost !py-2 !px-4 text-sm"><Share2 className="h-4 w-4" /> Share link</button>
              <button onClick={printPdf} className="btn-secondary !py-2 !px-4 text-sm"><Printer className="h-4 w-4" /> Export as PDF</button>
              {!isShared && <button onClick={clear} className="btn-ghost !py-2 !px-4 text-sm">Clear all</button>}
            </div>
          )}
        </div>
      </section>

      <section className="container-page py-10 md:py-14 compare-shell">
        <div className="hidden print:block mb-6">
          <div className="text-2xl font-bold text-primary">Foxwood Properties</div>
          <div className="text-sm text-muted-foreground">Property Comparison Report · {new Date().toLocaleDateString()}</div>
        </div>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <GitCompare className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No properties to compare</h3>
            <p className="text-sm text-muted-foreground mt-1">Add properties from the listings page to compare them side-by-side.</p>
            <Link to="/properties" className="btn-primary btn-primary-hover inline-flex mt-6">Browse properties</Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[640px] border-separate border-spacing-x-3">
              <thead>
                <tr>
                  <th className="w-40 text-left align-top" />
                  {items.map((p) => (
                    <th key={p.id} className="text-left align-top min-w-[220px]">
                      <div className="rounded-2xl border border-border bg-card overflow-hidden">
                        <div className="relative aspect-[4/3]">
                          <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                          {!isShared && (
                            <button onClick={() => remove(p.id)}
                              className="no-print absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-background/95 shadow-soft hover:bg-destructive hover:text-destructive-foreground transition-colors"
                              aria-label="Remove">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <span className="absolute top-2 left-2 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold px-2.5 py-0.5">{p.category}</span>
                        </div>
                        <div className="p-4">
                          <Link to="/properties/$id" params={{ id: p.id }} className="font-semibold text-sm line-clamp-1 hover:text-primary">{p.title}</Link>
                          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.area}, {p.town}</div>
                          <div className="mt-2 text-lg font-bold text-primary">{formatKsh(p.price)}<span className="text-xs font-medium text-muted-foreground">{p.priceSuffix ?? ""}</span></div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                <Row label="Type" items={items} render={(p) => p.type} />
                <Row label="County" items={items} render={(p) => p.county} />
                <Row label={<span className="flex items-center gap-1"><Bed className="h-4 w-4" /> Bedrooms</span>} items={items} render={(p) => p.bedrooms || "—"} />
                <Row label={<span className="flex items-center gap-1"><Bath className="h-4 w-4" /> Bathrooms</span>} items={items} render={(p) => p.bathrooms || "—"} />
                <Row label={<span className="flex items-center gap-1"><Maximize className="h-4 w-4" /> Size</span>} items={items} render={(p) => p.size || "—"} />

                <SectionRow label="Features" span={items.length + 1} />
                {allFeatures.map((f) => (
                  <Row key={f} label={f} items={items} render={(p) => p.features.includes(f) ? <Check className="h-4 w-4 text-primary" /> : <Minus className="h-4 w-4 text-muted-foreground/50" />} />
                ))}

                <SectionRow label="Amenities" span={items.length + 1} />
                {allAmenities.map((a) => (
                  <Row key={a} label={a} items={items} render={(p) => p.amenities.includes(a) ? <Check className="h-4 w-4 text-primary" /> : <Minus className="h-4 w-4 text-muted-foreground/50" />} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Row({ label, items, render }: { label: React.ReactNode; items: Property[]; render: (p: Property) => React.ReactNode }) {
  return (
    <tr>
      <td className="py-2 pr-3 text-xs font-medium text-muted-foreground align-top">{label}</td>
      {items.map((p) => (
        <td key={p.id} className="py-2 border-b border-border/60 align-top">{render(p)}</td>
      ))}
    </tr>
  );
}

function SectionRow({ label, span }: { label: string; span: number }) {
  return (
    <tr>
      <td colSpan={span} className="pt-6 pb-2 text-xs font-bold uppercase tracking-wider text-primary">{label}</td>
    </tr>
  );
}
