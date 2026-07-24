import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const submitSchema = z.object({
  propertyId: z.string().uuid(),
  idDocumentUrl: z.string().url().optional(),
  titleDeedUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
});

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: prop } = await context.supabase
      .from("properties").select("id,owner_id").eq("id", data.propertyId).maybeSingle();
    if (!prop || prop.owner_id !== context.userId) throw new Error("Not your property");

    const { error } = await context.supabase.from("verification_requests").insert({
      property_id: data.propertyId,
      user_id: context.userId,
      id_document_url: data.idDocumentUrl,
      title_deed_url: data.titleDeedUrl,
      notes: data.notes,
    });
    if (error) throw error;
    return { ok: true };
  });

const decideSchema = z.object({
  requestId: z.string().uuid(),
  approve: z.boolean(),
  reviewerNotes: z.string().max(1000).optional(),
});

export const decideVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decideSchema.parse(d))
  .handler(async ({ data, context }) => {
    // must be admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: req } = await context.supabase
      .from("verification_requests").select("id,property_id").eq("id", data.requestId).maybeSingle();
    if (!req) throw new Error("Request not found");

    await context.supabase.from("verification_requests").update({
      status: data.approve ? "approved" : "rejected",
      reviewer_notes: data.reviewerNotes,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", data.requestId);

    if (data.approve && req.property_id) {
      await context.supabase.from("properties").update({
        verified: true, verified_at: new Date().toISOString(), verified_by: context.userId,
      }).eq("id", req.property_id);
    }

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: data.approve ? "verification.approve" : "verification.reject",
      entityType: "verification_request",
      entityId: data.requestId,
      summary: `Listing verification ${data.approve ? "approved" : "rejected"}`,
      metadata: { property_id: req.property_id, reviewer_notes: data.reviewerNotes },
    });
    return { ok: true };
  });
