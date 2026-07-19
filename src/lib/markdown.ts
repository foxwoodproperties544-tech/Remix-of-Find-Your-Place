// Extended markdown renderer for Foxwood blog.
// Supports: # ## ### #### headings (with auto id anchors), paragraphs,
// unordered/ordered lists, **bold**, *italic*, `code`, [links](url),
// --- hr, > blockquote, >> pull quote, images ![alt|caption](url),
// GFM tables (| a | b |), callouts (:::tip / :::warning / :::note),
// YouTube embeds [youtube:VIDEO_ID], PDF attachments [pdf:url|Label].
// Escapes HTML first to prevent XSS.

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

export interface HeadingItem { id: string; text: string; level: number }

export function extractHeadings(md: string): HeadingItem[] {
  const out: HeadingItem[] = [];
  const seen = new Map<string, number>();
  for (const line of md.replace(/\r\n/g, "\n").split("\n")) {
    const m = /^(#{2,3})\s+(.*)$/.exec(line);
    if (!m) continue;
    const text = m[2].trim();
    let id = slugify(text);
    const n = seen.get(id) ?? 0;
    if (n > 0) id = `${id}-${n}`;
    seen.set(slugify(text), n + 1);
    out.push({ id, text, level: m[1].length });
  }
  return out;
}

function inline(s: string): string {
  let out = esc(s);
  // YouTube: [youtube:VIDEOID]
  out = out.replace(/\[youtube:([\w-]{6,20})\]/g, (_m, id) =>
    `<span class="my-4 block aspect-video w-full overflow-hidden rounded-xl border border-border"><iframe class="h-full w-full" src="https://www.youtube.com/embed/${id}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></span>`);
  // PDF attachment: [pdf:url|Label]
  out = out.replace(/\[pdf:([^\s|\]]+)(?:\|([^\]]+))?\]/g, (_m, url, label) => {
    const safe = /^(https?:|\/)/i.test(url) ? url : "#";
    return `<a href="${safe}" download class="my-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">📄</span> ${label || "Download PDF"}</a>`;
  });
  // Images with optional |caption inside alt
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => {
    const safe = /^(https?:|\/)/i.test(url) ? url : "#";
    const [rawAlt, caption] = alt.split("|");
    const cap = caption ? `<figcaption class="mt-2 text-center text-sm text-muted-foreground italic">${esc(caption)}</figcaption>` : "";
    return `<figure class="my-6"><img src="${safe}" alt="${esc(rawAlt || caption || "")}" loading="lazy" class="w-full rounded-xl border border-border" />${cap}</figure>`;
  });
  // Links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
    const url = String(u).trim();
    const safe = /^(https?:|mailto:|\/|#)/i.test(url) ? url : "#";
    return `<a href="${safe}" class="text-primary underline hover:no-underline"${safe.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : ""}>${t}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">$1</code>');
  return out;
}

function renderTable(rows: string[]): string {
  // rows[0] = header, rows[1] = alignment, rows[2..] = body
  const cells = (row: string) =>
    row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  const thead = `<thead><tr>${header.map((h) => `<th class="border border-border bg-muted/60 px-3 py-2 text-left text-sm font-semibold">${inline(h)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td class="border border-border px-3 py-2 text-sm">${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<div class="my-6 overflow-x-auto"><table class="w-full border-collapse rounded-lg overflow-hidden">${thead}${tbody}</table></div>`;
}

const CALLOUT: Record<string, { label: string; cls: string; icon: string }> = {
  tip: { label: "Tip", cls: "border-primary/50 bg-primary-soft/40", icon: "💡" },
  warning: { label: "Warning", cls: "border-secondary/60 bg-secondary/10", icon: "⚠️" },
  note: { label: "Note", cls: "border-border bg-muted/40", icon: "📝" },
};

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const seen = new Map<string, number>();
  let i = 0;
  const flushList = (buf: string[], ordered: boolean) => {
    if (!buf.length) return;
    const tag = ordered ? "ol" : "ul";
    const cls = ordered ? "list-decimal" : "list-disc";
    out.push(`<${tag} class="${cls} pl-6 my-4 space-y-1.5 text-foreground/90">`);
    for (const item of buf) out.push(`<li>${inline(item)}</li>`);
    out.push(`</${tag}>`);
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^---+$/.test(line.trim())) { out.push('<hr class="my-8 border-border" />'); i++; continue; }

    // Callouts
    const cm = /^:::(tip|warning|note)\s*$/.exec(line.trim());
    if (cm) {
      const kind = cm[1] as keyof typeof CALLOUT;
      i++;
      const buf: string[] = [];
      while (i < lines.length && !/^:::\s*$/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
      if (i < lines.length) i++; // closing :::
      const c = CALLOUT[kind];
      out.push(`<aside class="my-6 rounded-xl border-l-4 ${c.cls} border p-4"><div class="flex items-center gap-2 font-semibold mb-1"><span aria-hidden="true">${c.icon}</span> ${c.label}</div><div class="text-foreground/90">${renderMarkdown(buf.join("\n"))}</div></aside>`);
      continue;
    }

    // Headings with id anchors
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      const text = h[2];
      let id = slugify(text);
      const n = seen.get(id) ?? 0;
      if (n > 0) id = `${id}-${n}`;
      seen.set(slugify(text), n + 1);
      const sizes = ["text-3xl", "text-2xl", "text-xl", "text-lg"];
      out.push(`<h${lvl} id="${id}" class="mt-8 mb-3 font-bold ${sizes[lvl - 1]} text-foreground scroll-mt-24 group"><a href="#${id}" class="opacity-0 group-hover:opacity-100 mr-2 text-muted-foreground no-underline">#</a>${inline(text)}</h${lvl}>`);
      i++; continue;
    }

    // Pull quote (>>)
    if (/^>>\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>>\s+/.test(lines[i])) { buf.push(lines[i].replace(/^>>\s+/, "")); i++; }
      out.push(`<blockquote class="my-8 border-l-4 border-secondary pl-6 text-xl md:text-2xl font-serif italic text-foreground/90">${inline(buf.join(" "))}</blockquote>`);
      continue;
    }
    if (/^>\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s+/.test(lines[i])) { buf.push(lines[i].replace(/^>\s+/, "")); i++; }
      out.push(`<blockquote class="border-l-4 border-primary bg-primary-soft/40 px-4 py-3 my-4 italic">${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Tables
    if (/^\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:-]+\|/.test(lines[i + 1])) {
      const rows: string[] = [line];
      i++;
      while (i < lines.length && /^\|.+\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
      out.push(renderTable(rows));
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\s*[-*]\s+/, "")); i++; }
      flushList(buf, false); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\s*\d+\.\s+/, "")); i++; }
      flushList(buf, true); continue;
    }

    // paragraph
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|[-*]\s|\d+\.\s|>\s|>>\s|---|:::|\|)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p class="my-4 leading-relaxed text-foreground/90">${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}
