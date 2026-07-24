import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type MySubscription = {
  tier: string;
  planName: string | null;
  status: "active" | "expiring" | "expired" | "free" | "suspended";
  startedAt: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  listingsUsed: number;
  listingQuota: number;
  listingsRemaining: number;
  nextBillingAmount: number;
  pendingTier: string | null;
  pendingTierName: string | null;
  suspended: boolean;
  graceDays: number;
};

function daysBetween(a: number, b: number) {
  return Math.ceil((a - b) / 86400_000);
}

/** Agent view: current plan + usage + status. */
export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MySubscription> => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tier, tier_expires_at, listing_quota, subscription_started_at, pending_tier, subscription_suspended")
      .eq("id", context.userId)
      .maybeSingle();

    const tier = prof?.tier ?? "free";
    const { data: plan } = await context.supabase
      .from("tier_plans").select("name, price, listing_quota, duration_days").eq("slug", tier).maybeSingle();

    let pendingName: string | null = null;
    if (prof?.pending_tier) {
      const { data: pp } = await context.supabase
        .from("tier_plans").select("name").eq("slug", prof.pending_tier).maybeSingle();
      pendingName = pp?.name ?? prof.pending_tier;
    }

    const { count: listingsUsed } = await context.supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", context.userId)
      .in("status", ["published", "pending", "draft"]);

    const { data: gs } = await context.supabase
      .from("platform_settings").select("value").eq("key", "grace_days").maybeSingle();
    const graceDays = Number((gs?.value as any)?.tier ?? 3);

    const expiresAt = prof?.tier_expires_at ?? null;
    const now = Date.now();
    const daysRemaining = expiresAt ? daysBetween(new Date(expiresAt).getTime(), now) : null;

    let status: MySubscription["status"] = "free";
    if (prof?.subscription_suspended) status = "suspended";
    else if (tier === "free") status = "free";
    else if (!expiresAt) status = "active";
    else if (daysRemaining !== null && daysRemaining < 0) status = "expired";
    else if (daysRemaining !== null && daysRemaining <= 7) status = "expiring";
    else status = "active";

    const quota = prof?.listing_quota ?? plan?.listing_quota ?? 3;
    return {
      tier,
      planName: plan?.name ?? null,
      status,
      startedAt: prof?.subscription_started_at ?? null,
      expiresAt,
      daysRemaining,
      listingsUsed: listingsUsed ?? 0,
      listingQuota: quota,
      listingsRemaining: Math.max(0, quota - (listingsUsed ?? 0)),
      nextBillingAmount: Number(plan?.price ?? 0),
      pendingTier: prof?.pending_tier ?? null,
      pendingTierName: pendingName,
      suspended: !!prof?.subscription_suspended,
      graceDays,
    };
  });

/** Schedule a downgrade to take effect at the end of the current billing cycle. */
export const scheduleDowngrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tier: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    // Verify target plan is cheaper than current
    const { data: prof } = await context.supabase
      .from("profiles").select("tier").eq("id", context.userId).maybeSingle();
    if (!prof?.tier || prof.tier === "free") throw new Error("No active paid plan to downgrade");
    const { data: currentPlan } = await context.supabase
      .from("tier_plans").select("price").eq("slug", prof.tier).maybeSingle();
    const { data: targetPlan } = await context.supabase
      .from("tier_plans").select("price, name").eq("slug", data.tier).eq("active", true).maybeSingle();
    if (!targetPlan) throw new Error("Target plan unavailable");
    if (Number(targetPlan.price) >= Number(currentPlan?.price ?? 0)) {
      throw new Error("Choose a cheaper plan than your current one");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles")
      .update({ pending_tier: data.tier })
      .eq("id", context.userId);
    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId,
      type: "subscription_downgrade_scheduled",
      title: "Downgrade scheduled",
      body: `You'll switch to ${targetPlan.name} at the end of your current billing cycle.`,
      link: "/dashboard/subscription",
    });
    return { ok: true };
  });

/** Cancel a pending downgrade. */
export const cancelPendingDowngrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ pending_tier: null }).eq("id", context.userId);
    return { ok: true };
  });

/** All M-Pesa transactions for the current user (payment history). */
export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mpesa_transactions")
      .select("id, created_at, amount, phone_number, purpose, status, mpesa_receipt, checkout_request_id, tier, duration_days, property_id, package_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

/** Invoice/receipt detail (owner-only). */
export const getMyInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: tx, error } = await context.supabase
      .from("mpesa_transactions").select("*").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (error) throw error;
    if (!tx) throw new Error("Invoice not found");
    const { data: profile } = await context.supabase
      .from("profiles").select("full_name, company_name, phone").eq("id", context.userId).maybeSingle();
    let planName: string | null = null;
    if (tx.tier) {
      const { data: p } = await context.supabase.from("tier_plans").select("name").eq("slug", tx.tier).maybeSingle();
      planName = p?.name ?? tx.tier;
    }
    return { tx, profile, planName };
  });

// ── Admin ────────────────────────────────────────────────────────────────────

async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

