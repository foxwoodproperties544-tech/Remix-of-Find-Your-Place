import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const prefsSchema = z.object({
  category: z.string().trim().max(40).optional(),
  type: z.string().trim().max(60).optional(),
  county: z.string().trim().max(60).optional(),
  minPrice: z.number().min(0).max(100_000_000_000).optional(),
  maxPrice: z.number().min(0).max(100_000_000_000).optional(),
  minBeds: z.number().int().min(0).max(50).optional(),
});

async function rateLimit(context: any, bucket: string, limit: number, windowSeconds: number) {
  const { data, error } = await context.supabase.rpc("check_and_hit_rate_limit", {
    _bucket: bucket,
    _key: `u:${context.userId}`,
    _limit: limit,
    _window_seconds: windowSeconds,
  });
  if (error) return; // fail open on infrastructure errors
  if (data === false) throw new Error("Too many requests — please slow down and try again shortly.");
}

/** Save the signed-in buyer's match preferences (owner derived from the token, never the payload). */
export const saveMatchPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ prefs: prefsSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await rateLimit(context, "match_prefs", 20, 300);

    const { error } = await context.supabase
      .from("match_preferences")
      .upsert({ user_id: context.userId, prefs: data.prefs as any }, { onConflict: "user_id" });
    if (error) throw error;

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: "match_preferences.update",
      entityType: "match_preferences",
      entityId: context.userId,
      summary: "Buyer match preferences updated",
      after: data.prefs,
    });

    return { ok: true };
  });

const alertToggles = {
  notify_email: z.boolean().optional(),
  notify_in_app: z.boolean().optional(),
  on_new_match: z.boolean().optional(),
  on_price_drop: z.boolean().optional(),
  on_status_change: z.boolean().optional(),
  on_agent_new_listing: z.boolean().optional(),
  on_relisted: z.boolean().optional(),
  active: z.boolean().optional(),
};

export const createPropertyAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().trim().min(1).max(120), filters: prefsSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await rateLimit(context, "alert_create", 10, 3600);

    const { data: row, error } = await context.supabase
      .from("property_alerts")
      .insert({ user_id: context.userId, name: data.name, filters: data.filters as any })
      .select("id")
      .maybeSingle();
    if (error) throw error;

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: "alert.create",
      entityType: "property_alert",
      entityId: (row as any)?.id ?? null,
      summary: `Smart alert created: ${data.name}`,
      after: { name: data.name, filters: data.filters },
    });

    return { ok: true, id: (row as any)?.id };
  });

export const updatePropertyAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: z.object(alertToggles).strict() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await rateLimit(context, "alert_update", 60, 300);

    const { data: before } = await context.supabase
      .from("property_alerts")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!before) throw new Error("Alert not found");

    const { error } = await context.supabase
      .from("property_alerts")
      .update(data.patch as any)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: "alert.update",
      entityType: "property_alert",
      entityId: data.id,
      summary: "Alert subscription preferences changed",
      before,
      after: data.patch,
    });

    return { ok: true };
  });

export const deletePropertyAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await rateLimit(context, "alert_delete", 30, 300);

    const { data: before } = await context.supabase
      .from("property_alerts")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!before) throw new Error("Alert not found");

    const { error } = await context.supabase
      .from("property_alerts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: "alert.delete",
      entityType: "property_alert",
      entityId: data.id,
      summary: `Smart alert removed: ${(before as any)?.name ?? data.id}`,
      before,
    });

    return { ok: true };
  });
