import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePhone, validatePhone } from "@/lib/phone";

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
    const invalid = validatePhone(data.phone);
    if (invalid) throw new Error(invalid);
    const phone = normalizePhone(data.phone);

    const { data: taken, error: dupErr } = await context.supabase.rpc("phone_in_use" as any, {
      _phone: phone,
    });
    if (dupErr) throw new Error(dupErr.message);
    if (taken) throw new Error("That phone number is already linked to another Foxwood account.");

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
