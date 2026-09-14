import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Unified package renewal / upgrade / downgrade for property listings,
 * blog posts, and ad campaigns.
 *
 * Renew  → charge same package price, extend expires_at by pkg.duration_days.
 * Upgrade → charge new (more expensive) package, expires_at = now + new pkg days.
 * Downgrade → schedule on `pending_package_id`; applied at expiry by the daily sweep.
 */

const site = () => process.env.SITE_URL ?? "https://foxwoodproperties-co-ke.lovable.app";

async function assertOwner(supabase: any, userId: string, table: string, id: string, ownerCol: string) {
  const { data } = await supabase.from(table).select(`id, ${ownerCol}`).eq("id", id).maybeSingle();
  if (!data) throw new Error("Not found");
  if ((data as any)[ownerCol] !== userId) throw new Error("Not allowed");
}

// ── LISTING PACKAGES ─────────────────────────────────────────────────────────

const renewListingSchema = z.object({
  purchaseId: z.string().uuid(),
  packageId: z.string().uuid(),
  mode: z.enum(["renew", "upgrade"]),
  phone: z.string().min(9),
});

export const renewOrUpgradeListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => renewListingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { initiateStkPush, normalizeKePhone } = await import("./mpesa.server");
    const { data: purchase } = await context.supabase
      .from("property_package_purchases").select("id, property_id, owner_id, package_id").eq("id", data.purchaseId).maybeSingle();
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.owner_id !== context.userId) throw new Error("Not your listing");
    const { data: pkg } = await context.supabase
      .from("listing_packages").select("*").eq("id", data.packageId).eq("active", true).maybeSingle();
    if (!pkg) throw new Error("Package unavailable");

    if (Number(pkg.price) === 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cur } = await supabaseAdmin.from("property_package_purchases").select("expires_at").eq("id", purchase.id).single();
      const base = data.mode === "renew" && cur?.expires_at && new Date(cur.expires_at).getTime() > Date.now()
        ? new Date(cur.expires_at).getTime() : Date.now();
      const expires = new Date(base + pkg.duration_days * 86400_000).toISOString();
      await supabaseAdmin.from("property_package_purchases").update({
        package_id: pkg.id, status: "active", activated_at: new Date().toISOString(), expires_at: expires, pending_package_id: null,
      }).eq("id", purchase.id);
      await supabaseAdmin.from("properties").update({
        is_featured: pkg.is_featured, featured: pkg.is_featured, featured_until: pkg.is_featured ? expires : null,
      }).eq("id", purchase.property_id);
      return { free: true };
    }

    const stk = await initiateStkPush({
      phone: data.phone, amount: Number(pkg.price),
      accountReference: `PKG${purchase.property_id.slice(0, 8)}`,
      description: `${data.mode === "renew" ? "Renew" : "Upgrade"}: ${pkg.name}`.slice(0, 40),
      callbackUrl: `${site()}/api/public/mpesa-callback`,
    });
    const { data: txn, error } = await context.supabase.from("mpesa_transactions").insert({
      user_id: context.userId,
      phone_number: normalizeKePhone(data.phone),
      amount: Number(pkg.price),
      purpose: "listing_package",
      property_id: purchase.property_id,
      package_id: pkg.id,
      duration_days: pkg.duration_days,
      merchant_request_id: stk.MerchantRequestID,
      checkout_request_id: stk.CheckoutRequestID,
      status: "pending",
      metadata: { renewal_of: purchase.id, mode: data.mode } as any,
    } as any).select().single();
    if (error) throw error;
    return { checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage, txnId: txn.id };
  });

export const scheduleListingDowngrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ purchaseId: z.string().uuid(), packageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: purchase } = await context.supabase
      .from("property_package_purchases").select("id, owner_id, package_id, expires_at, listing_packages!property_package_purchases_package_id_fkey(price)")
      .eq("id", data.purchaseId).maybeSingle();
    if (!purchase || (purchase as any).owner_id !== context.userId) throw new Error("Not your listing");
    const { data: pkg } = await context.supabase.from("listing_packages").select("*").eq("id", data.packageId).eq("active", true).maybeSingle();
    if (!pkg) throw new Error("Package unavailable");
    if (Number(pkg.price) >= Number((purchase as any).listing_packages?.price ?? 0)) {
      throw new Error("Choose a cheaper package than your current one");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("property_package_purchases").update({ pending_package_id: pkg.id }).eq("id", purchase.id);
    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId, type: "listing_downgrade_scheduled",
      title: "Listing downgrade scheduled",
      body: `Your listing will switch to ${pkg.name} at the end of the current cycle.`,
      link: "/dashboard",
    });
    return { ok: true };
  });

export const cancelListingDowngrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ purchaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId, "property_package_purchases", data.purchaseId, "owner_id");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("property_package_purchases").update({ pending_package_id: null }).eq("id", data.purchaseId);
    return { ok: true };
  });

