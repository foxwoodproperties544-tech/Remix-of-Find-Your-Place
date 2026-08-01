import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Forbidden");
  return true;
}

/* ------------------------------- Fraud ops ------------------------------- */

const escalateSchema = z.object({
  reportId: z.string().uuid(),
  severity: z.enum(["normal", "high", "critical"]),
  internalNotes: z.string().trim().max(2000).optional(),
});

export const escalateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => escalateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("property_reports")
      .update({
        severity: data.severity,
        status: "reviewing",
        escalated_at: new Date().toISOString(),
        escalated_by: context.userId,
        internal_notes: data.internalNotes ?? null,
      })
      .eq("id", data.reportId);
    if (error) throw new Error(error.message);

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      action: "report.escalate",
      entityType: "property_report",
      entityId: data.reportId,
      summary: `Escalated report to ${data.severity}`,
    });
    return { ok: true };
  });

const suspendSchema = z.object({
  userId: z.string().uuid(),
  suspend: z.boolean(),
  reason: z.string().trim().max(1000).optional(),
});

export const setAgentSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => suspendSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.suspend && !data.reason?.trim()) throw new Error("A suspension reason is required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        suspended: data.suspend,
        suspended_at: data.suspend ? new Date().toISOString() : null,
        suspended_by: data.suspend ? context.userId : null,
        suspension_reason: data.suspend ? (data.reason ?? null) : null,
      })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    if (data.suspend) {
      await supabaseAdmin
        .from("properties")
        .update({ status: "draft" })
        .eq("owner_id", data.userId)
        .in("status", ["published", "approved", "active"]);
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      type: data.suspend ? "account_suspended" : "account_reinstated",
      title: data.suspend ? "Your account has been suspended" : "Your account has been reinstated",
      body: data.suspend
        ? `Reason: ${data.reason}. You can submit an appeal from your dashboard.`
        : "Your listings can be published again.",
      link: data.suspend ? "/dashboard/appeal" : "/dashboard",
    });

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      action: data.suspend ? "agent.suspend" : "agent.reinstate",
      entityType: "profile",
      entityId: data.userId,
      summary: data.reason ?? null,
    });
    return { ok: true };
  });

export const listSuspendedAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, company_name, suspended, suspended_at, suspension_reason")
      .eq("suspended", true)
      .order("suspended_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* -------------------------------- Appeals -------------------------------- */

export const submitAppeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ body: z.string().trim().min(20).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("agent_appeals")
      .insert({ user_id: context.userId, body: data.body, status: "pending" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyAppeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("agent_appeals")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAppeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("agent_appeals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const ids = [...new Set((data ?? []).map((a) => a.user_id))];
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name ?? "Unknown"]));
    }
    return (data ?? []).map((a) => ({ ...a, agent_name: names[a.user_id] ?? "Unknown" }));
  });

const decideSchema = z.object({
  appealId: z.string().uuid(),
  decision: z.enum(["approved", "declined"]),
  note: z.string().trim().max(2000).optional(),
});

export const decideAppeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decideSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: appeal } = await supabaseAdmin
      .from("agent_appeals")
      .select("id, user_id")
      .eq("id", data.appealId)
      .maybeSingle();
    if (!appeal) throw new Error("Appeal not found");

    const { error } = await supabaseAdmin
      .from("agent_appeals")
      .update({
        status: data.decision,
        decision_note: data.note ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.appealId);
    if (error) throw new Error(error.message);

    if (data.decision === "approved") {
      await supabaseAdmin
        .from("profiles")
        .update({ suspended: false, suspended_at: null, suspended_by: null, suspension_reason: null })
        .eq("id", appeal.user_id);
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: appeal.user_id,
      type: `appeal_${data.decision}`,
      title: data.decision === "approved" ? "Appeal approved" : "Appeal declined",
      body: data.note ?? (data.decision === "approved" ? "Your account has been reinstated." : "Your appeal was declined."),
      link: "/dashboard/appeal",
    });

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      action: `appeal.${data.decision}`,
      entityType: "agent_appeal",
      entityId: data.appealId,
      summary: data.note ?? null,
    });
    return { ok: true };
  });

/* --------------------- Read-only support (impersonation) ------------------ */

const snapshotSchema = z.object({
  email: z.string().trim().email().max(255),
  reason: z.string().trim().min(5).max(500),
});

export const getSupportSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => snapshotSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, company_name, phone, whatsapp, county, town, verified, suspended, suspension_reason, kyc_status, agent_verification_status, created_at")
      .eq("email_public", data.email)
      .limit(1);
    let profile: any = profs?.[0] ?? null;

    if (!profile) {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = users?.users?.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!match) throw new Error("No account found for that email");
      const { data: p2 } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, company_name, phone, whatsapp, county, town, verified, suspended, suspension_reason, kyc_status, agent_verification_status, created_at")
        .eq("id", match.id)
        .maybeSingle();
      profile = p2 ?? { id: match.id, full_name: null };
    }

    const [listings, viewings, offers, tickets] = await Promise.all([
      supabaseAdmin.from("properties").select("id, title, status, price, created_at").eq("owner_id", profile.id).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("viewings").select("id, status, requested_at").eq("requester_id", profile.id).order("requested_at", { ascending: false }).limit(10),
      supabaseAdmin.from("offers").select("id, status, amount, created_at").eq("buyer_id", profile.id).order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("support_tickets").select("id, subject, status, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(10),
    ]);

    await supabaseAdmin.from("support_sessions").insert({
      admin_id: context.userId,
      target_user_id: profile.id,
      reason: data.reason,
    });
    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      action: "support.view_account",
      entityType: "profile",
      entityId: profile.id,
      summary: data.reason,
    });

    return {
      profile,
      listings: listings.data ?? [],
      viewings: viewings.data ?? [],
      offers: offers.data ?? [],
      tickets: tickets.data ?? [],
    };
  });

export const listSupportSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("support_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
