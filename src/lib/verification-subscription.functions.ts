import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Monthly agent verification subscription. */
export const VERIFICATION_SUB_PRICE = 1000;
export const VERIFICATION_SUB_DAYS = 30;
/** Marker stored in mpesa_transactions.tier so the callback can route the payment. */
export const VERIFICATION_SUB_MARKER = "agent_verification_sub";

export type VerificationPayment = {
  id: string;
  amount: number;
  status: string;
  receipt: string | null;
  phone: string | null;
  paidAt: string | null;
};

export type VerificationSubscription = {
  active: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  daysRemaining: number | null;
  price: number;
  durationDays: number;
  lastRenewedAt: string | null;
  payments: VerificationPayment[];
};

export const getVerificationSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VerificationSubscription> => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("verification_sub_started_at, verification_sub_expires_at")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: txns } = await context.supabase
      .from("mpesa_transactions")
      .select("id, amount, status, mpesa_receipt, phone_number, created_at, updated_at")
      .eq("user_id", context.userId)
      .eq("tier", VERIFICATION_SUB_MARKER)
      .order("created_at", { ascending: false })
      .limit(24);

    const payments: VerificationPayment[] = (txns ?? []).map((t: any) => ({
      id: t.id,
      amount: Number(t.amount ?? 0),
      status: t.status,
      receipt: t.mpesa_receipt ?? null,
      phone: t.phone_number ?? null,
      paidAt: t.updated_at ?? t.created_at ?? null,
    }));

    const expiresAt = (prof as any)?.verification_sub_expires_at ?? null;
    const ms = expiresAt ? new Date(expiresAt).getTime() - Date.now() : null;
    return {
      active: ms !== null && ms > 0,
      startedAt: (prof as any)?.verification_sub_started_at ?? null,
      expiresAt,
      daysRemaining: ms === null ? null : Math.ceil(ms / 86400_000),
      price: VERIFICATION_SUB_PRICE,
      durationDays: VERIFICATION_SUB_DAYS,
      lastRenewedAt: payments.find((p) => p.status === "success")?.paidAt ?? null,
      payments,
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
      callbackUrl: `${process.env.SITE_URL ?? "https://foxwoodproperties-co-ke.lovable.app"}/api/public/mpesa-callback`,
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
