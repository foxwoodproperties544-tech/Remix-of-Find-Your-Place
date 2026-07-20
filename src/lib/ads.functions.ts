import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PLACEMENTS = [
  "homepage_hero",
  "homepage_banner",
  "properties_top",
  "sidebar",
  "blog_inline",
] as const;

const packageSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional().nullable(),
  placement: z.enum(PLACEMENTS),
  price: z.coerce.number().min(0),
  duration_days: z.coerce.number().int().min(1).max(365),
  width_px: z.coerce.number().int().min(100).max(4000),
  height_px: z.coerce.number().int().min(50).max(4000),
  max_active: z.coerce.number().int().min(1).max(20),
  sort_order: z.coerce.number().int().default(0),
  active: z.boolean().default(true),
  badge_color: z.string().max(20).optional().nullable(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/* ============= PACKAGES ============= */

export const listActiveAdPackages = createServerFn({ method: "GET" }).handler(async () => {
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
    .from("ad_packages").select("*").eq("active", true).order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
});

export const adminListAdPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("ad_packages").select("*").order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

export const adminCreateAdPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => packageSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase.from("ad_packages").insert(data).select().single();
    if (error) throw error;
    return row;
  });

export const adminUpdateAdPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), patch: packageSchema.partial() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("ad_packages").update(data.patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteAdPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("ad_packages").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminToggleAdPackageActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("ad_packages").update({ active: data.active }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* ============= CAMPAIGNS ============= */

const campaignSchema = z.object({
  packageId: z.string().uuid(),
  title: z.string().min(2).max(120),
  image_url: z.string().url(),
  target_url: z.string().url(),
  phone: z.string().min(9),
});

/** Create a pending campaign + initiate M-Pesa payment (or free flow). */
export const startAdPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => campaignSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { initiateStkPush, normalizeKePhone } = await import("./mpesa.server");
    const { data: pkg } = await context.supabase
      .from("ad_packages").select("*").eq("id", data.packageId).eq("active", true).maybeSingle();
    if (!pkg) throw new Error("Ad package unavailable");

    // Insert pending campaign
    const { data: campaign, error: cErr } = await context.supabase.from("ad_campaigns").insert({
      owner_id: context.userId,
      package_id: pkg.id,
      placement: pkg.placement,
      title: data.title,
      image_url: data.image_url,
      target_url: data.target_url,
      status: Number(pkg.price) === 0 ? "pending_review" : "pending_payment",
      amount_paid: Number(pkg.price),
    }).select().single();
    if (cErr) throw cErr;

    if (Number(pkg.price) === 0) {
      return { free: true, campaignId: campaign.id };
    }

    const site = process.env.SITE_URL ?? "https://find-joy-list.lovable.app";
    const stk = await initiateStkPush({
      phone: data.phone,
      amount: Number(pkg.price),
      accountReference: `AD${campaign.id.slice(0, 8)}`,
      description: `Ad: ${pkg.name}`.slice(0, 40),
      callbackUrl: `${site}/api/public/mpesa-callback`,
    });

    const { data: txn, error: tErr } = await context.supabase.from("mpesa_transactions").insert({
      user_id: context.userId,
      phone_number: normalizeKePhone(data.phone),
      amount: Number(pkg.price),
      purpose: "advertisement",
      ad_campaign_id: campaign.id,
      duration_days: pkg.duration_days,
      merchant_request_id: stk.MerchantRequestID,
      checkout_request_id: stk.CheckoutRequestID,
      status: "pending",
    } as any).select().single();
    if (tErr) throw tErr;

    await context.supabase.from("ad_campaigns")
      .update({ mpesa_transaction_id: txn.id })
      .eq("id", campaign.id);

    return { free: false, campaignId: campaign.id, checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage };
  });

export const listMyCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ad_campaigns")
      .select("*, ad_packages(name, price, placement, duration_days, badge_color)")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminListCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("ad_campaigns")
      .select("*, ad_packages(name, price, placement, duration_days)")
      .order("created_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const adminApproveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: c } = await context.supabase
      .from("ad_campaigns").select("*, ad_packages(duration_days)").eq("id", data.id).single();
    if (!c) throw new Error("Not found");
    const days = c.ad_packages?.duration_days ?? 7;
    const now = new Date();
    const expires = new Date(now.getTime() + days * 86400_000).toISOString();
    const { error } = await context.supabase.from("ad_campaigns").update({
      status: "active",
      starts_at: now.toISOString(),
      expires_at: expires,
      admin_notes: null,
    }).eq("id", data.id);
    if (error) throw error;
    await context.supabase.from("notifications").insert({
      user_id: c.owner_id,
      type: "ad_approved",
      title: "Your ad is live",
      body: `"${c.title}" is now running until ${new Date(expires).toLocaleDateString()}.`,
      link: "/dashboard/my-ads",
    });
    return { ok: true };
  });

export const adminRejectCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), notes: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: c } = await context.supabase.from("ad_campaigns").select("owner_id,title").eq("id", data.id).single();
    const { error } = await context.supabase.from("ad_campaigns")
      .update({ status: "rejected", admin_notes: data.notes })
      .eq("id", data.id);
    if (error) throw error;
    if (c) {
      await context.supabase.from("notifications").insert({
        user_id: c.owner_id,
        type: "ad_rejected",
        title: "Ad rejected",
        body: `"${c.title}" was rejected: ${data.notes}`,
        link: "/dashboard/my-ads",
      });
    }
    return { ok: true };
  });

/* ============= PUBLIC RENDER + TRACKING ============= */

/** Fetch active ads for a placement (public; used by <AdSlot />). */
export const getActiveAds = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ placement: z.enum(PLACEMENTS) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("ad_campaigns")
      .select("id,title,image_url,target_url,placement")
      .eq("status", "active")
      .eq("placement", data.placement)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .limit(6);
    if (error) return [];
    return rows ?? [];
  });

/** Increment impression count (fire-and-forget from client). */
export const trackAdImpression = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("ad_campaigns").select("impressions").eq("id", data.id).maybeSingle();
    const next = (row?.impressions ?? 0) + 1;
    await supabaseAdmin.from("ad_campaigns").update({ impressions: next }).eq("id", data.id);
    return { ok: true };
  });

/** Register a click and return the target URL. */
export const trackAdClick = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("ad_campaigns").select("target_url,clicks").eq("id", data.id).single();
    if (!row) return { target: "/" };
    await supabaseAdmin.from("ad_campaigns").update({ clicks: (row.clicks ?? 0) + 1 }).eq("id", data.id);
    return { target: row.target_url };
  });
