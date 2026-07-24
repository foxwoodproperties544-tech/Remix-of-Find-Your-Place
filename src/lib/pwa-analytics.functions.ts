import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const rangeSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .optional();

export const getPwaInstallAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ok) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const to = data?.to ?? new Date().toISOString();
    const from = data?.from ?? new Date(Date.now() - 30 * 864e5).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from("pwa_install_events")
      .select("event_type,platform,created_at")
      .gte("created_at", from)
      .lte("created_at", to)
      .limit(50000);
    if (error) throw new Error(error.message);

    const totals: Record<string, number> = {
      impression: 0,
      install_click: 0,
      installed: 0,
      dismiss: 0,
      ios_hint_shown: 0,
    };
    const byPlatform: Record<string, Record<string, number>> = {};
    const byDay: Record<string, Record<string, number>> = {};

    for (const r of rows ?? []) {
      totals[r.event_type] = (totals[r.event_type] ?? 0) + 1;
      const p = r.platform ?? "unknown";
      byPlatform[p] ??= { impression: 0, install_click: 0, installed: 0, dismiss: 0, ios_hint_shown: 0 };
      byPlatform[p][r.event_type] = (byPlatform[p][r.event_type] ?? 0) + 1;
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      byDay[day] ??= { impression: 0, install_click: 0, installed: 0, dismiss: 0, ios_hint_shown: 0 };
      byDay[day][r.event_type] = (byDay[day][r.event_type] ?? 0) + 1;
    }

    const clickRate = totals.impression > 0 ? (totals.install_click / totals.impression) * 100 : 0;
    const installRate = totals.install_click > 0 ? (totals.installed / totals.install_click) * 100 : 0;

    return {
      range: { from, to },
      totals,
      clickRate: Number(clickRate.toFixed(2)),
      installRate: Number(installRate.toFixed(2)),
      byPlatform,
      byDay: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, counts]) => ({ day, ...counts })),
    };
  });
