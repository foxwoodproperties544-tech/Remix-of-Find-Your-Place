import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: { full_name: string | null; avatar_url: string | null } | null;
};

export function ProfileReviews({ targetId }: { targetId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const q = useQuery({
    queryKey: ["reviews", "agent", targetId],
    queryFn: async () => {
      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("id, user_id, rating, comment, created_at")
        .eq("target_type", "agent")
        .eq("target_id", targetId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((reviews ?? []).map((r) => r.user_id)));
      let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("public_profiles").select("id, full_name, avatar_url").in("id", ids);
        (profs ?? []).forEach((p) => (profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url }));
      }
      return (reviews ?? []).map((r) => ({ ...r, reviewer: profilesMap[r.user_id] ?? null })) as Review[];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to leave a review");
      const { error } = await supabase.from("reviews").insert({
        target_type: "agent",
        target_id: targetId,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review posted");
      setComment("");
      setRating(5);
      qc.invalidateQueries({ queryKey: ["reviews", "agent", targetId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not post review"),
  });

  const reviews = q.data ?? [];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const canReview = !!user && user.id !== targetId;
  const alreadyReviewed = !!user && reviews.some((r) => r.user_id === user.id);

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={"h-4 w-4 " + (n <= Math.round(avg) ? "fill-secondary text-secondary" : "text-muted-foreground")} />
              ))}
            </div>
            <span className="font-semibold">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {canReview && !alreadyReviewed && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
          className="mt-4 rounded-2xl border border-border bg-card p-5"
        >
          <div className="text-sm font-semibold mb-2">Your rating</div>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={"h-6 w-6 transition " + (n <= rating ? "fill-secondary text-secondary" : "text-muted-foreground hover:text-secondary")} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience working with this agent…"
            rows={3}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm"
          />
          <button type="submit" disabled={submit.isPending} className="btn-primary btn-primary-hover mt-3">
            {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Post review
          </button>
        </form>
      )}

      {!user && (
        <p className="mt-4 text-sm text-muted-foreground">
          <a href="/auth" className="text-primary font-semibold hover:underline">Sign in</a> to leave a review.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No reviews yet. Be the first to share your experience.
          </div>
        ) : (
          reviews.map((r) => {
            const name = r.reviewer?.full_name ?? "Anonymous";
            const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  {r.reviewer?.avatar_url ? (
                    <img src={r.reviewer.avatar_url} alt={name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">{initials || "U"}</div>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}</div>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={"h-4 w-4 " + (n <= r.rating ? "fill-secondary text-secondary" : "text-muted-foreground")} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="mt-3 text-sm leading-relaxed">{r.comment}</p>}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