export const adminListSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    q: z.string().optional(),
    status: z.enum(["all", "active", "expiring", "expired", "suspended"]).default("all"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let query = context.supabase
      .from("profiles")
      .select("id, full_name, company_name, phone, tier, tier_expires_at, subscription_started_at, subscription_suspended, pending_tier, listing_quota")
      .neq("tier", "free")
      .order("tier_expires_at", { ascending: true, nullsFirst: false });
    if (data.q && data.q.trim()) {
      const q = `%${data.q.trim()}%`;
      query = query.or(`full_name.ilike.${q},company_name.ilike.${q},phone.ilike.${q}`);
    }
    const { data: rows, error } = await query;
    if (error) throw error;
    const now = Date.now();
    const filtered = (rows ?? []).filter((r: any) => {
      if (data.status === "all") return true;
      if (r.subscription_suspended && data.status !== "suspended") return false;
      if (data.status === "suspended") return !!r.subscription_suspended;
      if (!r.tier_expires_at) return data.status === "active";
      const d = Math.ceil((new Date(r.tier_expires_at).getTime() - now) / 86400_000);
      if (data.status === "expired") return d < 0;
      if (data.status === "expiring") return d >= 0 && d <= 7;
      if (data.status === "active") return d > 7;
      return true;
    });
    return filtered;
  });

export const adminExtendSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), days: z.number().int().min(1).max(3650) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("tier_expires_at").eq("id", data.userId).maybeSingle();
    const base = prof?.tier_expires_at && new Date(prof.tier_expires_at).getTime() > Date.now()
      ? new Date(prof.tier_expires_at).getTime() : Date.now();
    const newExpiry = new Date(base + data.days * 86400_000).toISOString();
    await supabaseAdmin.from("profiles")
      .update({ tier_expires_at: newExpiry, subscription_suspended: false, last_expiry_reminder_days: null })
      .eq("id", data.userId);
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId, type: "subscription_extended",
      title: "Subscription extended",
      body: `Your subscription was extended by ${data.days} days by an admin.`,
      link: "/dashboard/subscription",
    });
    return { newExpiry };
  });

export const adminSetExpiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), expiresAt: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({
      tier_expires_at: new Date(data.expiresAt).toISOString(),
      last_expiry_reminder_days: null,
    }).eq("id", data.userId);
    return { ok: true };
  });

export const adminSuspendSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), suspended: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ subscription_suspended: data.suspended }).eq("id", data.userId);
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId, type: "subscription_suspended",
      title: data.suspended ? "Subscription suspended" : "Subscription reactivated",
      body: data.suspended
        ? "Your subscription was suspended by an admin. Please contact support."
        : "Your subscription has been reactivated.",
      link: "/dashboard/subscription",
    });
    return { ok: true };
  });

export const adminCancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({
      tier: "free", tier_expires_at: null, pending_tier: null, listing_quota: 3, subscription_suspended: false,
    }).eq("id", data.userId);
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId, type: "subscription_cancelled",
      title: "Subscription cancelled", body: "Your subscription was cancelled by an admin.",
      link: "/dashboard/subscription",
    });
    return { ok: true };
  });

export const adminSendReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("tier, tier_expires_at").eq("id", data.userId).maybeSingle();
    if (!prof?.tier_expires_at) throw new Error("No expiry to remind about");
    const d = Math.ceil((new Date(prof.tier_expires_at).getTime() - Date.now()) / 86400_000);
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId, type: "subscription_reminder",
      title: d < 0 ? "Your subscription has expired" : `Your subscription expires in ${d} day${d === 1 ? "" : "s"}`,
      body: `Renew your ${prof.tier} plan to keep your premium features.`,
      link: "/dashboard/subscription",
    });
    return { ok: true };
  });

export const adminGetRevenue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data } = await context.supabase
      .from("mpesa_transactions")
      .select("amount, purpose, created_at")
      .eq("status", "success")
      .gte("created_at", since30);
    const rows = data ?? [];
    const total30 = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const byPurpose = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.purpose] = (acc[r.purpose] ?? 0) + Number(r.amount ?? 0);
      return acc;
    }, {});
    return { total30, byPurpose };
  });

export const adminListExpiring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ withinDays: z.number().int().min(1).max(60).default(14) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const until = new Date(Date.now() + data.withinDays * 86400_000).toISOString();
    const { data: rows, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, company_name, phone, tier, tier_expires_at")
      .neq("tier", "free")
      .not("tier_expires_at", "is", null)
      .lte("tier_expires_at", until)
      .order("tier_expires_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const adminGetGracePeriods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("platform_settings").select("value").eq("key", "grace_days").maybeSingle();
    return (data?.value as any) ?? { tier: 3, listing: 3, blog: 3, ad: 3 };
  });

export const adminSetGracePeriods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    tier: z.number().int().min(0).max(60),
    listing: z.number().int().min(0).max(60),
    blog: z.number().int().min(0).max(60),
    ad: z.number().int().min(0).max(60),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("platform_settings").upsert(
      { key: "grace_days", value: data, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    return { ok: true };
  });
