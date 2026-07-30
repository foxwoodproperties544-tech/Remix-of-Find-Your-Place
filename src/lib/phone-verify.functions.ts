import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash, randomInt } from "crypto";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function hashCode(code: string, userId: string) {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "+254" + digits.slice(1);
  if (digits.startsWith("254")) return "+" + digits;
  return digits.startsWith("+") ? digits : "+" + digits;
}

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string }) => z.object({ phone: z.string().min(7).max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    if (!/^\+\d{10,15}$/.test(phone)) throw new Error("Enter a valid phone number (e.g. +254712345678)");

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
    const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM;
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM) {
      throw new Error("SMS is not configured yet. Please contact support.");
    }

    // Rate limit: max 3 OTP requests / 15 min per user
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await context.supabase
      .from("phone_verifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("sent_at", since);
    if ((count ?? 0) >= 3) throw new Error("Too many requests. Try again in a few minutes.");

    const code = String(randomInt(100000, 999999));
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insErr } = await supabaseAdmin.from("phone_verifications").insert({
      user_id: context.userId,
      phone,
      code_hash: hashCode(code, context.userId),
      expires_at,
    });
    if (insErr) throw new Error(insErr.message);

    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: TWILIO_FROM,
        Body: `Foxwood Properties verification code: ${code}. Valid for 10 minutes. Do not share.`,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Twilio send failed [${res.status}]: ${body}`);
      throw new Error(`Could not send SMS. Please try again.`);
    }

    return { ok: true, phone };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) =>
    z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("phone_verifications")
      .select("id, phone, code_hash, attempts, expires_at, verified_at")
      .eq("user_id", context.userId)
      .is("verified_at", null)
      .order("sent_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const row = rows?.[0];
    if (!row) throw new Error("No pending verification. Send a new code.");
    if (new Date(row.expires_at) < new Date()) throw new Error("Code expired. Send a new one.");
    if (row.attempts >= 5) throw new Error("Too many attempts. Send a new code.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const match = hashCode(data.code, context.userId) === row.code_hash;
    if (!match) {
      await supabaseAdmin
        .from("phone_verifications")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Incorrect code. Try again.");
    }

    await supabaseAdmin
      .from("phone_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", row.id);

    await supabaseAdmin
      .from("profiles")
      .update({
        phone: row.phone,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
      })
      .eq("id", context.userId);

    return { ok: true, phone: row.phone };
  });

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
