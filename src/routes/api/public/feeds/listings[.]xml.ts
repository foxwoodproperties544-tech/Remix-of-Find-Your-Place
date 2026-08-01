import { createFileRoute } from "@tanstack/react-router";

/**
 * Public listing syndication feed (XML) for portal partners and developers.
 * Read-only, published listings only, no owner contact PII.
 * Usage: /api/public/feeds/listings.xml?county=Nairobi&limit=500
 */
function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/api/public/feeds/listings.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const county = url.searchParams.get("county");
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 500) || 500, 1), 1000);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("properties")
          .select("id, slug, title, description, price, price_suffix, category, property_type, county, town, bedrooms, bathrooms, size, images, updated_at, published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(limit);
        if (county) q = q.eq("county", county);

        const { data, error } = await q;
        if (error) return new Response("Feed unavailable", { status: 503 });

        const origin = url.origin;
        const items = (data ?? [])
          .map((p) => {
            const link = `${origin}/properties/${p.slug ?? p.id}`;
            const img = Array.isArray(p.images) ? p.images[0] : null;
            return `  <listing>
    <id>${esc(p.id)}</id>
    <title>${esc(p.title)}</title>
    <link>${esc(link)}</link>
    <description>${esc((p.description ?? "").slice(0, 900))}</description>
    <price currency="KES">${esc(p.price)}</price>
    <priceSuffix>${esc(p.price_suffix)}</priceSuffix>
    <category>${esc(p.category)}</category>
    <propertyType>${esc(p.property_type)}</propertyType>
    <county>${esc(p.county)}</county>
    <town>${esc(p.town)}</town>
    <bedrooms>${esc(p.bedrooms)}</bedrooms>
    <bathrooms>${esc(p.bathrooms)}</bathrooms>
    <size>${esc(p.size)}</size>
    <image>${esc(img)}</image>
    <updated>${esc(p.updated_at)}</updated>
  </listing>`;
          })
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<listings generator="Foxwood Properties" generated="${new Date().toISOString()}" count="${(data ?? []).length}">
${items}
</listings>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=900",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
          },
        }),
    },
  },
});
