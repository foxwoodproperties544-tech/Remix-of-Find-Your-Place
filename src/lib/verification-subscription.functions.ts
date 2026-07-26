import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Monthly agent verification subscription. */
export const VERIFICATION_SUB_PRICE = 1000;
export const VERIFICATION_SUB_DAYS = 30;
/** Marker stored in mpesa_transactions.tier so the callback can route the payment. */
export const VERIFICATION_SUB_MARKER = "agent_verification_sub";

export type VerificationSubscription = {
  active: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  price: number;
  durationDays: number;
};

export const getVerificationSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VerificationSubscription> => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("verification_sub_started_at, verification_sub_expires_at")
      .eq("id", context.userId)
      .maybeSingle();

    const expiresAt = (prof as any)?.verification_sub_expires_at ?? null;
    const ms = expiresAt ? new Date(expiresAt).getTime() - Date.now() : null;
    return {
      active: ms !== null && ms > 0,
      startedAt: (prof as any)?.verification_sub_started_at ?? null,
      expiresAt,
      daysRemaining: ms === null ? null : Math.ceil(ms / 86400_000),
      price: VERIFICATION_SUB_PRICE,
      durationDays: VERIFICATION_SUB_DAYS,
    };
  });

const paySchema = z.object({ phone: z.string().min(9).max(15) });

/** Start (or renew) the KSh 1,000 / month verification subscription via M-Pesa STK push. */
export const startVerificationSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { initiateStkPush, normalizeKePhone } = await import("./mpesa.server");

    const stk = await initiateStkPush({
      phone: data.phone,
      amount: VERIFICATION_SUB_PRICE,
      accountReference: "FXVERIFY",
      description: "Agent verification - 30 days",
      callbackUrl: `${process.env.SITE_URL ?? "https://find-joy-list.lovable.app"}/api/public/mpesa-callback`,
    });

    const { error } = await context.supabase.from("mpesa_transactions").insert({
      user_id: context.userId,
      phone_number: normalizeKePhone(data.phone),
      amount: VERIFICATION_SUB_PRICE,
      purpose: "other",
      tier: VERIFICATION_SUB_MARKER,
      duration_days: VERIFICATION_SUB_DAYS,
      merchant_request_id: stk.MerchantRequestID,
      checkout_request_id: stk.CheckoutRequestID,
      status: "pending",
    });
    if (error) throw error;

    return { checkoutRequestId: stk.CheckoutRequestID, customerMessage: stk.CustomerMessage };
  });
