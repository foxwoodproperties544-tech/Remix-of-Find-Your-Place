import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const rangeSchema = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .parse;

function dayKey(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

export const getAgentInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ from: z.string().optional(), to: z.string().optional() })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const to = data.to ? new Date(data.to) : new Date();
    const from = data.from
      ? new Date(data.from)
      : new Date(Date.now() - 30 * 864e5);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const { supabase, userId } = context;

    const { data: props, error: propsErr } = await supabase
      .from("properties")
      .select("id, title, status, price, is_featured, published_at")
      .eq("owner_id", userId);
    if (propsErr) throw propsErr;

    const listings = props ?? [];
    const ids = listings.map((p) => p.id);
    const keys = ids.map(String);

    let views: Array<{ property_key: string; created_at: string }> = [];
    let inquiries: Array<{ property_key: string; created_at: string }> = [];

    if (keys.length) {
      const [{ data: v }, { data: q }] = await Promise.all([
        supabase
          .from("property_views")
          .select("property_key, created_at")
          .in("property_key", keys)
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        supabase
          .from("inquiries")
          .select("property_key, created_at")
          .in("property_key", keys)
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
      ]);
      views = v ?? [];
      inquiries = q ?? [];
    }

    // Per-listing rollup
    const byListing = listings.map((p) => {
      const key = String(p.id);
      const v = views.filter((r) => r.property_key === key).length;
      const i = inquiries.filter((r) => r.property_key === key).length;
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        price: p.price,
        is_featured: p.is_featured,
        views: v,
        inquiries: i,
        conversion:
          v > 0 ? Math.round((i / v) * 1000) / 10 : 0, // %
      };
    });

    // Daily series
    const bucket = new Map<string, { views: number; inquiries: number }>();
    for (
      let d = new Date(from);
      d <= to;
      d = new Date(d.getTime() + 864e5)
    ) {
      bucket.set(dayKey(d), { views: 0, inquiries: 0 });
    }
    for (const r of views) {
      const k = dayKey(r.created_at);
      const b = bucket.get(k);
      if (b) b.views++;
    }
    for (const r of inquiries) {
      const k = dayKey(r.created_at);
      const b = bucket.get(k);
      if (b) b.inquiries++;
    }
    const daily = Array.from(bucket.entries()).map(([date, v]) => ({
      date,
      ...v,
    }));

    return {
      range: { from: fromIso, to: toIso },
      totals: {
        listings: listings.length,
        published: listings.filter((p) => p.status === "published").length,
        views: views.length,
        inquiries: inquiries.length,
        conversion:
          views.length > 0
            ? Math.round((inquiries.length / views.length) * 1000) / 10
            : 0,
      },
      daily,
      byListing: byListing.sort((a, b) => b.views - a.views),
    };
  });
