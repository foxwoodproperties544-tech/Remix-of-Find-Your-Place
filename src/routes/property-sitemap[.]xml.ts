import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://find-joy-list.lovable.app";

export const Route = createFileRoute("/property-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: string[] = [];
        try {
          const { data: rows } = await supabase
            .from("properties")
            .select("id, slug, updated_at, created_at")
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(5000);
          for (const r of rows ?? []) {
            const path = (r as any).slug || r.id;
            const lastmod = ((r as any).updated_at || r.created_at)
              ? new Date(((r as any).updated_at || r.created_at) as string).toISOString()
              : undefined;
            urls.push(
              [
                `  <url>`,
                `    <loc>${BASE_URL}/properties/${path}</loc>`,
                lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
                `    <changefreq>weekly</changefreq>`,
                `    <priority>0.8</priority>`,
                `  </url>`,
              ]
                .filter(Boolean)
                .join("\n"),
            );
          }
        } catch {
          // still return a valid, empty sitemap on failure
        }

        urls.unshift(
          [
            `  <url>`,
            `    <loc>${BASE_URL}/properties</loc>`,
            `    <changefreq>daily</changefreq>`,
            `    <priority>0.9</priority>`,
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
