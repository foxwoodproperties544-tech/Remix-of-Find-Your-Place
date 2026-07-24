import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { renderMarkdown } from "@/lib/markdown";
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Heading2, Heading3, Quote, Table, Youtube, Loader2, Eye, PencilLine } from "lucide-react";

type Props = {
  initial: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    tags: string;
    cover_image: string;
    seo_title: string;
    seo_description: string;
    reading_minutes: number;
  };
  onChange: (v: Props["initial"]) => void;
};

const CATEGORIES = ["guides", "market-updates", "investment", "lifestyle", "legal", "news"];

function insertAt(text: string, sel: [number, number], before: string, after = "", placeholder = "") {
  const [s, e] = sel;
  const selected = text.slice(s, e) || placeholder;
  return {
    text: text.slice(0, s) + before + selected + after + text.slice(e),
    cursor: s + before.length + selected.length + after.length,
  };
}

export function BlogEditor({ initial, onChange }: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const html = useMemo(() => (tab === "preview" ? renderMarkdown(initial.content || "*Nothing to preview yet.*") : ""), [tab, initial.content]);

  function set<K extends keyof Props["initial"]>(k: K, v: Props["initial"][K]) {
    onChange({ ...initial, [k]: v });
  }

  function wrap(before: string, after = "", placeholder = "") {
    const ta = document.getElementById("blog-content") as HTMLTextAreaElement | null;
    if (!ta) return;
    const res = insertAt(initial.content, [ta.selectionStart, ta.selectionEnd], before, after, placeholder);
    set("content", res.text);
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = res.cursor; });
  }

  async function uploadImage(file: File, into: "content" | "cover") {
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    const setLoad = into === "cover" ? setUploadingCover : setUploading;
    setLoad(true);
    try {
      const path = `posts/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("blog-images").getPublicUrl(path);
      const url = pub.publicUrl;
      if (into === "cover") set("cover_image", url);
      else wrap(`![alt text](${url})`, "", "");
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message ?? "Upload failed"); }
    finally { setLoad(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold">Title</label>
          <input
            value={initial.title} onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. 10 things to know before buying land in Kiambu"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-lg font-semibold"
          />
        </div>

        <div>
          <label className="text-xs font-semibold">Excerpt</label>
          <textarea
            value={initial.excerpt} onChange={(e) => set("excerpt", e.target.value)}
            rows={2} maxLength={400}
            placeholder="One or two sentence summary shown in listings and social shares."
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-2 py-1">
            <div className="flex items-center gap-1 flex-wrap">
              <ToolbarBtn onClick={() => wrap("**", "**", "bold")} icon={Bold} label="Bold" />
              <ToolbarBtn onClick={() => wrap("*", "*", "italic")} icon={Italic} label="Italic" />
              <ToolbarBtn onClick={() => wrap("\n## ", "", "Heading")} icon={Heading2} label="H2" />
              <ToolbarBtn onClick={() => wrap("\n### ", "", "Heading")} icon={Heading3} label="H3" />
              <ToolbarBtn onClick={() => wrap("\n- ", "", "list item")} icon={List} label="Bullets" />
              <ToolbarBtn onClick={() => wrap("\n1. ", "", "list item")} icon={ListOrdered} label="Numbered" />
              <ToolbarBtn onClick={() => wrap("\n> ", "", "quote")} icon={Quote} label="Quote" />
              <ToolbarBtn
                onClick={() => {
                  const url = prompt("Link URL"); if (!url) return;
                  wrap("[", `](${url})`, "link text");
                }}
                icon={LinkIcon} label="Link"
              />
              <ToolbarBtn
                onClick={() => wrap("\n| Col A | Col B |\n| --- | --- |\n| Cell | Cell |\n")}
                icon={Table} label="Table"
              />
              <ToolbarBtn
                onClick={() => {
                  const url = prompt("YouTube URL"); if (!url) return;
                  wrap(`\n\n@[youtube](${url})\n\n`);
                }}
                icon={Youtube} label="YouTube"
              />
              <label className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                Image
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "content"); e.currentTarget.value = ""; }} />
              </label>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setTab("write")}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${tab === "write" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <PencilLine className="h-3.5 w-3.5" /> Write
              </button>
              <button type="button" id="blog-preview-tab" onClick={() => setTab("preview")}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${tab === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
            </div>
          </div>

          {tab === "write" ? (
            <textarea
              id="blog-content" value={initial.content} onChange={(e) => set("content", e.target.value)}
              rows={22} placeholder="Write your article in Markdown. Use the toolbar above for formatting."
              className="w-full bg-background px-4 py-3 text-sm font-mono focus:outline-none resize-y"
            />
          ) : (
            <div className="prose prose-sm max-w-none px-5 py-4 bg-background min-h-[400px]"
              dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <label className="text-xs font-semibold">Featured image</label>
          {initial.cover_image ? (
            <div className="mt-2 relative">
              <img src={initial.cover_image} alt="Cover" className="w-full h-40 object-cover rounded-lg" />
              <button onClick={() => set("cover_image", "")}
                className="absolute top-2 right-2 rounded-full bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5">Remove</button>
            </div>
          ) : (
            <label className="mt-2 flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted/50">
              {uploadingCover ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
              <span className="mt-2 text-xs text-muted-foreground">Click to upload</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "cover"); e.currentTarget.value = ""; }} />
            </label>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold">Category</label>
            <select value={initial.category} onChange={(e) => set("category", e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold">Tags (comma separated)</label>
            <input value={initial.tags} onChange={(e) => set("tags", e.target.value)}
              placeholder="kenya, land, kiambu"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold">Reading minutes</label>
            <input type="number" min={1} max={120} value={initial.reading_minutes}
              onChange={(e) => set("reading_minutes", Number(e.target.value))}
              className="mt-1 w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SEO</div>
          <div>
            <label className="text-xs font-semibold">URL slug</label>
            <input value={initial.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="auto from title" maxLength={120}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs font-semibold">SEO title</label>
            <input value={initial.seo_title} onChange={(e) => set("seo_title", e.target.value)}
              maxLength={120} placeholder="Overrides the title in search results"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold">Meta description</label>
            <textarea value={initial.seo_description} onChange={(e) => set("seo_description", e.target.value)}
              rows={3} maxLength={300}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
      </aside>
    </div>
  );
}

function ToolbarBtn({ onClick, icon: Icon, label }: { onClick: () => void; icon: any; label: string }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted">
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
