import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PropertyCard } from "@/components/site/PropertyCard";
import { properties as mockProps } from "@/lib/mock-data";
import { fetchPublishedProperties } from "@/lib/properties";

export const Route = createFileRoute("/_authenticated/favorites")({
  component: FavoritesPage,
  head: () => ({ meta: [{ title: "Saved properties — Foxwood Properties" }] }),
});

function FavoritesPage() {
  const { user } = useAuth();
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

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">Saved properties</h1>
      <p className="text-sm text-muted-foreground mt-1">Listings you've hearted for later.</p>
      {saved.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Nothing saved yet. Tap the heart on any listing to save it here.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
