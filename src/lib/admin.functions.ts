import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Forbidden");
}

/* ============ Account verify / reject ============ */

const verifyDecision = z.object({
  userId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

export const decideAccountVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => verifyDecision.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const verified = data.decision === "approve";
    const { error } = await supabaseAdmin.from("profiles").update({ verified }).eq("id", data.userId);
    if (error) throw error;

    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      type: verified ? "account_verified" : "account_rejected",
      title: verified ? "Your account was verified" : "Verification not approved",
      body: verified
        ? "Congratulations — your Foxwood account is now verified."
        : `Your verification request was not approved.${data.reason ? " Reason: " + data.reason : ""}`,
      link: "/dashboard/profile",
    });

    return { ok: true };
  });

/* ============ Subscriptions overview ============ */

export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, company_name, tier, tier_expires_at, listing_quota, verified")
      .neq("tier", "free")
      .order("tier_expires_at", { ascending: true, nullsFirst: false })
      .limit(500);
    if (error) throw error;

    const ids = (rows ?? []).map((r) => r.id);
    const { data: txs } = ids.length
      ? await supabaseAdmin
          .from("mpesa_transactions")
          .select("user_id, amount, purpose, tier, status, mpesa_receipt, created_at")
          .in("user_id", ids)
          .order("created_at", { ascending: false })
          .limit(1000)
      : { data: [] as any[] };

    const lastByUser = new Map<string, any>();
    for (const t of txs ?? []) if (!lastByUser.has(t.user_id)) lastByUser.set(t.user_id, t);

    const list = (rows ?? []).map((r) => ({ ...r, last_payment: lastByUser.get(r.id) ?? null }));
    const q = data.q?.trim().toLowerCase();
    return q
      ? list.filter((r) =>
          [r.full_name, r.company_name, r.phone, r.last_payment?.mpesa_receipt].some((v) =>
            v?.toLowerCase().includes(q),
          ),
        )
      : list;
  });

export const lookupPayment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().min(3) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const q = data.q.trim();
    const { data: rows, error } = await supabaseAdmin
      .from("mpesa_transactions")
      .select("*")
      .or(
        `mpesa_receipt.ilike.%${q}%,phone_number.ilike.%${q}%,checkout_request_id.ilike.%${q}%,merchant_request_id.ilike.%${q}%`,
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return rows ?? [];
  });

/* ============ Notifications center ============ */

export const listAllNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      q: z.string().optional(),
      status: z.enum(["all", "unread", "read"]).optional(),
      type: z.string().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("notifications")
      .select("id, user_id, type, title, body, link, read, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status === "unread") query = query.eq("read", false);
    if (data.status === "read") query = query.eq("read", true);
    if (data.type) query = query.eq("type", data.type);

    const { data: rows, error } = await query;
    if (error) throw error;

    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as { id: string; full_name: string | null }[] };
    const nameById = new Map((profs ?? []).map((p) => [p.id, p.full_name]));

    const enriched = (rows ?? []).map((r) => ({ ...r, user_name: nameById.get(r.user_id) ?? null }));

    const q = data.q?.trim().toLowerCase();
    return q
      ? enriched.filter((r) =>
          [r.title, r.body, r.user_name, r.type].some((v) => v?.toLowerCase().includes(q)),
        )
      : enriched;
  });

export const updateNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      ids: z.array(z.string().uuid()).min(1),
      action: z.enum(["mark_read", "mark_unread", "delete"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.action === "delete") {
      const { error } = await supabaseAdmin.from("notifications").delete().in("id", data.ids);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({ read: data.action === "mark_read" })
        .in("id", data.ids);
      if (error) throw error;
    }
    return { ok: true };
  });

export const broadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().min(2).max(120),
      body: z.string().min(2).max(600),
      link: z.string().max(300).optional(),
      audience: z.enum(["all", "agents", "verified"]).default("all"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userIds: string[] = [];
    if (data.audience === "agents") {
      const { data: rows } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "agent");
      userIds = (rows ?? []).map((r) => r.user_id);
    } else if (data.audience === "verified") {
      const { data: rows } = await supabaseAdmin.from("profiles").select("id").eq("verified", true);
      userIds = (rows ?? []).map((r) => r.id);
    } else {
      const { data: rows } = await supabaseAdmin.from("profiles").select("id");
      userIds = (rows ?? []).map((r) => r.id);
    }
    if (!userIds.length) return { ok: true, sent: 0 };

    const payload = userIds.map((uid) => ({
      user_id: uid,
      type: "admin_broadcast",
      title: data.title,
      body: data.body,
      link: data.link || "/dashboard/account",
    }));
    // insert in chunks of 500
    for (let i = 0; i < payload.length; i += 500) {
      const { error } = await supabaseAdmin.from("notifications").insert(payload.slice(i, i + 500));
      if (error) throw error;
    }
    return { ok: true, sent: userIds.length };
  });
