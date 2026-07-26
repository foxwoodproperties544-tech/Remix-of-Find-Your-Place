import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Shared admin gate — every mutation below re-checks the caller's role server-side. */
async function assertAdmin(context: any) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Could not verify permissions");
  if (!isAdmin) throw new Error("Forbidden: admin role required");
  return { actorId: context.userId as string, actorEmail: (context.claims as any)?.email ?? null };
}

/* ------------------------------------------------------------------ */
/* Verification scoring                                                */
/* ------------------------------------------------------------------ */

const checkSchema = z.object({
  propertyId: z.string().uuid(),
  criterionKey: z.string().trim().min(1).max(64),
  passed: z.boolean(),
  notes: z.string().trim().max(1000).optional(),
});

export const setVerificationCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => checkSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(context);

    const { data: before } = await context.supabase
      .from("property_verification_checks")
      .select("id, passed, notes")
      .eq("property_id", data.propertyId)
      .eq("criterion_key", data.criterionKey)
      .maybeSingle();

    const payload = {
      property_id: data.propertyId,
      criterion_key: data.criterionKey,
      passed: data.passed,
      notes: data.notes ?? null,
      checked_by: actor.actorId,
      checked_at: new Date().toISOString(),
    };

    const { error } = before
      ? await context.supabase.from("property_verification_checks").update(payload).eq("id", before.id)
      : await context.supabase.from("property_verification_checks").insert(payload);
    if (error) throw error;

    const { data: score } = await context.supabase.rpc("property_verification_score", {
      _property_id: data.propertyId,
    });

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      action: "verification_score.update",
      entityType: "property",
      entityId: data.propertyId,
      summary: `Verification check "${data.criterionKey}" set to ${data.passed ? "passed" : "failed"}`,
      before: before ?? null,
      after: payload,
      metadata: { score: (score as any)?.[0] ?? score ?? null },
    });

    return { ok: true, score: (score as any)?.[0] ?? null };
  });

/* ------------------------------------------------------------------ */
/* Investment scoring                                                  */
/* ------------------------------------------------------------------ */

const ratingSchema = z.object({
  propertyId: z.string().uuid(),
  factorKey: z.string().trim().min(1).max(64),
  value: z.number().min(0).max(10),
});

export const setInvestmentRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ratingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(context);

    const { data: before } = await context.supabase
      .from("property_investment_ratings")
      .select("id, value")
      .eq("property_id", data.propertyId)
      .eq("factor_key", data.factorKey)
      .maybeSingle();

    const payload = {
      property_id: data.propertyId,
      factor_key: data.factorKey,
      value: data.value,
    };

    const { error } = before
      ? await context.supabase.from("property_investment_ratings").update(payload).eq("id", before.id)
      : await context.supabase.from("property_investment_ratings").insert(payload);
    if (error) throw error;

    const { data: score } = await context.supabase.rpc("property_investment_score", {
      _property_id: data.propertyId,
    });

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      action: "investment_score.update",
      entityType: "property",
      entityId: data.propertyId,
      summary: `Investment factor "${data.factorKey}" rated ${data.value}/10`,
      before: before ?? null,
      after: payload,
      metadata: { score },
    });

    return { ok: true, score };
  });

/* ------------------------------------------------------------------ */
/* Area guides                                                         */
/* ------------------------------------------------------------------ */

const guideSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and dashes"),
  name: z.string().trim().min(2).max(120),
  level: z.enum(["county", "town"]).default("town"),
  county: z.string().trim().max(80).optional(),
  town: z.string().trim().max(80).optional(),
  hero_image: z.string().url().max(500).optional().or(z.literal("")),
  overview: z.string().trim().max(6000).optional(),
  market_overview: z.string().trim().max(6000).optional(),
  average_prices: z.string().trim().max(2000).optional(),
  schools: z.string().trim().max(2000).optional(),
  hospitals: z.string().trim().max(2000).optional(),
  shopping: z.string().trim().max(2000).optional(),
  transport: z.string().trim().max(2000).optional(),
  security: z.string().trim().max(2000).optional(),
  utilities: z.string().trim().max(2000).optional(),
  internet: z.string().trim().max(2000).optional(),
  lifestyle: z.string().trim().max(2000).optional(),
  attractions: z.string().trim().max(2000).optional(),
  published: z.boolean().default(false),
});

export const upsertAreaGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => guideSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(context);
    const { id, ...fields } = data;

    let before: unknown = null;
    if (id) {
      const { data: row } = await context.supabase.from("area_guides").select("*").eq("id", id).maybeSingle();
      before = row ?? null;
    }

    const query = id
      ? context.supabase.from("area_guides").update(fields as any).eq("id", id).select("id").maybeSingle()
      : context.supabase.from("area_guides").insert(fields as any).select("id").maybeSingle();

    const { data: saved, error } = await query;
    if (error) throw error;

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      action: id ? "area_guide.update" : "area_guide.create",
      entityType: "area_guide",
      entityId: (saved as any)?.id ?? id ?? null,
      summary: `${id ? "Updated" : "Created"} area guide "${data.name}" (${data.published ? "published" : "draft"})`,
      before,
      after: fields,
    });

    return { ok: true, id: (saved as any)?.id ?? id };
  });

/* ------------------------------------------------------------------ */
/* Due-diligence request moderation                                    */
/* ------------------------------------------------------------------ */

const ddStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["new", "in_progress", "completed", "cancelled"]),
  adminNotes: z.string().trim().max(2000).optional(),
});

export const updateDueDiligenceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ddStatusSchema.parse(d))
  .handler(async ({ data, context }) => {
    const actor = await assertAdmin(context);

    const { data: before } = await context.supabase
      .from("due_diligence_requests")
      .select("id, status, admin_notes")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!before) throw new Error("Request not found");

    const { error } = await context.supabase
      .from("due_diligence_requests")
      .update({ status: data.status, admin_notes: data.adminNotes ?? null })
      .eq("id", data.requestId);
    if (error) throw error;

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: actor.actorId,
      actorEmail: actor.actorEmail,
      action: "due_diligence.status_change",
      entityType: "due_diligence_request",
      entityId: data.requestId,
      summary: `Due-diligence request moved to "${data.status}"`,
      before,
      after: { status: data.status, admin_notes: data.adminNotes ?? null },
    });

    return { ok: true };
  });

/** Admin-only listing of due-diligence requests. */
export const listDueDiligenceRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.string().max(40).optional(), limit: z.number().int().min(1).max(200).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("due_diligence_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });
