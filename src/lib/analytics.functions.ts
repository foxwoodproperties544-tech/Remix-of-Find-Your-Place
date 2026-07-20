import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Forbidden");
}

export const getPlatformAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - 30 * 864e5).toISOString();

    const [
      propsAll, propsPub, propsPend, propsRej, propsFeat, propsVer,
      leadsAll, leadsNew, leadsWon,
      viewingsAll, viewingsPending,
      inquiries30,
      views30,
      usersAll, agents, verifiedProfiles,
      recentProps, topProps,
    ] = await Promise.all([
      supabaseAdmin.from("properties").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("is_featured", true),
      supabaseAdmin.from("properties").select("id", { count: "exact", head: true }).eq("verified", true),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("status", "won"),
      supabaseAdmin.from("viewings").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("viewings").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("inquiries").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("property_views").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "agent"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("verified", true),
      supabaseAdmin.from("properties").select("id,title,slug,status,created_at,owner_id").order("created_at", { ascending: false }).limit(8),
      supabaseAdmin.from("properties").select("id,title,slug,view_count").order("view_count", { ascending: false }).limit(8),
    ]);

    return {
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
        inquiries30d: inquiries30.count ?? 0,
        views30d: views30.count ?? 0,
      },
      users: {
        total: usersAll.count ?? 0,
        agents: agents.count ?? 0,
        verified: verifiedProfiles.count ?? 0,
      },
      recentListings: recentProps.data ?? [],
      topListings: topProps.data ?? [],
    };
  });
