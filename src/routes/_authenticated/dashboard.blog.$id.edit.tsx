import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyBlogPost, saveBlogDraft } from "@/lib/blog-submission.functions";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, Save, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/blog/$id/edit")({
  component: EditBlogPost,
  head: () => ({ meta: [{ title: "Edit blog post — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

function EditBlogPost() {
  const { id } = useParams({ from: "/_authenticated/dashboard/blog/$id/edit" });
  const nav = useNavigate();
  const load = useServerFn(getMyBlogPost);
  const save = useServerFn(saveBlogDraft);
  const [state, setState] = useState<any>(null);
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);

  const { data: post } = useQuery({
    queryKey: ["my-blog-post", id],
    queryFn: () => load({ data: { id } }),
  });

  useEffect(() => {
    if (post && !state) {
      setState({
        title: post.title ?? "",
        slug: post.slug ?? "",
        excerpt: post.excerpt ?? "",
        content: post.content ?? "",
        category: post.category ?? "guides",
        tags: (post.tags ?? []).join(", "),
        cover_image: post.cover_image ?? "",
        seo_title: post.seo_title ?? "",
        seo_description: post.seo_description ?? "",
        reading_minutes: post.reading_minutes ?? 5,
      });
    }
  }, [post, state]);

  async function persist(next: "save" | "submit") {
    if (!state) return;
    setBusy(next);
    try {
      const res: any = await save({
        data: {
          id, title: state.title, slug: state.slug || undefined, excerpt: state.excerpt || undefined,
          content: state.content, category: state.category,
          tags: state.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
          cover_image: state.cover_image || undefined,
          seo_title: state.seo_title || undefined, seo_description: state.seo_description || undefined,
          reading_minutes: state.reading_minutes,
        },
      });
      toast.success("Saved");
      if (next === "submit") nav({ to: "/dashboard/blog/$id/pay", params: { id: res.id } });
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setBusy(null); }
  }

  if (!state) return <DashboardShell><div className="text-sm text-muted-foreground">Loading…</div></DashboardShell>;

  const readOnly = post && !["draft", "changes_requested", "rejected"].includes(post.status);

  return (
    <DashboardShell>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Edit blog post</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {readOnly ? "This post is locked (already submitted or published)." : "Update your draft, then choose a package to submit."}
          </p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button onClick={() => persist("save")} disabled={!!busy}
              className="btn-ghost inline-flex items-center gap-2 text-sm">
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
            <button onClick={() => persist("submit")} disabled={!!busy}
              className="btn-primary btn-primary-hover inline-flex items-center gap-2 text-sm">
              {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Save & choose package
            </button>
          </div>
        )}
      </div>

      {post?.admin_notes && ["changes_requested", "rejected"].includes(post.status) && (
        <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
          <strong>Admin note:</strong> {post.admin_notes}
        </div>
      )}

      <div className="mt-6 pointer-events-auto">
        <fieldset disabled={!!readOnly} className={readOnly ? "opacity-70 pointer-events-none" : ""}>
          <BlogEditor initial={state} onChange={setState} />
        </fieldset>
      </div>
    </DashboardShell>
  );
}
