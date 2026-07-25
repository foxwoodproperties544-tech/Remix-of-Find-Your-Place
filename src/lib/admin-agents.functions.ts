import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Forbidden");
}

const inviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  company_name: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  tier_slug: z.string().default("founding"),
  comp_reason: z.string().trim().max(500).optional(),
  send_invite: z.boolean().default(true),
});

/** Admin: invite/create an agent, grant Founding (or chosen) tier, verify profile. */
export const adminInviteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { writeAudit } = await import("./audit.server");

    // Fetch tier plan
    const { data: plan, error: planErr } = await supabaseAdmin
      .from("tier_plans")
      .select("slug, name, duration_days, listing_quota")
      .eq("slug", data.tier_slug)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!plan) throw new Error(`Tier "${data.tier_slug}" not found`);

    const origin =
      (context.claims as any)?.origin ??
      process.env.SITE_URL ??
      "https://find-joy-list.lovable.app";

    // Try to create user. If already exists, look them up.
    let userId: string | null = null;
    let created = false;

    const createRes = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        invited_as: "agent",
        invited_by: context.userId,
      },
    });

    if (createRes.error) {
      // If already registered, find them
      const msg = createRes.error.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        // Paginate to find by email
        for (let page = 1; page <= 10; page++) {
          const { data: pg } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200, page });
          const found = pg?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
          if (found) { userId = found.id; break; }
          if (!pg?.users?.length || pg.users.length < 200) break;
        }
        if (!userId) throw new Error("User exists but could not be located");
      } else {
        throw createRes.error;
      }
    } else {
      userId = createRes.data.user!.id;
      created = true;
    }

    // Send magic-link invite (optional, only if requested and newly created OR requested for existing)
    if (data.send_invite) {
      try {
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: data.email,
          options: { redirectTo: `${origin}/dashboard` },
        });
      } catch { /* non-fatal */ }
    }

    // Update profile — the handle_new_user trigger creates the row on signup, so upsert.
    const now = new Date().toISOString();
    const expires = plan.duration_days
      ? new Date(Date.now() + plan.duration_days * 86400_000).toISOString()
      : null;

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: data.full_name,
          phone: data.phone ?? null,
          whatsapp: data.whatsapp ?? null,
          company_name: data.company_name ?? null,
          bio: data.bio ?? null,
          verified: true,
          tier: plan.slug,
          tier_expires_at: expires,
          listing_quota: plan.listing_quota ?? 20,
          subscription_started_at: now,
          subscription_suspended: false,
          last_expiry_reminder_days: null,
          comp_reason: data.comp_reason ?? "Admin invite — founding agent",
          comp_granted_by: context.userId,
          comp_granted_at: now,
        },
        { onConflict: "id" },
      );
    if (pErr) throw pErr;

    // Grant agent role
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "agent" }, { onConflict: "user_id,role" });
    if (rErr) throw rErr;

    // Welcome notification
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "welcome_agent",
      title: `Welcome to Foxwood — ${plan.name}`,
      body: `You've been invited as an agent with a complimentary ${plan.name} plan${
        expires ? ` valid until ${new Date(expires).toDateString()}` : ""
      }. Start posting listings — no payment required.`,
      link: "/dashboard",
    });

    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: created ? "agent.invite" : "agent.grant_comp",
      entityType: "user",
      entityId: userId!,
      summary: `${created ? "Invited new agent" : "Granted comp to existing user"} (${data.email}) → ${plan.name}`,
      metadata: { tier: plan.slug, expires_at: expires, reason: data.comp_reason ?? null },
    });

    return { ok: true, userId, created, tier: plan.slug, expires_at: expires };
  });

/** Admin: list users currently on a comp/founding plan. */
export const listCompAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, phone, company_name, tier, tier_expires_at, comp_reason, comp_granted_at, comp_granted_by, verified",
      )
      .not("comp_granted_at", "is", null)
      .order("comp_granted_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

/** Admin: revoke comp (reset to free). */
export const revokeCompAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { writeAudit } = await import("./audit.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        tier: "free",
        tier_expires_at: null,
        pending_tier: null,
        comp_reason: null,
        comp_granted_by: null,
        comp_granted_at: null,
      })
      .eq("id", data.userId);
    if (error) throw error;
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: "agent.revoke_comp",
      entityType: "user",
      entityId: data.userId,
      summary: "Revoked complimentary agent plan",
    });
    return { ok: true };
  });
