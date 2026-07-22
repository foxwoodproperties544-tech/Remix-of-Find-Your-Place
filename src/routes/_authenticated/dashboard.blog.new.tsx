import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { saveBlogDraft } from "@/lib/blog-submission.functions";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, Save, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/blog/new")({
  component: NewBlogPost,
  head: () => ({ meta: [{ title: "Write a blog — Foxwood Properties" }, { name: "robots", content: "noindex" }] }),
});

const EMPTY = {
  title: "", slug: "", excerpt: "", content: "", category: "guides",
  tags: "", cover_image: "", seo_title: "", seo_description: "", reading_minutes: 5,
};

function NewBlogPost() {
  const nav = useNavigate();
  const save = useServerFn(saveBlogDraft);
  const [state, setState] = useState(EMPTY);
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);

  async function persist(next: "save" | "submit") {
    if (state.title.trim().length < 3) return toast.error("Title is too short");
    if (state.content.trim().length < 20) return toast.error("Add more content before saving");
    setBusy(next);
    try {
      const res: any = await save({
        data: {
          title: state.title, slug: state.slug || undefined, excerpt: state.excerpt || undefined,
          content: state.content, category: state.category,
          tags: state.tags.split(",").map((t) => t.trim()).filter(Boolean),
          cover_image: state.cover_image || undefined,
          seo_title: state.seo_title || undefined, seo_description: state.seo_description || undefined,
          reading_minutes: state.reading_minutes,
        },
      });
      toast.success(next === "save" ? "Draft saved" : "Ready — choose a package to submit");
      if (next === "submit") nav({ to: "/dashboard/blog/$id/pay", params: { id: res.id } });
      else nav({ to: "/dashboard/blog/$id/edit", params: { id: res.id } });
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setBusy(null); }
  }

  return (
    <DashboardShell>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Write a blog</h1>
          <p className="text-sm text-muted-foreground mt-1">Draft, preview, then choose a package to submit for review.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => persist("save")} disabled={!!busy}
            className="btn-ghost inline-flex items-center gap-2 text-sm">
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
          </button>
          <button onClick={() => persist("submit")} disabled={!!busy}
            className="btn-primary btn-primary-hover inline-flex items-center gap-2 text-sm">
            {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Save & choose package
          </button>
        </div>
      </div>

      <div className="mt-6">
        <BlogEditor initial={state} onChange={setState} />
      </div>
    </DashboardShell>
  );
}
