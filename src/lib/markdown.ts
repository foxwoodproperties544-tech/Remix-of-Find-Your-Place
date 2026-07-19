// Minimal, safe markdown → HTML renderer for blog + help content.
// Supports: # ## ### headings, paragraphs, unordered/ordered lists,
// **bold**, *italic*, `code`, [links](url), --- hr, > blockquote.
// Escapes HTML first to prevent XSS.

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  let out = esc(s);
  // links [text](url) — validate url scheme
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
    const url = String(u).trim();
    const safe = /^(https?:|mailto:|\/)/i.test(url) ? url : "#";
    return `<a href="${safe}" class="text-primary underline hover:no-underline" ${safe.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${t}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">$1</code>');
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
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
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      const sizes = ["text-3xl", "text-2xl", "text-xl", "text-lg"];
      out.push(`<h${lvl} class="mt-8 mb-3 font-bold ${sizes[lvl - 1]} text-foreground">${inline(h[2])}</h${lvl}>`);
      i++; continue;
    }
    if (/^>\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s+/.test(lines[i])) { buf.push(lines[i].replace(/^>\s+/, "")); i++; }
      out.push(`<blockquote class="border-l-4 border-primary bg-primary-soft/40 px-4 py-3 my-4 italic">${inline(buf.join(" "))}</blockquote>`);
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
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|[-*]\s|\d+\.\s|>\s|---)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p class="my-4 leading-relaxed text-foreground/90">${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}
