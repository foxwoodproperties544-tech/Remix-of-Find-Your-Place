import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type FoundingStatus = {
  tier: string | null;
  tier_name: string | null;
  expires_at: string | null;
  days_remaining: number | null;
  listing_quota: number;
  published_count: number;
  pending_count: number;
  rejected_count: number;
  draft_count: number;
  remaining: number;
  is_founding: boolean;
  is_comp: boolean;
  active: boolean;
};

/** Agent widget: founding tier expiry, remaining listings, and approval status. */
export const getMyFoundingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FoundingStatus> => {
    const { supabase, userId } = context;
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("tier, tier_expires_at, listing_quota, comp_granted_at")
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw pErr;

    const { data: plan } = prof?.tier
      ? await supabase.from("tier_plans").select("name").eq("slug", prof.tier).maybeSingle()
      : { data: null };

    const { data: rows, error: rErr } = await supabase
      .from("properties")
      .select("status")
      .eq("owner_id", userId);
    if (rErr) throw rErr;

    const counts = { published: 0, pending: 0, rejected: 0, draft: 0 };
    for (const r of rows ?? []) {
      if (r.status === "published") counts.published++;
      else if (r.status === "pending" || r.status === "pending_payment") counts.pending++;
      else if (r.status === "rejected") counts.rejected++;
      else if (r.status === "draft") counts.draft++;
    }

    const expiresAt = prof?.tier_expires_at ?? null;
    const daysRemaining = expiresAt
      ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400_000))
      : null;
    const quota = Number(prof?.listing_quota ?? 0);
    const active =
      !!prof?.tier &&
      prof.tier !== "free" &&
      (!expiresAt || new Date(expiresAt).getTime() > Date.now());

    return {
      tier: prof?.tier ?? null,
      tier_name: plan?.name ?? prof?.tier ?? null,
      expires_at: expiresAt,
      days_remaining: daysRemaining,
      listing_quota: quota,
      published_count: counts.published,
      pending_count: counts.pending,
      rejected_count: counts.rejected,
      draft_count: counts.draft,
      remaining: Math.max(0, quota - counts.published),
      is_founding: prof?.tier === "founding",
      is_comp: !!prof?.comp_granted_at,
      active,
    };
  });

/** Admin moderation queue: pending listings with owner + quota info. */
export const listPendingAgentListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["pending", "pending_payment", "all"]).default("pending") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("properties")
      .select(
        "id, slug, title, category, property_type, county, town, area, price, price_suffix, images, owner_id, status, created_at, description",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);

    const { data: props, error } = await q;
    if (error) throw error;
    const ids = Array.from(new Set((props ?? []).map((p) => p.owner_id).filter(Boolean)));
    if (!ids.length) return [];

    const [{ data: profiles }, { data: roles }, { data: published }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, company_name, avatar_url, verified, tier, tier_expires_at, listing_quota, phone")
        .in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin
        .from("properties")
        .select("owner_id")
        .in("owner_id", ids)
        .eq("status", "published"),
    ]);

    const pubByOwner = new Map<string, number>();
    for (const r of published ?? []) pubByOwner.set(r.owner_id, (pubByOwner.get(r.owner_id) ?? 0) + 1);
    const rolesByOwner = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rolesByOwner.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByOwner.set(r.user_id, arr);
    }
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    // --- Duplicate photo detection -------------------------------------------------
    // Collect the perceptual hashes of the queued listings, then look for the same
    // hashes registered by a DIFFERENT owner (or a different, already-published listing).
    const propIds = (props ?? []).map((p) => p.id);
    const dupByProperty = new Map<string, { hashes: number; matches: number; owners: number }>();
    if (propIds.length) {
      const { data: myHashes } = await supabaseAdmin
        .from("property_image_hashes")
        .select("property_id, owner_id, image_hash")
        .in("property_id", propIds);
      const hashes = Array.from(new Set((myHashes ?? []).map((h) => h.image_hash)));
      if (hashes.length) {
        const { data: allHashes } = await supabaseAdmin
          .from("property_image_hashes")
          .select("property_id, owner_id, image_hash")
          .in("image_hash", hashes);
        const byHash = new Map<string, { property_id: string; owner_id: string }[]>();
        for (const h of allHashes ?? []) {
          const arr = byHash.get(h.image_hash) ?? [];
          arr.push({ property_id: h.property_id, owner_id: h.owner_id });
          byHash.set(h.image_hash, arr);
        }
        for (const h of myHashes ?? []) {
          const others = (byHash.get(h.image_hash) ?? []).filter((o) => o.property_id !== h.property_id);
          if (!others.length) continue;
          const cur = dupByProperty.get(h.property_id) ?? { hashes: 0, matches: 0, owners: 0 };
          cur.hashes += 1;
          cur.matches += others.length;
          cur.owners += others.filter((o) => o.owner_id !== h.owner_id).length;
          dupByProperty.set(h.property_id, cur);
        }
      }
    }

    return (props ?? []).map((p) => {
      const prof = profileById.get(p.owner_id) as any;
      const pubCount = pubByOwner.get(p.owner_id) ?? 0;
      const quota = Number(prof?.listing_quota ?? 0);
      const dup = dupByProperty.get(p.id) ?? null;
      return {
        ...p,
        duplicate: dup
          ? {
              photos: dup.hashes,
              matches: dup.matches,
              cross_owner: dup.owners > 0,
              severity: dup.owners > 0 ? ("high" as const) : ("low" as const),
            }
          : null,
        owner: prof
          ? {
              ...prof,
              roles: rolesByOwner.get(p.owner_id) ?? [],
              published_count: pubCount,
              quota,
              remaining: Math.max(0, quota - pubCount),
              at_quota: quota > 0 && pubCount >= quota,
            }
          : null,
      };
    });

  });

export const moderateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        reason: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { writeAudit } = await import("./audit.server");

    const newStatus = data.action === "approve" ? "published" : "rejected";
    const patch: any = { status: newStatus };
    if (data.action === "approve") patch.published_at = new Date().toISOString();

    const { data: row, error } = await supabaseAdmin
      .from("properties")
      .update(patch)
      .eq("id", data.id)
      .select("id, owner_id, title, status")
      .single();
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("quota")) {
        throw new Error(
          "Cannot approve: this agent has reached their free-listing quota under the founding plan. Ask them to upgrade or unpublish an existing listing before approving another.",
        );
      }
      throw error;
    }


    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: data.action === "approve" ? "listing.approve" : "listing.reject",
      entityType: "property",
      entityId: row.id,
      summary: `${data.action === "approve" ? "Approved" : "Rejected"} listing "${row.title}"${data.reason ? ` — ${data.reason}` : ""}`,
      metadata: { owner_id: row.owner_id, reason: data.reason ?? null },
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: row.owner_id,
      type: `listing_${newStatus}`,
      title: data.action === "approve" ? "Your listing was approved" : "Your listing was rejected",
      body:
        data.action === "approve"
          ? `"${row.title}" is now live on Foxwood.`
          : `"${row.title}" was not approved.${data.reason ? ` Reason: ${data.reason}` : ""}`,
      link: "/dashboard",
    });

    return { ok: true, status: newStatus };
  });
