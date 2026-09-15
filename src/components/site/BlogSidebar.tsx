import { foxwoodWhatsappLink } from "@/lib/whatsapp";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { BlogPost } from "@/lib/blog";
import { subscribeNewsletter } from "@/lib/blog";
import type { Property } from "@/lib/mock-data";
import { formatKsh } from "@/lib/mock-data";
import { Search, Mail, Phone, MessageCircle, MapPin } from "lucide-react";
import { ALL_TYPES } from "@/lib/taxonomy";

const LOCATIONS = ["Nairobi","Kiambu","Kitengela","Syokimau","Katani","Ngong","Isinya","Juja","Matuu","Machakos","Kajiado","Mombasa"];

interface Props {
  currentPost: BlogPost;
  categories: { category: string; count: number }[];
  popularPosts: BlogPost[];
  recentPosts: BlogPost[];
  featuredProperties: Property[];
  tags: string[];
}

export function BlogSidebar({ currentPost, categories, popularPosts, recentPosts, featuredProperties, tags }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const onSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await subscribeNewsletter(email);
    if (res.ok) { setEmail(""); setMsg("Subscribed! Watch your inbox for updates."); }
    else setMsg(res.error ?? "Could not subscribe.");
  };

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 self-start">
      {/* Search */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate({ to: "/blog", search: { q: q.trim() } as any }); }}>
          <label htmlFor="blog-search" className="sr-only">Search blog</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input id="blog-search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles…"
              className="w-full rounded-lg border border-border bg-field pl-9 pr-3 py-2 text-sm" />
          </div>
        </form>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <SidebarCard title="Categories">
          <ul className="space-y-1.5 text-sm">
            {categories.map((c) => (
              <li key={c.category} className="flex items-center justify-between">
                <Link to="/blog" className="capitalize hover:text-primary">{c.category.replace("-", " ")}</Link>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{c.count}</span>
              </li>
            ))}
          </ul>
        </SidebarCard>
      )}

      {/* Popular */}
      {popularPosts.length > 0 && (
        <SidebarCard title="Popular posts">
          <PostList posts={popularPosts} exclude={currentPost.id} />
        </SidebarCard>
      )}

      {/* Recent */}
      {recentPosts.length > 0 && (
        <SidebarCard title="Recent posts">
          <PostList posts={recentPosts} exclude={currentPost.id} />
        </SidebarCard>
      )}

      {/* Featured properties */}
      {featuredProperties.length > 0 && (
        <SidebarCard title="Featured properties">
          <ul className="space-y-3">
            {featuredProperties.map((p) => (
              <li key={p.id}>
                <Link to="/properties/$id" params={{ id: p.slug ?? p.id }} className="group flex gap-3">
                  <img src={p.image} alt="" loading="lazy" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary">{p.title}</div>
                    <div className="mt-0.5 text-xs text-primary font-bold">{formatKsh(p.price)}{p.priceSuffix ?? ""}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.town}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SidebarCard>
      )}

      {/* Property categories */}
      <SidebarCard title="Property categories">
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.slice(0, 10).map((t: string) => (
            <Link key={t} to="/properties" search={{ type: t } as any}
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary hover:text-primary">
              {t}
            </Link>
          ))}
        </div>
      </SidebarCard>

      {/* Popular locations */}
      <SidebarCard title="Popular locations">
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.map((loc) => (
            <Link key={loc} to="/properties" search={{ town: loc } as any}
              className="rounded-full bg-primary-soft text-primary px-3 py-1 text-xs font-medium hover:bg-primary hover:text-primary-foreground">
              {loc}
            </Link>
          ))}
        </div>
      </SidebarCard>

      {/* Newsletter */}
      <div className="rounded-2xl border border-primary/30 bg-primary-soft p-5">
        <h3 className="font-bold flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Newsletter</h3>
        <p className="mt-1 text-sm text-muted-foreground">Get weekly property tips and new listings.</p>
        <form onSubmit={onSubscribe} className="mt-3 space-y-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-border bg-field px-3 py-2 text-sm" />
          <button type="submit" className="btn-primary btn-primary-hover w-full">Subscribe</button>
        </form>
        {msg && <p className="mt-2 text-xs text-primary">{msg}</p>}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <SidebarCard title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 30).map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">#{t}</span>
            ))}
          </div>
        </SidebarCard>
      )}

      {/* Ad slot */}
      <Link to="/services/list" className="block rounded-2xl bg-gradient-to-br from-primary to-secondary p-5 text-primary-foreground shadow-glow">
        <div className="text-xs uppercase tracking-wider opacity-90">Advertisement</div>
        <div className="mt-1 text-lg font-black leading-tight">List your property on Foxwood</div>
        <div className="mt-1 text-sm opacity-90">Reach thousands of buyers &amp; tenants across Kenya.</div>
        <div className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Get started →</div>
      </Link>

      {/* Contact card */}
      <SidebarCard title="Talk to us">
        <div className="space-y-2 text-sm">
          <a href="tel:+254759556026" className="flex items-center gap-2 hover:text-primary"><Phone className="h-4 w-4" /> +254 759 556 026</a>
          <a href="mailto:info@foxwoodproperties.co.ke" className="flex items-center gap-2 hover:text-primary"><Mail className="h-4 w-4" /> info@foxwoodproperties.co.ke</a>
          <a href={foxwoodWhatsappLink("blog")} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
            <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
          </a>
        </div>
      </SidebarCard>
    </aside>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function PostList({ posts, exclude }: { posts: BlogPost[]; exclude?: string }) {
  const filtered = posts.filter((p) => p.id !== exclude).slice(0, 5);
  return (
    <ul className="space-y-3">
      {filtered.map((p) => (
        <li key={p.id}>
          <Link to="/blog/$slug" params={{ slug: p.slug }} className="group flex gap-3">
            {p.cover_image ? (
              <img src={p.cover_image} alt="" loading="lazy" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="h-14 w-20 shrink-0 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary">{p.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{p.reading_minutes} min read</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
