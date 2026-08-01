import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { APPLICATION_STATUSES } from "./rentals";


async function rateLimit(context: any, bucket: string, limit: number, windowSeconds: number) {
  const { data, error } = await context.supabase.rpc("check_and_hit_rate_limit", {
    _bucket: bucket,
    _key: `u:${context.userId}`,
    _limit: limit,
    _window_seconds: windowSeconds,
  });
  if (error) return;
  if (data === false) throw new Error("Too many requests — please try again shortly.");
}

const applicationSchema = z.object({
  propertyId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(30),
  occupation: z.string().trim().max(120).optional(),
  employer: z.string().trim().max(160).optional(),
  monthlyIncome: z.number().min(0).max(1_000_000_000).optional(),
  moveInDate: z.string().trim().max(20).optional(),
  occupants: z.number().int().min(1).max(30),
  pets: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
  documents: z
    .array(z.object({ name: z.string().trim().max(160), url: z.string().trim().url().max(600) }))
    .max(6)
    .optional(),
});

/** Submit a rental application for a published rental listing. */
export const submitRentalApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => applicationSchema.parse(d))
  .handler(async ({ data, context }) => {
    await rateLimit(context, "rental_application", 10, 3600);

    const { data: property, error: pErr } = await context.supabase
      .from("properties")
      .select("id, owner_id, status, category")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!property || property.status !== "published") throw new Error("Listing not available");
    if (property.owner_id === context.userId) throw new Error("You cannot apply to your own listing");
    const cat = (property.category ?? "").toLowerCase();
    if (!cat.includes("rent") && !cat.includes("lease")) {
      throw new Error("Applications are only open on rental and lease listings");
    }

    const { data: existing } = await context.supabase
      .from("rental_applications")
      .select("id, status")
      .eq("property_id", data.propertyId)
      .eq("applicant_id", context.userId)
      .not("status", "in", "(withdrawn,rejected)")
      .maybeSingle();
    if (existing) throw new Error("You already have an open application for this listing");

    const { data: row, error } = await context.supabase
      .from("rental_applications")
      .insert({
        property_id: data.propertyId,
        applicant_id: context.userId,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        occupation: data.occupation ?? null,
        employer: data.employer ?? null,
        monthly_income: data.monthlyIncome ?? null,
        move_in_date: data.moveInDate || null,
        occupants: data.occupants,
        pets: data.pets,
        notes: data.notes ?? null,
        documents: (data.documents ?? []) as any,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: "rental_application.submit",
      entityType: "rental_application",
      entityId: (row as any)?.id ?? null,
      summary: `Rental application submitted for property ${data.propertyId}`,
    });

    return { ok: true, id: (row as any)?.id };
  });

/** Agent/admin review action, or applicant withdrawal. */
export const updateRentalApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(APPLICATION_STATUSES),
        reviewerNotes: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await rateLimit(context, "rental_application_update", 60, 300);

    const { data: before } = await context.supabase
      .from("rental_applications")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Application not found");

    const isApplicant = (before as any).applicant_id === context.userId;
    if (isApplicant && data.status !== "withdrawn") {
      throw new Error("You can only withdraw your own application");
    }

    const patch: Record<string, unknown> = { status: data.status };
    if (!isApplicant && data.reviewerNotes !== undefined) patch["reviewer_notes"] = data.reviewerNotes;

    const { error } = await context.supabase
      .from("rental_applications")
      .update(patch as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: "rental_application.status",
      entityType: "rental_application",
      entityId: data.id,
      summary: `Application status → ${data.status}`,
      before: { status: (before as any).status },
      after: patch,
    });

    return { ok: true };
  });
