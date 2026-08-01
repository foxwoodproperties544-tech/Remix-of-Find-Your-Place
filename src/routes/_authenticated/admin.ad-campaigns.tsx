import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { adminListCampaigns, adminApproveCampaign, adminRejectCampaign } from "@/lib/ads.functions";
import { toast } from "sonner";
import { ShieldCheck, Check, X, Megaphone, ExternalLink, Eye, MousePointerClick } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/ad-campaigns")({
  component: AdminAdCampaigns,
  head: () => ({ meta: [{ title: "Ad campaigns — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

const STATUSES = ["", "pending_review", "active", "rejected", "expired", "pending_payment"] as const;

function AdminAdCampaigns() {
  const { isAdmin, loading } = useRoles();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending_review");
  const [rejectFor, setRejectFor] = useState<{ id: string; title: string } | null>(null);
  const [notes, setNotes] = useState("");

  const listFn = useServerFn(adminListCampaigns);
  const approveFn = useServerFn(adminApproveCampaign);
  const rejectFn = useServerFn(adminRejectCampaign);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-ad-campaigns", status],
    enabled: isAdmin,
    queryFn: () => listFn({ data: { status: status || undefined } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });

  const approve = useMutation({
    mutationFn: (id: string) => approveFn({ data: { id } }),
    onSuccess: () => { toast.success("Approved · ad is live"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (v: { id: string; notes: string }) => rejectFn({ data: v }),
    onSuccess: () => { toast.success("Rejected"); invalidate(); setRejectFor(null); setNotes(""); },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldCheck className="h-10 w-10 mx-auto text-primary" />
        <h1 className="text-xl font-bold mt-3">Admins only</h1>
        <button onClick={() => nav({ to: "/dashboard/account" })} className="btn-primary btn-primary-hover mt-4">Back</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-secondary bg-secondary/10 rounded-full px-3 py-1">
            <Megaphone className="h-3.5 w-3.5" /> Moderation
          </div>
          <h1 className="text-3xl font-bold mt-2">Ad campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Review creatives, approve to go live, or reject with a reason.</p>
        </div>
        <Link to="/admin/ads" className="btn-ghost text-sm">Manage ad packages</Link>
      </div>

      <div className="mt-6 flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatus(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            {s ? s.replace("_", " ") : "all"}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && (rows?.length ?? 0) === 0 && (
          <div className="text-sm text-muted-foreground">No campaigns.</div>
        )}
        {rows?.map((c: any) => (
          <div key={c.id} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="aspect-[16/6] bg-muted overflow-hidden">
              <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold truncate">{c.title}</div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${c.status === "active" ? "bg-primary text-primary-foreground" : c.status === "pending_review" ? "bg-secondary text-white" : "bg-muted text-muted-foreground"}`}>
                  {c.status.replace("_", " ")}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {c.ad_packages?.name} · {c.placement.replace("_", " ")}
              </div>
              <a href={c.target_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="h-3 w-3" /> {c.target_url}
              </a>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {c.impressions}</span>
                <span className="inline-flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {c.clicks}</span>
              </div>
              {c.admin_notes && <div className="mt-2 text-xs text-destructive">Notes: {c.admin_notes}</div>}
              {c.status === "pending_review" && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => approve.mutate(c.id)} className="btn-primary btn-primary-hover text-xs inline-flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button onClick={() => setRejectFor({ id: c.id, title: c.title })} className="btn-ghost text-xs inline-flex items-center gap-1 text-destructive">
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {rejectFor && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl">
            <div className="p-4 border-b border-border font-semibold">Reject "{rejectFor.title}"</div>
            <div className="p-4">
              <label className="text-xs font-semibold">Reason (shown to advertiser)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full min-h-[100px] rounded-lg border border-border bg-field px-3 py-2 text-sm" />
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => { setRejectFor(null); setNotes(""); }} className="btn-ghost text-sm">Cancel</button>
              <button
                disabled={!notes.trim() || reject.isPending}
                onClick={() => reject.mutate({ id: rejectFor.id, notes: notes.trim() })}
                className="btn-primary btn-primary-hover text-sm bg-destructive hover:bg-destructive/90"
              >
                {reject.isPending ? "Sending…" : "Reject campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
