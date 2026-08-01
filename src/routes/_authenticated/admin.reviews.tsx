import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { listReviewsForModeration, moderateReview } from "@/lib/reviews.functions";
import { Star, CheckCircle2, XCircle, Trash2, Loader2, ShieldCheck, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: ReviewQueue,
  head: () => ({
    meta: [{ title: "Review moderation — Admin" }, { name: "robots", content: "noindex" }],
  }),
});

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
] as const;

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-secondary text-secondary" : "text-muted-foreground/40"}`} />
      ))}
    </span>
  );
}

function ReviewQueue() {
  const { isAdmin, loading } = useRoles();
  const qc = useQueryClient();
  const listFn = useServerFn(listReviewsForModeration);
  const moderateFn = useServerFn(moderateReview);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", tab],
    enabled: isAdmin,
    queryFn: () => listFn({ data: { status: tab } }),
  });

  const act = useMutation({
    mutationFn: (v: { reviewId: string; action: "approve" | "reject" | "delete"; note?: string }) =>
      moderateFn({ data: v }),
    onSuccess: () => {
      toast.success("Review updated");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["reviews"] });
      setNoteFor(null);
      setNote("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) return <div className="p-6">Admins only.</div>;

  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-6">
      <header>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">
          <MessageSquare className="h-3.5 w-3.5" /> Reviews
        </div>
        <h1 className="text-2xl font-bold mt-2">Review moderation</h1>
        <p className="text-sm text-muted-foreground">
          New reviews stay hidden until approved here. Rejecting keeps the record but hides it from public pages.
        </p>
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
          <ShieldCheck className="h-8 w-8 mx-auto text-primary" />
          <h3 className="font-semibold mt-2">Nothing to moderate</h3>
          <p className="text-sm text-muted-foreground mt-1">No reviews in this view.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex flex-wrap gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Stars n={r.rating} />
                    <span className="text-sm font-semibold truncate">{r.author?.full_name ?? "Anonymous"}</span>
                    <span className="rounded-full bg-muted text-xs px-2 py-0.5 uppercase">{r.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    On{" "}
                    {r.target?.kind === "agent"
                      ? `agent ${r.target?.full_name ?? r.target_id}`
                      : `listing ${r.target?.title ?? r.target_id}`}{" "}
                    · {new Date(r.created_at).toLocaleString()}
                  </div>
                  {r.comment && (
                    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5 text-sm whitespace-pre-wrap">
                      {r.comment}
                    </div>
                  )}
                  {r.moderation_note && (
                    <p className="text-xs text-muted-foreground mt-2">Moderator note: {r.moderation_note}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {r.target?.kind === "agent" ? (
                    <Link to="/agents/$id" params={{ id: r.target_id }} target="_blank" className="btn-ghost text-xs !py-1.5">
                      <ExternalLink className="h-3.5 w-3.5" /> Agent
                    </Link>
                  ) : r.target?.slug || r.target?.id ? (
                    <Link
                      to="/properties/$id"
                      params={{ id: r.target?.slug ?? r.target_id }}
                      target="_blank"
                      className="btn-ghost text-xs !py-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Listing
                    </Link>
                  ) : null}
                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => act.mutate({ reviewId: r.id, action: "approve" })}
                        disabled={act.isPending}
                        className="btn-primary btn-primary-hover text-xs !py-1.5"
                      >
                        {act.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Approve
                      </button>
                      <button
                        onClick={() => setNoteFor(noteFor === r.id ? null : r.id)}
                        className="btn-ghost text-xs !py-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject…
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => confirm("Delete this review permanently?") && act.mutate({ reviewId: r.id, action: "delete" })}
                    disabled={act.isPending}
                    className="btn-ghost text-xs !py-1.5 text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>

              {noteFor === r.id && (
                <div className="border-t border-border bg-muted/30 p-4 space-y-2">
                  <label className="text-xs font-semibold">Why is this being rejected?</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    className="w-full rounded-lg border border-border bg-field px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="e.g. Abusive language / not a genuine customer."
                  />
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button onClick={() => setNoteFor(null)} className="btn-ghost text-xs">Cancel</button>
                    <button
                      onClick={() => act.mutate({ reviewId: r.id, action: "reject", note: note || undefined })}
                      disabled={act.isPending}
                      className="btn-primary btn-primary-hover text-xs bg-destructive"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject review
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
