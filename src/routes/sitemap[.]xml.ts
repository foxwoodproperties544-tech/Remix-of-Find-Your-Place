import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://find-joy-list.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/properties", changefreq: "hourly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/help", changefreq: "monthly", priority: "0.5" },
  { path: "/pricing", changefreq: "monthly", priority: "0.5" },
  { path: "/mortgage", changefreq: "monthly", priority: "0.5" },
  { path: "/compare", changefreq: "monthly", priority: "0.4" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/services/buy", changefreq: "monthly", priority: "0.7" },
  { path: "/services/sell", changefreq: "monthly", priority: "0.7" },
  { path: "/services/rent", changefreq: "monthly", priority: "0.7" },
  { path: "/services/lease", changefreq: "monthly", priority: "0.7" },
  { path: "/services/list", changefreq: "monthly", priority: "0.7" },
  { path: "/services/valuation", changefreq: "monthly", priority: "0.6" },
  { path: "/services/marketing", changefreq: "monthly", priority: "0.6" },
  { path: "/services/management", changefreq: "monthly", priority: "0.6" },
  { path: "/services/investment", changefreq: "monthly", priority: "0.6" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...staticEntries];

        try {
          const { data: props } = await supabase
            .from("properties")
            .select("id, slug, updated_at")
            .eq("status", "published")
            .order("updated_at", { ascending: false })
            .limit(2000);
          for (const p of props ?? []) {
            entries.push({
              path: `/properties/${(p as any).slug ?? p.id}`,
              lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.8",
            });
          }
        } catch {
          // ignore db errors — still return static sitemap
        }

        try {
          const { data: agents } = await supabase
            .from("profiles")
            .select("id, updated_at")
            .in("role_primary", ["agent", "developer"])
            .limit(1000);
          for (const a of agents ?? []) {
            entries.push({
              path: `/agents/${a.id}`,
              lastmod: a.updated_at ? new Date(a.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.5",
            });
          }
        } catch {
          // ignore
        }

        try {
          const { data: posts } = await supabase
            .from("blog_posts")
            .select("slug, updated_at")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(500);
          for (const b of posts ?? []) {
            entries.push({
              path: `/blog/${b.slug}`,
              lastmod: b.updated_at ? new Date(b.updated_at).toISOString() : undefined,
              changefreq: "monthly",
              priority: "0.6",
            });
          }
        } catch {
          // ignore
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
