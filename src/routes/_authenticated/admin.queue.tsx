import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { listPendingAgentListings, moderateListing } from "@/lib/founding.functions";
import { formatKsh } from "@/lib/mock-data";
import { ShieldCheck, CheckCircle2, XCircle, ExternalLink, BadgeCheck, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/queue")({
  component: ModerationQueue,
  head: () => ({ meta: [{ title: "Approval queue — Admin" }, { name: "robots", content: "noindex" }] }),
});

const TABS = [
  { key: "pending", label: "Pending review" },
  { key: "pending_payment", label: "Awaiting payment" },
  { key: "all", label: "All" },
] as const;

function ModerationQueue() {
  const { isAdmin, loading } = useRoles();
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingAgentListings);
  const modFn = useServerFn(moderateListing);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-queue", tab],
    enabled: isAdmin,
    queryFn: () => listFn({ data: { status: tab } }),
  });

  const mod = useMutation({
    mutationFn: (v: { id: string; action: "approve" | "reject"; reason?: string }) =>
      modFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.action === "approve" ? "Listing approved" : "Listing rejected");
      qc.invalidateQueries({ queryKey: ["admin-queue"] });
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      qc.invalidateQueries({ queryKey: ["published-properties"] });
      setRejectingId(null);
      setReason("");
    },
    onError: (e: any) => toast.error(e.message ?? "Action failed"),
  });

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="p-6">Admins only.</div>;

  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary-soft rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Moderation queue
          </div>
          <h1 className="text-2xl font-bold mt-2">Approve or reject agent listings</h1>
          <p className="text-sm text-muted-foreground">
            Quota is enforced automatically — approving a listing beyond an agent's plan quota will be blocked.
          </p>
        </div>
      </header>

      <div className="flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-primary" />
          <h3 className="font-semibold mt-2">All caught up</h3>
          <p className="text-sm text-muted-foreground mt-1">No listings in this queue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex flex-wrap gap-4 p-4">
                <img
                  src={p.images?.[0] ?? "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200"}
                  alt=""
                  className="h-24 w-32 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <span className="rounded-full bg-muted text-xs px-2 py-0.5">{p.category}</span>
                    <span className="rounded-full bg-muted text-xs px-2 py-0.5">{p.property_type}</span>
                    <span className="rounded-full bg-primary-soft text-xs px-2 py-0.5 text-primary font-semibold uppercase">
                      {p.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.area ? `${p.area}, ` : ""}{p.town}, {p.county} · Submitted {new Date(p.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm font-bold text-primary mt-1">
                    {formatKsh(Number(p.price))}{p.price_suffix ?? ""}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>

                  {p.owner && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2.5 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {p.owner.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                        {p.owner.full_name ?? "Unnamed"}
                        {p.owner.company_name && <span className="font-normal text-muted-foreground">· {p.owner.company_name}</span>}
                      </div>
                      {p.owner.tier && (
                        <span className="inline-flex items-center gap-1 text-primary font-semibold">
                          <Sparkles className="h-3 w-3" /> {p.owner.tier}
                        </span>
                      )}
                      <span className={p.owner.at_quota ? "text-secondary font-semibold" : ""}>
                        Quota: {p.owner.published_count}/{p.owner.quota || "∞"}
                        {p.owner.at_quota && (
                          <span className="ml-1 inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> at limit
                          </span>
                        )}
                      </span>
                      {p.owner.phone && <span className="text-muted-foreground">{p.owner.phone}</span>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    to="/properties/$id"
                    params={{ id: p.slug ?? p.id }}
                    target="_blank"
                    className="btn-ghost text-xs !py-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Preview
                  </Link>
                  <button
                    onClick={() => mod.mutate({ id: p.id, action: "approve" })}
                    disabled={mod.isPending || p.owner?.at_quota}
                    title={p.owner?.at_quota ? "Owner has reached their quota" : "Approve"}
                    className="btn-primary btn-primary-hover text-xs !py-1.5 disabled:opacity-50"
                  >
                    {mod.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve
                  </button>
                  <button
                    onClick={() => setRejectingId(rejectingId === p.id ? null : p.id)}
                    className="btn-ghost text-xs !py-1.5 text-destructive"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>

              {rejectingId === p.id && (
                <div className="border-t border-border bg-muted/30 p-4 space-y-2">
                  <label className="text-xs font-semibold">Reason (sent to agent)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="e.g. Photos are low quality, please re-upload."
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setRejectingId(null)} className="btn-ghost text-xs">Cancel</button>
                    <button
                      onClick={() => mod.mutate({ id: p.id, action: "reject", reason: reason || undefined })}
                      disabled={mod.isPending}
                      className="btn-primary btn-primary-hover text-xs bg-destructive"
                    >
                      Confirm reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
