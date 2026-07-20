import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Forbidden");
}

const rangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).optional();

export const getPlatformAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const to = data?.to ?? new Date().toISOString();
    const from = data?.from ?? new Date(Date.now() - 30 * 864e5).toISOString();

    const inRange = <T extends { gte: any; lte: any }>(q: T) => q.gte("created_at", from).lte("created_at", to);

    const [
      propsAll, propsPub, propsPend, propsRej, propsFeat, propsVer,
      leadsAll, leadsNew, leadsWon,
      viewingsAll, viewingsPending,
      inquiriesRange,
      viewsRange,
      usersAll, agents, verifiedProfiles,
      usersInRange,
      recentProps,
    ] = await Promise.all([
      inRange(supabaseAdmin.from("properties").select("id", { count: "exact", head: true })),
      inRange(supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("status", "published")),
      inRange(supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("status", "pending")),
      inRange(supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("status", "rejected")),
      inRange(supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("is_featured", true)),
      inRange(supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("verified", true)),
      inRange(supabaseAdmin.from("leads").select("id", { count: "exact", head: true })),
      inRange(supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new")),
      inRange(supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("status", "won")),
      inRange(supabaseAdmin.from("viewings").select("id", { count: "exact", head: true })),
      inRange(supabaseAdmin.from("viewings").select("id", { count: "exact", head: true }).eq("status", "pending")),
      inRange(supabaseAdmin.from("inquiries").select("id", { count: "exact", head: true })),
      inRange(supabaseAdmin.from("property_views").select("id", { count: "exact", head: true })),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "agent"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("verified", true),
      inRange(supabaseAdmin.from("profiles").select("id", { count: "exact", head: true })),
      inRange(supabaseAdmin.from("properties").select("id,title,slug,status,created_at,owner_id").order("created_at", { ascending: false }).limit(8)),
    ]);

    return {
      range: { from, to },
      properties: {
        total: propsAll.count ?? 0,
        published: propsPub.count ?? 0,
        pending: propsPend.count ?? 0,
        rejected: propsRej.count ?? 0,
        featured: propsFeat.count ?? 0,
        verified: propsVer.count ?? 0,
      },
      leads: {
        total: leadsAll.count ?? 0,
        new: leadsNew.count ?? 0,
        won: leadsWon.count ?? 0,
      },
      viewings: {
        total: viewingsAll.count ?? 0,
        pending: viewingsPending.count ?? 0,
      },
      engagement: {
        inquiries: inquiriesRange.count ?? 0,
        views: viewsRange.count ?? 0,
      },
      users: {
        total: usersAll.count ?? 0,
        newInRange: usersInRange.count ?? 0,
        agents: agents.count ?? 0,
        verified: verifiedProfiles.count ?? 0,
      },
      recentListings: recentProps.data ?? [],
    };
  });