/** Latest active purchase per property, keyed by property id — for card CTAs. */
export const listMyActiveListingPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("property_package_purchases")
      .select("id, property_id, package_id, pending_package_id, status, expires_at, listing_packages!property_package_purchases_package_id_fkey(name, price, duration_days), pending_package:listing_packages!property_package_purchases_pending_package_id_fkey(name, price)")
      .eq("owner_id", context.userId)
      .in("status", ["active", "expired"])
      .order("created_at", { ascending: false });
    if (error) throw error;
    const byProp = new Map<string, any>();
    for (const row of data ?? []) if (!byProp.has(row.property_id)) byProp.set(row.property_id, row);
    return Array.from(byProp.values());
  });

// ── BLOG PACKAGES ────────────────────────────────────────────────────────────

const renewBlogSchema = z.object({
  postId: z.string().uuid(),
  packageId: z.string().uuid(),
  mode: z.enum(["renew", "upgrade"]),
  phone: z.string().min(9),
});

export const renewOrUpgradeBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => renewBlogSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { initiateStkPush, normalizeKePhone } = await import("./mpesa.server");
    const { data: post } = await context.supabase
      .from("blog_posts").select("id, author_id, title").eq("id", data.postId).maybeSingle();
    if (!post) throw new Error("Post not found");
    if (post.author_id !== context.userId) throw new Error("Not your post");
    const { data: pkg } = await context.supabase
      .from("blog_packages").select("*").eq("id", data.packageId).eq("active", true).maybeSingle();
    if (!pkg) throw new Error("Package unavailable");

    if (Number(pkg.price) === 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cur } = await supabaseAdmin.from("blog_posts").select("expires_at").eq("id", post.id).single();
      const base = data.mode === "renew" && cur?.expires_at && new Date(cur.expires_at).getTime() > Date.now()
        ? new Date(cur.expires_at).getTime() : Date.now();
      const expires = new Date(base + pkg.duration_days * 86400_000).toISOString();
      await supabaseAdmin.from("blog_posts").update({
        package_id: pkg.id, status: "published", expires_at: expires, is_sponsored: pkg.is_sponsored ?? false,
      }).eq("id", post.id);
      await supabaseAdmin.from("blog_post_purchases").insert({
        post_id: post.id, package_id: pkg.id, user_id: context.userId,
        amount_paid: 0, status: "active", activated_at: new Date().toISOString(), expires_at: expires,
      });
      return { free: true };
    }

    const stk = await initiateStkPush({
      phone: data.phone, amount: Number(pkg.price),
      accountReference: `BLG${post.id.slice(0, 8)}`,
      description: `${data.mode === "renew" ? "Renew" : "Upgrade"} blog: ${pkg.name}`.slice(0, 40),
      callbackUrl: `${site()}/api/public/mpesa-callback`,
    });
    const { data: txn, error } = await context.supabase.from("mpesa_transactions").insert({
      user_id: context.userId,
      phone_number: normalizeKePhone(data.phone),
      amount: Number(pkg.price),
      purpose: "blog_submission",
      blog_post_id: post.id, package_id: pkg.id, duration_days: pkg.duration_days,
      merchant_request_id: stk.MerchantRequestID, checkout_request_id: stk.CheckoutRequestID,
      status: "pending", metadata: { mode: data.mode, renewal: true } as any,
    } as any).select().single();
    if (error) throw error;
    await context.supabase.from("blog_post_purchases").insert({
      post_id: post.id, package_id: pkg.id, user_id: context.userId,
      mpesa_transaction_id: txn.id, amount_paid: Number(pkg.price), status: "pending",
    });
    return { checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage, txnId: txn.id };
  });

export const scheduleBlogDowngrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid(), packageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: post } = await context.supabase
      .from("blog_posts").select("id, author_id, package_id, blog_packages(price)").eq("id", data.postId).maybeSingle();
    if (!post || (post as any).author_id !== context.userId) throw new Error("Not your post");
    const { data: pkg } = await context.supabase.from("blog_packages").select("*").eq("id", data.packageId).eq("active", true).maybeSingle();
    if (!pkg) throw new Error("Package unavailable");
    if (Number(pkg.price) >= Number((post as any).blog_packages?.price ?? 0)) {
      throw new Error("Choose a cheaper package than your current one");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: active } = await supabaseAdmin
      .from("blog_post_purchases").select("id").eq("post_id", data.postId).eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!active) throw new Error("No active blog purchase to downgrade");
    await supabaseAdmin.from("blog_post_purchases").update({ pending_package_id: pkg.id }).eq("id", active.id);
    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId, type: "blog_downgrade_scheduled",
      title: "Blog downgrade scheduled",
      body: `Your post will switch to ${pkg.name} at the end of the current cycle.`,
      link: "/dashboard/blog",
    });
    return { ok: true };
  });

export const cancelBlogDowngrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: active } = await supabaseAdmin.from("blog_post_purchases")
      .select("id, user_id").eq("post_id", data.postId).eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!active || active.user_id !== context.userId) throw new Error("Not allowed");
    await supabaseAdmin.from("blog_post_purchases").update({ pending_package_id: null }).eq("id", active.id);
    return { ok: true };
  });

