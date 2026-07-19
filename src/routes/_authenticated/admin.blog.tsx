import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { slugify, isValidSlug, ensureUniqueBlogSlug } from "@/lib/slug";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, ExternalLink, Plus, Pencil, Trash2, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  component: AdminBlog,
  head: () => ({ meta: [{ title: "Blog Admin — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

type PostRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  category: string;
  published_at: string | null;
  updated_at: string;
};

function AdminBlog() {
  const { user } = useAuth();
  const { isAdmin, loading } = useRoles();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, status, category, published_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as PostRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <div className="container-page py-16">Loading…</div>;
  if (!isAdmin) return <div className="container-page py-16">You need admin access to manage blog posts.</div>;

  if (editingId) {
    return (
      <div className="container-page py-8">
        <button onClick={() => setEditingId(null)} className="btn-ghost inline-flex mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to posts
        </button>
        <PostEditor
          postId={editingId === "new" ? null : editingId}
          userId={user?.id ?? ""}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
            setEditingId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Blog Admin</h1>
          <p className="text-muted-foreground">Create, edit, and manage blog posts. Slugs are validated and made unique automatically.</p>
        </div>
        <button onClick={() => setEditingId("new")} className="btn-primary btn-primary-hover inline-flex">
          <Plus className="h-4 w-4" /> New post
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="p-6 text-muted-foreground">Loading posts…</div>
        ) : (posts ?? []).length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No posts yet. Create your first one.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Status</th>
                <th className="p-3">Updated</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(posts ?? []).map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-medium">{p.title}</td>
                  <td className="p-3">
                    <code className="text-xs bg-muted rounded px-1.5 py-0.5">{p.slug}</code>
                  </td>
                  <td className="p-3">
                    <span className={
                      "rounded-full px-2 py-0.5 text-xs font-semibold " +
                      (p.status === "published"
                        ? "bg-emerald-100 text-emerald-700"
                        : p.status === "draft"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground")
                    }>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right space-x-2 whitespace-nowrap">
                    <Link to="/blog/$slug" params={{ slug: p.slug }} className="btn-ghost inline-flex">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <button onClick={() => setEditingId(p.id)} className="btn-ghost inline-flex" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm("Delete this post?")) del.mutate(p.id); }}
                      className="btn-ghost inline-flex text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PostEditor({ postId, userId, onSaved }: { postId: string | null; userId: string; onSaved: () => void }) {
  const isNew = postId === null;
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("guides");
  const [tags, setTags] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  // Load existing
  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("id", postId).maybeSingle();
      if (error) { toast.error(error.message); return; }
      if (!data) return;
      setTitle(data.title ?? "");
      setSlug(data.slug ?? "");
      setSlugTouched(true);
      setExcerpt(data.excerpt ?? "");
      setContent(data.content ?? "");
      setCategory(data.category ?? "guides");
      setTags((data.tags ?? []).join(", "));
      setCoverImage(data.cover_image ?? "");
      setStatus((data.status as "draft" | "published") ?? "draft");
    })();
  }, [postId]);

  // Auto-generate slug from title until user edits it
  useEffect(() => {
    if (slugTouched) return;
    if (!title) return;
    setSlug(slugify(title));
  }, [title, slugTouched]);

  const slugValid = useMemo(() => isValidSlug(slug), [slug]);

  // Availability check (debounced)
  useEffect(() => {
    if (!slug || !slugValid) { setSlugAvailable(null); return; }
    setCheckingSlug(true);
    const handle = setTimeout(async () => {
      let q = supabase.from("blog_posts").select("id").eq("slug", slug).limit(1);
      if (postId) q = q.neq("id", postId);
      const { data } = await q;
      setSlugAvailable(!data || data.length === 0);
      setCheckingSlug(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [slug, slugValid, postId]);

  async function autoFix() {
    const unique = await ensureUniqueBlogSlug(slug || title, postId ?? undefined);
    setSlug(unique);
    setSlugTouched(true);
  }

  async function save() {
    if (!title.trim()) return toast.error("Title is required");
    if (!content.trim()) return toast.error("Content is required");
    setSaving(true);
    try {
      const finalSlug = await ensureUniqueBlogSlug(slug || title, postId ?? undefined);
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt.trim() || null,
        content,
        category,
        tags: tagList,
        cover_image: coverImage.trim() || null,
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
        author_id: userId,
      };

      if (isNew) {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
        toast.success(`Post created (/${finalSlug})`);
      } else {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", postId!);
        if (error) throw error;
        toast.success("Post updated");
      }
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-black">{isNew ? "New post" : "Edit post"}</h2>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background p-2.5"
            placeholder="How to buy your first plot in Kenya"
          />
        </label>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Slug (URL)</span>
            <button type="button" onClick={autoFix} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <Wand2 className="h-3 w-3" /> Auto-generate unique slug
            </button>
          </div>
          <div className="mt-1 flex items-stretch rounded-lg border border-border overflow-hidden bg-background">
            <span className="px-3 text-sm text-muted-foreground bg-muted grid place-items-center">/blog/</span>
            <input
              value={slug}
              onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
              onBlur={() => setSlug(slugify(slug))}
              className="flex-1 p-2.5 bg-transparent focus:outline-none"
              placeholder="my-post-slug"
            />
            <span className="px-3 grid place-items-center">
              {!slug ? null :
                !slugValid ? <XCircle className="h-4 w-4 text-destructive" /> :
                checkingSlug ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> :
                slugAvailable === false ? <XCircle className="h-4 w-4 text-destructive" /> :
                slugAvailable === true ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                null}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {!slug ? "A slug will be generated from the title." :
              !slugValid ? "Use lowercase letters, numbers and hyphens (3–96 chars)." :
              slugAvailable === false ? "This slug is taken — auto-generate will append a suffix on save." :
              slugAvailable === true ? "Slug is available." :
              "Checking availability…"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Category</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2.5" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Tags (comma-separated)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2.5" placeholder="airbnb, nairobi, investment" />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold">Cover image URL</span>
          <input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2.5" placeholder="https://…" />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Excerpt</span>
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border bg-background p-2.5" />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Content (Markdown)</span>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={16} className="mt-1 w-full rounded-lg border border-border bg-background p-2.5 font-mono text-sm" />
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={status === "published"} onChange={(e) => setStatus(e.target.checked ? "published" : "draft")} />
          <span className="text-sm font-semibold">Publish</span>
        </label>

        <div className="flex gap-3 pt-2">
          <button onClick={save} disabled={saving} className="btn-primary btn-primary-hover">
            {saving ? "Saving…" : isNew ? "Create post" : "Save changes"}
          </button>
          <button onClick={() => nav({ to: "/blog" })} className="btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}
