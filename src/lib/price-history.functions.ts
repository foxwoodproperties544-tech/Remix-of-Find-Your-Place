import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MAX_PRICE = 100_000_000_000;

async function isAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  return !!data;
}

const updateSchema = z.object({
  propertyId: z.string().uuid(),
  price: z.number().positive().max(MAX_PRICE),
  reason: z.string().trim().max(300).optional().nullable(),
});

/**
 * Update a listing's asking price. Only the assigned owner/agent or an admin may
 * do this; the database trigger records the price-history entry automatically.
 */
export const updateListingPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: prop, error: readErr } = await context.supabase
      .from("properties")
      .select("id, title, owner_id, price, status")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!prop) throw new Error("Listing not found");

    const admin = await isAdmin(context);
    if (prop.owner_id !== context.userId && !admin) throw new Error("Forbidden");

    const previous = Number(prop.price);
    if (previous === data.price) return { ok: true, unchanged: true as const };

    const { error } = await context.supabase
      .from("properties")
      .update({ price: data.price, price_change_reason: data.reason ?? null } as any)
      .eq("id", data.propertyId);
    if (error) throw new Error(error.message);

    const { writeAudit } = await import("@/lib/audit.server");
    await writeAudit({
      actorId: context.userId,
      action: "property.price_update",
      entityType: "property",
      entityId: data.propertyId,
      summary: `Price changed from ${previous} to ${data.price}${data.reason ? ` — ${data.reason}` : ""}`,
      before: { price: previous },
      after: { price: data.price },
      metadata: { reason: data.reason ?? null, byAdmin: admin && prop.owner_id !== context.userId },
    });

    return { ok: true, previous, price: data.price };
  });

const listSchema = z.object({
  q: z.string().trim().max(120).optional(),
  county: z.string().trim().max(60).optional(),
  town: z.string().trim().max(60).optional(),
  propertyType: z.string().trim().max(60).optional(),
  direction: z.enum(["all", "down", "up"]).default("all"),
  startDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
  limit: z.number().int().min(1).max(1000).default(200),
});

export type AdminPriceChange = {
  id: string;
  property_id: string;
  created_at: string;
  previous_price: number | null;
  new_price: number;
  amount_changed: number | null;
  percent_changed: number | null;
  reason: string | null;
  reverted: boolean;
  title: string;
  slug: string | null;
  county: string | null;
  town: string | null;
  property_type: string | null;
  owner_id: string | null;
  owner_name: string | null;
};

/** Admin: every recorded price change, filterable. */
export const listPriceChanges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<AdminPriceChange[]> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");

    let q = context.supabase
      .from("property_price_history")
      .select(
        "id, property_id, created_at, previous_price, new_price, amount_changed, percent_changed, reason, reverted, properties!inner(title, slug, county, town, property_type, owner_id)",
      )
      .eq("is_initial", false)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.county) q = q.eq("properties.county", data.county);
    if (data.town) q = q.eq("properties.town", data.town);
    if (data.propertyType) q = q.eq("properties.property_type", data.propertyType);
    if (data.startDate) q = q.gte("created_at", data.startDate);
    if (data.endDate) q = q.lte("created_at", data.endDate);
    if (data.direction === "down") q = q.lt("amount_changed", 0);
    if (data.direction === "up") q = q.gt("amount_changed", 0);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ownerIds = [...new Set(((rows ?? []) as any[]).map((r) => r.properties?.owner_id).filter(Boolean))];
    const names = new Map<string, string>();
    if (ownerIds.length) {
      const { data: profiles } = await context.supabase.from("profiles").select("id, full_name").in("id", ownerIds);
      for (const p of (profiles ?? []) as any[]) names.set(p.id, p.full_name ?? "");
    }

    const mapped: AdminPriceChange[] = ((rows ?? []) as any[]).map((r) => ({
      id: r.id,
      property_id: r.property_id,
      created_at: r.created_at,
      previous_price: r.previous_price == null ? null : Number(r.previous_price),
      new_price: Number(r.new_price),
      amount_changed: r.amount_changed == null ? null : Number(r.amount_changed),
      percent_changed: r.percent_changed == null ? null : Number(r.percent_changed),
      reason: r.reason,
      reverted: !!r.reverted,
      title: r.properties?.title ?? "",
      slug: r.properties?.slug ?? null,
      county: r.properties?.county ?? null,
      town: r.properties?.town ?? null,
      property_type: r.properties?.property_type ?? null,
      owner_id: r.properties?.owner_id ?? null,
      owner_name: names.get(r.properties?.owner_id) ?? null,
    }));

    const needle = data.q?.toLowerCase();
    return needle
      ? mapped.filter((r) =>
          [r.title, r.county, r.town, r.property_type, r.owner_name, r.reason].some((v) =>
            (v ?? "").toLowerCase().includes(needle),
          ),
        )
      : mapped;
  });

