import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("property_key").eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((r) => r.property_key));
    },
  });

  const toggle = useMutation({
    mutationFn: async (propertyKey: string) => {
      if (!user) throw new Error("not signed in");
      const has = query.data?.has(propertyKey);
      if (has) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("property_key", propertyKey);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, property_key: propertyKey });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });

  return {
    favorites: query.data ?? new Set<string>(),
    isFavorite: (key: string) => query.data?.has(key) ?? false,
    toggle: (key: string) => {
      if (!user) {
        toast("Sign in to save favorites", { action: { label: "Sign in", onClick: () => navigate({ to: "/auth" }) } });
        return;
      }
      toggle.mutate(key);
    },
  };
}
