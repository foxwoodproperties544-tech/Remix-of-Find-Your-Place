import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const listSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
  })
  .optional();

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!ok) throw new Error("Forbidden");
}

export const listReviewsForModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const status = data?.status ?? "pending";

    let q = context.supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "all") q = q.eq("status", status);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const authorIds = [...new Set((rows ?? []).map((r: any) => r.user_id))];
    const agentIds = [
      ...new Set((rows ?? []).filter((r: any) => r.target_type === "agent").map((r: any) => r.target_id)),
    ];
    const profileIds = [...new Set([...authorIds, ...agentIds])];

    let profiles: Record<string, any> = {};
    if (profileIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", profileIds);
      profiles = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }

    const propIds = [
      ...new Set((rows ?? []).filter((r: any) => r.target_type === "property").map((r: any) => r.target_id)),
    ];
    let props: Record<string, any> = {};
    if (propIds.length) {
      const { data: pr } = await context.supabase
        .from("properties")
        .select("id, slug, title")
        .in("id", propIds);
      props = Object.fromEntries((pr ?? []).map((p: any) => [p.id, p]));
    }

    return (rows ?? []).map((r: any) => ({
      ...r,
      author: profiles[r.user_id] ?? null,
      target:
        r.target_type === "agent"
          ? { kind: "agent", ...(profiles[r.target_id] ?? {}) }
          : { kind: "property", ...(props[r.target_id] ?? {}) },
    }));
  });

const moderateSchema = z.object({
  reviewId: z.string().uuid(),
  action: z.enum(["approve", "reject", "delete"]),
  note: z.string().max(1000).optional(),
});

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => moderateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: review } = await context.supabase
      .from("reviews")
      .select("id, user_id, target_id, target_type, rating, status")
      .eq("id", data.reviewId)
      .maybeSingle();
    if (!review) throw new Error("Review not found");

    if (data.action === "delete") {
      const { error } = await context.supabase.from("reviews").delete().eq("id", data.reviewId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("reviews")
        .update({
          status: data.action === "approve" ? "approved" : "rejected",
          moderated_by: context.userId,
          moderated_at: new Date().toISOString(),
          moderation_note: data.note ?? null,
        })
        .eq("id", data.reviewId);
      if (error) throw new Error(error.message);
    }

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      actorId: context.userId,
      actorEmail: (context.claims as any)?.email ?? null,
      action: `review.${data.action}`,
      entityType: "review",
      entityId: data.reviewId,
      summary: `Review ${data.action}d`,
      before: { status: review.status },
      metadata: {
        target_type: review.target_type,
        target_id: review.target_id,
        rating: review.rating,
        note: data.note ?? null,
      },
    });

    return { ok: true };
  });
