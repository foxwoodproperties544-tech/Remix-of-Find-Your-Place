import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const featureSchema = z.object({
  propertyId: z.string().uuid(),
  planId: z.enum(["featured_week", "featured_month"]),
  phone: z.string().min(9),
});

const tierSchema = z.object({
  tier: z.string().min(1),
  phone: z.string().min(9),
});


const verifySchema = z.object({
  propertyId: z.string().uuid(),
  phone: z.string().min(9),
});

const callbackUrlDefault = () => {
  const site = process.env.SITE_URL ?? "https://find-joy-list.lovable.app";
  return `${site}/api/public/mpesa-callback`;
};

/** Feature a specific property (STK Push). */
export const startFeaturedPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => featureSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { FEATURED_PLANS } = await import("./pricing");
    const { initiateStkPush, normalizeKePhone } = await import("./mpesa.server");
    const plan = FEATURED_PLANS.find((p) => p.id === data.planId)!;

    // Verify property belongs to caller
    const { data: prop, error: pErr } = await context.supabase
      .from("properties").select("id,owner_id,title").eq("id", data.propertyId).maybeSingle();
    if (pErr || !prop) throw new Error("Property not found");
    if (prop.owner_id !== context.userId) throw new Error("Not your property");

    const stk = await initiateStkPush({
      phone: data.phone,
      amount: plan.price,
      accountReference: `FX${prop.id.slice(0, 8)}`,
      description: `Feature: ${plan.label}`,
      callbackUrl: callbackUrlDefault(),
    });

    const { error } = await context.supabase.from("mpesa_transactions").insert({
      user_id: context.userId,
      phone_number: normalizeKePhone(data.phone),
      amount: plan.price,
      purpose: "feature_listing",
      property_id: prop.id,
      duration_days: plan.days,
      merchant_request_id: stk.MerchantRequestID,
      checkout_request_id: stk.CheckoutRequestID,
      status: "pending",
    });
    if (error) throw error;
    return { checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage };
  });

/** Upgrade agent tier (STK Push). Free tier activates immediately, promotes to agent role. */
export const startTierUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tierSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: plan, error: pErr } = await context.supabase
      .from("tier_plans").select("*").eq("slug", data.tier).eq("active", true).maybeSingle();
    if (pErr || !plan) throw new Error("Plan unavailable");

    // Free tier — activate immediately, no STK.
    if (Number(plan.price) === 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const expires = new Date(Date.now() + (plan.duration_days ?? 30) * 86400_000).toISOString();
      await supabaseAdmin.from("profiles").update({
        tier: plan.slug as any,
        tier_expires_at: expires,
        listing_quota: plan.listing_quota,
      }).eq("id", context.userId);
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: context.userId, role: "agent" as any },
        { onConflict: "user_id,role" }
      );
      return { checkoutRequestId: "free", customerMessage: "Plan activated" };
    }

    const { initiateStkPush, normalizeKePhone } = await import("./mpesa.server");
    const stk = await initiateStkPush({
      phone: data.phone,
      amount: Number(plan.price),
      accountReference: `TIER${plan.slug.toUpperCase()}`,
      description: `${plan.name} tier - ${plan.duration_days} days`,
      callbackUrl: callbackUrlDefault(),
    });

    const { error } = await context.supabase.from("mpesa_transactions").insert({
      user_id: context.userId,
      phone_number: normalizeKePhone(data.phone),
      amount: Number(plan.price),
      purpose: "upgrade_tier",
      tier: plan.slug as any,
      duration_days: plan.duration_days ?? 30,
      merchant_request_id: stk.MerchantRequestID,
      checkout_request_id: stk.CheckoutRequestID,
      status: "pending",
    });
    if (error) throw error;
    return { checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage };
  });


/** Pay verification fee for a property. */
export const startVerificationPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => verifySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { VERIFICATION_FEE } = await import("./pricing");
    const { initiateStkPush, normalizeKePhone } = await import("./mpesa.server");
    const { data: prop } = await context.supabase
      .from("properties").select("id,owner_id").eq("id", data.propertyId).maybeSingle();
    if (!prop || prop.owner_id !== context.userId) throw new Error("Not your property");

    const stk = await initiateStkPush({
      phone: data.phone,
      amount: VERIFICATION_FEE,
      accountReference: `VER${prop.id.slice(0, 8)}`,
      description: `Verification fee`,
      callbackUrl: callbackUrlDefault(),
    });

    await context.supabase.from("mpesa_transactions").insert({
      user_id: context.userId,
      phone_number: normalizeKePhone(data.phone),
      amount: VERIFICATION_FEE,
      purpose: "verification_fee",
      property_id: prop.id,
      merchant_request_id: stk.MerchantRequestID,
      checkout_request_id: stk.CheckoutRequestID,
      status: "pending",
    });
    return { checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage };
  });

/** Poll a payment status (used by UI to show success without waiting for callback). */
export const getPaymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ checkoutRequestId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("mpesa_transactions")
      .select("status,result_desc,mpesa_receipt,purpose,property_id,tier")
      .eq("checkout_request_id", data.checkoutRequestId)
      .maybeSingle();
    return row;
  });
