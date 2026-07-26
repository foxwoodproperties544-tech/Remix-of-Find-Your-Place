import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useRoles } from "@/hooks/use-role";
import { toast } from "sonner";

/**
 * Client-side admin gate for admin routes. Server functions and RLS policies
 * re-check the role on every mutation — this only prevents the UI from rendering
 * admin tooling to non-admins.
 */
export function useAdminGuard() {
  const { isAdmin, loading } = useRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error("Admins only");
      navigate({ to: "/dashboard" });
    }
  }, [loading, isAdmin, navigate]);

  return { isAdmin, loading };
}
