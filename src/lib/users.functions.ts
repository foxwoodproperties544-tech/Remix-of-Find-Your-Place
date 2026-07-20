import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ROLES = ["admin", "agent", "user", "owner", "buyer", "tenant", "developer"] as const;
type AppRole = (typeof ROLES)[number];

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Forbidden");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, company_name, verified, tier, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roles } = ids.length
      ? await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as { user_id: string; role: string }[] };

    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }

    // fetch emails via admin auth API (paged)
    const emailById = new Map<string, string>();
    try {
      const { data: page } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200, page: 1 });
      for (const u of page?.users ?? []) if (u.email) emailById.set(u.id, u.email);
    } catch { /* ignore */ }

    const rows = (profiles ?? []).map((p) => ({
      ...p,
      email: emailById.get(p.id) ?? null,
      roles: rolesByUser.get(p.id) ?? [],
    }));

    const q = data.q?.trim().toLowerCase();
    return q
      ? rows.filter((r) =>
          [r.full_name, r.email, r.company_name, r.phone].some((v) => v?.toLowerCase().includes(q)),
        )
      : rows;
  });

const roleMutation = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLES),
  action: z.enum(["add", "remove"]),
});

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => roleMutation.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.action === "add") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role as AppRole }, { onConflict: "user_id,role" });
      if (error) throw error;
    } else {
      if (data.role === "admin" && data.userId === context.userId) {
        throw new Error("You cannot remove your own admin role.");
      }
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw error;
    }
    return { ok: true };
  });

export const setUserVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), verified: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ verified: data.verified }).eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });
