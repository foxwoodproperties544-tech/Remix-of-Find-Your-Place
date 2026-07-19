import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listComments, postComment, toggleCommentLike, reportComment, type BlogComment } from "@/lib/blog";
import { Heart, Flag, MessageSquare, Reply } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function BlogComments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setUser(data.user ? { id: data.user.id, email: data.user.email } : null);
      const c = await listComments(postId);
      if (!cancelled) { setComments(c); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [postId]);

  const tree = useMemo(() => {
    const byParent = new Map<string | null, BlogComment[]>();
    for (const c of comments) {
      const arr = byParent.get(c.parent_id) ?? [];
      arr.push(c); byParent.set(c.parent_id, arr);
    }
    return byParent;
  }, [comments]);

  const submit = async () => {
    if (!user) return;
    if (body.trim().length < 2) { setNotice("Comment is too short."); return; }
    setSubmitting(true); setNotice("");
    const res = await postComment({ postId, parentId, body: body.trim(), authorName: name.trim() });
    setSubmitting(false);
    if (!res.ok) { setNotice(res.error ?? "Could not post comment."); return; }
    setBody(""); setParentId(null);
    setNotice("Thanks — your comment is pending review and will appear once approved.");
  };

  const onLike = async (id: string) => {
    if (!user) return;
    const liked = await toggleCommentLike(id);
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, like_count: c.like_count + (liked ? 1 : -1) } : c));
  };
  const onReport = async (id: string) => {
    if (!user) return;
    const reason = window.prompt("Why is this comment inappropriate?") ?? "";
    if (!reason.trim()) return;
    const ok = await reportComment(id, reason.trim());
    setNotice(ok ? "Reported. Thank you." : "Could not report. Please try again.");
  };

  const renderNode = (c: BlogComment, depth = 0): JSX.Element => (
    <li key={c.id} className={depth > 0 ? "ml-6 pl-4 border-l border-border" : ""}>
      <article className="rounded-xl border border-border bg-card p-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary font-bold">
              {(c.author_name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{c.author_name}</div>
              <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}</div>
            </div>
          </div>
        </header>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
        <div className="mt-3 flex items-center gap-3 text-xs">
          <button type="button" onClick={() => onLike(c.id)} disabled={!user}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary disabled:opacity-50">
            <Heart className="h-3.5 w-3.5" /> {c.like_count}
          </button>
          <button type="button" onClick={() => { setParentId(c.id); document.getElementById("comment-form")?.scrollIntoView({ behavior: "smooth" }); }}
            disabled={!user} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary disabled:opacity-50">
            <Reply className="h-3.5 w-3.5" /> Reply
          </button>
          <button type="button" onClick={() => onReport(c.id)} disabled={!user}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-secondary disabled:opacity-50 ml-auto">
            <Flag className="h-3.5 w-3.5" /> Report
          </button>
        </div>
      </article>
      {(tree.get(c.id) ?? []).length > 0 && (
        <ul className="mt-3 space-y-3">
          {(tree.get(c.id) ?? []).map((child) => renderNode(child, depth + 1))}
        </ul>
      )}
    </li>
  );

  const roots = tree.get(null) ?? [];

  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-12 border-t border-border pt-10">
      <h2 id="comments-heading" className="flex items-center gap-2 text-2xl font-bold">
        <MessageSquare className="h-5 w-5 text-primary" /> Discussion ({comments.length})
      </h2>

      <div id="comment-form" className="mt-6 rounded-2xl border border-border bg-card p-5">
        {user ? (
          <>
            <div className="mb-2 text-sm font-semibold">
              {parentId ? (
                <span>Replying to a comment · <button type="button" onClick={() => setParentId(null)} className="text-primary underline">cancel</button></span>
              ) : "Leave a comment"}
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
              placeholder="Your display name (optional)"
              className="w-full mb-2 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={4}
              placeholder="Share your thoughts…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Comments are moderated before publishing.</span>
              <button type="button" onClick={submit} disabled={submitting}
                className="btn-primary btn-primary-hover inline-flex disabled:opacity-60">
                {submitting ? "Posting…" : "Post comment"}
              </button>
            </div>
            {notice && <p className="mt-3 text-sm text-primary">{notice}</p>}
          </>
        ) : (
          <div className="text-sm">
            <Link to="/auth" className="text-primary font-semibold underline">Sign in</Link> to join the discussion, like comments, and reply.
          </div>
        )}
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comments…</p>
        ) : roots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Be the first to comment.</p>
        ) : (
          <ul className="space-y-4">{roots.map((c) => renderNode(c))}</ul>
        )}
      </div>
    </section>
  );
}
