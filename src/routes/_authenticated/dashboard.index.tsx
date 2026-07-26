import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { fetchMyProperties } from "@/lib/properties";
import { formatKsh } from "@/lib/mock-data";
import { PlusCircle, Trash2, ExternalLink, Home, CheckCircle2, Clock, XCircle, Eye, Heart, TrendingUp, Pencil, RefreshCw, Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { PageHero } from "@/components/site/PageHero";
import { RenewPackageDialog } from "@/components/site/RenewPackageDialog";
import { listMyActiveListingPurchases } from "@/lib/renewals.functions";
import { useServerFn } from "@tanstack/react-start";
import { FoundingTierWidget } from "@/components/dashboard/FoundingTierWidget";
import heroTools from "@/assets/hero-tools.jpg";


export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "My listings — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

type RangeKey = "7" | "30" | "90" | "all";
const RANGE_LABELS: Record<RangeKey, string> = { "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days", all: "All time" };

function sinceIso(range: RangeKey): string | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - Number(range));
  return d.toISOString();
}

function Dashboard() {
  const { user } = useAuth();
  const { isAgent, isAdmin, loading: rolesLoading } = useRoles();
  const qc = useQueryClient();
  const [range, setRange] = useState<RangeKey>("30");
  const [renewFor, setRenewFor] = useState<{ purchase: any; property: any } | null>(null);
  const listPurchasesFn = useServerFn(listMyActiveListingPurchases);

  if (!rolesLoading && !isAgent && !isAdmin) {
    return <Navigate to="/dashboard/account" replace />;
  }



  const { data, isLoading } = useQuery({
    queryKey: ["my-properties", user?.id],
    enabled: !!user,
    queryFn: () => fetchMyProperties(user!.id),
  });

  const propertyIds = useMemo(() => (data ?? []).map(p => p.id), [data]);

  const purchases = useQuery<any[]>({
    queryKey: ["my-listing-purchases", user?.id],
    enabled: !!user,
    queryFn: () => listPurchasesFn(),
  });
  const purchasesByProp = useMemo(() => {
    const m = new Map<string, any>();
    for (const row of purchases.data ?? []) m.set(row.property_id, row);
    return m;
  }, [purchases.data]);

  const insights = useQuery({
    queryKey: ["my-insights", user?.id, range, propertyIds.length],
    enabled: !!user && propertyIds.length > 0,
    queryFn: async () => {
      const since = sinceIso(range);
      let viewsQ = supabase.from("property_views").select("property_key, created_at").in("property_key", propertyIds);
      let favsQ = supabase.from("favorites").select("property_key, created_at").in("property_key", propertyIds);
      if (since) { viewsQ = viewsQ.gte("created_at", since); favsQ = favsQ.gte("created_at", since); }
      const [vRes, fRes] = await Promise.all([viewsQ, favsQ]);
      if (vRes.error) throw vRes.error;
      if (fRes.error) throw fRes.error;
      const viewsByProp: Record<string, number> = {};
      for (const r of vRes.data) viewsByProp[r.property_key] = (viewsByProp[r.property_key] ?? 0) + 1;
      const favsByProp: Record<string, number> = {};
      for (const r of fRes.data) favsByProp[r.property_key] = (favsByProp[r.property_key] ?? 0) + 1;
      return {
        totalViews: vRes.data.length,
        totalFavs: fRes.data.length,
        viewsByProp,
        favsByProp,
      };
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Listing deleted"); qc.invalidateQueries({ queryKey: ["my-properties"] }); qc.invalidateQueries({ queryKey: ["my-insights"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const renew = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").update({ status: "pending", published_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Listing sent for re-review"); qc.invalidateQueries({ queryKey: ["my-properties"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const total = data?.length ?? 0;
  const published = data?.filter((p) => p.status === "published").length ?? 0;
  const pending = data?.filter((p) => p.status === "pending").length ?? 0;
  const rejected = data?.filter((p) => p.status === "rejected").length ?? 0;
  const totalViews = insights.data?.totalViews ?? 0;
  const totalFavs = insights.data?.totalFavs ?? 0;
  const convRate = totalViews > 0 ? Math.round((totalFavs / totalViews) * 100) : 0;

  // Top-performing listings by views
  const ranked = useMemo(() => {
    if (!data || !insights.data) return [];
    const rows = data.map(p => ({
      p,
      views: insights.data!.viewsByProp[p.id] ?? 0,
      favs: insights.data!.favsByProp[p.id] ?? 0,
    }));
    return rows.sort((a, b) => (b.views + b.favs * 2) - (a.views + a.favs * 2));
  }, [data, insights.data]);

  return (
    <>
      <PageHero
        image={heroTools}
        size="xs"
        eyebrow={<><Home className="h-3.5 w-3.5" /> Owner dashboard</>}
        title="My listings"
        subtitle="Manage the properties you've posted on Foxwood."
        actions={<Link to="/dashboard/new" className="btn-secondary !py-2 !px-4 text-sm"><PlusCircle className="h-4 w-4" /> Post a new listing</Link>}
      />
      <div className="container-page py-10">
        <FoundingTierWidget />
        <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Insights</h2>
        <div className="inline-flex rounded-full border border-border bg-background p-1">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map(k => (
            <button key={k} onClick={() => setRange(k)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${range === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {RANGE_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Home} label="Total listings" value={total} tone="primary" />
        <StatCard icon={CheckCircle2} label="Published" value={published} tone="primary" />
        <StatCard icon={Eye} label="Views" value={totalViews} tone="primary" hint={RANGE_LABELS[range]} loading={insights.isLoading} />
        <StatCard icon={Heart} label="Favorites" value={totalFavs} tone="secondary" hint={`${convRate}% of views`} loading={insights.isLoading} />
      </div>
      <div className="mt-3 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} label="Pending review" value={pending} tone="secondary" />
        <StatCard icon={XCircle} label="Rejected" value={rejected} tone="destructive" />
      </div>

      {ranked.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="font-bold text-sm">Top performing · {RANGE_LABELS[range]}</h3>
          <div className="mt-3 grid gap-2">
            {ranked.slice(0, 5).map(({ p, views, favs }) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl bg-muted/40 p-2 pr-3">
                <img src={p.images[0] ?? "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200"} alt="" className="h-10 w-14 rounded-md object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.area}, {p.town}</div>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className="inline-flex items-center gap-1 text-muted-foreground"><Eye className="h-3.5 w-3.5" /> <span className="font-semibold tabular-nums text-foreground">{views}</span></span>
                  <span className="inline-flex items-center gap-1 text-secondary"><Heart className="h-3.5 w-3.5" /> <span className="font-semibold tabular-nums">{favs}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {data.map((p) => {
              const v = insights.data?.viewsByProp[p.id] ?? 0;
              const f = insights.data?.favsByProp[p.id] ?? 0;
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-soft hover:border-primary/30 transition-all">
                 <div className="flex items-center gap-4">
                  <img src={p.images[0] ?? "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200"} alt="" className="h-16 w-24 rounded-lg object-cover shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{p.title}</h3>
                      <span className="rounded-full bg-primary-soft text-primary text-xs px-2 py-0.5 font-semibold">{p.category}</span>
                      {p.status !== "published" && <span className={`rounded-full text-xs px-2 py-0.5 font-semibold ${p.status === "pending" ? "bg-secondary/15 text-secondary" : "bg-destructive/10 text-destructive"}`}>{p.status}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{p.area}, {p.town}</div>
                    <div className="mt-1 flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-primary">{formatKsh(Number(p.price))}{p.price_suffix ?? ""}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" /> {v}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-secondary"><Heart className="h-3.5 w-3.5" /> {f}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {p.status === "published" && !p.is_featured && (
                      <Link to="/dashboard/feature/$id" params={{ id: p.id }} className="btn-ghost !px-3 !py-2 text-secondary" title="Feature this listing"><Star className="h-4 w-4" /></Link>
                    )}
                    {p.status === "published" && p.is_featured && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary bg-secondary/10 rounded-full px-2 py-1"><Star className="h-3 w-3 fill-current" /> Featured</span>
                    )}
                    {!p.verified && p.status === "published" && (
                      <Link to="/dashboard/verify/$id" params={{ id: p.id }} className="btn-ghost !px-3 !py-2 text-primary" title="Verify listing"><ShieldCheck className="h-4 w-4" /></Link>
                    )}
                    {p.verified && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary-soft rounded-full px-2 py-1"><ShieldCheck className="h-3 w-3" /> Verified</span>
                    )}
                    <Link to="/properties/$id" params={{ id: p.slug ?? p.id }} className="btn-ghost !px-3 !py-2" title="View"><ExternalLink className="h-4 w-4" /></Link>
                    <Link to="/dashboard/edit/$id" params={{ id: p.id }} className="btn-ghost !px-3 !py-2" title="Edit"><Pencil className="h-4 w-4" /></Link>
                    {p.status === "pending_payment" && (
                      <Link to="/dashboard/pay/$id" params={{ id: p.id }} className="btn-primary btn-primary-hover !px-3 !py-2 text-xs" title="Pay to publish">Pay to publish</Link>
                    )}
                    {(p.status === "rejected" || p.status === "draft") && (
                      <button onClick={() => renew.mutate(p.id)} className="btn-ghost !px-3 !py-2 text-primary" title="Submit for review"><RefreshCw className="h-4 w-4" /></button>
                    )}
                    {purchasesByProp.get(p.id) && (
                      <button onClick={() => setRenewFor({ purchase: purchasesByProp.get(p.id), property: p })} className="btn-ghost !px-3 !py-2 text-primary text-xs inline-flex items-center gap-1" title="Renew / change plan">
                        <RefreshCw className="h-3.5 w-3.5" /> Plan
                      </button>
                    )}
                    <button onClick={() => confirm("Delete this listing?") && del.mutate(p.id)} className="btn-ghost !px-3 !py-2 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                 </div>
                 {isStale(p as any) && <FreshnessPrompt property={p} />}
                </div>

              );
            })}
          </div>
        )}
        </div>
      </div>

      {renewFor && (
        <RenewPackageDialog
          open={!!renewFor}
          onClose={() => setRenewFor(null)}
          kind="listing"
          entityId={renewFor.purchase.id}
          currentPackageId={renewFor.purchase.package_id}
          currentPrice={Number(renewFor.purchase.listing_packages?.price ?? 0)}
          pendingPackageName={renewFor.purchase.pending_package?.name}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ["my-listing-purchases"] }); qc.invalidateQueries({ queryKey: ["my-properties"] }); }}
        />
      )}
    </>
  );
}

function StatCard({ icon: Icon, label, value, tone, hint, loading }: { icon: any; label: string; value: number; tone: "primary" | "secondary" | "destructive"; hint?: string; loading?: boolean }) {
  const toneCls = tone === "primary" ? "bg-primary-soft text-primary" : tone === "secondary" ? "bg-secondary/15 text-secondary" : "bg-destructive/10 text-destructive";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${toneCls}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums">{loading ? <span className="inline-block h-6 w-12 rounded bg-muted animate-pulse" /> : value.toLocaleString()}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
