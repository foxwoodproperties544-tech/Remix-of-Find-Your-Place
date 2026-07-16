import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { fetchPublishedProperties } from "@/lib/properties";
import { properties as mockProps } from "@/lib/mock-data";
import { PropertyCard } from "@/components/site/PropertyCard";

export function RecentlyViewedRail({
  excludeId,
  title = "Recently viewed",
  limit = 6,
}: {
  excludeId?: string;
  title?: string;
  limit?: number;
}) {
  const { ids } = useRecentlyViewed();
  const { data: dbProps } = useQuery({ queryKey: ["properties"], queryFn: fetchPublishedProperties });

  const items = useMemo(() => {
    const pool = [...(dbProps ?? []), ...mockProps];
    const byId = new Map(pool.map((p) => [p.id, p]));
    const filtered = ids
      .filter((id) => id !== excludeId)
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    return filtered.slice(0, limit);
  }, [ids, dbProps, excludeId, limit]);

  if (items.length === 0) return null;

  return (
    <section className="container-page py-10 md:py-14">
      <div className="flex items-center gap-2 mb-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
          <p className="text-xs text-muted-foreground">Pick up where you left off</p>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <PropertyCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
