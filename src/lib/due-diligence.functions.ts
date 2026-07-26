import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const submitSchema = z.object({
  service: z.enum(["land_search", "title_verification", "survey", "valuation"]),
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20).regex(/^[0-9+()\-\s]+$/, "Invalid phone number"),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  county: z.string().trim().max(60).optional().or(z.literal("")),
  property_ref: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

function callerIp(): string | null {
  try {
    const h = getRequest()?.headers;
    return (
      h?.get("cf-connecting-ip") ??
      h?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h?.get("x-real-ip") ??
      null
    );
  } catch {
    return null;
  }
}

/** Resolve the signed-in user from the bearer token when present. Guests stay anonymous. */
async function optionalUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const header = getRequest()?.headers?.get("authorization");
    if (!header?.startsWith("Bearer ")) return null;
    const token = header.slice(7);
    if (token.split(".").length !== 3) return null;
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(process.env.SUPABASE_URL!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data, error } = await client.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return { id: String(data.claims.sub), email: (data.claims as any).email ?? null };
  } catch {
    return null;
  }
}

/**
 * Public (guest-friendly) due-diligence request endpoint.
 * Input is validated with Zod, throttled per user/IP, and every submission is audited.
 */
export const submitDueDiligenceRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    const user = await optionalUser();
    const ip = callerIp();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allowed } = await supabaseAdmin.rpc("check_and_hit_rate_limit", {
      _bucket: "due_diligence_submit",
      _key: user ? `u:${user.id}` : `ip:${ip ?? "unknown"}`,
      _limit: 5,
      _window_seconds: 3600,
    });
    if (allowed === false) {
      throw new Error("Too many requests. Please try again in an hour or call our support line.");
    }

    const { data: row, error } = await supabaseAdmin
      .from("due_diligence_requests")
      .insert({
        user_id: user?.id ?? null,
        service: data.service,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        county: data.county || null,
        property_ref: data.property_ref || null,
        message: data.message || null,
      })
      .select("id")
      .maybeSingle();
    if (error) throw error;

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? data.email ?? null,
      action: "due_diligence.submit",
      entityType: "due_diligence_request",
      entityId: (row as any)?.id ?? null,
      summary: `Due-diligence request submitted (${data.service})`,
      after: { service: data.service, county: data.county || null, property_ref: data.property_ref || null },
      metadata: { guest: !user },
    });

    return { ok: true };
  });
