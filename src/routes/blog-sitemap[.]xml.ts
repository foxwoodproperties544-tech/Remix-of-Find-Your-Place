import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://find-joy-list.lovable.app";

export const Route = createFileRoute("/blog-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: string[] = [];
        try {
          const { data: posts } = await supabase
            .from("blog_posts")
            .select("slug, updated_at, published_at")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(2000);
          for (const b of posts ?? []) {
            const lastmod = (b.updated_at || b.published_at)
              ? new Date((b.updated_at || b.published_at) as string).toISOString()
              : undefined;
            urls.push(
              [
                `  <url>`,
                `    <loc>${BASE_URL}/blog/${b.slug}</loc>`,
                lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
                `    <changefreq>monthly</changefreq>`,
                `    <priority>0.7</priority>`,
                `  </url>`,
              ]
                .filter(Boolean)
                .join("\n"),
            );
          }
        } catch {
          // still return an empty valid sitemap
        }

        // Always include the blog index itself.
        urls.unshift(
          [
            `  <url>`,
            `    <loc>${BASE_URL}/blog</loc>`,
            `    <changefreq>daily</changefreq>`,
            `    <priority>0.8</priority>`,
            `  </url>`,
          ].join("\n"),
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
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
