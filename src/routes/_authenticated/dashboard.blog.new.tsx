import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { saveBlogDraft } from "@/lib/blog-submission.functions";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { toast } from "sonner";
import { Loader2, Save, Send, Eye, FileText } from "lucide-react";

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
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function doSave(silent = false): Promise<string | null> {
    if (state.title.trim().length < 3 || state.content.trim().length < 20) return null;
    if (silent) setAutoSaving(true);
    try {
      const res: any = await save({
        data: {
          ...(draftId ? { id: draftId } : {}),
          title: state.title, slug: state.slug || undefined, excerpt: state.excerpt || undefined,
          content: state.content, category: state.category,
          tags: state.tags.split(",").map((t) => t.trim()).filter(Boolean),
          cover_image: state.cover_image || undefined,
          seo_title: state.seo_title || undefined, seo_description: state.seo_description || undefined,
          reading_minutes: state.reading_minutes,
        },
      });
      if (res?.id) setDraftId(res.id);
      setLastSavedAt(new Date());
      return res?.id ?? null;
    } catch (e: any) {
      if (!silent) toast.error(e.message ?? "Save failed");
      return null;
    } finally {
      if (silent) setAutoSaving(false);
    }
  }

  // Autosave (debounced 2s after edits)
  useEffect(() => {
    if (state.title.trim().length < 3 || state.content.trim().length < 20) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void doSave(true); }, 2000);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function persist(next: "save" | "submit") {
    if (state.title.trim().length < 3) return toast.error("Title is too short");
    if (state.content.trim().length < 20) return toast.error("Add more content before saving");
    setBusy(next);
    const id = await doSave(false);
    setBusy(null);
    if (!id) return;
    if (next === "save") { toast.success("Draft saved"); nav({ to: "/dashboard/blog/$id/edit", params: { id } }); }
    else { toast.success("Ready — choose a package to publish"); nav({ to: "/dashboard/blog/$id/pay", params: { id } }); }
  }

  const savedLabel = autoSaving
    ? "Autosaving…"
    : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : "Not saved yet";

  return (
    <DashboardShell>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">Write a blog</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-semibold">
              <FileText className="h-3 w-3" /> Draft
            </span>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              {autoSaving && <Loader2 className="h-3 w-3 animate-spin" />} {savedLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Draft autosaves as you type. Preview inside the editor, then publish by choosing a package.</p>
        </div>
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
      </div>

      <div className="mt-6">
        <BlogEditor initial={state} onChange={setState} />
      </div>
    </DashboardShell>
  );
}
