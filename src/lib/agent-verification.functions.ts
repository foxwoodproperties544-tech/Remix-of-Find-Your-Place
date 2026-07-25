import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const requestSchema = z.object({
  idDocumentUrl: z.string().url().optional(),
  licenseUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
});

/** Agent submits (or resubmits) a verification request. Requires a complete profile with a verified phone. */
export const requestAgentVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => requestSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("id, phone_verified, profile_completed_at, agent_verification_status")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!profile) throw new Error("Profile not found");
    if (!profile.profile_completed_at) {
      throw new Error("Complete every required profile field before requesting verification.");
    }
    if (!profile.phone_verified) {
      throw new Error("Verify your phone number before requesting verification.");
    }
    if (profile.agent_verification_status === "pending") {
      throw new Error("Your verification is already pending review.");
    }
    if (profile.agent_verification_status === "approved") {
      throw new Error("You are already verified.");
    }

    const { error: uErr } = await context.supabase
      .from("profiles")
      .update({
        agent_verification_status: "pending",
        agent_verification_requested_at: new Date().toISOString(),
        agent_verification_id_url: data.idDocumentUrl ?? null,
        agent_verification_license_url: data.licenseUrl ?? null,
        agent_verification_reviewer_notes: data.notes ?? null,
        agent_verification_reviewed_at: null,
        agent_verification_reviewed_by: null,
      })
      .eq("id", context.userId);
    if (uErr) throw uErr;
    return { ok: true };
  });

const decideSchema = z.object({
  userId: z.string().uuid(),
  approve: z.boolean(),
  reviewerNotes: z.string().max(1000).optional(),
});

export const decideAgentVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decideSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = {
      agent_verification_status: data.approve ? "approved" : "rejected",
      agent_verification_reviewed_at: new Date().toISOString(),
      agent_verification_reviewed_by: context.userId,
      agent_verification_reviewer_notes: data.reviewerNotes ?? null,
      ...(data.approve ? { verified: true } : {}),
    };
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw error;

    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      type: data.approve ? "agent_verified" : "agent_verification_rejected",
      title: data.approve ? "You're a verified agent 🎉" : "Verification needs changes",
      body: data.approve
        ? "Your public profile now shows the Foxwood Verified Agent badge."
        : (data.reviewerNotes ?? "Please review the reviewer notes and resubmit."),
      link: data.approve ? "/dashboard/profile" : "/dashboard/profile",
    });

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: data.approve ? "agent.verify" : "agent.verify.reject",
      entityType: "user",
      entityId: data.userId,
      summary: data.approve ? "Approved agent verification" : "Rejected agent verification",
      metadata: { reviewer_notes: data.reviewerNotes ?? null },
    });
    return { ok: true };
  });

export const listPendingAgentVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, company_name, phone, avatar_url, county, town, agent_verification_status, agent_verification_requested_at, agent_verification_id_url, agent_verification_license_url, agent_verification_reviewer_notes, license_number, years_experience")
      .eq("agent_verification_status", "pending")
      .order("agent_verification_requested_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });
