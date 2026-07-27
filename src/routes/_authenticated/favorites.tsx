import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PropertyCard } from "@/components/site/PropertyCard";
import { properties as mockProps } from "@/lib/mock-data";
import { fetchPublishedProperties } from "@/lib/properties";
import { formatKsh } from "@/lib/mock-data";
import { fetchLatestChanges, formatDate, formatDelta, type PriceHistoryRow } from "@/lib/price-history";
import { PriceChangeBadge } from "@/components/property/PriceChangeBadge";

type SortKey = "default" | "biggest-drop" | "recent-change" | "biggest-increase";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Recently saved" },
  { value: "biggest-drop", label: "Biggest price drop" },
  { value: "recent-change", label: "Most recent price change" },
  { value: "biggest-increase", label: "Highest price increase" },
];

export const Route = createFileRoute("/_authenticated/favorites")({
  component: FavoritesPage,
  head: () => ({
    meta: [
      { title: "Saved properties — Foxwood Properties" },
      { name: "description", content: "Your saved Foxwood listings with live price changes, price drop badges and price-history sorting." },
      { property: "og:title", content: "Saved properties | Foxwood Properties" },
      { property: "og:description", content: "Track price drops on the Kenyan properties you saved." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function FavoritesPage() {
  const { user } = useAuth();
  const [sort, setSort] = useState<SortKey>("default");

  const favs = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("property_key").eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((r) => r.property_key));
    },
  });
  const dbProps = useQuery({ queryKey: ["properties"], queryFn: fetchPublishedProperties });

  const all = [...mockProps, ...(dbProps.data ?? [])];
  const saved = all.filter((p) => favs.data?.has(p.id));

  const changes = useQuery({
    queryKey: ["saved-price-changes", saved.map((p) => p.id).join(",")],
    enabled: saved.length > 0,
    staleTime: 60_000,
    queryFn: () => fetchLatestChanges(saved.map((p) => p.id)),
  });

  const sorted = useMemo(() => {
    const map: Map<string, PriceHistoryRow> = changes.data ?? new Map();
    const list = [...saved];
    if (sort === "biggest-drop") {
      list.sort((a, b) => (map.get(a.id)?.amount_changed ?? 0) - (map.get(b.id)?.amount_changed ?? 0));
    } else if (sort === "biggest-increase") {
      list.sort((a, b) => (map.get(b.id)?.amount_changed ?? 0) - (map.get(a.id)?.amount_changed ?? 0));
    } else if (sort === "recent-change") {
      list.sort(
        (a, b) =>
          +new Date(map.get(b.id)?.created_at ?? 0) - +new Date(map.get(a.id)?.created_at ?? 0),
      );
    }
    return list;
  }, [saved, sort, changes.data]);

  return (
    <div className="container-page py-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Saved properties</h1>
          <p className="text-sm text-muted-foreground mt-1">Listings you've hearted, with any price changes since you saved them.</p>
        </div>
        {saved.length > 1 && (
          <label className="text-xs font-semibold">
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input-base mt-1 block">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        )}
      </div>

      {saved.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Nothing saved yet. Tap the heart on any listing to save it here.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => {
            const change = changes.data?.get(p.id) ?? null;
            return (
              <div key={p.id} className="space-y-2">
                <PropertyCard p={p} />
                {change && (
                  <div className="rounded-xl border border-border bg-card p-3 text-xs">
                    <PriceChangeBadge change={change} compact />
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">Current</div>
                        <div className="font-bold text-primary">{formatKsh(p.price)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">Last recorded</div>
                        <div className="font-semibold">{change.previous_price == null ? "—" : formatKsh(change.previous_price)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">Difference</div>
                        <div className={"font-semibold " + ((change.amount_changed ?? 0) < 0 ? "text-primary" : "text-secondary")}>
                          {formatDelta(change.amount_changed, change.percent_changed)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Changed {formatDate(change.created_at)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
