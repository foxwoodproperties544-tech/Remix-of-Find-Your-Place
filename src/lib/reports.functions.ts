import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const listSchema = z
  .object({ status: z.enum(["open", "reviewing", "resolved", "dismissed", "all"]).default("open") })
  .optional();

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Forbidden");
}

export const listPropertyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const status = data?.status ?? "open";

    let q = context.supabase
      .from("property_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "all") q = q.eq("status", status);

    const { data: reports, error } = await q;
    if (error) throw new Error(error.message);

    const ids = [...new Set((reports ?? []).map((r: any) => r.property_id))];
    let propsById: Record<string, any> = {};
    if (ids.length) {
      const { data: props } = await context.supabase
        .from("properties")
        .select("id,slug,title,status,images,county,town,price,owner_id")
        .in("id", ids);
      propsById = Object.fromEntries((props ?? []).map((p: any) => [p.id, p]));
    }

    return (reports ?? []).map((r: any) => ({ ...r, property: propsById[r.property_id] ?? null }));
  });

const resolveSchema = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["dismiss", "resolve", "unpublish", "remove"]),
  resolution: z.string().max(1000).optional(),
});

export const resolvePropertyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resolveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: report } = await context.supabase
      .from("property_reports")
      .select("id,property_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report) throw new Error("Report not found");

    if (data.action === "unpublish" || data.action === "remove") {
      const { error: upErr } = await context.supabase
        .from("properties")
        .update({ status: data.action === "remove" ? "archived" : "draft" })
        .eq("id", report.property_id);
      if (upErr) throw new Error(upErr.message);
    }

    const status = data.action === "dismiss" ? "dismissed" : "resolved";
    const { error } = await context.supabase
      .from("property_reports")
      .update({
        status,
        resolution: data.resolution ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.reportId);
    if (error) throw new Error(error.message);

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: `report.${data.action}`,
      entityType: "property_report",
      entityId: data.reportId,
      summary: `Listing report ${data.action}`,
      metadata: { property_id: report.property_id, resolution: data.resolution },
    });

    return { ok: true };
  });