// ── AD CAMPAIGN PACKAGES ─────────────────────────────────────────────────────

const renewAdSchema = z.object({
  campaignId: z.string().uuid(),
  packageId: z.string().uuid(),
  mode: z.enum(["renew", "upgrade"]),
  phone: z.string().min(9),
});

export const renewOrUpgradeAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => renewAdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { initiateStkPush, normalizeKePhone } = await import("./mpesa.server");
    const { data: c } = await context.supabase.from("ad_campaigns").select("id, owner_id, title").eq("id", data.campaignId).maybeSingle();
    if (!c) throw new Error("Campaign not found");
    if (c.owner_id !== context.userId) throw new Error("Not your campaign");
    const { data: pkg } = await context.supabase.from("ad_packages").select("*").eq("id", data.packageId).eq("active", true).maybeSingle();
    if (!pkg) throw new Error("Package unavailable");

    if (Number(pkg.price) === 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cur } = await supabaseAdmin.from("ad_campaigns").select("expires_at").eq("id", c.id).single();
      const base = data.mode === "renew" && cur?.expires_at && new Date(cur.expires_at).getTime() > Date.now()
        ? new Date(cur.expires_at).getTime() : Date.now();
      const expires = new Date(base + pkg.duration_days * 86400_000).toISOString();
      await supabaseAdmin.from("ad_campaigns").update({
        package_id: pkg.id, placement: pkg.placement, status: "active",
        starts_at: new Date().toISOString(), expires_at: expires, pending_package_id: null,
      }).eq("id", c.id);
      return { free: true };
    }

    const stk = await initiateStkPush({
      phone: data.phone, amount: Number(pkg.price),
      accountReference: `AD${c.id.slice(0, 8)}`,
      description: `${data.mode === "renew" ? "Renew" : "Upgrade"} ad: ${pkg.name}`.slice(0, 40),
      callbackUrl: `${site()}/api/public/mpesa-callback`,
    });
    const { error } = await context.supabase.from("mpesa_transactions").insert({
      user_id: context.userId,
      phone_number: normalizeKePhone(data.phone),
      amount: Number(pkg.price),
      purpose: "advertisement",
      ad_campaign_id: c.id, duration_days: pkg.duration_days,
      merchant_request_id: stk.MerchantRequestID, checkout_request_id: stk.CheckoutRequestID,
      status: "pending", metadata: { mode: data.mode, renewal: true, package_id: pkg.id } as any,
    } as any);
    if (error) throw error;
    return { checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage };
  });

export const scheduleAdDowngrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string().uuid(), packageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: c } = await context.supabase
      .from("ad_campaigns").select("id, owner_id, package_id, ad_packages!ad_campaigns_package_id_fkey(price)")
      .eq("id", data.campaignId).maybeSingle();
    if (!c || (c as any).owner_id !== context.userId) throw new Error("Not your campaign");
    const { data: pkg } = await context.supabase.from("ad_packages").select("*").eq("id", data.packageId).eq("active", true).maybeSingle();
    if (!pkg) throw new Error("Package unavailable");
    if (Number(pkg.price) >= Number((c as any).ad_packages?.price ?? 0)) {
      throw new Error("Choose a cheaper package than your current one");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ad_campaigns").update({ pending_package_id: pkg.id }).eq("id", c.id);
    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId, type: "ad_downgrade_scheduled",
      title: "Ad downgrade scheduled",
      body: `Your ad will switch to ${pkg.name} at the end of the current cycle.`,
      link: "/dashboard/my-ads",
    });
    return { ok: true };
  });

export const cancelAdDowngrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId, "ad_campaigns", data.campaignId, "owner_id");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ad_campaigns").update({ pending_package_id: null }).eq("id", data.campaignId);
    return { ok: true };
  });

// ── SCAN RUNS (admin) ────────────────────────────────────────────────────────

export const adminListScanRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("scan_runs").select("*").order("ran_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const adminRunSubscriptionScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const started = Date.now();
    const { data: reminded, error: rErr } = await supabaseAdmin.rpc("send_subscription_reminders");
    if (rErr) {
      await supabaseAdmin.from("scan_runs").insert({
        ok: false, reminders_sent: 0, error_step: "reminders", error_message: rErr.message,
        duration_ms: Date.now() - started, triggered_by: "manual",
      });
      throw new Error(rErr.message);
    }
    const { error: eErr } = await supabaseAdmin.rpc("expire_listing_packages");
    if (eErr) {
      await supabaseAdmin.from("scan_runs").insert({
        ok: false, reminders_sent: reminded ?? 0, error_step: "expire", error_message: eErr.message,
        duration_ms: Date.now() - started, triggered_by: "manual",
      });
      throw new Error(eErr.message);
    }
    await supabaseAdmin.from("scan_runs").insert({
      ok: true, reminders_sent: reminded ?? 0,
      duration_ms: Date.now() - started, triggered_by: "manual",
    });
    return { ok: true, remindersSent: reminded ?? 0 };
  });