/** Admin: revert an incorrect price change (audit trail preserved). */
export const revertPriceChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ historyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");

    const { data: row, error } = await context.supabase
      .from("property_price_history")
      .select("id, property_id, previous_price, new_price, reverted")
      .eq("id", data.historyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Price change not found");
    if (row.reverted) throw new Error("This change has already been reverted");
    if (row.previous_price == null) throw new Error("The initial listing price cannot be reverted");

    const restore = Number(row.previous_price);

    const { error: upErr } = await context.supabase
      .from("properties")
      .update({ price: restore, price_change_reason: "Admin correction — reverted price change" } as any)
      .eq("id", row.property_id);
    if (upErr) throw new Error(upErr.message);

    const { error: markErr } = await context.supabase
      .from("property_price_history")
      .update({ reverted: true, reverted_by: context.userId, reverted_at: new Date().toISOString() } as any)
      .eq("id", row.id);
    if (markErr) throw new Error(markErr.message);

    const { writeAudit } = await import("@/lib/audit.server");
    await writeAudit({
      actorId: context.userId,
      action: "property.price_revert",
      entityType: "property",
      entityId: row.property_id,
      summary: `Reverted price change back to ${restore}`,
      before: { price: Number(row.new_price) },
      after: { price: restore },
      metadata: { historyId: row.id },
    });

    return { ok: true, restored: restore };
  });

export type PriceAnalytics = {
  byCounty: { key: string; avg: number; count: number }[];
  byTown: { key: string; avg: number; count: number }[];
  byType: { key: string; avg: number; count: number }[];
  largestDrops: AdminPriceChange[];
  largestIncreases: AdminPriceChange[];
  trend: { month: string; drops: number; increases: number; avgChange: number }[];
  avgDaysBetweenChanges: number | null;
  totalChanges: number;
};

/** Admin: platform-wide pricing analytics built purely from Foxwood data. */
export const getPriceAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.number().int().min(7).max(730).default(180) }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<PriceAnalytics> => {
    if (!(await isAdmin(context))) throw new Error("Forbidden");
    const since = new Date(Date.now() - data.days * 864e5).toISOString();

    const [{ data: props }, { data: hist }] = await Promise.all([
      context.supabase
        .from("properties")
        .select("id, price, county, town, property_type")
        .eq("status", "published"),
      context.supabase
        .from("property_price_history")
        .select(
          "id, property_id, created_at, previous_price, new_price, amount_changed, percent_changed, reason, reverted, properties!inner(title, slug, county, town, property_type, owner_id)",
        )
        .eq("is_initial", false)
        .eq("reverted", false)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(5000),
    ]);

    const avgBy = (key: "county" | "town" | "property_type") => {
      const acc = new Map<string, { sum: number; count: number }>();
      for (const p of (props ?? []) as any[]) {
        const k = (p[key] ?? "").trim();
        if (!k) continue;
        const cur = acc.get(k) ?? { sum: 0, count: 0 };
        cur.sum += Number(p.price ?? 0);
        cur.count += 1;
        acc.set(k, cur);
      }
      return [...acc.entries()]
        .map(([k, v]) => ({ key: k, avg: Math.round(v.sum / v.count), count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
    };

    const rows: AdminPriceChange[] = ((hist ?? []) as any[]).map((r) => ({
      id: r.id,
      property_id: r.property_id,
      created_at: r.created_at,
      previous_price: r.previous_price == null ? null : Number(r.previous_price),
      new_price: Number(r.new_price),
      amount_changed: r.amount_changed == null ? null : Number(r.amount_changed),
      percent_changed: r.percent_changed == null ? null : Number(r.percent_changed),
      reason: r.reason,
      reverted: !!r.reverted,
      title: r.properties?.title ?? "",
      slug: r.properties?.slug ?? null,
      county: r.properties?.county ?? null,
      town: r.properties?.town ?? null,
      property_type: r.properties?.property_type ?? null,
      owner_id: r.properties?.owner_id ?? null,
      owner_name: null,
    }));

    // Average gap between consecutive changes on the same property
    const byProp = new Map<string, number[]>();
    for (const r of rows) {
      const list = byProp.get(r.property_id) ?? [];
      list.push(+new Date(r.created_at));
      byProp.set(r.property_id, list);
    }
    const gaps: number[] = [];
    for (const times of byProp.values()) {
      times.sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) / 864e5);
    }

    const months = new Map<string, { drops: number; increases: number; sum: number; n: number }>();
    for (const r of rows) {
      const m = r.created_at.slice(0, 7);
      const cur = months.get(m) ?? { drops: 0, increases: 0, sum: 0, n: 0 };
      if ((r.amount_changed ?? 0) < 0) cur.drops += 1;
      else cur.increases += 1;
      cur.sum += r.amount_changed ?? 0;
      cur.n += 1;
      months.set(m, cur);
    }

    return {
      byCounty: avgBy("county"),
      byTown: avgBy("town"),
      byType: avgBy("property_type"),
      largestDrops: [...rows].sort((a, b) => (a.amount_changed ?? 0) - (b.amount_changed ?? 0)).slice(0, 10),
      largestIncreases: [...rows].sort((a, b) => (b.amount_changed ?? 0) - (a.amount_changed ?? 0)).slice(0, 10),
      trend: [...months.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, v]) => ({ month, drops: v.drops, increases: v.increases, avgChange: Math.round(v.sum / v.n) })),
      avgDaysBetweenChanges: gaps.length ? Math.round((gaps.reduce((s, g) => s + g, 0) / gaps.length) * 10) / 10 : null,
      totalChanges: rows.length,
    };
  });
