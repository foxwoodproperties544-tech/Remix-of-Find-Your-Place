import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://find-joy-list.lovable.app";

export const Route = createFileRoute("/company-sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { data } = await supabase
          .from("businesses")
          .select("slug, updated_at")
          .eq("status", "published")
          .order("updated_at", { ascending: false })
          .limit(45000);

        const urls = [
          `  <url><loc>${BASE_URL}/companies</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
          ...(data ?? []).map(
            (b: any) =>
              `  <url><loc>${BASE_URL}/companies/${b.slug}</loc><lastmod>${new Date(b.updated_at).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
          ),
        ].join("\n");

        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
          { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } },
        );
      },
    },
  },
});
