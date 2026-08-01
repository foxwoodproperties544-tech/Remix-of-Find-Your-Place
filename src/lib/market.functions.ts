import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Public market report for a county/town (+ optional category) over the last 12 months. */
export const getMarketReport = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        county: z.string().trim().max(60).optional(),
        town: z.string().trim().max(60).optional(),
        category: z.string().trim().max(40).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();

    let q = supabase
      .from("market_snapshots")
      .select("*")
      .order("period", { ascending: true })
      .limit(24);

    q = data.county ? q.ilike("county", data.county) : q.is("county", null);
    q = data.town ? q.ilike("town", data.town) : q.is("town", null);
    q = data.category ? q.ilike("category", data.category) : q.is("category", null);
    q = q.is("property_type", null);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Distinct counties that currently have market data, for the report picker. */
export const listMarketAreas = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("market_snapshots")
    .select("county, town")
    .not("county", "is", null)
    .limit(1000);
  if (error) throw new Error(error.message);

  const counties = new Map<string, Set<string>>();
  for (const r of data ?? []) {
    const c = (r as any).county as string;
    if (!counties.has(c)) counties.set(c, new Set());
    const t = (r as any).town as string | null;
    if (t) counties.get(c)!.add(t);
  }
  return [...counties.entries()]
    .map(([county, towns]) => ({ county, towns: [...towns].sort() }))
    .sort((a, b) => a.county.localeCompare(b.county));
});

/** Comparable-based value estimate for a published listing. */
export const getValuationEstimate = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ propertyId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: result, error } = await supabase.rpc("estimate_property_value", {
      _property_id: data.propertyId,
    });
    if (error) throw new Error(error.message);
    return result;
  });
