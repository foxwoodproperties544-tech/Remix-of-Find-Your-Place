import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().optional(),
        action: z.string().optional(),
        actions: z.array(z.string()).optional(),
        entityType: z.string().optional(),
        actorId: z.string().uuid().optional(),
        entityId: z.string().uuid().optional(),
        agentId: z.string().uuid().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    let q = context.supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);

    if (data.action) q = q.eq("action", data.action);
    if (data.actions?.length) q = q.in("action", data.actions);
    if (data.entityType) q = q.eq("entity_type", data.entityType);
    if (data.actorId) q = q.eq("actor_id", data.actorId);
    if (data.entityId) q = q.eq("entity_id", data.entityId);
    if (data.agentId) q = q.or(`actor_id.eq.${data.agentId},entity_id.eq.${data.agentId}`);
    if (data.startDate) q = q.gte("created_at", data.startDate);
    if (data.endDate) q = q.lte("created_at", data.endDate);

    const { data: rows, error } = await q;
    if (error) throw error;

    const needle = data.q?.trim().toLowerCase();
    return needle
      ? (rows ?? []).filter((r: any) =>
          [r.actor_email, r.summary, r.entity_id, r.action, r.entity_type].some((v) =>
            (v ?? "").toString().toLowerCase().includes(needle),
          ),
        )
      : rows ?? [];
  });
