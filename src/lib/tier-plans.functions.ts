import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type TierPlanRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  listing_quota: number;
  duration_days: number;
  perks: string[];
  badge_color: string | null;
  highlight: boolean;
  active: boolean;
  sort_order: number;
};

/** Public: active tier plans, ordered. */
export const listActiveTierPlans = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  const sb = createClient(url, key, {
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
  const { data, error } = await sb
    .from("tier_plans")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TierPlanRow[];
});

/** Admin: full list including inactive. */
export const adminListTierPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("tier_plans").select("*").order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as TierPlanRow[];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  patch: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    price: z.number().min(0),
    listing_quota: z.number().int().min(0),
    duration_days: z.number().int().min(1),
    perks: z.array(z.string()),
    badge_color: z.string().nullable().optional(),
    highlight: z.boolean().optional(),
    active: z.boolean().optional(),
    sort_order: z.number().int().optional(),
  }),
});

export const adminUpsertTierPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    if (data.id) {
      const { error } = await context.supabase.from("tier_plans").update(data.patch).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("tier_plans").insert(data.patch).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const adminToggleTierPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("tier_plans").update({ active: data.active }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteTierPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("tier_plans").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
