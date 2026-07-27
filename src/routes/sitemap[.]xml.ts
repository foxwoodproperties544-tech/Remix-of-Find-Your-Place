import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { KENYA_COUNTIES, KENYA_SUBLOCATIONS } from "@/lib/kenya-locations-data";
import { toSlug } from "@/lib/location-slug";

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
  { path: "/listing-packages", changefreq: "monthly", priority: "0.7" },
  { path: "/advertising-packages", changefreq: "monthly", priority: "0.6" },
  { path: "/blog-submission-packages", changefreq: "monthly", priority: "0.6" },
  { path: "/agent-developer-subscriptions", changefreq: "monthly", priority: "0.7" },
  { path: "/mortgage", changefreq: "monthly", priority: "0.5" },
  { path: "/due-diligence", changefreq: "monthly", priority: "0.6" },
  { path: "/compare", changefreq: "monthly", priority: "0.4" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.7" },
  { path: "/testimonials", changefreq: "weekly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.3" },

  { path: "/services/buy", changefreq: "monthly", priority: "0.7" },
  { path: "/services/sell", changefreq: "monthly", priority: "0.7" },
  { path: "/services/rent", changefreq: "monthly", priority: "0.7" },
  { path: "/services/lease", changefreq: "monthly", priority: "0.7" },
  { path: "/services/list", changefreq: "monthly", priority: "0.7" },
  { path: "/services/valuation", changefreq: "monthly", priority: "0.6" },
  { path: "/services/marketing", changefreq: "monthly", priority: "0.6" },
  { path: "/services/management", changefreq: "monthly", priority: "0.6" },
  { path: "/services/investment", changefreq: "monthly", priority: "0.6" },
  { path: "/locations", changefreq: "weekly", priority: "0.7" },
  { path: "/for-agents", changefreq: "monthly", priority: "0.8" },
  { path: "/agents", changefreq: "weekly", priority: "0.7" },
  { path: "/agents/become", changefreq: "monthly", priority: "0.7" },
  { path: "/pricing", changefreq: "monthly", priority: "0.7" },
  { path: "/help-center", changefreq: "monthly", priority: "0.5" },
  { path: "/get-app", changefreq: "monthly", priority: "0.7" },
  { path: "/property-requests", changefreq: "daily", priority: "0.8" },
];


export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...staticEntries];

        // Location landing pages (counties + sublocations)
        for (const county of KENYA_COUNTIES) {
          const cSlug = toSlug(county);
          entries.push({ path: `/locations/${cSlug}`, changefreq: "weekly", priority: "0.6" });
          for (const town of KENYA_SUBLOCATIONS[county] ?? []) {
            entries.push({ path: `/locations/${cSlug}/${toSlug(town)}`, changefreq: "weekly", priority: "0.5" });
          }
        }

        try {
          const { data: reqs } = await supabase
            .from("property_requests" as any)
            .select("id, slug, updated_at")
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(1000);
          for (const r of (reqs ?? []) as any[]) {
            entries.push({
              path: `/property-requests/${r.slug ?? r.id}`,
              lastmod: r.updated_at?.slice(0, 10),
              changefreq: "daily",
              priority: "0.6",
            });
          }
        } catch { /* ignore */ }



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
            .from("public_profiles")
            .select("id, created_at")
            .in("role_primary", ["agent", "developer"])
            .limit(1000);
          for (const a of agents ?? []) {
            entries.push({
              path: `/agents/${a.id}`,
              lastmod: a.created_at ? new Date(a.created_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.5",
            });
          }
        } catch {
          // ignore
        }

        // Area guide pages (published neighbourhood/county guides)
        try {
          const { data: guides } = await supabase
            .from("area_guides")
            .select("slug, level, county, town, updated_at")
            .eq("published", true)
            .limit(1000);
          const seen = new Set<string>();
          for (const g of guides ?? []) {
            const county = (g as any).county ? toSlug((g as any).county) : null;
            const town = (g as any).town ? toSlug((g as any).town) : null;
            const path =
              (g as any).level === "town" && county && town
                ? `/locations/${county}/${town}`
                : county
                  ? `/locations/${county}`
                  : null;
            if (!path || seen.has(path)) continue;
            seen.add(path);
            entries.push({
              path,
              lastmod: (g as any).updated_at ? new Date((g as any).updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.6",
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

        // De-duplicate paths (area guides can overlap generated location pages)
        const byPath = new Map<string, SitemapEntry>();
        for (const e of entries) {
          const existing = byPath.get(e.path);
          if (!existing || (e.lastmod && !existing.lastmod)) byPath.set(e.path, e);
        }
        const urls = [...byPath.values()].map((e) =>
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
