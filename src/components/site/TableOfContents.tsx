import { useEffect, useState } from "react";
import type { HeadingItem } from "@/lib/markdown";
import { List } from "lucide-react";

export function TableOfContents({ items }: { items: HeadingItem[] }) {
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    if (!items.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
        if (visible[0]) setActive((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [items]);
  if (items.length < 2) return null;
  return (
    <nav aria-label="Table of contents" className="rounded-2xl border border-border bg-card p-5 print:hidden">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <List className="h-4 w-4" /> On this page
      </h3>
      <ol className="space-y-1.5 text-sm">
        {items.map((h) => (
          <li key={h.id} className={h.level === 3 ? "ml-3" : ""}>
            <a
              href={`#${h.id}`}
              className={`block border-l-2 pl-3 py-1 transition-colors ${
                active === h.id ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-primary"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
