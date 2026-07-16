import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyProperties } from "@/lib/properties";
import { formatKsh } from "@/lib/mock-data";
import { PlusCircle, Trash2, ExternalLink, Home, CheckCircle2, Clock, XCircle } from "lucide-react";
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

  const total = data?.length ?? 0;
  const published = data?.filter((p) => p.status === "published").length ?? 0;
  const pending = data?.filter((p) => p.status === "pending").length ?? 0;
  const rejected = data?.filter((p) => p.status === "rejected").length ?? 0;

  return (
    <div className="container-page py-10">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <span className="chip"><Home className="h-3 w-3" /> Owner dashboard</span>
          <h1 className="text-3xl font-bold mt-3">My listings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage the properties you've posted on Foxwood.</p>
        </div>
        <Link to="/dashboard/new" className="btn-primary btn-primary-hover justify-self-start md:justify-self-end"><PlusCircle className="h-4 w-4" /> Post a new listing</Link>
      </div>

      <div className="mt-8 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Home} label="Total" value={total} tone="primary" />
        <StatCard icon={CheckCircle2} label="Published" value={published} tone="primary" />
        <StatCard icon={Clock} label="Pending review" value={pending} tone="secondary" />
        <StatCard icon={XCircle} label="Rejected" value={rejected} tone="destructive" />
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-3">
            {[0,1,2].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center bg-muted/30">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary"><Home className="h-6 w-6" /></div>
            <h3 className="font-semibold mt-4">No listings yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Post your first property to reach thousands of buyers and tenants.</p>
            <Link to="/dashboard/new" className="btn-primary btn-primary-hover mt-5 inline-flex">Post a listing</Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 hover:shadow-soft hover:border-primary/30 transition-all">
                <img src={p.images[0] ?? "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200"} alt="" className="h-16 w-24 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <span className="rounded-full bg-primary-soft text-primary text-xs px-2 py-0.5 font-semibold">{p.category}</span>
                    {p.status !== "published" && <span className={`rounded-full text-xs px-2 py-0.5 font-semibold ${p.status === "pending" ? "bg-secondary/15 text-secondary" : "bg-destructive/10 text-destructive"}`}>{p.status}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{p.area}, {p.town}</div>
                  <div className="text-sm font-bold text-primary mt-1">{formatKsh(Number(p.price))}{p.price_suffix ?? ""}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link to="/properties/$id" params={{ id: p.id }} className="btn-ghost !px-3 !py-2" title="View"><ExternalLink className="h-4 w-4" /></Link>
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

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: "primary" | "secondary" | "destructive" }) {
  const toneCls = tone === "primary" ? "bg-primary-soft text-primary" : tone === "secondary" ? "bg-secondary/15 text-secondary" : "bg-destructive/10 text-destructive";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${toneCls}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

