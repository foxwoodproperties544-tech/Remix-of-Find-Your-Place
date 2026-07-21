import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const packageSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only"),
  description: z.string().max(1000).optional().nullable(),
  price: z.coerce.number().min(0),
  duration_days: z.coerce.number().int().min(1).max(3650),
  max_listings: z.coerce.number().int().min(1).max(9999),
  max_photos: z.coerce.number().int().min(1).max(200),
  max_videos: z.coerce.number().int().min(0).max(50),
  is_featured: z.boolean().default(false),
  homepage_placement: z.boolean().default(false),
  priority_search: z.boolean().default(false),
  category_highlight: z.boolean().default(false),
  analytics_enabled: z.boolean().default(false),
  whatsapp_button: z.boolean().default(true),
  lead_management: z.boolean().default(false),
  renewal_enabled: z.boolean().default(true),
  auto_expiry: z.boolean().default(true),
  active: z.boolean().default(true),
  sort_order: z.coerce.number().int().default(0),
  badge_color: z.string().max(20).optional().nullable(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

/** Public: list active packages (used by pricing / picker). */
export const listActivePackages = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await supabase
    .from("listing_packages")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
});

/** Admin: list all packages including inactive. */
export const adminListPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("listing_packages")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const adminCreatePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => packageSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase.from("listing_packages").insert(data).select().single();
    if (error) throw error;
    return row;
  });

export const adminUpdatePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), patch: packageSchema.partial() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("listing_packages").update(data.patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeletePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("listing_packages").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminTogglePackageActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("listing_packages").update({ active: data.active }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDuplicatePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: src, error } = await context.supabase.from("listing_packages").select("*").eq("id", data.id).single();
    if (error || !src) throw new Error("Package not found");
    const { id, created_at, updated_at, ...rest } = src as any;
    const copy = {
      ...rest,
      name: `${src.name} (copy)`,
      slug: `${src.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
      active: false,
    };
    const { data: row, error: e2 } = await context.supabase.from("listing_packages").insert(copy).select().single();
    if (e2) throw e2;
    return row;
  });

/** Owner: start M-Pesa payment for a package on a property. */
export const startPackagePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      propertyId: z.string().uuid(),
      packageId: z.string().uuid(),
      phone: z.string().min(9),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { initiateStkPush, normalizeKePhone } = await import("./mpesa.server");

    // Verify property ownership
    const { data: prop } = await context.supabase
      .from("properties").select("id,owner_id,title,status").eq("id", data.propertyId).maybeSingle();
    if (!prop) throw new Error("Property not found");
    if (prop.owner_id !== context.userId) throw new Error("Not your property");

    // Load package
    const { data: pkg } = await context.supabase
      .from("listing_packages").select("*").eq("id", data.packageId).eq("active", true).maybeSingle();
    if (!pkg) throw new Error("Package unavailable");

    // Free package shortcut
    if (Number(pkg.price) === 0) {
      const expires = new Date(Date.now() + pkg.duration_days * 86400_000).toISOString();
      await context.supabase.from("property_package_purchases").insert({
        property_id: prop.id,
        package_id: pkg.id,
        owner_id: context.userId,
        amount_paid: 0,
        status: "active",
        activated_at: new Date().toISOString(),
        expires_at: expires,
      });
      await context.supabase.from("properties").update({
        status: "pending",
        featured: pkg.is_featured,
        is_featured: pkg.is_featured,
        featured_until: pkg.is_featured ? expires : null,
      }).eq("id", prop.id);
      return { free: true };
    }

    const site = process.env.SITE_URL ?? "https://find-joy-list.lovable.app";
    const stk = await initiateStkPush({
      phone: data.phone,
      amount: Number(pkg.price),
      accountReference: `PKG${prop.id.slice(0, 8)}`,
      description: `Package: ${pkg.name}`,
      callbackUrl: `${site}/api/public/mpesa-callback`,
    });

    const { data: txn, error } = await context.supabase.from("mpesa_transactions").insert({
      user_id: context.userId,
      phone_number: normalizeKePhone(data.phone),
      amount: Number(pkg.price),
      purpose: "listing_package",
      property_id: prop.id,
      package_id: pkg.id,
      duration_days: pkg.duration_days,
      merchant_request_id: stk.MerchantRequestID,
      checkout_request_id: stk.CheckoutRequestID,
      status: "pending",
    }).select().single();
    if (error) throw error;

    // Create a pending purchase row (activated in the M-Pesa callback)
    await context.supabase.from("property_package_purchases").insert({
      property_id: prop.id,
      package_id: pkg.id,
      owner_id: context.userId,
      mpesa_transaction_id: txn.id,
      amount_paid: Number(pkg.price),
      status: "pending",
    });

    return { checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage, free: false };
  });

/** Owner: list purchases for one of their properties. */
export const listPropertyPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ propertyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("property_package_purchases")
      .select("*, listing_packages(name, slug, badge_color, price, duration_days)")
      .eq("property_id", data.propertyId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

/** Admin: list recent package purchases (for review / recovery). */
export const adminListRecentPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["all", "pending", "active", "expired"]).default("all") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("property_package_purchases")
      .select("*, listing_packages(name, price, duration_days), properties(title, status)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

/**
 * Admin: manually mark a pending purchase as paid.
 * Activates the purchase, moves the property to admin review, records a
 * synthetic M-Pesa receipt, and notifies the owner. Idempotent — a purchase
 * that is already active is left alone.
 */
export const adminMarkPurchasePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ purchaseId: z.string().uuid(), note: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: purchase, error: pErr } = await supabaseAdmin
      .from("property_package_purchases")
      .select("*, listing_packages(*)")
      .eq("id", data.purchaseId)
      .maybeSingle();
    if (pErr || !purchase) throw new Error("Purchase not found");
    if (purchase.status === "active") return { ok: true, alreadyActive: true };

    const pkg: any = purchase.listing_packages;
    const days = pkg?.duration_days ?? 30;
    const now = new Date();
    const expires = new Date(now.getTime() + days * 86400_000).toISOString();
    const receipt = `MANUAL-${now.getTime().toString(36).toUpperCase()}`;

    // Flip transaction, if any, to success (guarded — never override a real terminal state)
    if (purchase.mpesa_transaction_id) {
      await supabaseAdmin.from("mpesa_transactions").update({
        status: "success",
        mpesa_receipt: receipt,
        result_desc: `Marked paid by admin${data.note ? ` — ${data.note}` : ""}`,
      }).eq("id", purchase.mpesa_transaction_id).eq("status", "pending");
    }

    // Activate the purchase
    await supabaseAdmin.from("property_package_purchases").update({
      status: "active",
      activated_at: now.toISOString(),
      expires_at: expires,
    }).eq("id", purchase.id).neq("status", "active");

    // Push property to admin review with package perks
    await supabaseAdmin.from("properties").update({
      status: "pending",
      featured: pkg?.is_featured ?? false,
      is_featured: pkg?.is_featured ?? false,
      featured_until: pkg?.is_featured ? expires : null,
    }).eq("id", purchase.property_id);

    // Notify owner
    await supabaseAdmin.from("notifications").insert({
      user_id: purchase.owner_id,
      type: "payment_success",
      title: "Payment marked as received",
      body: `An admin marked your listing package payment as received. Ref: ${receipt}. Your listing is now awaiting review.`,
    });

    return { ok: true, receipt };
  });

