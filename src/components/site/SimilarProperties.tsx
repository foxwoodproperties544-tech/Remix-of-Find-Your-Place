import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toProperty, type DbPropertyRow } from "@/lib/properties";
import { PropertyCard } from "./PropertyCard";
import { Sparkles } from "lucide-react";

interface Props {
  currentId: string;
  category?: string | null;
  type?: string | null;
  county?: string | null;
  price?: number | null;
}

export function SimilarProperties({ currentId, category, type, county, price }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["similar-properties", currentId, category, type, county, price],
    queryFn: async () => {
      // Prefer same category+type+county; then broaden if too few.
      const min = price ? price * 0.6 : null;
      const max = price ? price * 1.6 : null;

      const base = supabase
        .from("properties")
        .select("*")
        .eq("status", "published")
        .neq("id", currentId)
        .limit(6);

      let q = base;
      if (category) q = q.eq("category", category);
      if (type) q = q.eq("type", type);
      if (county) q = q.eq("county", county);
      if (min != null && max != null) q = q.gte("price", min).lte("price", max);

      let { data: rows } = await q.order("is_featured", { ascending: false }).order("published_at", { ascending: false });
      if (!rows || rows.length < 3) {
        // Broaden: same category only
        const { data: rows2 } = await supabase
          .from("properties")
          .select("*")
          .eq("status", "published")
          .neq("id", currentId)
          .eq("category", category ?? "")
          .order("published_at", { ascending: false })
          .limit(6);
        rows = rows2 ?? rows ?? [];
      }
      return (rows as DbPropertyRow[]).slice(0, 3).map(toProperty);
    },
    staleTime: 60_000,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <section className="container-page pb-16">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-secondary" />
        <h2 className="text-2xl font-bold">Similar properties you may like</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map(p => <PropertyCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
