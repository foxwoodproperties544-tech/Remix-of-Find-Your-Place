import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function useRoles() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as string);
    },
  });
  const roles = q.data ?? [];
  return {
    roles,
    isAdmin: roles.includes("admin"),
    isAgent: roles.includes("agent"),
    loading: q.isLoading,
    refetch: q.refetch,
  };
}
