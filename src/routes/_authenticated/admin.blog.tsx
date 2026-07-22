import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListBlogSubmissions, adminGetBlogPost,
  adminApproveBlogPost, adminRejectBlogPost, adminRequestBlogRevisions,
  adminArchiveBlogPost, adminDeleteBlogPost, adminEditBlogPost,
  adminBlogStats,
} from "@/lib/blog-submission.functions";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useRoles } from "@/hooks/use-role";
import { toast } from "sonner";
import { renderMarkdown } from "@/lib/markdown";
import {
  Loader2, ExternalLink, CheckCircle2, XCircle, AlertTriangle, Archive, Trash2,
  Pencil, ArrowLeft, FileText, Clock, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  component: AdminBlog,
  head: () => ({ meta: [{ title: "Blog submissions — Foxwood Admin" }, { name: "robots", content: "noindex" }] }),
});

const TABS: { key: any; label: string }[] = [
  { key: "pending_review", label: "Pending review" },
  { key: "changes_requested", label: "Changes requested" },
  { key: "pending_payment", label: "Pending payment" },
  { key: "published", label: "Published" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
];

function AdminBlog() {
  const { isAdmin, loading } = useRoles();
  const qc = useQueryClient();
  const [tab, setTab] = useState<any>("pending_review");
  const [openId, setOpenId] = useState<string | null>(null);

  const listFn = useServerFn(adminListBlogSubmissions);
  const statsFn = useServerFn(adminBlogStats);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-blog-subs", tab],
    enabled: isAdmin,
    queryFn: () => listFn({ data: { status: tab } }),
  });
  const { data: stats } = useQuery({ queryKey: ["admin-blog-stats"], enabled: isAdmin, queryFn: () => statsFn() });

  if (loading) return <DashboardShell><div>Loading…</div></DashboardShell>;
  if (!isAdmin) return <DashboardShell><div className="text-sm text-destructive">Admins only.</div></DashboardShell>;

  if (openId) return <AdminBlogDetail id={openId} onBack={() => { setOpenId(null); qc.invalidateQueries({ queryKey: ["admin-blog-subs"] }); qc.invalidateQueries({ queryKey: ["admin-blog-stats"] }); }} />;

  return (
    <DashboardShell>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Blog submissions</h1>
          <p className="text-sm text-muted-foreground">Review, approve, reject, or request revisions.</p>
        </div>
        <Link to="/admin/blog-packages" className="btn-ghost text-sm">Manage packages</Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <StatCard label="Pending review" icon={Clock} value={stats?.pending ?? 0} />
        <StatCard label="Published" icon={CheckCircle2} value={stats?.published ?? 0} />
        <StatCard label="Total posts" icon={FileText} value={stats?.total ?? 0} />
        <StatCard label="Revenue (KSh)" icon={TrendingUp} value={Math.round(stats?.revenue ?? 0).toLocaleString()} />
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : !rows?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Nothing here.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((p: any) => (
              <button key={p.id} onClick={() => setOpenId(p.id)}
                className="w-full text-left p-4 md:p-5 hover:bg-muted/40 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">{p.status}</span>
                    {p.blog_packages?.name && <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold">{p.blog_packages.name}</span>}
                    <span className="text-muted-foreground">{p.category}</span>
                  </div>
                  <div className="mt-1 font-semibold truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Submitted {p.submitted_at ? new Date(p.submitted_at).toLocaleString() : "—"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Review →</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: any; icon: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function AdminBlogDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetBlogPost);
  const approve = useServerFn(adminApproveBlogPost);
  const reject = useServerFn(adminRejectBlogPost);
  const revise = useServerFn(adminRequestBlogRevisions);
  const archive = useServerFn(adminArchiveBlogPost);
  const del = useServerFn(adminDeleteBlogPost);
  const edit = useServerFn(adminEditBlogPost);

  const [notes, setNotes] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<any | null>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: ["admin-blog-post", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const run = async (fn: () => Promise<any>, msg: string) => {
    try { await fn(); toast.success(msg); qc.invalidateQueries({ queryKey: ["admin-blog-post", id] }); onBack(); }
    catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  const saveEdit = useMutation({
    mutationFn: async () => edit({ data: { id, patch: {
      title: draft.title, excerpt: draft.excerpt || null, content: draft.content,
      category: draft.category, tags: draft.tags, cover_image: draft.cover_image || null,
      seo_title: draft.seo_title || null, seo_description: draft.seo_description || null,
      is_sponsored: !!draft.is_sponsored,
    }}}),
    onSuccess: () => { toast.success("Post updated"); setEditMode(false); qc.invalidateQueries({ queryKey: ["admin-blog-post", id] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (isLoading || !post) return <DashboardShell><div className="text-sm text-muted-foreground">Loading…</div></DashboardShell>;

  return (
    <DashboardShell>
      <button onClick={onBack} className="btn-ghost inline-flex items-center gap-2 text-sm mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to list
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">{post.status}</span>
            {post.blog_packages?.name && <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold">{post.blog_packages.name}</span>}
          </div>
          {editMode ? (
            <div className="mt-3 space-y-3">
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xl font-bold" />
              <textarea value={draft.excerpt ?? ""} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                rows={2} placeholder="Excerpt" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                rows={20} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
              <div className="flex gap-2">
                <button onClick={() => setEditMode(false)} className="btn-ghost text-sm">Cancel</button>
                <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending}
                  className="btn-primary btn-primary-hover text-sm inline-flex items-center gap-2">
                  {saveEdit.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-bold">{post.title}</h1>
              {post.excerpt && <p className="mt-2 text-muted-foreground">{post.excerpt}</p>}
              {post.cover_image && <img src={post.cover_image} alt="Cover" className="mt-4 w-full rounded-xl border border-border" />}
              <div className="prose prose-sm max-w-none mt-6"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content || "") }} />
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} placeholder="Admin notes (required for reject/revise)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <button onClick={() => run(() => approve({ data: { id, notes: notes || undefined } }), "Approved & published")}
              className="w-full btn-primary btn-primary-hover text-sm inline-flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Approve & publish
            </button>
            <button onClick={() => { if (notes.length < 3) return toast.error("Add a note"); run(() => revise({ data: { id, notes } }), "Revisions requested"); }}
              className="w-full btn-ghost text-sm inline-flex items-center justify-center gap-2 border border-border">
              <AlertTriangle className="h-4 w-4" /> Request revisions
            </button>
            <button onClick={() => { if (notes.length < 3) return toast.error("Add a note"); run(() => reject({ data: { id, notes } }), "Rejected"); }}
              className="w-full text-sm inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 font-semibold">
              <XCircle className="h-4 w-4" /> Reject
            </button>
            <div className="pt-3 border-t border-border grid grid-cols-2 gap-2">
              <button onClick={() => { setDraft({ ...post, tags: post.tags ?? [] }); setEditMode(true); }}
                className="btn-ghost text-xs inline-flex items-center justify-center gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={() => run(() => archive({ data: { id } }), "Archived")}
                className="btn-ghost text-xs inline-flex items-center justify-center gap-1">
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
              {post.status === "published" && (
                <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer"
                  className="btn-ghost text-xs inline-flex items-center justify-center gap-1 col-span-2">
                  <ExternalLink className="h-3.5 w-3.5" /> View live
                </a>
              )}
              <button onClick={() => { if (!confirm("Delete this post permanently?")) return; run(() => del({ data: { id } }), "Deleted"); }}
                className="col-span-2 text-xs inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 font-semibold">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-1">
            <div><strong>Slug:</strong> {post.slug}</div>
            <div><strong>Category:</strong> {post.category}</div>
            <div><strong>Reading:</strong> {post.reading_minutes} min</div>
            {post.submitted_at && <div><strong>Submitted:</strong> {new Date(post.submitted_at).toLocaleString()}</div>}
            {post.expires_at && <div><strong>Expires:</strong> {new Date(post.expires_at).toLocaleString()}</div>}
            {post.admin_notes && <div><strong>Previous note:</strong> {post.admin_notes}</div>}
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
