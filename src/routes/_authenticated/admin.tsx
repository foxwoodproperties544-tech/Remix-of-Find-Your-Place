import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import type { DbPropertyRow } from "@/lib/properties";
import { formatKsh } from "@/lib/mock-data";
import { claimFirstAdmin } from "@/lib/admin.functions";
import { CheckCircle2, XCircle, Trash2, ExternalLink, ShieldCheck, Clock, EyeOff, Eye, Star } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Admin — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

const STATUSES = ["all", "pending", "published", "rejected"] as const;

function Admin() {
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading, refetch: refetchRoles } = useRoles();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [tab, setTab] = useState<typeof STATUSES[number]>("pending");
  const [claiming, setClaiming] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-properties", tab],
    enabled: isAdmin,
    queryFn: async () => {
      let q = supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (tab !== "all") q = q.eq("status", tab);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbPropertyRow[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("properties").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Listing marked as ${v.status}`);
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      qc.invalidateQueries({ queryKey: ["published-properties"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      const patch: any = { is_featured: on, featured: on };
      if (on) patch.featured_until = new Date(Date.now() + 30 * 86400_000).toISOString();
      else patch.featured_until = null;
      const { error } = await supabase.from("properties").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Featured status updated"); qc.invalidateQueries({ queryKey: ["admin-properties"] }); qc.invalidateQueries({ queryKey: ["published-properties"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleVerified = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      const { error } = await supabase.from("properties").update({
        verified: on, verified_at: on ? new Date().toISOString() : null, verified_by: on ? user!.id : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Verification updated"); qc.invalidateQueries({ queryKey: ["admin-properties"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Listing removed");
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      qc.invalidateQueries({ queryKey: ["published-properties"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function claimAdmin() {
    setClaiming(true);
    try {
      const result = await claimFirstAdmin();
      if (result?.claimed) { toast.success("You are now an admin"); await refetchRoles(); }
      else toast.error("An admin already exists — ask them to grant you access.");
    } catch (e: any) { toast.error(e.message ?? "Failed to claim admin"); }
    finally { setClaiming(false); }
  }

  if (!user) return null;
  if (rolesLoading) return <div className="container-page py-16 text-sm text-muted-foreground">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="container-page py-16 max-w-lg text-center">
        <ShieldCheck className="h-12 w-12 mx-auto text-primary" />
        <h1 className="text-2xl font-bold mt-4">Admin access required</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This dashboard is restricted to administrators. If you are the site owner and no admin
          exists yet, you can claim the admin role for your account below.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => nav({ to: "/" })} className="btn-ghost">Back home</button>
          <button onClick={claimAdmin} disabled={claiming} className="btn-primary btn-primary-hover">
            {claiming ? "Claiming…" : "Claim admin role"}
          </button>
        </div>
      </div>
    );
  }

  const counts = STATUSES.reduce((acc, s) => { acc[s] = 0; return acc; }, {} as Record<string, number>);
  if (data) { counts.all = data.length; }

  return (
    <div className="container-page py-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1"><ShieldCheck className="h-3.5 w-3.5" /> Admin</div>
          <h1 className="text-3xl font-bold mt-2">Moderation dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Approve, reject, or remove listings across the platform.</p>
        </div>
        <Link to="/admin/verifications" className="btn-ghost text-sm"><ShieldCheck className="h-4 w-4" /> Verifications queue</Link>
      </div>

      <AdminMfaNudge />


      <div className="mt-6 flex gap-2 border-b border-border">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${tab === s ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading listings…</p>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <h3 className="font-semibold">Nothing here</h3>
            <p className="text-sm text-muted-foreground mt-1">No listings in this queue.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex items-start gap-4 flex-wrap md:flex-nowrap">
                <img src={p.images[0] ?? "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200"} alt="" className="h-20 w-28 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <StatusBadge status={p.status} />
                    <span className="rounded-full bg-muted text-xs px-2 py-0.5">{p.category}</span>
                    <span className="rounded-full bg-muted text-xs px-2 py-0.5">{p.property_type}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">{p.area ? `${p.area}, ` : ""}{p.town}, {p.county} · Submitted {new Date(p.created_at).toLocaleDateString()}</div>
                  <div className="text-sm font-bold text-primary mt-1">{formatKsh(Number(p.price))}{p.price_suffix ?? ""}</div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  <Link to="/properties/$id" params={{ id: p.slug ?? p.id }} className="btn-ghost !px-3 !py-2" title="Preview"><ExternalLink className="h-4 w-4" /></Link>
                  {p.status !== "published" && (
                    <button onClick={() => setStatus.mutate({ id: p.id, status: "published" })}
                      className="btn-ghost !px-3 !py-2 text-primary" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>
                  )}
                  {p.status !== "rejected" && (
                    <button onClick={() => setStatus.mutate({ id: p.id, status: "rejected" })}
                      className="btn-ghost !px-3 !py-2 text-secondary" title="Reject"><XCircle className="h-4 w-4" /></button>
                  )}
                  {p.status === "published" && (
                    <button onClick={() => setStatus.mutate({ id: p.id, status: "pending" })}
                      className="btn-ghost !px-3 !py-2" title="Unpublish"><EyeOff className="h-4 w-4" /></button>
                  )}
                  {p.status === "published" && (
                    <button onClick={() => toggleFeatured.mutate({ id: p.id, on: !(p as any).is_featured })}
                      className={`btn-ghost !px-3 !py-2 ${(p as any).is_featured ? "text-secondary" : ""}`}
                      title={(p as any).is_featured ? "Unfeature" : "Feature"}><Star className={`h-4 w-4 ${(p as any).is_featured ? "fill-current" : ""}`} /></button>
                  )}
                  <button onClick={() => toggleVerified.mutate({ id: p.id, on: !(p as any).verified })}
                    className={`btn-ghost !px-3 !py-2 ${(p as any).verified ? "text-primary" : ""}`}
                    title={(p as any).verified ? "Unverify" : "Verify"}><ShieldCheck className="h-4 w-4" /></button>
                  <button onClick={() => confirm("Delete this listing permanently?") && del.mutate(p.id)}
                    className="btn-ghost !px-3 !py-2 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminMfaNudge() {
  const [hasMfa, setHasMfa] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = ((data?.all ?? []) as any[]).some((f) => f.factor_type === "totp" && f.status === "verified");
      setHasMfa(verified);
    }).catch(() => setHasMfa(null));
  }, []);
  if (hasMfa !== false || dismissed) return null;
  return (
    <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
      <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <div className="font-semibold text-amber-900 dark:text-amber-100">Enable two-factor authentication</div>
        <div className="text-amber-800/90 dark:text-amber-200/90">Admin accounts should be protected by 2FA. Set up an authenticator app to keep the platform secure.</div>
      </div>
      <Link to="/dashboard/security" className="rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-700">Set up 2FA</Link>
      <button onClick={() => setDismissed(true)} className="text-xs text-amber-800 hover:underline">Later</button>
    </div>
  );
}


function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: any }> = {
    published: { cls: "bg-primary-soft text-primary", Icon: Eye },
    pending: { cls: "bg-secondary/15 text-secondary", Icon: Clock },
    rejected: { cls: "bg-destructive/10 text-destructive", Icon: XCircle },
  };
  const { cls, Icon } = map[status] ?? { cls: "bg-muted", Icon: Clock };
  return <span className={`inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 font-semibold ${cls}`}><Icon className="h-3 w-3" /> {status}</span>;
}
