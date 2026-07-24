import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyBlogPost, saveBlogDraft } from "@/lib/blog-submission.functions";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, Save, Send, Eye, FileText, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/blog/$id/edit")({
  component: EditBlogPost,
  head: () => ({ meta: [{ title: "Edit blog post — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

const STATUS_META: Record<string, { label: string; icon: any; className: string }> = {
  draft: { label: "Draft", icon: FileText, className: "bg-muted text-muted-foreground" },
  pending_payment: { label: "Pending payment", icon: Clock, className: "bg-amber-100 text-amber-800" },
  pending_review: { label: "Pending review", icon: Clock, className: "bg-blue-100 text-blue-800" },
  changes_requested: { label: "Changes requested", icon: Clock, className: "bg-orange-100 text-orange-800" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800" },
  published: { label: "Published", icon: CheckCircle2, className: "bg-primary/10 text-primary" },
  rejected: { label: "Rejected", icon: Clock, className: "bg-red-100 text-red-700" },
};

function EditBlogPost() {
  const { id } = useParams({ from: "/_authenticated/dashboard/blog/$id/edit" });
  const nav = useNavigate();
  const load = useServerFn(getMyBlogPost);
  const save = useServerFn(saveBlogDraft);
  const [state, setState] = useState<any>(null);
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

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

  const readOnly = post && !["draft", "changes_requested", "rejected"].includes(post.status);

  async function doSave(silent: boolean): Promise<string | null> {
    if (!state || readOnly) return null;
    if (silent) setAutoSaving(true);
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
      setLastSavedAt(new Date());
      dirty.current = false;
      return res?.id ?? id;
    } catch (e: any) {
      if (!silent) toast.error(e.message ?? "Save failed");
      return null;
    } finally {
      if (silent) setAutoSaving(false);
    }
  }

  // Autosave debounced
  useEffect(() => {
    if (!state || readOnly) return;
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void doSave(true); }, 2000);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function persist(next: "save" | "submit") {
    if (!state) return;
    setBusy(next);
    const savedId = await doSave(false);
    setBusy(null);
    if (!savedId) return;
    if (next === "save") toast.success("Draft saved");
    else nav({ to: "/dashboard/blog/$id/pay", params: { id: savedId } });
  }

  if (!state) return <DashboardShell><div className="text-sm text-muted-foreground">Loading…</div></DashboardShell>;

  const meta = STATUS_META[post?.status ?? "draft"] ?? STATUS_META.draft;
  const StatusIcon = meta.icon;
  const savedLabel = autoSaving ? "Autosaving…" : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : "All changes saved";

  return (
    <DashboardShell>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">Edit blog post</h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
              <StatusIcon className="h-3 w-3" /> {meta.label}
            </span>
            {!readOnly && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                {autoSaving && <Loader2 className="h-3 w-3 animate-spin" />} {savedLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {readOnly ? "This post is locked (already submitted or published)." : "Autosaves as you type. Preview inside the editor, then publish by choosing a package."}
          </p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <a href="#preview" onClick={(e) => { e.preventDefault(); document.getElementById("blog-preview-tab")?.click(); }}
              className="btn-ghost inline-flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4" /> Preview
            </a>
            <button onClick={() => persist("save")} disabled={!!busy}
              className="btn-ghost inline-flex items-center gap-2 text-sm">
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
            </button>
            <button onClick={() => persist("submit")} disabled={!!busy}
              className="btn-primary btn-primary-hover inline-flex items-center gap-2 text-sm">
              {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
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
