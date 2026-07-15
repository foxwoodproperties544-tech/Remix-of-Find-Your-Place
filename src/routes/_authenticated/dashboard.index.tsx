import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyProperties } from "@/lib/properties";
import { formatKsh } from "@/lib/mock-data";
import { PlusCircle, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "My listings — Foxwood Properties" }] }),
});

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-properties", user?.id],
    enabled: !!user,
    queryFn: () => fetchMyProperties(user!.id),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Listing deleted"); qc.invalidateQueries({ queryKey: ["my-properties"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="container-page py-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">My listings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage the properties you've posted on Foxwood.</p>
        </div>
        <Link to="/dashboard/new" className="btn-primary btn-primary-hover"><PlusCircle className="h-4 w-4" /> Post a new listing</Link>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <h3 className="font-semibold">No listings yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Post your first property to reach thousands of buyers and tenants.</p>
            <Link to="/dashboard/new" className="btn-primary btn-primary-hover mt-4 inline-flex">Post a listing</Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
                <img src={p.images[0] ?? "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200"} alt="" className="h-16 w-24 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <span className="rounded-full bg-primary-soft text-primary text-xs px-2 py-0.5">{p.category}</span>
                    {p.status !== "published" && <span className="rounded-full bg-muted text-xs px-2 py-0.5">{p.status}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{p.area}, {p.town}</div>
                  <div className="text-sm font-bold text-primary mt-1">{formatKsh(Number(p.price))}{p.price_suffix ?? ""}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Link to="/properties/$id" params={{ id: p.id }} className="btn-ghost !px-3 !py-2" title="View"><ExternalLink className="h-4 w-4" /></Link>
                  <Link to="/dashboard/$id/edit" params={{ id: p.id }} className="btn-ghost !px-3 !py-2" title="Edit"><Pencil className="h-4 w-4" /></Link>
                  <button onClick={() => confirm("Delete this listing?") && del.mutate(p.id)} className="btn-ghost !px-3 !py-2 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
