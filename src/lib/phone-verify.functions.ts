import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "+254" + digits.slice(1);
  if (digits.startsWith("254")) return "+" + digits;
  return digits.startsWith("+") ? digits : "+" + digits;
}

export const getPhoneVerifyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("phone, phone_verified, phone_verified_at")
      .eq("id", context.userId)
      .maybeSingle();
    return data ?? { phone: null, phone_verified: false, phone_verified_at: null };
  });

export const savePhoneNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string }) =>
    z.object({ phone: z.string().trim().min(7).max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    if (!/^\+\d{9,15}$/.test(phone)) throw new Error("Enter a valid phone number (e.g. +254712345678)");

    const { error } = await context.supabase
      .from("profiles")
      .update({
        phone,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    return { ok: true, phone };
  });
