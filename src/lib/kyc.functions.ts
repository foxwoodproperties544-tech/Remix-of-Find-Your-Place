import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const submitSchema = z.object({
  full_legal_name: z.string().trim().min(3).max(120),
  id_type: z.enum(["national_id", "passport", "alien_id"]).default("national_id"),
  id_number: z.string().trim().min(4).max(40),
  id_document_url: z.string().min(4),
  selfie_url: z.string().min(4),
  kra_pin: z.string().trim().max(20).optional().nullable(),
  kra_pin_certificate_url: z.string().min(4).optional().nullable(),
  business_permit_url: z.string().min(4).optional().nullable(),
  earb_license_number: z.string().trim().max(40).optional().nullable(),
  earb_license_url: z.string().min(4).optional().nullable(),
  company_name: z.string().trim().max(120).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Reject if there's already a pending or approved submission
    const { data: existing } = await context.supabase
      .from("kyc_submissions")
      .select("id,status")
      .eq("user_id", context.userId)
      .in("status", ["pending", "approved"])
      .maybeSingle();
    if (existing) throw new Error(`You already have a ${existing.status} KYC submission`);

    const { error } = await context.supabase.from("kyc_submissions").insert({
      user_id: context.userId,
      ...data,
    });
    if (error) throw error;
    return { ok: true };
  });

const decideSchema = z.object({
  submissionId: z.string().uuid(),
  approve: z.boolean(),
  reviewerNotes: z.string().max(1000).optional(),
});

export const decideKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decideSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { error } = await context.supabase.from("kyc_submissions").update({
      status: data.approve ? "approved" : "rejected",
      reviewer_notes: data.reviewerNotes,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", data.submissionId);
    if (error) throw error;
    return { ok: true };
  });
