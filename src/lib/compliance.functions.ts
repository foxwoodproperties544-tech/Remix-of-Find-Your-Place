import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Forbidden");
}

/** Signed-in user: download every record we hold about them (data portability). */
export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    const pick = async (table: string, column: string) => {
      const { data } = await (supabase as any).from(table).select("*").eq(column, userId).limit(1000);
      return data ?? [];
    };

    const [
      profile,
      properties,
      favorites,
      savedSearches,
      viewings,
      inquiries,
      leads,
      notifications,
      reviews,
      supportTickets,
      blogPosts,
      deletionRequests,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle().then((r) => r.data ?? null),
      pick("properties", "owner_id"),
      pick("favorites", "user_id"),
      pick("saved_searches", "user_id"),
      pick("viewings", "requester_id"),
      pick("inquiries", "sender_user_id"),
      pick("leads", "owner_id"),
      pick("notifications", "user_id"),
      pick("reviews", "author_id"),
      pick("support_tickets", "user_id"),
      pick("blog_posts", "author_id"),
      pick("account_deletion_requests", "user_id"),
    ]);

    return {
      exported_at: new Date().toISOString(),
      account: { id: userId, email: (claims as any)?.email ?? null },
      profile,
      properties,
      favorites,
      saved_searches: savedSearches,
      viewings,
      inquiries,
      leads,
      notifications,
      reviews,
      support_tickets: supportTickets,
      blog_posts: blogPosts,
      account_deletion_requests: deletionRequests,
    };
  });

const requestSchema = z.object({ reason: z.string().trim().max(1000).optional() });

/** Signed-in user: request erasure of their account. Admins process it manually. */
export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => requestSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("account_deletion_requests")
      .select("id,status")
      .eq("user_id", userId)
      .in("status", ["pending", "reviewing"])
      .maybeSingle();
    if (existing) return { ok: true, alreadyPending: true, id: existing.id };

    const { data: row, error } = await supabase
      .from("account_deletion_requests")
      .insert({ user_id: userId, reason: data.reason ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { ok: true, alreadyPending: false, id: row.id };
  });

/** Signed-in user: current deletion-request status, if any. */
export const myDeletionRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("account_deletion_requests")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  });

const listSchema = z
  .object({ status: z.enum(["pending", "reviewing", "completed", "rejected", "all"]).default("pending") })
  .optional();

export const listDeletionRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const status = data?.status ?? "pending";

    let q = context.supabase
      .from("account_deletion_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "all") q = q.eq("status", status);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = [...new Set((rows ?? []).map((r: any) => r.user_id))];
    let byId: Record<string, any> = {};
    if (ids.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone, county, town")
        .in("id", ids);
      byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }

    return (rows ?? []).map((r: any) => ({ ...r, profile: byId[r.user_id] ?? null }));
  });

const processSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["reviewing", "completed", "rejected"]),
  notes: z.string().trim().max(1000).optional(),
});

export const processDeletionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => processSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { error } = await context.supabase
      .from("account_deletion_requests")
      .update({
        status: data.action,
        admin_notes: data.notes ?? null,
        handled_by: context.userId,
        handled_at: data.action === "reviewing" ? null : new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
