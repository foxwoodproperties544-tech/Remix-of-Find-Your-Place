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
        entityType: z.string().optional(),
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
    if (data.entityType) q = q.eq("entity_type", data.entityType);

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
